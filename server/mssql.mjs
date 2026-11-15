// Microsoft SQL Server (legacy Comrade ERP) -> local ERP migration.
//
// The UI sends a per-request connection (never stored). We read the legacy
// tables, map the rows onto the ERP's SQLite tables and insert them for the
// signed-in tenant. Every entity is idempotent: rows whose natural key already
// exists for the tenant are skipped, so a failed run can simply be re-run.
//
// Legacy tables (all in the company database):
//   asmast      account master (chart of accounts + customer/supplier ledgers)
//   ASADR       address book, keyed by account
//   asicm       item master
//   asinv       A/R invoice headers
//   aspinv      A/P invoice headers
//   astran      general-ledger postings (double entry)
//   ASVOUCHMAST GL voucher headers (narration)
//   asict       stock movements
//
// Design notes:
// * Dates are converted to strings in SQL (CONVERT ... 23/120) so a TimeZone
//   offset can never move an imported date by a day.
// * Customers/suppliers are discovered from the invoices that reference them
//   (asinv.cust_acc / aspinv.account) plus the legacy party-type hints, so an
//   account code never has to be guessed from a single-character column.
// * After GL postings are imported the account balances are recalculated from
//   the journal lines, which is what Trial Balance / P&L / Balance Sheet read.

import { randomUUID } from 'node:crypto'
import { columnsOf, quoteIdent } from './db.mjs'

let mssqlPromise = null
function loadMssql() {
  if (!mssqlPromise) mssqlPromise = import('mssql').then((mod) => mod.default || mod)
  return mssqlPromise
}

export const ENTITIES = [
  { key: 'accounts', label: 'Chart of Accounts', source: 'asmast', note: 'Legacy GL accounts with opening balances' },
  { key: 'customers', label: 'Customers', source: 'asmast + ASADR', note: 'Accounts used by A/R invoices plus address book' },
  { key: 'suppliers', label: 'Suppliers', source: 'asmast + ASADR', note: 'Accounts used by A/P invoices plus address book' },
  { key: 'products', label: 'Stock Items', source: 'asicm', note: 'Item master with cost, price, VAT and stock' },
  { key: 'invoices', label: 'A/R Invoices', source: 'asinv', note: 'Sales invoices (headers) with paid/balance' },
  { key: 'purchase_invoices', label: 'A/P Invoices', source: 'aspinv', note: 'Purchase invoices (headers) with paid/balance' },
  { key: 'journal_entries', label: 'Journal Entries (GL)', source: 'astran', note: 'Posted double-entry vouchers; limit counts vouchers' },
  { key: 'stock_movements', label: 'Stock Movements', source: 'asict', note: 'Item in/out movements from sales, purchases and returns' },
]

const ENTITY_KEYS = new Set(ENTITIES.map((e) => e.key))

// ---------------------------------------------------------------------------
// Connection handling
// ---------------------------------------------------------------------------

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
    connectionTimeout: 20000,
    requestTimeout: 15 * 60 * 1000,
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

// ---------------------------------------------------------------------------
// Small value helpers
// ---------------------------------------------------------------------------

