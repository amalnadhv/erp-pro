// Microsoft SQL Server -> local ERP migration.
//
// The UI sends a per-request connection (never stored). We read the legacy
// tables, map the rows onto the ERP's SQLite tables and insert them for the
// signed-in tenant. Every entity is idempotent: rows whose natural key already
// exists for the tenant are skipped, so a failed run can simply be re-run.

import { randomUUID } from 'node:crypto'
import { columnsOf, quoteIdent } from './db.mjs'

let mssqlPromise = null
function loadMssql() {
  if (!mssqlPromise) mssqlPromise = import('mssql').then((mod) => mod.default || mod)
  return mssqlPromise
}

export const ENTITIES = [
  { key: 'accounts', label: 'Chart of Accounts', source: 'asmast', note: 'Legacy GL accounts with opening balances' },
  { key: 'customers', label: 'Customers', source: 'asmast + ASADR', note: 'Accounts with type 1205/1210 plus address book' },
  { key: 'suppliers', label: 'Suppliers', source: 'asmast + ASADR', note: 'Accounts with type 2205/2210 plus address book' },
  { key: 'products', label: 'Stock Items', source: 'asicm', note: 'Item master with cost, price, VAT and stock' },
  { key: 'invoices', label: 'A/R Invoices', source: 'asinv', note: 'Sales invoices (headers only)' },
  { key: 'purchase_invoices', label: 'A/P Invoices', source: 'aspinv', note: 'Purchase invoices (headers only)' },
  { key: 'journal_entries', label: 'Journal Entries (GL)', source: 'astran', note: 'Posted double-entry vouchers; limit counts vouchers' },
  { key: 'stock_movements', label: 'Stock Movements', source: 'asict', note: 'Item in/out movements from sales, purchases and returns' },
]

const ENTITY_KEYS = new Set(ENTITIES.map((e) => e.key))

export function normalizeConnection(input = {}) {
  let server = String(input.server || '').trim().replace(/^tcp:/i, '')
  if (!server) throw new Error('SQL Server host is required')
  const database = String(input.database || '').trim()
  if (!database) throw new Error('Database name is required')
  const user = String(input.user || '').trim()
  const password = String(input.password || '')
  if (!user) throw new Error('SQL login is required')

  // Accept the usual SQL Server forms: "host", "host,1433", "host\INSTANCE".
  let port = Number(input.port) || 0
  let instanceName = String(input.instanceName || '').trim()
  const comma = server.lastIndexOf(',')
  if (comma > 0) {
    const maybePort = Number(server.slice(comma + 1).trim())
    if (Number.isInteger(maybePort) && maybePort > 0) {
      port = maybePort
      server = server.slice(0, comma).trim()
    }
  }
  const backslash = server.indexOf('\\')
  if (backslash > 0) {
    if (!instanceName) instanceName = server.slice(backslash + 1).trim()
    server = server.slice(0, backslash).trim()
  }
  if (!server) throw new Error('SQL Server host is required')
  // A named instance is resolved through SQL Browser; a typed default 1433 must not override it.
  const explicitPort = port > 0 && !(instanceName && port === 1433)

  return {
    server,
    ...(explicitPort ? { port } : instanceName ? {} : { port: 1433 }),
    database,
    user,
    password,
    options: {
      encrypt: Boolean(input.encrypt),
      trustServerCertificate: input.trustServerCertificate !== false,
      enableArithAbort: true,
      ...(instanceName ? { instanceName } : {}),
    },
    connectionTimeout: 15000,
    requestTimeout: 10 * 60 * 1000,
    pool: { max: 4, min: 0, idleTimeoutMillis: 5000 },
  }
}

async function withPool(input, fn) {
  const sql = await loadMssql()
  const pool = new sql.ConnectionPool(normalizeConnection(input))
  await pool.connect()
  try {
    return await fn(pool, sql)
  } finally {
    try { await pool.close() } catch { /* ignore */ }
  }
}

export async function testConnection(input) {
  return withPool(input, async (pool) => {
    const r = await pool.request().query(
      "SELECT SERVERPROPERTY('ServerName') AS server_name, DB_NAME() AS database_name, SERVERPROPERTY('ProductVersion') AS version"
    )
    const row = r.recordset[0] || {}
    return {
      ok: true,
      server: row.server_name || '',
      database: row.database_name || '',
      version: row.version || '',
      tables: await tableStats(pool),
      entities: ENTITIES,
    }
  })
}

