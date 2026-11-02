// Local HTTP API used by src/utils/localClient.ts. Mounted at /api by Vite.
// Every endpoint is local-only: no cloud, no service keys.

import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import {
  getDb, columnsOf, tableExists, quoteIdent,
  storageDir, dataDir, hashPassword, verifyPassword,
} from './db.mjs'

const MAX_BODY = 30 * 1024 * 1024

function send(res, status, payload) {
  const body = JSON.stringify(payload)
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(body)
}

function error(res, message, status = 400) {
  send(res, status, { data: null, error: { message: String(message) } })
}

function readBody(req) {
  // Vercel (and some other hosts) pre-parse JSON bodies onto req.body.
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') {
      try { return Promise.resolve(req.body ? JSON.parse(req.body) : {}) } catch { return Promise.reject(new Error('Invalid JSON body')) }
    }
    return Promise.resolve(req.body)
  }
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY) { reject(new Error('Request body too large')); req.destroy(); return }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (!chunks.length) return resolve({})
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))) } catch (e) { reject(new Error('Invalid JSON body')) }
    })
    req.on('error', reject)
  })
}

// ---------- value helpers ----------

function encode(value) {
  if (value === undefined || value === null) return null
  if (typeof value === 'boolean') return value ? 1 : 0
  if (typeof value === 'object') return JSON.stringify(value)
  return value
}

function decode(value) {
  if (typeof value !== 'string') return value
  const t = value.trim()
  if ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))) {
    try { return JSON.parse(t) } catch { /* keep as text */ }
  }
  return value
}

function decodeRow(row) {
  if (!row) return row
  const out = {}
  for (const [k, v] of Object.entries(row)) out[k] = decode(v)
  return out
}

function asArray(value) {
  if (value === null || value === undefined) return []
  return Array.isArray(value) ? value : [value]
}

// ---------- query translation ----------

function buildWhere(filters, cols) {
  const clauses = []
  const params = []
  for (const f of filters || []) {
    if (!f || !cols.has(f.col)) continue
    const col = quoteIdent(f.col)
    const op = String(f.op || 'eq').toLowerCase()
    const value = f.value
    switch (op) {
      case 'eq':
        if (value === null || value === undefined) { clauses.push(`${col} IS NULL`) }
        else { clauses.push(`${col} = ?`); params.push(encode(value)) }
        break
      case 'neq':
        if (value === null || value === undefined) clauses.push(`${col} IS NOT NULL`)
        else { clauses.push(`${col} <> ?`); params.push(encode(value)) }
        break
      case 'gt': clauses.push(`${col} > ?`); params.push(encode(value)); break
      case 'gte': clauses.push(`${col} >= ?`); params.push(encode(value)); break
      case 'lt': clauses.push(`${col} < ?`); params.push(encode(value)); break
      case 'lte': clauses.push(`${col} <= ?`); params.push(encode(value)); break
      case 'like': clauses.push(`${col} LIKE ?`); params.push(encode(value)); break
      case 'ilike': clauses.push(`LOWER(${col}) LIKE LOWER(?)`); params.push(encode(value)); break
      case 'in': {
        const list = asArray(value)
        if (!list.length) { clauses.push('0 = 1'); break }
        clauses.push(`${col} IN (${list.map(() => '?').join(', ')})`)
        params.push(...list.map(encode))
        break
      }
      case 'is':
        if (value === null) clauses.push(`${col} IS NULL`)
        else if (value === true) clauses.push(`${col} = 1`)
        else if (value === false) clauses.push(`${col} = 0`)
        else { clauses.push(`${col} IS ?`); params.push(encode(value)) }
        break
      case 'contains':
        clauses.push(`(CASE WHEN json_valid(${col}) AND json_type(${col}) = 'array' THEN EXISTS (SELECT 1 FROM json_each(${col}) WHERE json_each.value = ?) ELSE ${col} LIKE ? END)`)
        params.push(encode(value), `%${value}%`)
        break
      case 'match': {
        for (const [k, v] of Object.entries(value || {})) {
          if (!cols.has(k)) continue
          if (v === null) clauses.push(`${quoteIdent(k)} IS NULL`)
          else { clauses.push(`${quoteIdent(k)} = ?`); params.push(encode(v)) }
        }
        break
      }
      default:
        break
    }
  }
  return { sql: clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '', params }
}