const str = (v) => (v == null ? '' : String(v).trim())
const num = (v) => {
  if (v == null || v === '') return 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
const round2 = (v) => Math.round(num(v) * 100) / 100

// SQL Server returns the column's declared casing (e.g. ASVOUCHMAST.JVTYPE); look up keys case-insensitively.
const ci = (row, name) => {
  if (row == null) return undefined
  if (row[name] !== undefined) return row[name]
  const key = Object.keys(row).find((k) => k.toLowerCase() === String(name).toLowerCase())
  return key === undefined ? undefined : row[key]
}

const firstValue = (row, keys) => {
  for (const k of keys) {
    const v = ci(row, k)
    if (v !== undefined && v !== null && String(v).trim() !== '') return v
  }
  return null
}
const firstText = (row, keys) => str(firstValue(row, keys))

const TRUE_FLAGS = new Set(['1', 'Y', 'YES', 'T', 'TRUE', 'ACTIVE', 'OK', 'A', 'ON'])
function isTrueFlag(v) {
  if (v == null || v === '') return false
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v !== 0
  return TRUE_FLAGS.has(String(v).trim().toUpperCase())
}

function dateParts(value) {
  const y = value.getUTCHours() === 0 && value.getUTCMinutes() === 0 && value.getUTCSeconds() === 0
    ? [value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate()]
    : [value.getFullYear(), value.getMonth() + 1, value.getDate()]
  return y
}
const isoDate = (v) => {
  if (v == null || v === '') return null
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return null
    const [y, m, d] = dateParts(v)
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }
  const s = String(v).trim()
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  if (match) return `${match[1]}-${match[2]}-${match[3]}`
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return null
  const [y, m, day] = dateParts(d)
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function accountType(acctype) {
  const raw = str(acctype).toUpperCase()
  if (!raw) return 'Asset'
  if (raw.includes('LIAB') || raw.includes('PAYABLE') || raw.includes('CREDITOR')) return 'Liability'
  if (raw.includes('EQUIT') || raw.includes('CAPITAL')) return 'Equity'
  if (raw.includes('INCOME') || raw.includes('REVENUE') || raw.includes('SALES')) return 'Income'
  if (raw.includes('EXPENSE') || raw.includes('COST')) return 'Expense'
  if (raw.includes('ASSET') || raw.includes('DEBTOR')) return 'Asset'
  switch (raw.charAt(0)) {
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

function tenantCurrency(db, tenantId) {
  try {
    const row = db.prepare('SELECT base_currency FROM company_profile WHERE tenant_id = ? LIMIT 1').get(tenantId)
    return str(row?.base_currency) || 'AED'
  } catch {
    return 'AED'
  }
}

// ---------------------------------------------------------------------------
// Source schema / reads (dates are returned as strings)
// ---------------------------------------------------------------------------

const DATE_TYPES = new Set(['date'])
const DATETIME_TYPES = new Set(['datetime', 'datetime2', 'smalldatetime', 'datetimeoffset'])

async function tableStats(pool) {
  const r = await pool.request().query(`
    SELECT t.name AS name, SUM(p.rows) AS row_count
    FROM sys.tables t
    JOIN sys.partitions p ON p.object_id = t.object_id AND p.index_id IN (0, 1)
    GROUP BY t.name`)
  const out = {}
  for (const row of r.recordset) {
    const count = Number(row.row_count) || 0
    out[row.name] = count
    out[String(row.name).toLowerCase()] = count
  }
  return out
}

async function sourceColumns(pool, table) {
  const r = await pool
    .request()
    .input('t', table)
    .query(`
      SELECT c.name AS name, ty.name AS data_type
      FROM sys.columns c
      JOIN sys.types ty ON c.user_type_id = ty.user_type_id
      WHERE c.object_id = OBJECT_ID(@t)
      ORDER BY c.column_id`)
  const map = new Map()
  for (const row of r.recordset) {
    map.set(String(row.name).toLowerCase(), { name: row.name, dataType: String(row.data_type || '').toLowerCase() })
  }
  return map
}

function columnExpression(column, prefix = '') {
  const ref = `${prefix}[${column.name}]`
  if (DATE_TYPES.has(column.dataType)) return `CONVERT(varchar(10), ${ref}, 23) AS [${column.name}]`
  if (DATETIME_TYPES.has(column.dataType)) return `CONVERT(varchar(19), ${ref}, 120) AS [${column.name}]`
  return `${ref}`
}

function pickColumns(available, wanted) {
  const picked = []
  const seen = new Set()
  for (const name of wanted) {
    const column = available.get(String(name).toLowerCase())
    if (!column || seen.has(column.name)) continue
    seen.add(column.name)
    picked.push(column)
  }
  return picked
}

async function selectRows(pool, table, wanted, limit = 0, orderBy = '') {
  const available = await sourceColumns(pool, table)
  if (!available.size) throw new Error(`Source table "${table}" was not found in this database.`)
  const columns = pickColumns(available, wanted)
  if (!columns.length) {
    const names = [...available.values()].map((c) => c.name)
    throw new Error(`Source table "${table}" has none of the expected columns. Found: ${names.slice(0, 25).join(', ')}`)
  }
  const top = limit > 0 ? `TOP (${Math.max(1, Math.floor(limit))}) ` : ''
  const sqlText = `SELECT ${top}${columns.map((c) => columnExpression(c)).join(', ')} FROM [${table}]${orderBy ? ` ORDER BY ${orderBy}` : ''}`
  const result = await pool.request().query(sqlText)
  return result.recordset
}

async function distinctValues(pool, table, columnName) {
  const available = await sourceColumns(pool, table)
  const column = available.get(String(columnName).toLowerCase())
  if (!column) return new Set()
  const r = await pool
    .request()
    .query(`SELECT DISTINCT [${column.name}] AS v FROM [${table}] WHERE [${column.name}] IS NOT NULL`)
  return new Set(r.recordset.map((row) => str(row.v)).filter(Boolean))
}

// ---------------------------------------------------------------------------
// Target inserters
// ---------------------------------------------------------------------------

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
      return record.id
    },
  }
}

// ---------------------------------------------------------------------------
// Legacy context loaded once per import run
// ---------------------------------------------------------------------------

const ACCOUNT_WANTED = [
  'account', 'accdesc', 'acctype', 'currency', 'openbal', 'startbal', 'debit', 'credit',
  'climit', 'duedays', 'terms', 'hide', 'cust_block', 'phone', 'grp', 'ctype',
  'sub_group', 'sub_group1', 'sub_group2', 'sale_man', 'country', 'area_code',
]

const HINT_CUSTOMER = ['CUSTOMER', 'CUST', 'DEBTOR', 'RECEIVABLE', '1205', '1210']
const HINT_SUPPLIER = ['SUPPLIER', 'SUPP', 'CREDITOR', 'PAYABLE', '2205', '2210']