async function tableStats(pool) {
  const r = await pool.request().query(`
    SELECT t.name AS name, SUM(p.rows) AS row_count
    FROM sys.tables t
    JOIN sys.partitions p ON p.object_id = t.object_id AND p.index_id IN (0, 1)
    GROUP BY t.name`)
  const out = {}
  for (const row of r.recordset) out[row.name] = Number(row.row_count) || 0
  return out
}

async function sourceColumns(pool, table) {
  const r = await pool
    .request()
    .input('t', table)
    .query('SELECT c.name FROM sys.columns c WHERE c.object_id = OBJECT_ID(@t)')
  return new Set(r.recordset.map((row) => row.name))
}

async function selectRows(pool, table, wanted, limit = 0, orderBy = '') {
  const available = await sourceColumns(pool, table)
  if (!available.size) throw new Error(`Source table "${table}" was not found in this database.`)
  const cols = wanted.filter((c) => available.has(c))
  if (!cols.length) throw new Error(`Source table "${table}" has none of the expected columns (${wanted.join(', ')}).`)
  const order = orderBy ? ` ORDER BY ${orderBy}` : ''
  const top = limit > 0 ? `TOP (${Math.max(1, Math.floor(limit))}) ` : ''
  const sqlText = `SELECT ${top}${cols.map((c) => `[${c}]`).join(', ')} FROM [${table}]${order}`
  const r = await pool.request().query(sqlText)
  return r.recordset
}

const str = (v) => (v == null ? '' : String(v).trim())
const num = (v) => {
  if (v == null || v === '') return 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
const int = (v) => Math.trunc(num(v))
const firstValue = (row, keys) => {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') return row[k]
  }
  return null
}
const isoDate = (v) => {
  if (!v) return null
  const d = v instanceof Date ? v : new Date(v)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 10)
}

function accountType(acctype) {
  const code = str(acctype)
  switch (code.charAt(0)) {
    case '1': return 'Asset'
    case '2': return 'Liability'
    case '3': return 'Equity'
    case '4': return 'Income'
    case '5':
    case '6': return 'Expense'
    default: return 'Asset'
  }
}

function encode(value) {
  if (value === undefined || value === null) return null
  if (typeof value === 'boolean') return value ? 1 : 0
  if (typeof value === 'object' && !(value instanceof Date)) return JSON.stringify(value)
  if (value instanceof Date) return value.toISOString()
  return value
}

function createInserter(db, table, tenantId, keyField) {
  const cols = columnsOf(db, table)
  const existing = new Set()
  if (keyField && cols.has(keyField)) {
    for (const row of db.prepare(`SELECT ${quoteIdent(keyField)} AS k FROM ${quoteIdent(table)} WHERE tenant_id = ?`).all(tenantId)) {
      if (row.k !== null && row.k !== undefined) existing.add(String(row.k))
    }
  }
  return {
    hasKey(key) {
      return key !== null && key !== undefined && existing.has(String(key))
    },
    insert(data) {
      const record = { ...data }
      if (!record.id) record.id = randomUUID()
      record.tenant_id = tenantId
      const keys = Object.keys(record).filter((k) => cols.has(k) && record[k] !== undefined)
      const sqlText = `INSERT INTO ${quoteIdent(table)} (${keys.map(quoteIdent).join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`
      db.prepare(sqlText).run(...keys.map((k) => encode(record[k])))
      if (keyField && record[keyField] !== undefined) existing.add(String(record[keyField]))
    },
  }
}

async function loadAccountNameMap(pool) {
  const cols = await sourceColumns(pool, 'asmast')
  if (!cols.size) return new Map()
  const wanted = ['account', 'accdesc']
  const rows = await selectRows(pool, 'asmast', wanted)
  const map = new Map()
  for (const row of rows) {
    const code = str(row.account)
    if (code) map.set(code, str(row.accdesc) || code)
  }
  return map
}

async function loadContactMap(pool) {
  const cols = await sourceColumns(pool, 'ASADR')
  if (!cols.size) return new Map()
  const rows = await selectRows(pool, 'ASADR', ['account', 'address1', 'address2', 'address3', 'phone', 'email', 'country'])
  const map = new Map()
  for (const row of rows) {
    const code = str(row.account)
    if (code && !map.has(code)) map.set(code, row)
  }
  return map
}