function buildOrder(orders, cols) {
  const parts = []
  for (const o of orders || []) {
    if (!o || !cols.has(o.col)) continue
    parts.push(`${quoteIdent(o.col)} ${o.ascending === false ? 'DESC' : 'ASC'}`)
  }
  return parts.length ? ` ORDER BY ${parts.join(', ')}` : ''
}

function parseColumns(columns, cols) {
  const relation = []
  const selected = []
  const raw = (columns || '*').trim()
  if (!raw || raw === '*') return { sql: '*', relation }
  for (const part of raw.split(',')) {
    const bit = part.trim()
    if (!bit) continue
    const rel = bit.match(/^([A-Za-z_][A-Za-z0-9_]*):([A-Za-z_][A-Za-z0-9_]*)\((\*|[^)]*)\)$/)
    if (rel) { relation.push({ name: rel[1], table: rel[2] }); continue }
    if (cols.has(bit)) selected.push(quoteIdent(bit))
  }
  if (!selected.length) return { sql: '*', relation }
  return { sql: selected.join(', '), relation }
}

function attachRelations(db, rows, relations) {
  if (!relations.length) return rows
  return rows.map((row) => {
    const out = { ...row }
    for (const rel of relations) {
      const sourceId = row[rel.name === 'tenant' ? 'tenant_id' : `${rel.name}_id`]
      if (!sourceId || !tableExists(db, rel.table)) { out[rel.name] = null; continue }
      const found = db.prepare(`SELECT * FROM ${quoteIdent(rel.table)} WHERE id = ?`).get(sourceId)
      out[rel.name] = decodeRow(found)
    }
    return out
  })
}

function runSelect(db, body) {
  const { table } = body
  const cols = columnsOf(db, table)
  const { sql: selectSql, relation } = parseColumns(body.columns, cols)
  const where = buildWhere(body.filters, cols)
  const order = buildOrder(body.orders, cols)

  if (body.count && body.head) {
    const row = db.prepare(`SELECT COUNT(*) AS count FROM ${quoteIdent(table)}${where.sql}`).get(...where.params)
    return { data: null, error: null, count: row.count }
  }

  const limit = Number.isFinite(body.limit) ? Math.max(0, Number(body.limit)) : 1000
  const offset = Number.isFinite(body.offset) ? Math.max(0, Number(body.offset)) : 0
  let sql = `SELECT ${selectSql} FROM ${quoteIdent(table)}${where.sql}${order} LIMIT ? OFFSET ?`
  const params = [...where.params, limit, offset]
  let rows = db.prepare(sql).all(...params).map(decodeRow)
  rows = attachRelations(db, rows, relation)

  let count
  if (body.count) {
    const row = db.prepare(`SELECT COUNT(*) AS count FROM ${quoteIdent(table)}${where.sql}`).get(...where.params)
    count = row.count
  }

  if (body.single || body.maybeSingle) {
    return { data: rows[0] || null, error: null, count }
  }
  return { data: rows, error: null, count }
}

function prepareRow(db, table, row, cols) {
  const out = {}
  for (const [k, v] of Object.entries(row || {})) {
    if (v === undefined) continue
    if (cols.has(k)) out[k] = encode(v)
  }
  if (cols.has('id') && !out.id) out.id = randomUUID()
  if (cols.has('tenant_id') && !out.tenant_id) out.tenant_id = '00000000-0000-0000-0000-000000000001'
  if (cols.has('created_at') && !out.created_at) out.created_at = new Date().toISOString()
  if (cols.has('updated_at') && !out.updated_at) out.updated_at = new Date().toISOString()
  return out
}