function hintKind(row) {
  const kinds = new Set()
  const values = [row.ctype, row.sub_group, row.sub_group1, row.sub_group2, row.grp]
    .map((v) => str(v).toUpperCase())
    .filter(Boolean)
  for (const value of values) {
    const isExactCode = /^\d+$/.test(value)
    for (const hint of HINT_CUSTOMER) {
      if (isExactCode ? value === hint : value.includes(hint)) kinds.add('customer')
    }
    for (const hint of HINT_SUPPLIER) {
      if (isExactCode ? value === hint : value.includes(hint)) kinds.add('supplier')
    }
  }
  return kinds
}

async function loadContext(pool, db, tenantId, limit) {
  const currency = tenantCurrency(db, tenantId)
  let accountRows = []
  let accountError = ''
  try {
    accountRows = await selectRows(pool, 'asmast', ACCOUNT_WANTED, 0, 'account')
  } catch (e) {
    accountError = e?.message || String(e)
    accountRows = []
  }

  const accountByCode = new Map()
  const nameByAccount = new Map()
  for (const row of accountRows) {
    const code = str(row.account)
    if (!code) continue
    accountByCode.set(code, row)
    nameByAccount.set(code, str(row.accdesc) || code)
  }

  let contactMap = new Map()
  try {
    const contacts = await selectRows(pool, 'ASADR', [
      'account', 'address1', 'address2', 'address3', 'address4', 'phone', 'email', 'country',
    ], 0, 'account')
    for (const row of contacts) {
      const code = str(row.account)
      if (code && !contactMap.has(code)) contactMap.set(code, row)
    }
  } catch {
    contactMap = new Map()
  }

  const customerCodes = await safeDistinct(pool, 'asinv', 'cust_acc')
  const supplierCodes = await safeDistinct(pool, 'aspinv', 'account')

  return {
    pool, db, tenantId, limit, currency,
    accountRows, accountByCode, nameByAccount, contactMap, customerCodes, supplierCodes, accountError,
  }
}