async function importAccounts({ pool, db, tenantId, limit }) {
  const rows = await selectRows(pool, 'asmast', [
    'account', 'accdesc', 'acctype', 'currency', 'openbal', 'climit', 'duedays', 'grp', 'hide',
  ], limit, 'account')
  const inserter = createInserter(db, 'accounts', tenantId, 'code')
  let imported = 0
  let skipped = 0
  const errors = []
  for (const row of rows) {
    const code = str(row.account)
    if (!code) { skipped += 1; continue }
    if (inserter.hasKey(code)) { skipped += 1; continue }
    try {
      const opening = num(row.openbal)
      inserter.insert({
        code,
        name: str(row.accdesc) || code,
        type: accountType(row.acctype),
        opening_balance: opening,
        current_balance: opening,
        currency: str(row.currency) || 'AED',
        is_group: 0,
        status: num(row.hide) ? 'Inactive' : 'Active',
        notes: `Imported from legacy account (type ${str(row.acctype)})`,
      })
      imported += 1
    } catch (e) {
      if (errors.length < 10) errors.push(`${code}: ${e.message}`)
    }
  }
  return { source: 'asmast', imported, skipped, errors }
}

async function importParties({ pool, db, tenantId, limit, kind }) {
  const contactMap = await loadContactMap(pool)
  const wanted = ['account', 'accdesc', 'acctype', 'currency', 'climit', 'duedays', 'phone', 'cust_block', 'grp', 'terms']
  const rows = await selectRows(pool, 'asmast', wanted, 0, 'account')
  const allowed = kind === 'customer' ? new Set(['1205', '1210']) : new Set(['2205', '2210'])
  const table = kind === 'customer' ? 'customers' : 'suppliers'
  const inserter = createInserter(db, table, tenantId, 'code')
  let imported = 0
  let skipped = 0
  const errors = []
  let seen = 0
  for (const row of rows) {
    if (!allowed.has(str(row.acctype))) continue
    if (limit > 0 && seen >= limit) break
    seen += 1
    const code = str(row.account)
    if (!code) { skipped += 1; continue }
    if (inserter.hasKey(code)) { skipped += 1; continue }
    const contact = contactMap.get(code) || {}
    const name = str(row.accdesc) || code
    const address = [contact.address1, contact.address2, contact.address3].map(str).filter(Boolean).join(', ')
    try {
      if (kind === 'customer') {
        inserter.insert({
          code,
          name,
          first_name: name,
          last_name: '-',
          email: str(contact.email) || `${code.toLowerCase()}@legacy.local`,
          phone: str(contact.phone) || str(row.phone),
          address,
          country: str(contact.country),
          currency: str(row.currency) || 'AED',
          credit_limit: num(row.climit),
          credit_days: int(row.duedays),
          payment_terms: str(row.terms),
          account_code: code,
          opening_balance: 0,
          status: num(row.cust_block) ? 'Blocked' : 'Active',
          notes: 'Imported from legacy ledger account',
        })
      } else {
        inserter.insert({
          code,
          name,
          email: str(contact.email),
          phone: str(contact.phone) || str(row.phone),
          address,
          country: str(contact.country),
          currency: str(row.currency) || 'AED',
          credit_limit: num(row.climit),
          credit_days: int(row.duedays),
          payment_terms: str(row.terms),
          account_code: code,
          opening_balance: 0,
          status: 'Active',
          notes: 'Imported from legacy ledger account',
        })
      }
      imported += 1
    } catch (e) {
      if (errors.length < 10) errors.push(`${code}: ${e.message}`)
    }
  }
  return { source: 'asmast + ASADR', imported, skipped, errors }
}