function runInsert(db, body, replace = false) {
  const { table } = body
  const cols = columnsOf(db, table)
  const rows = asArray(body.values).map((r) => prepareRow(db, table, r, cols))
  if (!rows.length) return { data: [], error: null }
  const ids = []
  for (const row of rows) {
    const keys = Object.keys(row)
    const verb = replace ? 'INSERT OR REPLACE' : 'INSERT'
    const sql = `${verb} INTO ${quoteIdent(table)} (${keys.map(quoteIdent).join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`
    db.prepare(sql).run(...keys.map((k) => row[k]))
    if (row.id) ids.push(row.id)
  }
  if (body.returning) {
    if (!ids.length) return { data: [], error: null }
    const found = db.prepare(`SELECT * FROM ${quoteIdent(table)} WHERE id IN (${ids.map(() => '?').join(', ')})`).all(...ids)
    return { data: found.map(decodeRow), error: null }
  }
  return { data: null, error: null }
}

function runUpdate(db, body) {
  const { table } = body
  const cols = columnsOf(db, table)
  const values = { ...(body.values || {}) }
  delete values.id
  if (cols.has('updated_at') && values.updated_at === undefined) values.updated_at = new Date().toISOString()
  const keys = Object.keys(values).filter((k) => cols.has(k))
  if (!keys.length) return { data: [], error: null }
  const where = buildWhere(body.filters, cols)
  const setSql = keys.map((k) => `${quoteIdent(k)} = ?`).join(', ')
  const sql = `UPDATE ${quoteIdent(table)} SET ${setSql}${where.sql}`
  db.prepare(sql).run(...keys.map((k) => encode(values[k])), ...where.params)
  if (body.returning) {
    const found = db.prepare(`SELECT * FROM ${quoteIdent(table)}${where.sql}`).all(...where.params)
    return { data: found.map(decodeRow), error: null }
  }
  return { data: null, error: null }
}

function runDelete(db, body) {
  const { table } = body
  const cols = columnsOf(db, table)
  const where = buildWhere(body.filters, cols)
  if (!where.sql) return { data: null, error: { message: 'Refusing to delete without a filter' } }
  db.prepare(`DELETE FROM ${quoteIdent(table)}${where.sql}`).run(...where.params)
  return { data: null, error: null }
}

function handleQuery(body) {
  const db = getDb()
  const table = String(body.table || '')
  if (!table || !tableExists(db, table)) {
    return { data: null, error: { message: `Table "${table}" does not exist in the local database` } }
  }
  switch (String(body.action || 'select')) {
    case 'select': return runSelect(db, body)
    case 'insert': return runInsert(db, body)
    case 'upsert': return runInsert(db, body, true)
    case 'update': return runUpdate(db, body)
    case 'delete': return runDelete(db, body)
    default: return { data: null, error: { message: `Unknown action "${body.action}"` } }
  }
}

// ---------- auth ----------

function publicUser(row) {
  if (!row) return null
  return {
    id: row.id,
    email: row.email,
    user_metadata: { full_name: row.full_name, role: row.role },
  }
}

function tenantForUser(db, userId) {
  const membership = db
    .prepare(`SELECT tu.role AS member_role, t.* FROM tenant_users tu JOIN tenants t ON t.id = tu.tenant_id
              WHERE tu.user_id = ? AND tu.status = 'Active' LIMIT 1`)
    .get(userId)
  return membership ? decodeRow(membership) : null
}

function handleLogin(body) {
  const db = getDb()
  const email = String(body.email || '').trim().toLowerCase()
  const password = String(body.password || '')
  if (!email || !password) return { data: null, error: { message: 'Email and password are required' } }
  const row = db.prepare('SELECT * FROM erp_users WHERE LOWER(email) = ? LIMIT 1').get(email)
  if (!row || !verifyPassword(password, row.password_hash)) {
    return { data: null, error: { message: 'Invalid email or password' } }
  }
  db.prepare('UPDATE erp_users SET last_login = ? WHERE id = ?').run(new Date().toISOString(), row.id)
  return { data: { user: publicUser(row), tenant: tenantForUser(db, row.id) }, error: null }
}

