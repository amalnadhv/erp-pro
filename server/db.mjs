// Local SQLite database for the ERP. Uses Node's built-in node:sqlite (Node 22+).
// Data lives in data/erp.db; uploaded files live in data/storage.

import { DatabaseSync } from 'node:sqlite'
import { randomUUID, scryptSync, timingSafeEqual } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
export const root = path.resolve(here, '..')
// Vercel only allows writes under /tmp, and serverless instances are ephemeral,
// so the demo seeds itself on each cold start there. Use a real disk/volume
// (Render disk, Railway volume, Fly volume, VM, WAMP) for persistent data.
const defaultDataDir = process.env.VERCEL ? '/tmp/erp-data' : path.join(root, 'data')
export const dataDir = process.env.ERP_DATA_DIR
  ? path.resolve(process.env.ERP_DATA_DIR)
  : defaultDataDir
export const storageDir = path.join(dataDir, 'storage')
export const dbPath = path.join(dataDir, 'erp.db')

export const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000001'
export const DEMO_USER_ID = '00000000-0000-0000-0000-000000000002'
export const DEMO_EMAIL = 'admin@local.test'
export const DEMO_PASSWORD = 'admin123'

let db = null
const columnCache = new Map()

export function getDb() {
  if (db) return db
  fs.mkdirSync(dataDir, { recursive: true })
  fs.mkdirSync(storageDir, { recursive: true })
  db = new DatabaseSync(dbPath)
  db.exec('PRAGMA journal_mode = WAL;')
  db.exec('PRAGMA foreign_keys = OFF;')
  ensureSchema(db)
  ensureAuthTables(db)
  seed(db)
  upgradePasswords(db)
  return db
}

export function columnsOf(database, table) {
  const key = table
  if (columnCache.has(key)) return columnCache.get(key)
  const rows = database.prepare(`PRAGMA table_info(${quoteIdent(table)})`).all()
  const map = new Map(rows.map((r) => [r.name, r]))
  columnCache.set(key, map)
  return map
}

export function tableExists(database, table) {
  return Boolean(database.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(table))
}