async function importProducts({ pool, db, tenantId, limit }) {
  const rows = await selectRows(pool, 'asicm', [
    'code', 'unit', 'group', 'sgroup', 'categ', 'scateg', 'desc', 'desc1', 'desc_1', 'desc2',
    'qty_open', 'phy_stock', 'phy_qty', 'cost_avg', 'avg_cost', 'cost_unit', 'price_unit',
    'LSPRICE', 'VAT', 'HSCODE', 'active', 'min_qty', 'max_qty', 'qty_rorder',
  ], limit, 'code')
  const inserter = createInserter(db, 'products', tenantId, 'code')
  let imported = 0
  let skipped = 0
  const errors = []
  for (const row of rows) {
    const code = str(row.code)
    if (!code) { skipped += 1; continue }
    if (inserter.hasKey(code)) { skipped += 1; continue }
    try {
      const name = str(firstValue(row, ['desc', 'desc1', 'desc_1', 'desc2'])) || code
      const cost = num(firstValue(row, ['cost_avg', 'avg_cost', 'cost_unit']))
      const price = num(firstValue(row, ['price_unit', 'LSPRICE'])) || cost
      const stock = int(firstValue(row, ['phy_stock', 'qty_open', 'phy_qty']))
      inserter.insert({
        code,
        name,
        description: str(row.desc2),
        category: str(firstValue(row, ['group', 'categ', 'sgroup', 'scateg'])),
        unit: str(row.unit) || 'Pcs',
        price,
        cost_price: cost,
        stock_quantity: stock,
        reorder_level: int(row.qty_rorder),
        min_stock: int(row.min_qty),
        max_stock: int(row.max_qty),
        vat_rate: num(row.VAT),
        hsn_code: str(row.HSCODE),
        status: row.active !== null && row.active !== undefined && int(row.active) === 0 ? 'Inactive' : 'Active',
        notes: 'Imported from legacy item master',
      })
      imported += 1
    } catch (e) {
      if (errors.length < 10) errors.push(`${code}: ${e.message}`)
    }
  }
  return { source: 'asicm', imported, skipped, errors }
}

async function importInvoices({ pool, db, tenantId, limit, kind, nameByAccount }) {
  const isAr = kind === 'ar'
  const table = isAr ? 'asinv' : 'aspinv'
  const target = isAr ? 'invoices' : 'purchase_invoices'
  const key = isAr ? 'invoice_no' : 'pin_no'
  const wanted = isAr
    ? ['inv_no', 'cust_acc', 'inv_total', 'vatamt', 'paid_amt', 'balance_amt', 'inv_date', 'due_date', 'comments', 'status', 'tran_type']
    : ['inv_no', 'account', 'accdesc', 'amount', 'vatamt', 'Balance_amt', 'date', 'duedate', 'remarks', 'status', 'tran_type']
  const order = isAr ? 'inv_date DESC, inv_no DESC' : 'date DESC, inv_no DESC'
  const rows = await selectRows(pool, table, wanted, limit, order)
  const inserter = createInserter(db, target, tenantId, key)

  const customerIdByCode = new Map()
  if (isAr) {
    const existing = db.prepare('SELECT id, code FROM customers WHERE tenant_id = ?').all(tenantId)
    for (const row of existing) if (row.code) customerIdByCode.set(String(row.code), row.id)
  }

  let imported = 0
  let skipped = 0
  const errors = []
  for (const row of rows) {
    const docNo = str(row.inv_no)
    if (!docNo) { skipped += 1; continue }
    if (inserter.hasKey(docNo)) { skipped += 1; continue }
    try {
      const total = num(isAr ? row.inv_total : row.amount)
      if (!total) { skipped += 1; continue }
      const vat = num(row.vatamt)
      const subtotal = Math.round((total - vat) * 100) / 100
      const balance = num(isAr ? row.balance_amt : row.Balance_amt)
      const partyCode = str(isAr ? row.cust_acc : row.account)
      const partyName = isAr
        ? (nameByAccount.get(partyCode) || partyCode)
        : (str(row.accdesc) || nameByAccount.get(partyCode) || partyCode)
      const docDate = isoDate(isAr ? row.inv_date : row.date)
      const dueDate = isoDate(isAr ? row.due_date : row.duedate)
      if (isAr) {
        const paid = num(row.paid_amt)
        inserter.insert({
          invoice_no: docNo,
          customer_id: customerIdByCode.get(partyCode) || null,
          customer_name: partyName,
          customer_vat: '',
          items: '[]',
          subtotal,
          vat_amount: vat,
          grand_total: total,
          amount_paid: paid,
          balance: balance || Math.max(0, total - paid),
          status: balance > 0 ? 'Outstanding' : 'Paid',
          invoice_date: docDate,
          due_date: dueDate,
          created_at: docDate ? `${docDate}T00:00:00.000Z` : undefined,
          notes: str(row.comments) || 'Imported from legacy A/R invoice',
        })
      } else {
        inserter.insert({
          pin_no: docNo,
          party_name: partyName,
          doc_date: docDate,
          due_date: dueDate,
          currency: 'AED',
          subtotal,
          vat_amount: vat,
          grand_total: total,
          status: balance > 0 ? 'Outstanding' : 'Paid',
          notes: str(row.remarks) || 'Imported from legacy A/P invoice',
        })
      }
      imported += 1
    } catch (e) {
      if (errors.length < 10) errors.push(`${docNo}: ${e.message}`)
    }
  }
  return { source: table, imported, skipped, errors }
}

