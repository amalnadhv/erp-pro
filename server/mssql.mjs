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
]

const ENTITY_KEYS = new Set(ENTITIES.map((e) => e.key))

export function normalizeConnection(input = {}) {
  const server = String(input.server || '').trim()
  if (!server) throw new Error('SQL Server host is required')
  const database = String(input.database || '').trim()
  if (!database) throw new Error('Database name is required')
  const user = String(input.user || '').trim()
  const password = String(input.password || '')
  if (!user) throw new Error('SQL login is required')

  return {
    server,
    port: Number(input.port) || 1433,
    database,
    user,
    password,
    options: {
      encrypt: Boolean(input.encrypt),
      trustServerCertificate: input.trustServerCertificate !== false,
      enableArithAbort: true,
      ...(String(input.instanceName || '').trim() ? { instanceName: String(input.instanceName).trim() } : {}),
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

const IMPORTERS = {
  accounts: (ctx) => importAccounts(ctx),
  customers: (ctx) => importParties({ ...ctx, kind: 'customer' }),
  suppliers: (ctx) => importParties({ ...ctx, kind: 'supplier' }),
  products: (ctx) => importProducts(ctx),
  invoices: (ctx) => importInvoices({ ...ctx, kind: 'ar' }),
  purchase_invoices: (ctx) => importInvoices({ ...ctx, kind: 'ap' }),
}

export async function runImport({ connection, tenantId, entities, limit, db }) {
  const list = (Array.isArray(entities) ? entities : []).filter((key) => ENTITY_KEYS.has(key))
  if (!list.length) throw new Error('Select at least one entity to import.')
  const maxRows = Math.min(Math.max(Number(limit) || 2000, 0), 200000)

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