function handleSignup(body) {
  const db = getDb()
  const email = String(body.email || '').trim().toLowerCase()
  const password = String(body.password || '')
  const fullName = String(body.fullName || email)
  if (!email || !password) return { data: null, error: { message: 'Email and password are required' } }
  const exists = db.prepare('SELECT id FROM erp_users WHERE LOWER(email) = ?').get(email)
  if (exists) return { data: null, error: { message: 'That email is already registered' } }
  const id = randomUUID()
  db.prepare(`INSERT INTO erp_users (id, username, full_name, email, password_hash, role, status)
              VALUES (?, ?, ?, ?, ?, 'Admin', 'Active')`)
    .run(id, email.split('@')[0], fullName, email, hashPassword(password))
  db.prepare(`INSERT INTO tenant_users (id, tenant_id, user_id, role, status)
              VALUES (?, '00000000-0000-0000-0000-000000000001', ?, 'Owner', 'Active')`)
    .run(randomUUID(), id)
  const row = db.prepare('SELECT * FROM erp_users WHERE id = ?').get(id)
  return { data: { user: publicUser(row), tenant: tenantForUser(db, id) }, error: null }
}

// ---------- storage ----------

function safeStoragePath(bucket, filePath) {
  const cleanBucket = String(bucket).replace(/[^A-Za-z0-9._-]/g, '')
  const cleanPath = String(filePath).replace(/\\/g, '/').replace(/^\/+/, '')
  if (!cleanBucket || cleanPath.split('/').includes('..')) throw new Error('Invalid file path')
  const full = path.resolve(storageDir, cleanBucket, cleanPath)
  const base = path.resolve(storageDir, cleanBucket)
  if (!full.startsWith(base + path.sep) && full !== base) throw new Error('Invalid file path')
  return full
}

function handleUpload(body) {
  const full = safeStoragePath(body.bucket, body.path)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  const base64 = String(body.data || '').replace(/^data:[^;]+;base64,/, '')
  fs.writeFileSync(full, Buffer.from(base64, 'base64'))
  return { data: { path: body.path }, error: null }
}

function handleRemove(body) {
  const full = safeStoragePath(body.bucket, body.path)
  if (fs.existsSync(full)) fs.unlinkSync(full)
  return { data: null, error: null }
}

const MIME = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8', '.csv': 'text/csv; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
}

function serveFile(res, bucket, filePath) {
  const full = safeStoragePath(bucket, filePath)
  if (!fs.existsSync(full)) { res.statusCode = 404; res.end('Not found'); return }
  res.statusCode = 200
  res.setHeader('Content-Type', MIME[path.extname(full).toLowerCase()] || 'application/octet-stream')
  fs.createReadStream(full).pipe(res)
}

// ---------- rpc / functions ----------