const sqlLiteral = (value) => `N'${String(value ?? '').replace(/'/g, "''")}'`

async function importJournalEntries({ pool, db, tenantId, limit }) {
  const cols = await sourceColumns(pool, 'astran')
  for (const required of ['account', 'jvtype', 'type_no', 'type', 'amount']) {
    if (!cols.has(required)) throw new Error(`Source table "astran" is missing the "${required}" column.`)
  }
  const maxVouchers = limit > 0 ? Math.min(limit, 20000) : 20000
  const keyResult = await pool
    .request()
    .query(`SELECT DISTINCT TOP (${Math.max(1, Math.floor(maxVouchers))}) type_no, jvtype FROM astran`)
  const keys = []
  const seenKeys = new Set()
  for (const row of keyResult.recordset) {
    const jvtype = str(row.jvtype)
    const typeNo = str(row.type_no)
    const marker = `${jvtype}\u0000${typeNo}`
    if (!typeNo || seenKeys.has(marker)) continue
    seenKeys.add(marker)
    keys.push({ jvtype, typeNo })
  }
  if (!keys.length) return { source: 'astran', imported: 0, skipped: 0, errors: [] }

  const lineCols = ['account', 'jvtype', 'type_no', 'type', 'amount', 'jvdate', 'ref', 'entry_ref', 'curno', 'account_desc']
    .filter((c) => cols.has(c))
  const masterCols = await sourceColumns(pool, 'ASVOUCHMAST')
  const hasMaster = masterCols.has('JVTYPE') && masterCols.has('TYPE_NO')
  const masterText = ['DESCRIPT', 'COMMENTS'].filter((c) => masterCols.has(c))

  const lines = []
  const narrationByKey = new Map()
  for (let i = 0; i < keys.length; i += 1000) {
    const chunk = keys.slice(i, i + 1000)
    const values = chunk.map((k) => `(${sqlLiteral(k.typeNo)},${sqlLiteral(k.jvtype)})`).join(',')
    const statements = [
      'CREATE TABLE #k (type_no nvarchar(200) COLLATE DATABASE_DEFAULT, jvtype nvarchar(50) COLLATE DATABASE_DEFAULT, PRIMARY KEY (type_no, jvtype));',
      `INSERT INTO #k (type_no, jvtype) VALUES ${values};`,
      `SELECT ${lineCols.map((c) => `a.[${c}]`).join(', ')} FROM astran a JOIN #k k ON a.type_no = k.type_no AND a.jvtype = k.jvtype;`,
    ]
    if (hasMaster && masterText.length) {
      statements.push(
        `SELECT k.type_no, k.jvtype, ${masterText.map((c) => `v.[${c}]`).join(', ')} FROM #k k LEFT JOIN ASVOUCHMAST v ON v.TYPE_NO = k.type_no AND v.JVTYPE = k.jvtype;`
      )
    }
    const result = await pool.request().query(statements.join('\n'))
    lines.push(...(result.recordsets[0] || []))
    if (result.recordsets[1]) {
      for (const row of result.recordsets[1]) {
        const marker = `${str(row.jvtype)}\u0000${str(row.type_no)}`
        if (!narrationByKey.has(marker)) narrationByKey.set(marker, row)
      }
    }
  }

  const groups = new Map()
  for (const row of lines) {
    const marker = `${str(row.jvtype)}\u0000${str(row.type_no)}`
    let group = groups.get(marker)
    if (!group) {
      group = { jvtype: str(row.jvtype), typeNo: str(row.type_no), lines: [] }
      groups.set(marker, group)
    }
    group.lines.push(row)
  }

  const accountIds = new Map()
  for (const row of db.prepare('SELECT id, code FROM accounts WHERE tenant_id = ?').all(tenantId)) {
    if (row.code) accountIds.set(String(row.code), row.id)
  }
  let stubCount = 0
  const resolveAccount = (code, name) => {
    if (accountIds.has(code)) return accountIds.get(code)
    const id = randomUUID()
    db.prepare(
      'INSERT INTO accounts (id, code, name, type, opening_balance, current_balance, currency, is_group, status, notes, tenant_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)'
    ).run(id, code, name || code, accountType(code), 0, 0, 'AED', 0, 'Active', 'Auto-created from legacy journal line', tenantId)
    accountIds.set(code, id)
    stubCount += 1
    return id
  }

  const existing = new Set(
    db.prepare('SELECT entry_no FROM journal_entries WHERE tenant_id = ?').all(tenantId).map((row) => String(row.entry_no))
  )
  const entrySql = db.prepare(
    'INSERT INTO journal_entries (id, entry_no, entry_date, reference, narration, status, total_debit, total_credit, currency, created_by, created_at, tenant_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
  )
  const lineSql = db.prepare(
    'INSERT INTO journal_lines (id, entry_id, line_no, account_id, debit, credit, description, created_at, tenant_id) VALUES (?,?,?,?,?,?,?,?,?)'
  )

  let imported = 0
  let skipped = 0
  const errors = []
  for (const group of groups.values()) {
    const entryNo = `${group.jvtype}-${group.typeNo}`
    if (existing.has(entryNo)) { skipped += 1; continue }
    const postings = []
    let totalDebit = 0
    let totalCredit = 0
    let entryDate = null
    let reference = ''
    let currency = 'AED'
    let description = ''
    for (const row of group.lines) {
      const code = str(row.account)
      if (!code) continue
      const amount = num(row.amount)
      const isDebit = str(row.type).toUpperCase() === 'D'
      if (isDebit) totalDebit += amount
      else totalCredit += amount
      const date = isoDate(row.jvdate)
      if (date && (!entryDate || date < entryDate)) entryDate = date
      if (!reference) reference = str(row.ref) || group.typeNo
      if (!currency) currency = str(row.curno) || 'AED'
      if (!description) {
        const entryRef = str(row.entry_ref).replace(/^:/, '')
        description = entryRef || str(row.account_desc)
      }
      postings.push({ code, name: str(row.account_desc), debit: isDebit ? amount : 0, credit: isDebit ? 0 : amount, text: str(row.entry_ref).replace(/^:/, '') })
    }
    if (!postings.length) { skipped += 1; continue }
    const master = narrationByKey.get(`${group.jvtype}\u0000${group.typeNo}`) || {}
    const narration = [str(master.DESCRIPT), str(master.COMMENTS)].filter(Boolean).join(' - ') || description || `Imported ${group.jvtype} ${group.typeNo}`
    const date = entryDate || new Date().toISOString().slice(0, 10)
    try {
      const entryId = randomUUID()
      entrySql.run(
        entryId, entryNo, date, reference, narration, 'Posted',
        Math.round(totalDebit * 100) / 100, Math.round(totalCredit * 100) / 100,
        currency || 'AED', 'Migration', `${date}T00:00:00.000Z`, tenantId
      )
      postings.forEach((posting, index) => {
        lineSql.run(
          randomUUID(), entryId, index + 1,
          resolveAccount(posting.code, posting.name),
          Math.round(posting.debit * 100) / 100,
          Math.round(posting.credit * 100) / 100,
          posting.text || narration,
          `${date}T00:00:00.000Z`, tenantId
        )
      })
      existing.add(entryNo)
      imported += 1
    } catch (e) {
      if (errors.length < 10) errors.push(`${entryNo}: ${e.message}`)
    }
  }
  const result = { source: 'astran', imported, skipped, errors, note: stubCount ? `${stubCount} missing accounts auto-created` : '' }
  return result
}

