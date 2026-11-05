// Local HTTP API used by src/utils/localClient.ts. Mounted at /api by Vite.
// Every endpoint is local-only: no cloud, no service keys.

import fs from 'node:fs'
import path from 'node:path'
import { randomUUID, randomBytes, createHash } from 'node:crypto'
import {
  getDb, columnsOf, tableExists, quoteIdent,
  storageDir, dataDir, hashPassword, verifyPassword,
  seedTenantDefaults, DEMO_TENANT_ID,
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

// ---------- sessions / tenant context ----------

const SESSION_DAYS = 30
const RESERVED_TABLES = new Set(['auth_sessions', 'sqlite_master', 'sqlite_schema', 'sqlite_temp_master'])
const GLOBAL_TABLES = new Set(['tenants', 'billing_plans', 'tax_config'])
const READ_ONLY_TABLES = new Set(['billing_plans', 'tax_config'])

// Best-effort brute-force protection. Serverless instances have their own
// memory, so this is not a substitute for a shared rate limiter at the edge.
const authRate = new Map()

function clientIp(req) {
  const forwarded = req.headers?.['x-forwarded-for']
  if (forwarded) return String(forwarded).split(',')[0].trim()
  return req.socket?.remoteAddress || 'unknown'
}

function rateLimited(key, max, windowMs) {
  const now = Date.now()
  if (authRate.size > 5000) {
    for (const [k, v] of authRate) if (v.reset <= now) authRate.delete(k)
  }
  const entry = authRate.get(key)
  if (!entry || entry.reset <= now) {
    authRate.set(key, { count: 1, reset: now + windowMs })
    return false
  }
  entry.count += 1
  return entry.count > max
}

function hashToken(token) {
  return createHash('sha256').update(String(token)).digest('hex')
}

function createSession(db, userId, tenantId) {
  const token = randomBytes(32).toString('base64url')
  const now = new Date()
  const expires = new Date(now.getTime() + SESSION_DAYS * 86400000)
  db.prepare(
    `INSERT INTO auth_sessions (token_hash, user_id, tenant_id, created_at, expires_at, last_seen_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(hashToken(token), userId, tenantId, now.toISOString(), expires.toISOString(), now.toISOString())
  return { token, expires_at: expires.toISOString() }
}

function deleteSession(db, token) {
  if (!token) return
  db.prepare('DELETE FROM auth_sessions WHERE token_hash = ?').run(hashToken(token))
}

function bearerToken(req, url) {
  const header = req.headers?.authorization || req.headers?.Authorization
  if (header && /^Bearer\s+/i.test(String(header))) return String(header).replace(/^Bearer\s+/i, '').trim()
  const queryToken = url?.searchParams?.get('token')
  return queryToken ? String(queryToken) : null
}

function authenticate(db, req, url) {
  const token = bearerToken(req, url)
  if (!token) return null
  const session = db.prepare('SELECT * FROM auth_sessions WHERE token_hash = ?').get(hashToken(token))
  if (!session) return null
  if (new Date(session.expires_at).getTime() < Date.now()) {
    deleteSession(db, token)
    return null
  }
  const user = db.prepare('SELECT * FROM erp_users WHERE id = ?').get(session.user_id)
  if (!user || String(user.status || 'Active') !== 'Active') return null
  return { token, session, user, tenantId: session.tenant_id }
}

function requireAuth(db, req, url, res) {
  const auth = authenticate(db, req, url)
  if (!auth) {
    error(res, 'Authentication required', 401)
    return null
  }
  return auth
}

function sanitizeRow(table, row) {
  if (!row) return row
  if (table === 'erp_users') {
    const { password_hash, ...rest } = row
    rest.has_password = Boolean(password_hash)
    return rest
  }
  return row
}

function sanitizeRows(table, rows) {
  return rows.map((row) => sanitizeRow(table, row))
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
    return { data: sanitizeRow(table, rows[0] || null), error: null, count }
  }
  return { data: sanitizeRows(table, rows), error: null, count }
}

function prepareRow(db, table, row, cols, tenantId, { isUpdate = false } = {}) {
  const out = {}
  for (const [k, v] of Object.entries(row || {})) {
    if (v === undefined) continue
    if (cols.has(k)) out[k] = encode(v)
  }
  if (cols.has('id') && !out.id) out.id = randomUUID()
  if (cols.has('tenant_id') && !out.tenant_id) out.tenant_id = tenantId || DEMO_TENANT_ID
  if (table === 'erp_users' && out.password_hash) {
    const plain = String(out.password_hash)
    // Accept existing scrypt hashes (e.g. copied users) but never store plain text.
    if (plain && !plain.startsWith('scrypt$')) out.password_hash = hashPassword(plain)
  }
  if (cols.has('created_at') && !out.created_at) out.created_at = new Date().toISOString()
  if (cols.has('updated_at') && !out.updated_at) out.updated_at = new Date().toISOString()
  return out
}

function runInsert(db, body, tenantId) {
  const { table } = body
  const cols = columnsOf(db, table)
  const rows = asArray(body.values).map((r) => prepareRow(db, table, r, cols, tenantId))
  if (!rows.length) return { data: [], error: null }
  const ids = []
  for (const row of rows) {
    const keys = Object.keys(row)
    const sql = `INSERT INTO ${quoteIdent(table)} (${keys.map(quoteIdent).join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`
    db.prepare(sql).run(...keys.map((k) => row[k]))
    if (row.id) ids.push(row.id)
  }
  if (body.returning) {
    if (!ids.length) return { data: [], error: null }
    const found = db.prepare(`SELECT * FROM ${quoteIdent(table)} WHERE id IN (${ids.map(() => '?').join(', ')})`).all(...ids)
    return { data: sanitizeRows(table, found.map(decodeRow)), error: null }
  }
  return { data: null, error: null }
}

// Upsert without INSERT OR REPLACE: REPLACE deletes the conflicting row first,
// so a client that guessed another tenant's id could overwrite that tenant's
// data. Here the lookup is always tenant-scoped and the update runs by id.
function runUpsert(db, body, tenantId) {
  const { table } = body
  const cols = columnsOf(db, table)
  const tenantScoped = cols.has('tenant_id')
  const hasId = cols.has('id')
  const rows = asArray(body.values).map((r) => prepareRow(db, table, r, cols, tenantId))
  if (!rows.length) return { data: [], error: null }

  const conflict = String(body.onConflict || '')
    .split(',')
    .map((c) => c.trim())
    .filter((c) => c && cols.has(c))
  const matchKeys = conflict.length ? conflict : (hasId ? ['id'] : [])
  const ids = []

  for (const row of rows) {
    const canMatch = matchKeys.length > 0 && matchKeys.every((k) => row[k] !== undefined && row[k] !== null)
    let existing = null
    let where = null
    let whereParams = null
    if (canMatch) {
      where = matchKeys.map((k) => `${quoteIdent(k)} = ?`)
      whereParams = matchKeys.map((k) => row[k])
      if (tenantScoped) { where.push('tenant_id = ?'); whereParams.push(tenantId) }
      const selectSql = hasId ? 'id' : '1 AS id'
      existing = db.prepare(`SELECT ${selectSql} FROM ${quoteIdent(table)} WHERE ${where.join(' AND ')} LIMIT 1`).get(...whereParams)
    }

    if (existing) {
      const updateKeys = Object.keys(row).filter((k) => k !== 'id' && k !== 'tenant_id' && k !== 'created_at')
      if (updateKeys.length) {
        const setSql = updateKeys.map((k) => `${quoteIdent(k)} = ?`).join(', ')
        if (hasId) {
          db.prepare(`UPDATE ${quoteIdent(table)} SET ${setSql} WHERE id = ?`).run(...updateKeys.map((k) => row[k]), existing.id)
        } else {
          db.prepare(`UPDATE ${quoteIdent(table)} SET ${setSql} WHERE ${where.join(' AND ')}`).run(...updateKeys.map((k) => row[k]), ...whereParams)
        }
      }
      if (hasId) ids.push(existing.id)
    } else {
      const keys = Object.keys(row)
      db.prepare(`INSERT INTO ${quoteIdent(table)} (${keys.map(quoteIdent).join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`).run(...keys.map((k) => row[k]))
      if (row.id) ids.push(row.id)
    }
  }

  if (body.returning && ids.length) {
    const found = db.prepare(`SELECT * FROM ${quoteIdent(table)} WHERE id IN (${ids.map(() => '?').join(', ')})`).all(...ids)
    return { data: sanitizeRows(table, found.map(decodeRow)), error: null }
  }
  return { data: null, error: null }
}

function runUpdate(db, body, tenantId) {
  const { table } = body
  const cols = columnsOf(db, table)
  const values = { ...(body.values || {}) }
  delete values.id
  if (cols.has('tenant_id')) delete values.tenant_id
  if (cols.has('updated_at') && values.updated_at === undefined) values.updated_at = new Date().toISOString()
  const keys = Object.keys(values).filter((k) => cols.has(k))
  if (!keys.length) return { data: [], error: null }
  const prepared = prepareRow(db, table, values, cols, tenantId, { isUpdate: true })
  const where = buildWhere(body.filters, cols)
  const setSql = keys.map((k) => `${quoteIdent(k)} = ?`).join(', ')
  const sql = `UPDATE ${quoteIdent(table)} SET ${setSql}${where.sql}`
  db.prepare(sql).run(...keys.map((k) => prepared[k]), ...where.params)
  if (body.returning) {
    const found = db.prepare(`SELECT * FROM ${quoteIdent(table)}${where.sql}`).all(...where.params)
    return { data: sanitizeRows(table, found.map(decodeRow)), error: null }
  }
  return { data: null, error: null }
}

function runDelete(db, body, tenantId) {
  const { table } = body
  const cols = columnsOf(db, table)
  const where = buildWhere(body.filters, cols)
  if (!where.sql) return { data: null, error: { message: 'Refusing to delete without a filter' } }
  db.prepare(`DELETE FROM ${quoteIdent(table)}${where.sql}`).run(...where.params)
  return { data: null, error: null }
}

// ---------- tenant-scoped query router ----------

function withTenantFilter(filters, tenantId) {
  return [...(filters || []), { col: 'tenant_id', op: 'eq', value: tenantId }]
}

function handleQuery(body, auth) {
  const db = getDb()
  const table = String(body.table || '')
  if (!table || !tableExists(db, table)) {
    return { data: null, error: { message: `Table "${table}" does not exist in the local database` } }
  }
  if (RESERVED_TABLES.has(table) || table.startsWith('sqlite_')) {
    return { data: null, error: { message: 'This table is not accessible' } }
  }

  const action = String(body.action || 'select')
  const cols = columnsOf(db, table)
  const tenantScoped = cols.has('tenant_id')
  const isTenants = table === 'tenants'

  if (READ_ONLY_TABLES.has(table) && action !== 'select') {
    return { data: null, error: { message: `"${table}" is read-only` } }
  }

  if (isTenants) {
    if (action === 'insert' || action === 'delete') {
      return { data: null, error: { message: 'Create companies through the signup screen' } }
    }
    if (action === 'update' && (body.values?.id || body.values?.slug)) {
      delete body.values.id
      delete body.values.slug
    }
    body = { ...body, filters: [...(body.filters || []), { col: 'id', op: 'eq', value: auth.tenantId }] }
    return runAction(db, table, action, body, auth.tenantId)
  }

  if (tenantScoped) {
    if (action === 'insert' || action === 'upsert') {
      const values = asArray(body.values).map((row) => ({ ...row, tenant_id: auth.tenantId }))
      body = { ...body, values }
    } else {
      body = { ...body, filters: withTenantFilter(body.filters, auth.tenantId) }
    }
  }

  return runAction(db, table, action, body, auth.tenantId)
}

function runAction(db, table, action, body, tenantId) {
  switch (action) {
    case 'select': return runSelect(db, body)
    case 'insert': return runInsert(db, body, tenantId)
    case 'upsert': return runUpsert(db, body, tenantId)
    case 'update': return runUpdate(db, body, tenantId)
    case 'delete': return runDelete(db, body, tenantId)
    default: return { data: null, error: { message: `Unknown action "${action}"` } }
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

function tenantForUser(db, user) {
  const userId = user.id
  const membership = db
    .prepare(`SELECT tu.role AS member_role, t.* FROM tenant_users tu JOIN tenants t ON t.id = tu.tenant_id
              WHERE tu.user_id = ? AND tu.status = 'Active' LIMIT 1`)
    .get(userId)
  if (membership) return decodeRow(membership)

  // Accounts created from the Users & Roles screen may not have an explicit
  // membership row. Fall back to the tenant stored on the user.
  if (user.tenant_id) {
    const tenant = db.prepare('SELECT * FROM tenants WHERE id = ? LIMIT 1').get(user.tenant_id)
    if (tenant) return decodeRow(tenant)
  }
  return null
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase()
}

function handleLogin(body) {
  const db = getDb()
  const email = normalizeEmail(body.email)
  const password = String(body.password || '')
  if (!email || !password) return { data: null, error: { message: 'Email and password are required' } }

  const row = db.prepare('SELECT * FROM erp_users WHERE LOWER(email) = ? LIMIT 1').get(email)
  if (!row || !verifyPassword(password, row.password_hash)) {
    return { data: null, error: { message: 'Invalid email or password' } }
  }
  if (String(row.status || 'Active') !== 'Active') {
    return { data: null, error: { message: 'This account is not active. Contact your administrator.' } }
  }

  const tenant = tenantForUser(db, row)
  if (!tenant) {
    return { data: null, error: { message: 'No active company is linked to this account.' } }
  }

  db.prepare('UPDATE erp_users SET last_login = ? WHERE id = ?').run(new Date().toISOString(), row.id)
  const { token, expires_at } = createSession(db, row.id, tenant.id)
  return {
    data: { user: publicUser(row), tenant, access_token: token, expires_at },
    error: null,
  }
}

function uniqueSlug(db, base) {
  const clean = String(base || 'company').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'company'
  let slug = clean
  let n = 2
  while (db.prepare('SELECT 1 FROM tenants WHERE slug = ?').get(slug)) {
    slug = `${clean}-${n++}`
  }
  return slug
}

function handleSignup(body) {
  const db = getDb()
  const email = normalizeEmail(body.email)
  const password = String(body.password || '')
  const fullName = String(body.fullName || '').trim() || email
  const company = String(body.company || '').trim()

  if (!email || !password) return { data: null, error: { message: 'Email and password are required' } }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { data: null, error: { message: 'Enter a valid email address' } }
  if (password.length < 6) return { data: null, error: { message: 'Password must be at least 6 characters' } }
  if (!company) return { data: null, error: { message: 'Company name is required' } }

  const exists = db.prepare('SELECT id FROM erp_users WHERE LOWER(email) = ?').get(email)
  if (exists) return { data: null, error: { message: 'That email is already registered' } }

  const tenantId = randomUUID()
  const userId = randomUUID()
  const now = new Date()
  const expires = new Date(now.getTime() + 30 * 86400000)

  db.exec('BEGIN')
  try {
    db.prepare(
      `INSERT INTO tenants (id, name, slug, plan_name, credit_balance, credit_used, credit_initial,
                            currency, expires_at, status, settings, created_at, updated_at)
       VALUES (?, ?, ?, 'Starter', 100, 0, 100, 'AED', ?, 'Active', ?, ?, ?)`
    ).run(
      tenantId, company, uniqueSlug(db, company), expires.toISOString().slice(0, 10),
      JSON.stringify({ region: 'UAE', onboarding: 'signup' }), now.toISOString(), now.toISOString()
    )

    db.prepare(
      `INSERT INTO erp_users (id, tenant_id, username, full_name, email, password_hash, role, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'Admin', 'Active', ?, ?)`
    ).run(
      userId, tenantId, email.split('@')[0] || 'admin', fullName, email,
      hashPassword(password), now.toISOString(), now.toISOString()
    )

    db.prepare(
      `INSERT INTO tenant_users (id, tenant_id, user_id, role, status, created_at)
       VALUES (?, ?, ?, 'Owner', 'Active', ?)`
    ).run(randomUUID(), tenantId, userId, now.toISOString())

    seedTenantDefaults(db, tenantId, company, { email })

    db.exec('COMMIT')
  } catch (e) {
    db.exec('ROLLBACK')
    return { data: null, error: { message: e?.message || 'Signup failed' } }
  }

  const user = db.prepare('SELECT * FROM erp_users WHERE id = ?').get(userId)
  const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenantId)
  const { token, expires_at } = createSession(db, userId, tenantId)
  return {
    data: { user: publicUser(user), tenant: decodeRow(tenant), access_token: token, expires_at },
    error: null,
  }
}

function handleSession(auth) {
  const db = getDb()
  const tenant = tenantForUser(db, auth.user)
  if (!tenant) return { data: null, error: { message: 'No active company is linked to this account.' } }
  return { data: { user: publicUser(auth.user), tenant }, error: null }
}

// ---------- storage ----------

function safeStoragePath(tenantId, bucket, filePath) {
  const cleanTenant = String(tenantId || '').replace(/[^A-Za-z0-9._-]/g, '')
  const cleanBucket = String(bucket).replace(/[^A-Za-z0-9._-]/g, '')
  const cleanPath = String(filePath).replace(/\\/g, '/').replace(/^\/+/, '')
  if (!cleanTenant || !cleanBucket || cleanPath.split('/').includes('..')) throw new Error('Invalid file path')
  const base = path.resolve(storageDir, 'tenants', cleanTenant, cleanBucket)
  const full = path.resolve(base, cleanPath)
  if (!full.startsWith(base + path.sep) && full !== base) throw new Error('Invalid file path')
  return full
}

function handleUpload(body, tenantId) {
  const full = safeStoragePath(tenantId, body.bucket, body.path)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  const base64 = String(body.data || '').replace(/^data:[^;]+;base64,/, '')
  fs.writeFileSync(full, Buffer.from(base64, 'base64'))
  return { data: { path: body.path }, error: null }
}

function handleRemove(body, tenantId) {
  const full = safeStoragePath(tenantId, body.bucket, body.path)
  if (fs.existsSync(full)) fs.unlinkSync(full)
  return { data: null, error: null }
}

const MIME = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8', '.csv': 'text/csv; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
}

function serveFile(res, tenantId, bucket, filePath) {
  const full = safeStoragePath(tenantId, bucket, filePath)
  if (!fs.existsSync(full)) { res.statusCode = 404; res.end('Not found'); return }
  res.statusCode = 200
  res.setHeader('Content-Type', MIME[path.extname(full).toLowerCase()] || 'application/octet-stream')
  res.setHeader('Cache-Control', 'private, max-age=3600')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  fs.createReadStream(full).pipe(res)
}

// ---------- rpc / functions ----------

function handleRpc(body, auth) {
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
    const template = db
      .prepare('SELECT * FROM recurring_invoices WHERE id = ? AND tenant_id = ?')
      .get(params.p_recurring_id, auth.tenantId)
    if (!template) return { data: null, error: { message: 'Recurring template not found' } }
    const items = typeof template.items === 'string' ? JSON.parse(template.items) : template.items
    const subtotal = Number(template.subtotal || 0)
    const vat = Number(template.vat_amount || 0)
    const id = randomUUID()
    const invoiceNo = `INV-REC-${Date.now().toString().slice(-6)}`
    db.prepare(`INSERT INTO invoices (id, tenant_id, invoice_no, customer_name, customer_id, items, subtotal, vat_percent,
                vat_amount, grand_total, amount_paid, balance, status, invoice_date, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'Pending', ?, ?)`)
      .run(id, auth.tenantId, invoiceNo, template.customer_name, template.customer_id, JSON.stringify(items || []),
        subtotal, template.vat_percent, vat, subtotal + vat, subtotal + vat,
        new Date().toISOString().slice(0, 10), new Date().toISOString())
    const next = new Date()
    next.setMonth(next.getMonth() + 1)
    db.prepare('UPDATE recurring_invoices SET last_run_date = ?, next_run_date = ?, run_count = run_count + 1 WHERE id = ? AND tenant_id = ?')
      .run(new Date().toISOString().slice(0, 10), next.toISOString().slice(0, 10), template.id, auth.tenantId)
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
    res.setHeader('X-Content-Type-Options', 'nosniff')

    if (route === '/health') return send(res, 200, { ok: true, mode: 'sqlite', db: 'data/erp.db' })

    try {
      const db = getDb()

      if (req.method === 'GET' && route.startsWith('/storage/file/')) {
        const auth = authenticate(db, req, url)
        if (!auth) return error(res, 'Authentication required', 401)
        const rest = decodeURIComponent(route.slice('/storage/file/'.length))
        const slash = rest.indexOf('/')
        if (slash < 0) return error(res, 'Invalid file path', 400)
        return serveFile(res, auth.tenantId, rest.slice(0, slash), rest.slice(slash + 1))
      }

      const body = req.method === 'GET' ? {} : await readBody(req)

      // Public auth endpoints
      if (route === '/auth/login' && req.method === 'POST') {
        const ip = clientIp(req)
        const key = `login:${ip}`
        if (rateLimited(key, 20, 10 * 60 * 1000)) {
          return error(res, 'Too many sign-in attempts. Please try again later.', 429)
        }
        const result = handleLogin(body)
        if (!result.error) authRate.delete(key)
        return send(res, 200, result)
      }
      if (route === '/auth/signup' && req.method === 'POST') {
        if (rateLimited(`signup:${clientIp(req)}`, 5, 60 * 60 * 1000)) {
          return error(res, 'Too many signups from this address. Please try again later.', 429)
        }
        return send(res, 200, handleSignup(body))
      }
      if ((route === '/auth/session' || route === '/auth/getUser') && req.method === 'POST') {
        const auth = authenticate(db, req, url)
        if (!auth) return send(res, 200, { data: null, error: { message: 'Not signed in' } })
        return send(res, 200, handleSession(auth))
      }
      if (route === '/auth/logout' && req.method === 'POST') {
        deleteSession(db, bearerToken(req, url))
        return send(res, 200, { data: null, error: null })
      }

      // Everything below requires a valid session.
      const auth = requireAuth(db, req, url, res)
      if (!auth) return

      if (route === '/db' && req.method === 'POST') {
        return send(res, 200, handleQuery(body, auth))
      }
      if (route === '/storage/upload' && req.method === 'POST') {
        return send(res, 200, handleUpload(body, auth.tenantId))
      }
      if (route === '/storage/remove' && req.method === 'POST') {
        return send(res, 200, handleRemove(body, auth.tenantId))
      }
      if (route === '/rpc' && req.method === 'POST') {
        return send(res, 200, handleRpc(body, auth))
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