function handleRpc(body) {
  const db = getDb()
  const name = String(body.name || '')
  const params = body.params || {}

  if (name === 'get_tax_config') {
    const country = String(params.p_country || 'Global')
    let row = db.prepare('SELECT * FROM tax_config WHERE country = ? AND is_active = 1 LIMIT 1').get(country)
    if (!row) row = db.prepare("SELECT * FROM tax_config WHERE country = 'Global' LIMIT 1").get()
    return { data: row ? [decodeRow(row)] : [], error: null }
  }

  if (name === 'generate_recurring_invoice') {
    const template = db.prepare('SELECT * FROM recurring_invoices WHERE id = ?').get(params.p_recurring_id)
    if (!template) return { data: null, error: { message: 'Recurring template not found' } }
    const items = typeof template.items === 'string' ? JSON.parse(template.items) : template.items
    const subtotal = Number(template.subtotal || 0)
    const vat = Number(template.vat_amount || 0)
    const id = randomUUID()
    const invoiceNo = `INV-REC-${Date.now().toString().slice(-6)}`
    db.prepare(`INSERT INTO invoices (id, invoice_no, customer_name, customer_id, items, subtotal, vat_percent,
                vat_amount, grand_total, amount_paid, balance, status, invoice_date, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'Pending', ?, ?)`)
      .run(id, invoiceNo, template.customer_name, template.customer_id, JSON.stringify(items || []),
        subtotal, template.vat_percent, vat, subtotal + vat, subtotal + vat,
        new Date().toISOString().slice(0, 10), new Date().toISOString())
    const next = new Date()
    next.setMonth(next.getMonth() + 1)
    db.prepare('UPDATE recurring_invoices SET last_run_date = ?, next_run_date = ?, run_count = run_count + 1 WHERE id = ?')
      .run(new Date().toISOString().slice(0, 10), next.toISOString().slice(0, 10), template.id)
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id)
    return { data: decodeRow(invoice), error: null }
  }

  return { data: null, error: { message: `RPC "${name}" is not implemented in local mode` } }
}

function logOutbox(payload) {
  fs.mkdirSync(dataDir, { recursive: true })
  fs.appendFileSync(path.join(dataDir, 'outbox.log'), JSON.stringify({ at: new Date().toISOString(), ...payload }) + '\n')
}

function handleFunction(name, body) {
  const payload = body.body || body
  if (name === 'send-email') {
    logOutbox({ type: 'email', to: payload.to || '(blank)', subject: payload.subject || '', html: payload.html || payload.text || '' })
    return { data: { ok: true, delivered: false, note: 'Email written to data/outbox.log (local mode)' }, error: null }
  }
  if (name === 'zatca-submit') {
    return { data: { ok: true, simulated: true, uuid: randomUUID(), status: 'SIMULATED' }, error: null }
  }
  if (name === 'bank-feed') {
    return { data: { ok: true, simulated: true, transactions: [] }, error: null }
  }
  return { data: { ok: true, simulated: true }, error: null }
}

// ---------- router ----------

export function createApiHandler() {
  return async function apiHandler(req, res, next) {
    const url = new URL(req.url || '/', 'http://localhost')
    const route = url.pathname
    if (route === '/health') return send(res, 200, { ok: true, mode: 'sqlite', db: 'data/erp.db' })

    try {
      if (req.method === 'GET' && route.startsWith('/storage/file/')) {
        const rest = decodeURIComponent(route.slice('/storage/file/'.length))
        const slash = rest.indexOf('/')
        if (slash < 0) return error(res, 'Invalid file path', 400)
        return serveFile(res, rest.slice(0, slash), rest.slice(slash + 1))
      }

      const body = req.method === 'GET' ? {} : await readBody(req)

      if (route === '/db' && req.method === 'POST') {
        return send(res, 200, handleQuery(body))
      }
      if (route === '/auth/login' && req.method === 'POST') {
        return send(res, 200, handleLogin(body))
      }
      if (route === '/auth/signup' && req.method === 'POST') {
        return send(res, 200, handleSignup(body))
      }
      if (route === '/auth/logout' && req.method === 'POST') {
        return send(res, 200, { data: null, error: null })
      }
      if (route === '/storage/upload' && req.method === 'POST') {
        return send(res, 200, handleUpload(body))
      }
      if (route === '/storage/remove' && req.method === 'POST') {
        return send(res, 200, handleRemove(body))
      }
      if (route === '/rpc' && req.method === 'POST') {
        return send(res, 200, handleRpc(body))
      }
      if (route.startsWith('/functions/') && req.method === 'POST') {
        return send(res, 200, handleFunction(route.slice('/functions/'.length), body))
      }

      if (next) return next()
      return error(res, 'Not found', 404)
    } catch (e) {
      console.error('[api]', e)
      return error(res, e?.message || 'Internal error', 500)
    }
  }
}