async function importStockMovements({ pool, db, tenantId, limit }) {
  const cols = await sourceColumns(pool, 'asict')
  for (const required of ['code', 'tr_type', 'tr_qty', 'tr_date']) {
    if (!cols.has(required)) throw new Error(`Source table "asict" is missing the "${required}" column.`)
  }
  const rows = await selectRows(pool, 'asict', [
    'tr_refno', 'tr_desc', 'tr_date', 'code', 'tr_type', 'tr_qty', 'unit_cost', 'unit', 'inv_no',
    'unit_price', 'idesc', 'type', 'locn', 'line_total', 'id',
  ], limit, 'id DESC')

  const productIds = new Map()
  for (const row of db.prepare('SELECT id, code FROM products WHERE tenant_id = ?').all(tenantId)) {
    if (row.code) productIds.set(String(row.code), row.id)
  }
  const existing = new Set()
  const legacyExisting = new Set()
  for (const row of db.prepare(
    'SELECT movement_no, product_id, movement_date, movement_type, quantity, warehouse FROM stock_movements WHERE tenant_id = ?'
  ).all(tenantId)) {
    existing.add(`${row.movement_no}|${row.product_id || ''}|${row.movement_date}|${row.movement_type}|${row.quantity}`)
    // Rows written before movement_no gained the line id suffix: allow re-imports to skip them.
    if (!String(row.movement_no || '').includes('-')) {
      legacyExisting.add(`${row.movement_no}|${row.product_id || ''}|${row.movement_date}|${row.movement_type}|${row.quantity}|${row.warehouse || ''}`)
    }
  }

  const insertSql = db.prepare(
    'INSERT INTO stock_movements (id, movement_no, product_id, item_name, movement_type, quantity, warehouse, reference, movement_date, status, created_at, tenant_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
  )

  let imported = 0
  let skipped = 0
  const errors = []
  for (const row of rows) {
    const code = str(row.code)
    const date = isoDate(row.tr_date) || new Date().toISOString().slice(0, 10)
    const trType = str(row.tr_type).toUpperCase()
    const typeName = str(row.type).toUpperCase()
    const movementType = trType === 'R' || typeName === 'STOCKIN' ? 'In' : 'Out'
    const quantity = Math.abs(int(row.tr_qty))
    const baseRef = str(row.tr_refno) || str(row.inv_no) || String(row.id ?? '')
    const movementNo = `${baseRef}-${str(row.id)}`
    const productId = productIds.get(code) || null
    const marker = `${movementNo}|${productId || ''}|${date}|${movementType}|${quantity}`
    const legacyMarker = `${baseRef}|${productId || ''}|${date}|${movementType}|${quantity}|${str(row.locn) || 'MAIN'}`
    if (!movementNo || existing.has(marker) || legacyExisting.has(legacyMarker)) { skipped += 1; continue }
    try {
      const reference = str(row.inv_no) || baseRef
      insertSql.run(
        randomUUID(), movementNo, productId, str(row.idesc) || code,
        movementType, quantity, str(row.locn) || 'MAIN',
        `${str(row.type)} ${reference}`.trim(), date, 'Posted',
        `${date}T00:00:00.000Z`, tenantId
      )
      existing.add(marker)
      imported += 1
    } catch (e) {
      if (errors.length < 10) errors.push(`${movementNo}: ${e.message}`)
    }
  }
  return { source: 'asict', imported, skipped, errors }
}