async function safeDistinct(pool, table, column) {
  try {
    return await distinctValues(pool, table, column)
  } catch {
    return new Set()
  }
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

async function importAccounts(ctx) {
  const { db, tenantId, accountRows, limit, currency, accountError } = ctx
  if (!accountRows.length) {
    if (accountError) throw new Error(`Could not read the legacy account table (asmast): ${accountError}`)
    const available = await sourceColumns(ctx.pool, 'asmast')
    throw new Error(available.size
      ? 'The legacy account table (asmast) has no rows.'
      : 'The legacy account table (asmast) was not found in this database.')
  }
  const rows = limit > 0 ? accountRows.slice(0, limit) : accountRows
  const inserter = createInserter(db, 'accounts', tenantId, 'code')
  let imported = 0
  let skipped = 0
  const errors = []

  for (const row of rows) {
    const code = str(row.account)
    if (!code) { skipped += 1; continue }
    if (inserter.hasKey(code)) { skipped += 1; continue }
    try {
      const type = accountType(row.acctype)
      const opening = round2(row.openbal)
      const movement = round2(num(row.debit) - num(row.credit))
      inserter.insert({
        code,
        name: str(row.accdesc) || code,
        type,
        opening_balance: opening,
        // Recalculated from imported journal lines when GL is imported; before
        // that this uses the ledger totals maintained by the legacy system.
        current_balance: round2(opening + movement),
        currency: str(row.currency) || currency,
        is_group: 0,
        status: isTrueFlag(row.hide) ? 'Inactive' : 'Active',
        notes: `Imported from legacy account (type ${str(row.acctype) || '?'})`,
      })
      imported += 1
    } catch (e) {
      if (errors.length < 10) errors.push(`${code}: ${e.message}`)
    }
  }
  return { source: 'asmast', imported, skipped, errors }
}

// ---------------------------------------------------------------------------
// Customers / suppliers
// ---------------------------------------------------------------------------

async function importParties(ctx, kind) {
  const { db, tenantId, accountRows, contactMap, customerCodes, supplierCodes, limit, currency } = ctx
  const isCustomer = kind === 'customer'
  if (!accountRows.length) throw new Error('The legacy account table (asmast) was not found in this database.')

  const allowed = isCustomer ? customerCodes : supplierCodes
  const table = isCustomer ? 'customers' : 'suppliers'
  const inserter = createInserter(db, table, tenantId, 'code')
  let imported = 0
  let skipped = 0
  let seen = 0
  const errors = []

  for (const row of accountRows) {
    const code = str(row.account)
    if (!code) continue
    const hints = hintKind(row)
    const isParty = allowed.has(code) || hints.has(kind)
    if (!isParty) continue
    if (limit > 0 && seen >= limit) break
    seen += 1
    if (inserter.hasKey(code)) { skipped += 1; continue }

    const contact = contactMap.get(code) || {}
    const name = str(row.accdesc) || code
    const address = [contact.address1, contact.address2, contact.address3, contact.address4]
      .map(str).filter(Boolean).join(', ')
    const email = str(contact.email)
    const phone = str(contact.phone) || str(row.phone)
    const country = str(contact.country) || str(row.country)
    // asmast.openbal follows the debit-positive convention used by the GL.
    // Customer dues are positive receivables; supplier dues are positive payables.
    const opening = isCustomer ? round2(row.openbal) : round2(-num(row.openbal))

    try {
      if (isCustomer) {
        inserter.insert({
          code,
          name,
          first_name: name,
          last_name: '',
          email: email || `${code.toLowerCase().replace(/[^a-z0-9]+/g, '.')}@legacy.local`,
          phone,
          address,
          country,
          currency: str(row.currency) || currency,
          credit_limit: round2(row.climit),
          credit_days: Math.trunc(num(row.duedays)),
          payment_terms: str(row.terms),
          account_code: code,
          opening_balance: opening,
          status: isTrueFlag(row.cust_block) ? 'Blocked' : 'Active',
          sales_person: str(row.sale_man),
          category: str(row.grp),
          notes: 'Imported from legacy ledger account',
        })
      } else {
        inserter.insert({
          code,
          name,
          email,
          phone,
          address,
          country,
          currency: str(row.currency) || currency,
          credit_limit: round2(row.climit),
          credit_days: Math.trunc(num(row.duedays)),
          payment_terms: str(row.terms),
          account_code: code,
          opening_balance: opening,
          status: 'Active',
          sales_person: str(row.sale_man),
          category: str(row.grp),
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

// ---------------------------------------------------------------------------
// Stock items
// ---------------------------------------------------------------------------

function productStatus(row) {
  if (row.blkitem != null && str(row.blkitem) !== '' && isTrueFlag(row.blkitem)) return 'Inactive'
  if (row.active == null || str(row.active) === '') return 'Active'
  return isTrueFlag(row.active) ? 'Active' : 'Inactive'
}

async function importProducts(ctx) {
  const { pool, db, tenantId, limit } = ctx
  const rows = await selectRows(pool, 'asicm', [
    'code', 'unit', 'group', 'group1', 'sgroup', 'categ', 'scateg', 'desc', 'desc1', 'desc2', 'desc_1',
    'qty_open', 'phy_stock', 'phy_qty', 'cost_avg', 'avg_cost', 'cost_unit', 'cost_fifo', 'LPCOST',
    'price_unit', 'LSPRICE', 'price2', 'VAT', 'HSCODE', 'active', 'blkitem', 'min_qty', 'max_qty',
    'qty_rorder', 'location', 'barcode', 'pcode',
  ], limit, 'code')
  const inserter = createInserter(db, 'products', tenantId, 'code')
  const productIds = new Map()
  for (const row of db.prepare('SELECT id, code FROM products WHERE tenant_id = ?').all(tenantId)) {
    if (row.code) productIds.set(String(row.code), row.id)
  }

  const inventoryIds = new Map()
  for (const row of db.prepare('SELECT id, product_id FROM inventory WHERE tenant_id = ?').all(tenantId)) {
    if (row.product_id) inventoryIds.set(String(row.product_id), row.id)
  }
  const insertInventory = db.prepare(
    'INSERT INTO inventory (id, product_id, quantity, reorder_level, tenant_id) VALUES (?,?,?,?,?)'
  )
  const updateInventory = db.prepare(
    'UPDATE inventory SET quantity = ?, reorder_level = ?, last_updated = CURRENT_TIMESTAMP WHERE id = ?'
  )
  const ensureInventory = (productId, stock, reorder) => {
    const existingInv = inventoryIds.get(String(productId))
    if (existingInv) {
      updateInventory.run(stock, reorder, existingInv)
    } else {
      const invId = randomUUID()
      insertInventory.run(invId, productId, stock, reorder, tenantId)
      inventoryIds.set(String(productId), invId)
    }
  }

  let imported = 0
  let skipped = 0
  const errors = []

  for (const row of rows) {
    const code = str(row.code)
    if (!code) { skipped += 1; continue }
    try {
      const name = firstText(row, ['desc', 'desc1', 'desc_1', 'desc2']) || code
      const cost = round2(firstValue(row, ['cost_avg', 'avg_cost', 'cost_unit', 'cost_fifo', 'LPCOST']))
      const price = round2(firstValue(row, ['price_unit', 'LSPRICE', 'price2'])) || cost
      const stock = round2(firstValue(row, ['phy_stock', 'phy_qty', 'qty_open']))
      const reorder = Math.trunc(num(firstValue(row, ['qty_rorder'])))

      const existingProduct = productIds.get(code)
      if (existingProduct) {
        // A previous run may have stopped after inserting the product but before
        // writing its inventory row; make sure it exists now.
        ensureInventory(existingProduct, stock, reorder)
        skipped += 1
        continue
      }

      const productId = inserter.insert({
        code,
        name,
        description: firstText(row, ['desc1', 'desc_1', 'desc2']) || name,
        category: firstText(row, ['group', 'categ', 'sgroup', 'scateg', 'group1']),
        unit: str(ci(row, 'unit')) || 'Pcs',
        price,
        cost_price: cost,
        stock_quantity: stock,
        reorder_level: reorder,
        min_stock: Math.trunc(num(firstValue(row, ['min_qty']))),
        max_stock: Math.trunc(num(firstValue(row, ['max_qty']))),
        vat_rate: round2(firstValue(row, ['VAT'])),
        hsn_code: str(firstValue(row, ['HSCODE'])),
        barcode: str(firstValue(row, ['barcode'])),
        sku: str(firstValue(row, ['pcode'])),
        location: str(firstValue(row, ['location'])),
        status: productStatus(row),
        notes: 'Imported from legacy item master',
      })
      productIds.set(code, productId)
      ensureInventory(productId, stock, reorder)
      imported += 1
    } catch (e) {
      if (errors.length < 10) errors.push(`${code}: ${e.message}`)
    }
  }
  return { source: 'asicm', imported, skipped, errors }
}

const sqlLiteral = (value) => `N'${String(value ?? '').replace(/'/g, "''")}'`

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

async function loadInvoiceLines(pool, invoiceNumbers) {
  const grouped = new Map()
  if (!invoiceNumbers.length) return grouped
  let columns
  try {
    columns = await sourceColumns(pool, 'asict')
  } catch {
    return grouped
  }
  if (!columns.has('inv_no')) return grouped
  const wanted = pickColumns(columns, [
    'inv_no', 'line_no', 'code', 'idesc', 'tr_desc', 'tr_qty', 'unit_price', 'unit',
    'discount', 'line_total', 'vatper', 'vatamt',
  ])
  const orderBy = columns.has('line_no') ? 'inv_no, line_no' : 'inv_no'
  for (let i = 0; i < invoiceNumbers.length; i += 400) {
    const chunk = invoiceNumbers.slice(i, i + 400)
    const list = chunk.map((n) => sqlLiteral(n)).join(',')
    const q = `SELECT ${wanted.map((c) => columnExpression(c)).join(', ')} FROM asict WHERE inv_no IN (${list}) ORDER BY ${orderBy}`
    try {
      const result = await pool.request().query(q)
      for (const line of result.recordset) {
        const key = str(line.inv_no)
        if (!grouped.has(key)) grouped.set(key, [])
        grouped.get(key).push(line)
      }
    } catch {
      break
    }
  }
  return grouped
}

function invoiceItems(lines, productIdByCode) {
  return (lines || []).map((line) => {
    const code = str(line.code)
    const name = str(line.idesc) || str(line.tr_desc) || code
    const qty = round2(Math.abs(num(line.tr_qty))) || 1
    const unitPrice = round2(firstValue(line, ['unit_price']))
    const lineTotal = round2(firstValue(line, ['line_total']))
    return {
      product_id: productIdByCode.get(code) || null,
      code,
      name,
      description: name,
      qty,
      price: unitPrice || (qty ? round2(lineTotal / qty) : 0),
      discount: 0,
      unit: str(firstValue(line, ['unit'])),
      vat_rate: round2(firstValue(line, ['vatper'])),
    }
  })
}

async function importInvoices(ctx, kind) {
  const { pool, db, tenantId, limit, currency, nameByAccount } = ctx
  const isAr = kind === 'ar'
  const table = isAr ? 'asinv' : 'aspinv'
  const target = isAr ? 'invoices' : 'purchase_invoices'
  const key = isAr ? 'invoice_no' : 'pin_no'
  const wanted = isAr
    ? ['inv_no', 'cust_acc', 'inv_total', 'vatamt', 'paid_amt', 'total_paid_amt', 'balance_amt',
      'disc_amt', 'inv_date', 'due_date', 'comments', 'status', 'tran_type']
    : ['inv_no', 'account', 'accdesc', 'amount', 'vatamt', 'paid_amount', 'total_paid_amt',
      'Balance_amt', 'date', 'duedate', 'remarks', 'status', 'tran_type']
  const order = isAr ? 'inv_date DESC, inv_no DESC' : 'date DESC, inv_no DESC'
  const rows = await selectRows(pool, table, wanted, limit, order)
  const inserter = createInserter(db, target, tenantId, key)

  const partyIdByCode = new Map()
  if (isAr) {
    for (const row of db.prepare('SELECT id, code FROM customers WHERE tenant_id = ?').all(tenantId)) {
      if (row.code) partyIdByCode.set(String(row.code), row.id)
    }
  } else {
    for (const row of db.prepare('SELECT id, code FROM suppliers WHERE tenant_id = ?').all(tenantId)) {
      if (row.code) partyIdByCode.set(String(row.code), row.id)
    }
  }

  const productIdByCode = new Map()
  for (const row of db.prepare('SELECT id, code FROM products WHERE tenant_id = ?').all(tenantId)) {
    if (row.code) productIdByCode.set(String(row.code), row.id)
  }

  const pending = []
  const seen = new Set()
  for (const row of rows) {
    const docNo = str(row.inv_no)
    if (!docNo) continue
    if (seen.has(docNo) || inserter.hasKey(docNo)) continue
    seen.add(docNo)
    pending.push(row)
  }
  const linesByNumber = await loadInvoiceLines(pool, pending.map((row) => str(row.inv_no)))

  let imported = 0
  let skipped = rows.length - pending.length
  const errors = []

  for (const row of pending) {
    const docNo = str(row.inv_no)
    try {
      const vat = round2(row.vatamt)
      const paid = round2(firstValue(row, isAr ? ['paid_amt', 'total_paid_amt'] : ['paid_amount', 'total_paid_amt']))
      const legacyBalance = firstValue(row, isAr ? ['balance_amt'] : ['Balance_amt'])
      let total
      if (isAr) {
        total = round2(row.inv_total)
      } else {
        // A/P "amount" is usually the net value and VAT is separate, but some
        // databases store it gross. Use the legacy balance + paid (independent
        // fields) to decide which interpretation fits.
        const amount = round2(row.amount)
        const netPlusVat = round2(amount + vat)
        const grossAmount = amount
        if (legacyBalance !== null && (paid > 0 || num(legacyBalance) > 0)) {
          const implied = round2(num(legacyBalance) + paid)
          total = Math.abs(implied - netPlusVat) <= Math.abs(implied - grossAmount) ? netPlusVat : grossAmount
        } else {
          total = netPlusVat
        }
      }
      const subtotal = round2(Math.max(total - vat, 0)) || total
      const balance = legacyBalance !== null ? round2(legacyBalance) : round2(Math.max(total - paid, 0))
      const partyCode = str(isAr ? row.cust_acc : row.account)
      const partyName = isAr
        ? (nameByAccount.get(partyCode) || partyCode || 'Unknown customer')
        : (str(row.accdesc) || nameByAccount.get(partyCode) || partyCode || 'Unknown supplier')
      const docDate = isoDate(isAr ? row.inv_date : row.date)
      const dueDate = isoDate(isAr ? row.due_date : row.duedate)
      // Sales reports/dashboard in the app read lowercase paid/pending.
      const status = balance <= 0.005 ? 'paid' : 'pending'
      const vatPercent = subtotal > 0 ? Math.round((vat / subtotal) * 10000) / 100 : 0

      if (isAr) {
        inserter.insert({
          invoice_no: docNo,
          customer_id: partyIdByCode.get(partyCode) || null,
          customer_name: partyName,
          customer_vat: '',
          items: JSON.stringify(invoiceItems(linesByNumber.get(docNo), productIdByCode)),
          subtotal,
          vat_percent: vatPercent,
          vat_amount: vat,
          grand_total: total,
          amount_paid: paid,
          balance,
          status,
          invoice_date: docDate,
          due_date: dueDate,
          created_at: docDate ? `${docDate}T00:00:00.000Z` : undefined,
          notes: str(row.comments) || 'Imported from legacy A/R invoice',
        })
      } else {
        inserter.insert({
          pin_no: docNo,
          party_id: partyIdByCode.get(partyCode) || null,
          party_name: partyName,
          doc_date: docDate,
          due_date: dueDate,
          currency,
          items: JSON.stringify(invoiceItems(linesByNumber.get(docNo), productIdByCode)),
          subtotal,
          vat_percent: vatPercent,
          vat_amount: vat,
          grand_total: total,
          status: 'Approved',
          created_at: docDate ? `${docDate}T00:00:00.000Z` : undefined,
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

// ---------------------------------------------------------------------------
// General ledger
// ---------------------------------------------------------------------------

function isDebitType(value) {
  const type = str(value).toUpperCase()
  if (!type) return true
  return ['D', 'DR', 'DEB', 'DEBIT'].includes(type)
}

function recalcAccountBalances(db, tenantId) {
  db.prepare(
    `UPDATE accounts
       SET current_balance = ROUND(opening_balance + COALESCE((
         SELECT SUM(jl.debit - jl.credit)
         FROM journal_lines jl
         WHERE jl.account_id = accounts.id AND jl.tenant_id = accounts.tenant_id
       ), 0), 2)
     WHERE tenant_id = ?`
  ).run(tenantId)
}

async function importJournalEntries(ctx) {
  const { pool, db, tenantId, limit, accountByCode } = ctx
  const cols = await sourceColumns(pool, 'astran')
  if (!cols.size) throw new Error('The legacy GL table (astran) was not found in this database.')
  for (const required of ['account', 'jvtype', 'type_no', 'type', 'amount']) {
    if (!cols.has(required)) throw new Error(`Source table "astran" is missing the "${required}" column.`)
  }

  const maxVouchers = limit > 0 ? Math.min(limit, 200000) : 200000
  const keyResult = await pool.request().query(`
    SELECT TOP (${Math.max(1, Math.floor(maxVouchers))}) type_no, jvtype
    FROM (
      SELECT type_no, jvtype, MIN(jvdate) AS first_date
      FROM astran
      GROUP BY type_no, jvtype
    ) AS vouchers
    ORDER BY first_date ASC, jvtype ASC, type_no ASC`)

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

  const lineWanted = ['account', 'jvtype', 'type_no', 'type', 'amount', 'jvdate', 'ref', 'entry_ref', 'curno', 'account_desc', 'accountype']
  const lineColumns = pickColumns(cols, lineWanted)

  const masterCols = await sourceColumns(pool, 'ASVOUCHMAST')
  const hasMaster = masterCols.has('jvtype') && masterCols.has('type_no')
  const masterColumns = pickColumns(masterCols, ['type_no', 'jvtype', 'descript', 'comments'])

  const lines = []
  const narrationByKey = new Map()
  for (let i = 0; i < keys.length; i += 1000) {
    const chunk = keys.slice(i, i + 1000)
    const values = chunk.map((k) => `(${sqlLiteral(k.typeNo)},${sqlLiteral(k.jvtype)})`).join(',')
    const statements = [
      "IF OBJECT_ID('tempdb..#k') IS NOT NULL DROP TABLE #k;",
      'CREATE TABLE #k (type_no nvarchar(200) COLLATE DATABASE_DEFAULT, jvtype nvarchar(50) COLLATE DATABASE_DEFAULT, PRIMARY KEY (type_no, jvtype));',
      `INSERT INTO #k (type_no, jvtype) VALUES ${values};`,
      `SELECT ${lineColumns.map((c) => columnExpression(c, 'a.')).join(', ')} FROM astran a JOIN #k k ON CONVERT(nvarchar(200), a.type_no) = k.type_no AND CONVERT(nvarchar(50), a.jvtype) = k.jvtype;`,
    ]
    if (hasMaster && masterColumns.length) {
      statements.push(
        `SELECT ${masterColumns.map((c) => columnExpression(c, 'v.')).join(', ')} FROM #k k LEFT JOIN ASVOUCHMAST v ON CONVERT(nvarchar(200), v.TYPE_NO) = k.type_no AND CONVERT(nvarchar(50), v.JVTYPE) = k.jvtype;`
      )
    }
    const result = await pool.request().query(statements.join('\n'))
    lines.push(...(result.recordsets[0] || []))
    if (result.recordsets[1]) {
      for (const row of result.recordsets[1]) {
        const marker = `${str(ci(row, 'jvtype'))}\u0000${str(ci(row, 'type_no'))}`
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
    const legacy = accountByCode.get(code)
    const type = legacy ? accountType(legacy.acctype) : accountType(code)
    db.prepare(
      'INSERT INTO accounts (id, code, name, type, opening_balance, current_balance, currency, is_group, status, notes, tenant_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)'
    ).run(id, code, name || code, type, 0, 0, ctx.currency || 'AED', 0, 'Active', 'Auto-created from legacy journal line', tenantId)
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
    let currency = ''
    let description = ''
    for (const row of group.lines) {
      const code = str(row.account)
      if (!code) continue
      const amount = round2(row.amount)
      const isDebit = isDebitType(row.type)
      if (isDebit) totalDebit += amount
      else totalCredit += amount
      const date = isoDate(row.jvdate)
      if (date && (!entryDate || date < entryDate)) entryDate = date
      if (!reference) reference = str(row.ref) || group.typeNo
      if (!currency) currency = str(row.curno) || str(ctx.currency) || 'AED'
      if (!description) {
        const entryRef = str(row.entry_ref).replace(/^:/, '')
        description = entryRef || str(row.account_desc)
      }
      postings.push({
        code,
        name: str(row.account_desc),
        debit: isDebit ? amount : 0,
        credit: isDebit ? 0 : amount,
        text: str(row.entry_ref).replace(/^:/, ''),
      })
    }
    if (!postings.length) { skipped += 1; continue }
    const master = narrationByKey.get(`${group.jvtype}\u0000${group.typeNo}`) || {}
    const narration = [str(ci(master, 'descript')), str(ci(master, 'comments'))].filter(Boolean).join(' - ') || description || `Imported ${group.jvtype} ${group.typeNo}`
    const date = entryDate || new Date().toISOString().slice(0, 10)
    let entryId = null
    try {
      entryId = randomUUID()
      entrySql.run(
        entryId, entryNo, date, reference, narration, 'Posted',
        round2(totalDebit), round2(totalCredit),
        currency || 'AED', 'Migration', `${date}T00:00:00.000Z`, tenantId
      )
      postings.forEach((posting, index) => {
        lineSql.run(
          randomUUID(), entryId, index + 1,
          resolveAccount(posting.code, posting.name),
          round2(posting.debit), round2(posting.credit),
          posting.text || narration,
          `${date}T00:00:00.000Z`, tenantId
        )
      })
      existing.add(entryNo)
      imported += 1
    } catch (e) {
      // No transaction here; remove the half-written voucher so a re-run works.
      if (entryId) {
        try {
          db.prepare('DELETE FROM journal_lines WHERE entry_id = ? AND tenant_id = ?').run(entryId, tenantId)
          db.prepare('DELETE FROM journal_entries WHERE id = ? AND tenant_id = ?').run(entryId, tenantId)
        } catch { /* ignore */ }
      }
      if (errors.length < 10) errors.push(`${entryNo}: ${e.message}`)
    }
  }

  recalcAccountBalances(db, tenantId)

  const notes = []
  if (stubCount) notes.push(`${stubCount} missing accounts auto-created`)
  if (keys.length >= maxVouchers) notes.push(`imported the earliest ${maxVouchers} vouchers; increase the limit to reach older ones`)
  return {
    source: 'astran',
    imported,
    skipped,
    errors,
    note: notes.join('; '),
  }
}

// ---------------------------------------------------------------------------
// Stock movements
// ---------------------------------------------------------------------------

const IN_WORDS = /\b(IN|REC|RCV|RECEIPT|RECEIVE|PURCHASE|PUR|PI|GRN|STOCKIN|OPEN|RETURN|SR)\b/
const OUT_WORDS = /\b(OUT|ISSUE|ISS|SALE|SALES|SAL|SI|DELIVERY|DO|CONSUM|WASTAGE|STOCKOUT|TRANSFER|PR)\b/

function movementDirection(trType, type, trQty) {
  const quantity = num(trQty)
  const explicit = str(type).toUpperCase().replace(/[^A-Z0-9]/g, '')
  const code = str(trType).toUpperCase().replace(/[^A-Z0-9]/g, '')

  if (explicit.includes('STOCKIN') || explicit.includes('STOCKOUT')) {
    return explicit.includes('STOCKOUT') ? 'Out' : 'In'
  }
  if (IN_WORDS.test(explicit)) return 'In'
  if (OUT_WORDS.test(explicit)) return 'Out'
  if (IN_WORDS.test(code)) return 'In'
  if (OUT_WORDS.test(code)) return 'Out'
  if (explicit === 'D') return 'In'
  if (explicit === 'C') return 'Out'
  if (quantity < 0) return 'Out'
  return 'In'
}

async function importStockMovements(ctx) {
  const { pool, db, tenantId, limit } = ctx
  const cols = await sourceColumns(pool, 'asict')
  if (!cols.size) throw new Error('The legacy stock table (asict) was not found in this database.')
  for (const required of ['code', 'tr_type', 'tr_qty', 'tr_date']) {
    if (!cols.has(required)) throw new Error(`Source table "asict" is missing the "${required}" column.`)
  }
  const rows = await selectRows(pool, 'asict', [
    'tr_refno', 'tr_desc', 'tr_date', 'code', 'tr_type', 'tr_qty', 'unit_cost', 'unit', 'inv_no',
    'unit_price', 'idesc', 'type', 'locn', 'line_total', 'id',
  ], limit, 'id ASC')

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
    const movementType = movementDirection(row.tr_type, row.type, row.tr_qty)
    const quantity = round2(Math.abs(num(row.tr_qty)))
    const baseRef = str(row.tr_refno) || str(row.inv_no) || 'MOV'
    const movementNo = `${baseRef}-${str(row.id)}`
    const productId = productIds.get(code) || null
    const warehouse = str(row.locn) || 'MAIN'
    const marker = `${movementNo}|${productId || ''}|${date}|${movementType}|${quantity}`
    const legacyMarker = `${baseRef}|${productId || ''}|${date}|${movementType}|${quantity}|${warehouse}`
    if (existing.has(marker) || legacyExisting.has(legacyMarker)) { skipped += 1; continue }
    try {
      const reference = str(row.inv_no) || baseRef
      insertSql.run(
        randomUUID(), movementNo, productId, str(row.idesc) || code,
        movementType, quantity, warehouse,
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

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const IMPORTERS = {
  accounts: (ctx) => importAccounts(ctx),
  customers: (ctx) => importParties(ctx, 'customer'),
  suppliers: (ctx) => importParties(ctx, 'supplier'),
  products: (ctx) => importProducts(ctx),
  invoices: (ctx) => importInvoices(ctx, 'ar'),
  purchase_invoices: (ctx) => importInvoices(ctx, 'ap'),
  journal_entries: (ctx) => importJournalEntries(ctx),
  stock_movements: (ctx) => importStockMovements(ctx),
}

export async function testConnection(input) {
  return withPool(input, async (pool) => {
    const r = await pool.request().query(
      "SELECT SERVERPROPERTY('ServerName') AS server_name, DB_NAME() AS database_name, SERVERPROPERTY('ProductVersion') AS version"
    )
    const row = r.recordset[0] || {}
    let tables = {}
    try {
      tables = await tableStats(pool)
    } catch {
      tables = {}
    }
    return {
      ok: true,
      server: row.server_name || '',
      database: row.database_name || '',
      version: row.version || '',
      tables,
      entities: ENTITIES,
    }
  })
}

export async function runImport({ connection, tenantId, entities, limit, db }) {
  const list = (Array.isArray(entities) ? entities : []).filter((key) => ENTITY_KEYS.has(key))
  if (!list.length) throw new Error('Select at least one entity to import.')
  const requested = Number(limit)
  const maxRows = Number.isFinite(requested) && requested > 0 ? Math.min(Math.floor(requested), 200000) : 200000

  return withPool(connection, async (pool) => {
    const ctx = await loadContext(pool, db, tenantId, maxRows)
    const report = []
    for (const key of list) {
      const started = Date.now()
      try {
        // No long-lived transaction: importers await SQL Server reads and the
        // SQLite handle is shared with live requests. Each insert is guarded so
        // a partial run can simply be re-run.
        const result = await IMPORTERS[key](ctx)
        report.push({ entity: key, ...result, ms: Date.now() - started })
      } catch (e) {
        report.push({ entity: key, imported: 0, skipped: 0, errors: [e.message], ms: Date.now() - started })
      }
    }
    return { ok: report.every((r) => r.errors.length === 0), report }
  })
}
