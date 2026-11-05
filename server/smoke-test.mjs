// Local regression test for authentication, tenant isolation and storage.
//
// It always runs against a fresh throwaway data directory, so it can never
// read or modify data/erp.db.
//
// Usage: node server/smoke-test.mjs

import http from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'erp-smoke-'))
process.env.ERP_DATA_DIR = tempDir

const { createApiHandler } = await import('./api.mjs')

const server = http.createServer(createApiHandler())
await new Promise((resolve) => server.listen(4199, '127.0.0.1', resolve))
const base = 'http://127.0.0.1:4199'

const json = async (route, body, token) => {
  const headers = { 'content-type': 'application/json' }
  if (token) headers.authorization = `Bearer ${token}`
  const res = await fetch(base + route, { method: 'POST', headers, body: JSON.stringify(body || {}) })
  return { status: res.status, body: await res.json() }
}

let failures = 0
const check = (name, ok, extra = '') => {
  if (!ok) failures += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`)
}

try {
  console.log(`data dir: ${tempDir}`)

  const unauth = await json('/db', { table: 'customers', action: 'select' })
  check('unauthenticated query is rejected', unauth.status === 401, String(unauth.status))

  const login = await json('/auth/login', { email: 'admin@local.test', password: 'admin123' })
  const demoToken = login.body.data?.access_token
  check('demo login returns a session', Boolean(demoToken), login.body.data?.tenant?.name)

  const demoCustomers = await json('/db', { table: 'customers', action: 'select' }, demoToken)
  const demoProducts = await json('/db', { table: 'products', action: 'select' }, demoToken)
  const demoUsers = await json('/db', { table: 'erp_users', action: 'select' }, demoToken)
  check('demo customer seed is visible', demoCustomers.body.data?.length === 6, `${demoCustomers.body.data?.length} rows`)
  check('demo product seed is visible', demoProducts.body.data?.length === 12, `${demoProducts.body.data?.length} rows`)
  check('password hashes are not exposed', !JSON.stringify(demoUsers.body.data).includes('scrypt$'))

  const signup = await json('/auth/signup', {
    email: 'owner@acme.test', password: 'acme123', fullName: 'Acme Owner', company: 'Acme Trading',
  })
  const acmeToken = signup.body.data?.access_token
  check('signup creates a tenant and session', Boolean(acmeToken), signup.body.data?.tenant?.name)

  const acmeAccounts = await json('/db', { table: 'accounts', action: 'select' }, acmeToken)
  check('new tenant gets starter accounts', acmeAccounts.body.data?.length === 19, `${acmeAccounts.body.data?.length} rows`)

  const demoCustomerId = demoCustomers.body.data?.[0]?.id
  const crossTenant = await json('/db', {
    table: 'customers', action: 'select',
    filters: [{ col: 'id', op: 'eq', value: demoCustomerId }],
  }, acmeToken)
  check('cross-tenant read returns nothing', (crossTenant.body.data?.length || 0) === 0)

  const insert = await json('/db', {
    table: 'customers', action: 'insert', returning: true,
    values: {
      code: demoCustomers.body.data?.[0]?.code,
      name: 'Duplicate Code Customer',
      first_name: 'Dup',
      last_name: 'Customer',
      email: 'dup@acme.test',
    },
  }, acmeToken)
  check('same customer code is allowed in another tenant', !insert.body.error, insert.body.error?.message)

  // Upsert must update the matching row instead of inserting a duplicate.
  const upsert1 = await json('/db', {
    table: 'stock_locations', action: 'upsert', onConflict: 'product_id,warehouse_id',
    values: { product_id: 'p1', warehouse_id: 'w1', qty: 5 },
  }, acmeToken)
  const upsert2 = await json('/db', {
    table: 'stock_locations', action: 'upsert', onConflict: 'product_id,warehouse_id',
    values: { product_id: 'p1', warehouse_id: 'w1', qty: 8 },
  }, acmeToken)
  const stock = await json('/db', {
    table: 'stock_locations', action: 'select',
    filters: [{ col: 'product_id', op: 'eq', value: 'p1' }],
  }, acmeToken)
  check(
    'upsert updates instead of duplicating',
    !upsert1.body.error && !upsert2.body.error && stock.body.data?.length === 1 && Number(stock.body.data?.[0]?.qty) === 8,
    `${stock.body.data?.length} row(s), qty ${stock.body.data?.[0]?.qty}`
  )

  const created = await json('/db', {
    table: 'erp_users', action: 'insert', returning: true,
    values: {
      username: 'acmeclerk', full_name: 'Acme Clerk', email: 'clerk@acme.test',
      password_hash: 'clerk123', role: 'Accountant', status: 'Active',
    },
  }, acmeToken)
  check('user can be created from the Users screen', !created.body.error, created.body.error?.message)

  const clerkLogin = await json('/auth/login', { email: 'clerk@acme.test', password: 'clerk123' })
  check('plain-text user password is hashed and works', Boolean(clerkLogin.body.data?.access_token))

  const setting1 = await json('/db', {
    table: 'app_settings', action: 'upsert', onConflict: 'key',
    values: { key: 'country', value: 'AE' },
  }, acmeToken)
  await json('/db', {
    table: 'app_settings', action: 'upsert', onConflict: 'key',
    values: { key: 'country', value: 'QA' },
  }, acmeToken)
  const acmeSetting = await json('/db', {
    table: 'app_settings', action: 'select',
    filters: [{ col: 'key', op: 'eq', value: 'country' }],
  }, acmeToken)

  await json('/db', {
    table: 'app_settings', action: 'upsert', onConflict: 'key',
    values: { key: 'country', value: 'SA' },
  }, demoToken)
  const demoSetting = await json('/db', {
    table: 'app_settings', action: 'select',
    filters: [{ col: 'key', op: 'eq', value: 'country' }],
  }, demoToken)
  const acmeAgain = await json('/db', {
    table: 'app_settings', action: 'select',
    filters: [{ col: 'key', op: 'eq', value: 'country' }],
  }, acmeToken)
  check(
    'per-tenant settings upsert and stay isolated',
    !setting1.body.error
      && acmeSetting.body.data?.length === 1
      && acmeSetting.body.data?.[0]?.value === 'QA'
      && demoSetting.body.data?.[0]?.value === 'SA'
      && acmeAgain.body.data?.[0]?.value === 'QA',
    `acme ${acmeAgain.body.data?.[0]?.value}, demo ${demoSetting.body.data?.[0]?.value}`
  )

  const upload = await json('/storage/upload', {
    bucket: 'attachments', path: 'hello.txt', data: 'data:text/plain;base64,aGVsbG8=',
  }, acmeToken)
  const fileUrl = `${base}/storage/file/attachments/hello.txt`
  const withToken = await fetch(`${fileUrl}?token=${encodeURIComponent(acmeToken)}`)
  const withoutToken = await fetch(fileUrl)
  check(
    'storage requires a token',
    !upload.body.error && withToken.status === 200 && withoutToken.status === 401,
    `upload ${upload.body.error ? 'failed' : 'ok'}, with ${withToken.status}, without ${withoutToken.status}`
  )

  const session = await json('/auth/session', {}, acmeToken)
  check('session endpoint returns the current tenant', session.body.data?.tenant?.name === 'Acme Trading')

  await json('/auth/logout', {}, acmeToken)
  const afterLogout = await json('/auth/session', {}, acmeToken)
  check('logout invalidates the session', !afterLogout.body.data)
} finally {
  server.close()
}

console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed')
process.exitCode = failures ? 1 : 0