const IMPORTERS = {
  accounts: (ctx) => importAccounts(ctx),
  customers: (ctx) => importParties({ ...ctx, kind: 'customer' }),
  suppliers: (ctx) => importParties({ ...ctx, kind: 'supplier' }),
  products: (ctx) => importProducts(ctx),
  invoices: (ctx) => importInvoices({ ...ctx, kind: 'ar' }),
  purchase_invoices: (ctx) => importInvoices({ ...ctx, kind: 'ap' }),
  journal_entries: (ctx) => importJournalEntries(ctx),
  stock_movements: (ctx) => importStockMovements(ctx),
}

export async function runImport({ connection, tenantId, entities, limit, db }) {
  const list = (Array.isArray(entities) ? entities : []).filter((key) => ENTITY_KEYS.has(key))
  if (!list.length) throw new Error('Select at least one entity to import.')
  const requested = Number(limit)
  const maxRows = Number.isFinite(requested) && requested > 0 ? Math.min(Math.floor(requested), 200000) : 200000

  return withPool(connection, async (pool) => {
    const nameByAccount = await loadAccountNameMap(pool)
    const report = []
    for (const key of list) {
      const started = Date.now()
      try {
        db.exec('BEGIN')
        const result = await IMPORTERS[key]({ pool, db, tenantId, limit: maxRows, nameByAccount })
        db.exec('COMMIT')
        report.push({ entity: key, ...result, ms: Date.now() - started })
      } catch (e) {
        try { db.exec('ROLLBACK') } catch { /* ignore */ }
        report.push({ entity: key, imported: 0, skipped: 0, errors: [e.message], ms: Date.now() - started })
      }
    }
    return { ok: report.every((r) => r.errors.length === 0), report }
  })
}