export function quoteIdent(name) {
  return '"' + String(name).replace(/"/g, '""') + '"'
}

function insertRow(database, table, row) {
  const cols = columnsOf(database, table)
  const data = cols.has('tenant_id') && row.tenant_id === undefined
    ? { ...row, tenant_id: DEMO_TENANT_ID }
    : row
  const keys = Object.keys(data).filter((k) => cols.has(k) && data[k] !== undefined)
  if (!keys.length) return
  const sql = `INSERT INTO ${quoteIdent(table)} (${keys.map(quoteIdent).join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`
  database.prepare(sql).run(...keys.map((k) => encodeValue(data[k])))
}

function encodeValue(value) {
  if (value === undefined) return null
  if (value === null) return null
  if (typeof value === 'boolean') return value ? 1 : 0
  if (typeof value === 'object') return JSON.stringify(value)
  return value
}

export function hashPassword(password) {
  const salt = randomUUID().replace(/-/g, '')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `scrypt$${salt}$${hash}`
}

export function verifyPassword(password, stored) {
  if (!stored || !stored.startsWith('scrypt$')) return false
  const [, salt, expected] = stored.split('$')
  if (!salt || !expected) return false
  const actual = scryptSync(password, salt, 64)
  const expectedBuf = Buffer.from(expected, 'hex')
  return actual.length === expectedBuf.length && timingSafeEqual(actual, expectedBuf)
}

// ---------------------------------------------------------------------------
// Schema bootstrap / migration
//
// Version 2 adds tenant_id to every business table and replaces global UNIQUE
// constraints with (tenant_id, key) indexes. Old databases are rebuilt in
// place: rows are copied into the new tables and missing tenant_ids are
// attributed to the demo tenant.
// ---------------------------------------------------------------------------
export const SCHEMA_VERSION = 2

function upgradePasswords(database) {
  const rows = database
    .prepare("SELECT id, password_hash FROM erp_users WHERE password_hash IS NOT NULL AND password_hash <> '' AND password_hash NOT LIKE 'scrypt$%'")
    .all()
  for (const row of rows) {
    database.prepare('UPDATE erp_users SET password_hash = ? WHERE id = ?').run(hashPassword(row.password_hash), row.id)
  }
  if (rows.length) console.log(`[db] hashed ${rows.length} legacy plain-text password(s)`)
}

function userTables(database) {
  return database
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all()
    .map((r) => r.name)
}

function migrateToV2(database, schemaSql, existingTables) {
  const prefix = '__legacy_'
  database.exec('PRAGMA legacy_alter_table = ON;')
  for (const table of existingTables) {
    database.exec(`ALTER TABLE ${quoteIdent(table)} RENAME TO ${quoteIdent(prefix + table)}`)
  }

  // Free the custom index names tied to the renamed tables so the new schema
  // can recreate them. Auto-indexes disappear with the legacy tables.
  const indexes = database
    .prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name NOT LIKE 'sqlite_%'")
    .all()
  for (const { name } of indexes) database.exec(`DROP INDEX IF EXISTS ${quoteIdent(name)}`)

  const indexStatements = schemaSql.match(/CREATE UNIQUE INDEX[\s\S]*?;/gi) || []
  database.exec(schemaSql.replace(/CREATE UNIQUE INDEX[\s\S]*?;/gi, ''))
  database.exec('PRAGMA legacy_alter_table = OFF;')

  for (const table of existingTables) {
    const legacy = prefix + table
    if (!tableExists(database, table) || !tableExists(database, legacy)) continue
    const newColumns = new Set(
      database.prepare(`PRAGMA table_info(${quoteIdent(table)})`).all().map((r) => r.name)
    )
    const oldColumns = database
      .prepare(`PRAGMA table_info(${quoteIdent(legacy)})`)
      .all()
      .map((r) => r.name)

    const targets = []
    const sources = []
    for (const column of oldColumns) {
      if (!newColumns.has(column)) continue
      // Single-tenant v1 rows often have a NULL tenant_id; attribute them to
      // the demo tenant instead of hiding them after the upgrade.
      if (column === 'tenant_id') {
        targets.push(quoteIdent(column))
        sources.push(`COALESCE(${quoteIdent(column)}, '${DEMO_TENANT_ID}')`)
        continue
      }
      targets.push(quoteIdent(column))
      sources.push(quoteIdent(column))
    }
    if (newColumns.has('tenant_id') && !oldColumns.includes('tenant_id')) {
      targets.push(quoteIdent('tenant_id'))
      sources.push(`'${DEMO_TENANT_ID}'`)
    }
    if (!targets.length) continue
    database.exec(
      `INSERT INTO ${quoteIdent(table)} (${targets.join(', ')}) SELECT ${sources.join(', ')} FROM ${quoteIdent(legacy)}`
    )
  }

  for (const statement of indexStatements) {
    try {
      database.exec(statement)
    } catch (e) {
      console.warn(`[db] could not create index (duplicate legacy values): ${e.message}`)
    }
  }

  for (const table of existingTables) {
    database.exec(`DROP TABLE IF EXISTS ${quoteIdent(prefix + table)}`)
  }
  columnCache.clear()
}

function ensureSchema(database) {
  const schemaPath = path.join(here, 'schema.sqlite.sql')
  const schemaSql = fs.readFileSync(schemaPath, 'utf8')
  const existingTables = userTables(database)
  if (!existingTables.length) {
    database.exec(schemaSql)
    database.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`)
    return
  }

  const version = Number(database.prepare('PRAGMA user_version').get().user_version || 0)
  if (version >= SCHEMA_VERSION) {
    database.exec(schemaSql)
    return
  }

  console.log(`[db] migrating schema v${version} -> v${SCHEMA_VERSION}`)
  migrateToV2(database, schemaSql, existingTables)
  database.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`)
}

function ensureAuthTables(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS auth_sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      tenant_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      last_seen_at TEXT
    );
    CREATE INDEX IF NOT EXISTS auth_sessions_user_idx ON auth_sessions(user_id);
    CREATE INDEX IF NOT EXISTS auth_sessions_expiry_idx ON auth_sessions(expires_at);
  `)
}

// ---------------------------------------------------------------------------
// Default data for a brand-new tenant
// ---------------------------------------------------------------------------
const DEFAULT_ACCOUNTS = [
  ['1000', 'Cash in Hand', 'Asset', 0],
  ['1010', 'Bank', 'Asset', 0],
  ['1020', 'Petty Cash', 'Asset', 0],
  ['1200', 'Accounts Receivable', 'Asset', 0],
  ['1300', 'Inventory', 'Asset', 0],
  ['1400', 'VAT Recoverable', 'Asset', 0],
  ['1500', 'Fixed Assets', 'Asset', 0],
  ['2000', 'Accounts Payable', 'Liability', 0],
  ['2100', 'VAT Payable', 'Liability', 0],
  ['2200', 'Accrued Liabilities', 'Liability', 0],
  ['3000', 'Owner Capital', 'Equity', 0],
  ['3100', 'Retained Earnings', 'Equity', 0],
  ['4000', 'Sales Revenue', 'Income', 0],
  ['4100', 'Other Income', 'Income', 0],
  ['5000', 'Cost of Goods Sold', 'Expense', 0],
  ['5100', 'Salaries & Wages', 'Expense', 0],
  ['5200', 'Rent Expense', 'Expense', 0],
  ['5300', 'Utilities Expense', 'Expense', 0],
  ['5400', 'General & Administrative', 'Expense', 0],
]

const DEFAULT_DOC_NUMBERING = [
  ['A/R Invoice', 'INV', 1],
  ['Purchase Order', 'PO', 1],
  ['Journal Entry', 'JE', 1],
  ['Incoming Payment', 'RCV', 1],
  ['Outgoing Payment', 'PAY', 1],
  ['Sales Quotation', 'QUO', 1],
]

const DEFAULT_MODULES = [
  'Dashboard', 'Company Profile', 'Users & Roles', 'Authorization', 'Document Numbering',
  'Chart of Accounts', 'Journal Entry', 'Incoming Payments', 'Outgoing Payments',
  'A/R Invoice', 'Purchase Order', 'Stock Master', 'Customer', 'Supplier',
  'Trial Balance', 'Profit & Loss', 'Balance Sheet', 'License', 'Audit Log',
]

export function seedTenantDefaults(database, tenantId, companyName, options = {}) {
  insertRow(database, 'company_profile', {
    id: randomUUID(),
    tenant_id: tenantId,
    company_name: companyName || 'My Company',
    country: options.country || 'UAE',
    base_currency: options.currency || 'AED',
    vat_rate: options.vatRate ?? 5,
    fiscal_year_start: '01',
    email: options.email || '',
  })

  for (const [code, name, type, balance] of DEFAULT_ACCOUNTS) {
    insertRow(database, 'accounts', {
      id: randomUUID(), tenant_id: tenantId, code, name, type,
      opening_balance: balance, current_balance: balance,
      currency: options.currency || 'AED', is_group: 0, status: 'Active',
    })
  }

  for (const [docType, prefix, next] of DEFAULT_DOC_NUMBERING) {
    insertRow(database, 'doc_numbering', {
      id: randomUUID(), tenant_id: tenantId, doc_type: docType, prefix,
      format: 'PREFIX-00001', next_number: next, pad_length: 5, separator: '-', is_active: 1,
    })
  }

  for (const module of DEFAULT_MODULES) {
    insertRow(database, 'role_permissions', {
      id: randomUUID(), tenant_id: tenantId, role: 'Admin', module,
      can_view: 1, can_create: 1, can_edit: 1, can_delete: 1, can_approve: 1, can_print: 1,
    })
  }

  insertRow(database, 'tenant_credits', {
    id: randomUUID(), tenant_id: tenantId, amount: 100, balance_after: 100,
    tx_type: 'Credit', description: 'Welcome bonus - $100 free credit',
  })
}

function dayOffset(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function monthStart(monthsAgo, day = 5) {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - monthsAgo)
  d.setDate(day)
  return d.toISOString()
}

function seed(database) {
  const { count } = database.prepare('SELECT COUNT(*) AS count FROM tenants').get()
  if (count > 0) return

  // ---- tenant / plans / users ----
  insertRow(database, 'tenants', {
    id: DEMO_TENANT_ID,
    name: 'Demo Company LLC',
    slug: 'demo',
    plan_name: 'Enterprise',
    credit_balance: 750,
    credit_used: 250,
    credit_initial: 1000,
    currency: 'AED',
    expires_at: dayOffset(365),
    status: 'Active',
    settings: { region: 'UAE', seeded: true },
  })

  for (const plan of [
    { name: 'Starter', credit_amount: 100, monthly_price: 0, max_users: 3, max_storage_mb: 1024, max_transactions: 2000, features: { modules: 'basic' } },
    { name: 'Standard', credit_amount: 0, monthly_price: 49, max_users: 10, max_storage_mb: 5120, max_transactions: 10000, features: { modules: 'standard', priority_support: true } },
    { name: 'Enterprise', credit_amount: 0, monthly_price: 149, max_users: 50, max_storage_mb: 20480, max_transactions: 50000, features: { modules: 'all', api_access: true, priority_support: true } },
  ]) insertRow(database, 'billing_plans', plan)

  insertRow(database, 'erp_users', {
    id: DEMO_USER_ID,
    username: 'admin',
    full_name: 'Demo Admin',
    email: DEMO_EMAIL,
    password_hash: hashPassword(DEMO_PASSWORD),
    role: 'Admin',
    status: 'Active',
    phone: '+971 50 000 0000',
    last_login: new Date().toISOString(),
  })

  insertRow(database, 'tenant_users', {
    id: randomUUID(),
    tenant_id: DEMO_TENANT_ID,
    user_id: DEMO_USER_ID,
    role: 'Owner',
    status: 'Active',
  })

  insertRow(database, 'tenant_credits', {
    id: randomUUID(),
    tenant_id: DEMO_TENANT_ID,
    amount: 1000,
    balance_after: 1000,
    tx_type: 'Credit',
    description: 'Welcome bonus — local demo credit',
    module: null,
    ref_id: null,
  })

  insertRow(database, 'usage_metering', {
    id: randomUUID(),
    tenant_id: DEMO_TENANT_ID,
    period_month: new Date().toISOString().slice(0, 7),
    storage_mb: 12.5,
    user_count: 4,
    transaction_count: 128,
    api_calls: 0,
  })

  insertRow(database, 'company_profile', {
    id: randomUUID(),
    company_name: 'Demo Company LLC',
    legal_name: 'Demo Company Limited Liability Company',
    trade_name: 'Demo ERP',
    tax_id: '100123456700003',
    cr_number: 'CR-1234567',
    vat_number: '100123456700003',
    address_line1: 'Office 1204, Business Bay',
    address_line2: 'Sheikh Zayed Road',
    city: 'Dubai',
    state: 'Dubai',
    country: 'UAE',
    postal_code: '00000',
    phone: '+971 4 123 4567',
    email: 'hello@demo.local',
    website: 'https://demo.local',
    base_currency: 'AED',
    vat_rate: 5,
    fiscal_year_start: '01',
  })

  // ---- chart of accounts ----
  const accounts = [
    ['1000', 'Cash in Hand', 'Asset', 25000, 25000],
    ['1010', 'Bank — Emirates NBD', 'Asset', 175000, 210000],
    ['1020', 'Petty Cash', 'Asset', 2000, 1850],
    ['1200', 'Accounts Receivable', 'Asset', 0, 86415],
    ['1300', 'Inventory', 'Asset', 0, 142500],
    ['1400', 'VAT Recoverable', 'Asset', 0, 12500],
    ['1500', 'Fixed Assets', 'Asset', 90000, 85500],
    ['2000', 'Accounts Payable', 'Liability', 0, 52300],
    ['2100', 'VAT Payable', 'Liability', 0, 18900],
    ['2200', 'Accrued Liabilities', 'Liability', 0, 9500],
    ['3000', 'Owner Capital', 'Equity', 300000, 300000],
    ['3100', 'Retained Earnings', 'Equity', 0, 118065],
    ['4000', 'Sales Revenue', 'Income', 0, 482000],
    ['4100', 'Other Income', 'Income', 0, 7500],
    ['5000', 'Cost of Goods Sold', 'Expense', 0, 288000],
    ['5100', 'Salaries & Wages', 'Expense', 0, 96000],
    ['5200', 'Rent Expense', 'Expense', 0, 48000],
    ['5300', 'Utilities Expense', 'Expense', 0, 12500],
    ['5400', 'General & Administrative', 'Expense', 0, 21000],
  ]
  for (const [code, name, type, opening, current] of accounts) {
    insertRow(database, 'accounts', {
      id: randomUUID(), code, name, type,
      opening_balance: opening, current_balance: current,
      currency: 'AED', is_group: 0, status: 'Active',
    })
  }

  // ---- partners ----
  const customers = [
    ['CUST-0001', 'Al Noor Trading LLC', 'Dubai', 'AE', 50000, 18400],
    ['CUST-0002', 'Gulf Star Industries', 'Sharjah', 'AE', 75000, 32000],
    ['CUST-0003', 'Marina Retail Group', 'Abu Dhabi', 'AE', 30000, 9800],
    ['CUST-0004', 'Desert Rose Hospitality', 'Dubai', 'AE', 40000, 0],
    ['CUST-0005', 'Falcon Logistics', 'Ajman', 'AE', 25000, 14215],
    ['CUST-0006', 'Oasis Healthcare', 'Al Ain', 'AE', 60000, 22500],
  ]
  const customerIds = []
  customers.forEach(([code, name, city, country, limit, balance], i) => {
    const id = randomUUID()
    customerIds.push(id)
    insertRow(database, 'customers', {
      id, code, name, first_name: name.split(' ')[0], last_name: 'LLC',
      email: `accounts@${code.toLowerCase()}.local`, phone: `+971 4 000 ${1000 + i}`,
      mobile: `+971 50 000 ${2000 + i}`,
      address: `${city} — Office ${i + 1}`, ship_address: `${city} — Warehouse`,
      city, country, currency: 'AED', payment_terms: 'Net 30',
      credit_limit: limit, opening_balance: balance, credit_days: 30,
      vat_no: `10000000000000${i}`,
      account_code: `AR-${code}`,
      sales_person: i % 2 ? 'Rania Saleh' : 'Omar Khan',
      status: 'Active', cust_type: 'Company', category: 'Wholesale',
    })
  })

  const suppliers = [
    ['SUP-0001', 'Emirates Packaging', 'Dubai', 'AE', 15000],
    ['SUP-0002', 'Global Components FZE', 'Sharjah', 'AE', 22000],
    ['SUP-0003', 'City Office Supplies', 'Dubai', 'AE', 4500],
    ['SUP-0004', 'Nova Tech Distribution', 'Abu Dhabi', 'AE', 18300],
  ]
  const supplierIds = []
  suppliers.forEach(([code, name, city, country, balance], i) => {
    const id = randomUUID()
    supplierIds.push(id)
    insertRow(database, 'suppliers', {
      id, code, name, email: `sales@${code.toLowerCase()}.local`,
      phone: `+971 4 500 ${3000 + i}`, city, country, currency: 'AED',
      payment_terms: 'Net 45', opening_balance: balance, status: 'Active',
      sup_type: 'Distributor', contact_person: 'Accounts Team',
      bank_name: 'Emirates NBD', bank_iban: `AE07033000000000000000${i}`,
    })
  })

  // ---- products / stock ----
  const products = [
    ['ITM-0001', 'Premium Widget A', 'WID-A', 'Goods', 'Pcs', 120, 80, 150, 20],
    ['ITM-0002', 'Premium Widget B', 'WID-B', 'Goods', 'Pcs', 145, 95, 90, 20],
    ['ITM-0003', 'Industrial Gear Set', 'GEAR-1', 'Spare Parts', 'Set', 480, 320, 34, 10],
    ['ITM-0004', 'Steel Bracket 40mm', 'BRK-40', 'Hardware', 'Pcs', 18, 9, 800, 100],
    ['ITM-0005', 'Hydraulic Hose 2m', 'HOSE-2', 'Spare Parts', 'Pcs', 65, 38, 120, 25],
    ['ITM-0006', 'Safety Helmet', 'HELM-01', 'Safety', 'Pcs', 42, 22, 240, 40],
    ['ITM-0007', 'Work Gloves (Pair)', 'GLV-01', 'Safety', 'Pair', 15, 7, 12, 30],
    ['ITM-0008', 'LED Floodlight 150W', 'LED-150', 'Electrical', 'Pcs', 210, 140, 46, 12],
    ['ITM-0009', 'Cable Drum 100m', 'CBL-100', 'Electrical', 'Roll', 390, 260, 18, 6],
    ['ITM-0010', 'Service Kit — Annual', 'SVC-ANN', 'Services', 'Job', 950, 0, 0, 0],
    ['ITM-0011', 'Toolbox 32"', 'TBX-32', 'Hardware', 'Pcs', 260, 170, 28, 8],
    ['ITM-0012', 'Office Chair Ergonomic', 'CHR-ERG', 'Furniture', 'Pcs', 520, 330, 5, 10],
  ]
  const productIds = []
  products.forEach(([code, name, sku, category, unit, price, cost, stock, reorder], i) => {
    const id = randomUUID()
    productIds.push(id)
    insertRow(database, 'products', {
      id, code, name, sku, barcode: `5901234${String(i).padStart(5, '0')}`,
      category, unit, price, cost_price: cost, stock_quantity: stock,
      reorder_level: reorder, min_stock: reorder, max_stock: reorder * 10,
      location: 'Main Warehouse', status: 'Active', vat_rate: 5,
      description: `${name} — demo catalogue item`,
    })
    insertRow(database, 'inventory', {
      id: randomUUID(), product_id: id, quantity: stock, reorder_level: reorder,
    })
  })

  // ---- sales orders for the 6-month dashboard chart ----
  const orderStatuses = ['completed', 'completed', 'completed', 'pending', 'completed', 'cancelled']
  for (let m = 5; m >= 0; m--) {
    for (let n = 0; n < 4; n++) {
      const p = n % products.length
      const qty = 2 + ((m + n) % 7)
      insertRow(database, 'orders', {
        id: randomUUID(),
        customer_id: customerIds[(m + n) % customerIds.length],
        product_id: productIds[p],
        quantity: qty,
        total_amount: Number(products[p][5]) * qty,
        status: orderStatuses[(m + n) % orderStatuses.length],
        shipping_address: 'Demo warehouse',
        created_at: monthStart(m, 5 + n * 5),
        updated_at: monthStart(m, 5 + n * 5),
      })
    }
  }

  // ---- invoices / purchases ----
  const invoiceStatuses = ['Approved', 'Approved', 'Approved', 'Approved', 'Pending', 'Approved', 'Draft', 'Approved']
  for (let i = 0; i < 8; i++) {
    const customer = customers[i % customers.length]
    const product = products[i % products.length]
    const qty = 2 + (i % 4)
    const price = Number(product[5])
    const subtotal = qty * price
    const vat = subtotal * 0.05
    const paid = i % 3 === 0 ? subtotal + vat : i % 3 === 1 ? (subtotal + vat) * 0.4 : 0
    const status = invoiceStatuses[i]
    insertRow(database, 'invoices', {
      id: randomUUID(),
      invoice_no: `INV-2601-${String(1001 + i)}`,
      customer_name: customer[1],
      customer_id: customerIds[i % customerIds.length],
      customer_email: `accounts@cust-${i}.local`,
      customer_phone: `+971 50 100 ${i}`,
      customer_vat: customer[7],
      items: [{ name: product[1], code: product[0], qty, price, discount: 0 }],
      subtotal, vat_percent: 5, vat_amount: vat,
      grand_total: subtotal + vat, payment_method: 'Bank Transfer',
      amount_paid: paid, balance: subtotal + vat - paid,
      status, notes: 'Seeded demo invoice',
      invoice_date: monthStart(5 - (i % 6), 10 + i).slice(0, 10),
      due_date: dayOffset(30 + i),
      created_at: monthStart(5 - (i % 6), 10 + i),
    })
  }

  const purchaseStatuses = ['Approved', 'Approved', 'Approved', 'Draft', 'Approved']
  for (let i = 0; i < 5; i++) {
    const supplier = suppliers[i % suppliers.length]
    const product = products[(i + 3) % products.length]
    const qty = 10 + i * 3
    const subtotal = qty * Number(product[6])
    const vat = subtotal * 0.05
    insertRow(database, 'purchase_invoices', {
      id: randomUUID(),
      invoice_no: `PINV-2601-${String(2001 + i)}`,
      party_name: supplier[1],
      supplier_id: supplierIds[i % supplierIds.length],
      items: [{ name: product[1], qty, price: product[6] }],
      subtotal, vat_amount: vat, grand_total: subtotal + vat,
      status: purchaseStatuses[i], doc_date: monthStart(5 - (i % 5), 8).slice(0, 10),
      created_at: monthStart(5 - (i % 5), 8),
    })
  }

  // ---- payments ----
  const paymentStatus = 'Approved'
  for (let i = 0; i < 4; i++) {
    insertRow(database, 'incoming_payments', {
      id: randomUUID(), payment_no: `RCV-2601-${3001 + i}`,
      payment_date: monthStart(4 - i, 12).slice(0, 10),
      customer_id: customerIds[i], customer_name: customers[i][1],
      payment_method: i % 2 ? 'Cash' : 'Bank Transfer',
      reference: `REF-${4000 + i}`, amount: 5000 + i * 2750,
      currency: 'AED', status: paymentStatus, created_by: 'Demo Admin',
    })
    if (i < 3) insertRow(database, 'outgoing_payments', {
      id: randomUUID(), payment_no: `PAY-2601-${5001 + i}`,
      payment_date: monthStart(4 - i, 15).slice(0, 10),
      supplier_id: supplierIds[i], supplier_name: suppliers[i][1],
      payment_method: 'Bank Transfer', reference: `SUP-${6000 + i}`,
      amount: 4200 + i * 1900, currency: 'AED', status: paymentStatus,
      created_by: 'Demo Admin',
    })
  }

  // ---- journal ----
  const arId = database.prepare("SELECT id FROM accounts WHERE code = '1200'").get().id
  const salesId = database.prepare("SELECT id FROM accounts WHERE code = '4000'").get().id
  const vatOutId = database.prepare("SELECT id FROM accounts WHERE code = '2100'").get().id
  const bankId = database.prepare("SELECT id FROM accounts WHERE code = '1010'").get().id
  const rentId = database.prepare("SELECT id FROM accounts WHERE code = '5200'").get().id
  const capitalId = database.prepare("SELECT id FROM accounts WHERE code = '3000'").get().id
  const cashId = database.prepare("SELECT id FROM accounts WHERE code = '1000'").get().id

  const journals = [
    {
      no: 'JE-2601-0001', date: monthStart(5, 1).slice(0, 10), narration: 'Opening capital introduced',
      lines: [[cashId, 300000, 0, 'Cash introduced'], [capitalId, 0, 300000, 'Owner capital']],
    },
    {
      no: 'JE-2601-0002', date: monthStart(3, 18).slice(0, 10), narration: 'Rent for the quarter',
      lines: [[rentId, 48000, 0, 'Office rent'], [bankId, 0, 48000, 'Paid from bank']],
    },
    {
      no: 'JE-2601-0003', date: monthStart(1, 20).slice(0, 10), narration: 'Sales invoice posting',
      lines: [[arId, 63000, 0, 'Receivable'], [salesId, 0, 60000, 'Revenue'], [vatOutId, 0, 3000, 'VAT']],
    },
    {
      no: 'JE-2601-0004', date: monthStart(0, 4).slice(0, 10), narration: 'Bank charges',
      lines: [[rentId, 350, 0, 'Bank charges'], [bankId, 0, 350, 'Bank']],
    },
  ]
  for (const journal of journals) {
    const entryId = randomUUID()
    const total = journal.lines.reduce((s, l) => s + Number(l[1]), 0)
    insertRow(database, 'journal_entries', {
      id: entryId, entry_no: journal.no, entry_date: journal.date,
      reference: journal.no, narration: journal.narration, status: 'Posted',
      total_debit: total, total_credit: total, currency: 'AED', created_by: 'Demo Admin',
    })
    journal.lines.forEach(([accountId, debit, credit, description], index) => {
      insertRow(database, 'journal_lines', {
        id: randomUUID(), entry_id: entryId, line_no: index + 1,
        account_id: accountId, debit, credit, description,
      })
    })
  }

  // ---- admin settings / permissions ----
  const modules = [
    'Dashboard', 'Company Profile', 'Users & Roles', 'Authorization', 'Document Numbering',
    'Chart of Accounts', 'Journal Entry', 'Incoming Payments', 'Outgoing Payments',
    'A/R Invoice', 'Purchase Order', 'Stock Master', 'Customer', 'Supplier',
    'Trial Balance', 'Profit & Loss', 'Balance Sheet', 'License', 'Audit Log',
  ]
  for (const module of modules) {
    insertRow(database, 'role_permissions', {
      id: randomUUID(), role: 'Admin', module,
      can_view: 1, can_create: 1, can_edit: 1, can_delete: 1, can_approve: 1, can_print: 1,
    })
  }
  for (const module of ['Dashboard', 'Chart of Accounts', 'Journal Entry', 'A/R Invoice', 'Stock Master']) {
    insertRow(database, 'role_permissions', {
      id: randomUUID(), role: 'Accountant', module,
      can_view: 1, can_create: 1, can_edit: 1, can_delete: 0, can_approve: 0, can_print: 1,
    })
  }

  for (const [docType, prefix, next] of [
    ['A/R Invoice', 'INV', 9],
    ['Purchase Order', 'PO', 1],
    ['Journal Entry', 'JE', 5],
    ['Incoming Payment', 'RCV', 5],
    ['Outgoing Payment', 'PAY', 4],
    ['Sales Quotation', 'QUO', 1],
  ]) {
    insertRow(database, 'doc_numbering', {
      id: randomUUID(), doc_type: docType, prefix, format: 'PREFIX-00001',
      next_number: next, pad_length: 5, separator: '-', is_active: 1,
    })
  }

  // ---- tax configuration ----
  const taxes = [
    ['UAE', 'VAT', 5, 0, 0, 'AED', 'Federal Tax Authority', 'UAE e-invoicing', 'TRN', 'Tax Invoice'],
    ['Saudi Arabia', 'VAT', 15, 0, 0, 'SAR', 'ZATCA', 'ZATCA Phase 2', 'VAT Number', 'Tax Invoice'],
    ['India', 'GST', 18, 5, 0, 'INR', 'GST Council', 'GST', 'GSTIN', 'Tax Invoice'],
    ['Global', 'Tax', 0, 0, 0, 'USD', 'N/A', 'None', 'Tax ID', 'Invoice'],
  ]
  for (const [country, taxName, standard, reduced, zero, currency, authority, compliance, idLabel, invoiceLabel] of taxes) {
    insertRow(database, 'tax_config', {
      id: randomUUID(), country, tax_name: taxName,
      standard_rate: standard, reduced_rate: reduced, zero_rate: zero,
      currency, tax_authority: authority, compliance_mode: compliance,
      tax_id_label: idLabel, invoice_label: invoiceLabel, is_active: 1,
    })
  }

  // ---- recurring invoice template ----
  insertRow(database, 'recurring_invoices', {
    id: randomUUID(), template_name: 'Monthly maintenance — Al Noor',
    customer_name: customers[0][1], customer_id: customerIds[0],
    frequency: 'Monthly', start_date: dayOffset(-90),
    next_run_date: dayOffset(5), run_count: 3,
    items: [{ name: 'Service Kit — Annual', qty: 1, price: 950 }],
    subtotal: 950, vat_percent: 5, vat_amount: 47.5, grand_total: 997.5,
    currency: 'AED', status: 'Active',
  })

  for (let i = 0; i < 6; i++) {
    insertRow(database, 'activity_log', {
      id: randomUUID(), action: i % 2 ? 'CREATE' : 'POST',
      entity: i % 2 ? 'A/R Invoice' : 'Journal Entry',
      entity_id: randomUUID(),
      detail: i % 2 ? `Created invoice INV-2601-${1001 + i}` : `Posted journal JE-2601-000${i + 1}`,
      user_email: DEMO_EMAIL,
    })
  }

  console.log(`[db] seeded ${dbPath}`)
}
