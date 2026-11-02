// Drop-in replacement for src/utils/supabaseClient.ts.
// When VITE_LOCAL_DB=true (default in dev), it talks to the local /api instead of Supabase.
// The API shape mirrors the methods used by the app: from().select().eq()... etc.

const LOCAL_API = import.meta.env.VITE_LOCAL_API || '/api'
const USE_LOCAL = String(import.meta.env.VITE_LOCAL_DB || 'true').toLowerCase() !== 'false'

function post(path, body) {
  return fetch(`${LOCAL_API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then((r) => r.json())
}

function getPublicUrl(bucket, path) {
  return { data: { publicUrl: `${LOCAL_API}/storage/file/${bucket}/${path.split('/').map(encodeURIComponent).join('/')}` } }
}

class QueryBuilder {
  constructor(table, client) {
    this.table = table
    this.client = client
    this._action = 'select'
    this._columns = '*'
    this._filters = []
    this._orders = []
    this._values = null
    this._limit = undefined
    this._offset = 0
    this._single = false
    this._maybeSingle = false
    this._count = null
    this._head = false
    this._returning = false
  }

  select(columns, opts = {}) {
    if (typeof columns === 'object' && columns && !Array.isArray(columns)) {
      opts = columns
      columns = '*'
    }
    this._columns = columns || '*'
    if (opts.count) this._count = opts.count
    if (opts.head) this._head = true
    this._returning = true
    return this
  }

  insert(values) {
    this._action = 'insert'
    this._values = values
    return this
  }

  update(values) {
    this._action = 'update'
    this._values = values
    return this
  }

  upsert(values) {
    this._action = 'upsert'
    this._values = values
    return this
  }

  delete() {
    this._action = 'delete'
    return this
  }

  eq(col, value) { this._filters.push({ col, op: 'eq', value }); return this }
  neq(col, value) { this._filters.push({ col, op: 'neq', value }); return this }
  gt(col, value) { this._filters.push({ col, op: 'gt', value }); return this }
  gte(col, value) { this._filters.push({ col, op: 'gte', value }); return this }
  lt(col, value) { this._filters.push({ col, op: 'lt', value }); return this }
  lte(col, value) { this._filters.push({ col, op: 'lte', value }); return this }
  like(col, pattern) { this._filters.push({ col, op: 'like', value: pattern }); return this }
  ilike(col, pattern) { this._filters.push({ col, op: 'ilike', value: pattern }); return this }
  is(col, value) { this._filters.push({ col, op: 'is', value }); return this }
  in(col, values) { this._filters.push({ col, op: 'in', value: values }); return this }
  contains(col, value) { this._filters.push({ col, op: 'contains', value }); return this }
  containedBy(col, value) { this._filters.push({ col, op: 'contains', value }); return this } // approximation
  overlaps() { return this }
  match(obj) { this._filters.push({ col: '__match__', op: 'match', value: obj }); return this }
  or() { return this }
  not() { return this }
  filter() { return this }

  order(col, opts = {}) { this._orders.push({ col, ascending: opts.ascending !== false }); return this }
  limit(n) { this._limit = n; return this }
  range(from, to) { this._offset = from; this._limit = to - from + 1; return this }

  single() { this._single = true; return this }
  maybeSingle() { this._maybeSingle = true; return this }

  async execute() {
    const payload = {
      table: this.table,
      action: this._action,
      columns: this._columns,
      filters: this._filters,
      orders: this._orders,
      values: this._values,
      limit: this._limit,
      offset: this._offset,
      single: this._single,
      maybeSingle: this._maybeSingle,
      count: this._count,
      head: this._head,
      returning: true,
    }
    return post('/db', payload)
  }

  then(resolve, reject) {
    return this.execute().then(resolve, reject)
  }

  catch(reject) {
    return this.execute().catch(reject)
  }
}

const localAuth = {
  async getSession() {
    try {
      const raw = localStorage.getItem('erp-local-auth')
      if (!raw) return { data: { session: null }, error: null }
      const parsed = JSON.parse(raw)
      return { data: { session: { user: parsed.user } }, error: null }
    } catch {
      return { data: { session: null }, error: null }
    }
  },
  onAuthStateChange(cb) {
    const handler = () => { localAuth.getSession().then(({ data }) => cb('SIGNED_IN', data.session)) }
    window.addEventListener('storage', handler)
    return { data: { subscription: { unsubscribe: () => window.removeEventListener('storage', handler) } } }
  },
  async signInWithPassword({ email, password }) {
    const res = await post('/auth/login', { email, password })
    if (res.error) return { data: { user: null }, error: res.error }
    localStorage.setItem('erp-local-auth', JSON.stringify(res.data))
    localStorage.setItem('erp-auth', JSON.stringify(res.data))
    return { data: { user: res.data.user }, error: null }
  },
  async signUp({ email, password }) {
    const res = await post('/auth/signup', { email, password })
    if (res.error) return { data: { user: null }, error: res.error }
    if (res.data?.user) {
      localStorage.setItem('erp-local-auth', JSON.stringify(res.data))
      localStorage.setItem('erp-auth', JSON.stringify(res.data))
    }
    return { data: { user: res.data?.user || null }, error: null }
  },
  async signOut() {
    localStorage.removeItem('erp-local-auth')
    localStorage.removeItem('erp-auth')
    await post('/auth/logout', {})
    return { error: null }
  },
}

const localStorageApi = {
  from(bucket) {
    return {
      async upload(path, file) {
        let data
        if (file instanceof File || file instanceof Blob) {
          data = await new Promise((resolve) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result)
            reader.readAsDataURL(file)
          })
        } else if (file instanceof ArrayBuffer) {
          const bytes = new Uint8Array(file)
          let binary = ''
          for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
          data = 'data:application/octet-stream;base64,' + btoa(binary)
        } else {
          data = String(file)
        }
        return post('/storage/upload', { bucket, path, data })
      },
      getPublicUrl(path) {
        return getPublicUrl(bucket, path)
      },
      async remove(paths) {
        for (const p of paths || []) await post('/storage/remove', { bucket, path: p })
        return { data: null, error: null }
      },
      async download(path) {
        const res = await fetch(`${LOCAL_API}/storage/file/${bucket}/${path.split('/').map(encodeURIComponent).join('/')}`)
        if (!res.ok) return { data: null, error: { message: 'Download failed' } }
        return { data: await res.blob(), error: null }
      },
    }
  },
}

const localFunctions = {
  async invoke(name, opts = {}) {
    return post(`/functions/${name}`, opts)
  },
}

const localClient = {
  from(table) {
    return new QueryBuilder(table, localClient)
  },
  auth: localAuth,
  storage: localStorageApi,
  functions: localFunctions,
  channel() { return { on: () => ({ subscribe: () => ({}) }), subscribe: () => ({}) } },
  removeChannel() {},
  rpc(name, params) {
    const run = () =>
      post('/rpc', { name, params }).then((res) => {
        const rows = res.error ? null : (Array.isArray(res.data) ? res.data : res.data == null ? [] : [res.data])
        return { data: rows, error: res.error, count: rows?.length ?? 0 }
      })
    return {
      then: (ok, bad) => run().then(ok, bad),
      catch: (bad) => run().catch(bad),
      single: () => run().then((r) => ({ ...r, data: r.data?.[0] ?? null })),
      maybeSingle: () => run().then((r) => ({ ...r, data: r.data?.[0] ?? null })),
    }
  },
}

// Local demo convenience: open the app signed in as the seeded administrator.
// Signing out sets a flag so the login screen is not skipped again.
const DEMO_TENANT = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Demo Company LLC',
  plan_name: 'Enterprise',
  credit_balance: 750,
  credit_used: 250,
  credit_initial: 1000,
  currency: 'AED',
  status: 'Active',
}
const DEMO_SESSION = {
  user: { id: '00000000-0000-0000-0000-000000000002', email: 'admin@local.test', user_metadata: { full_name: 'Demo Admin' } },
  tenant: DEMO_TENANT,
}
if (USE_LOCAL && typeof localStorage !== 'undefined') {
  if (!localStorage.getItem('erp-auth') && !localStorage.getItem('erp-local-signed-out')) {
    localStorage.setItem('erp-auth', JSON.stringify(DEMO_SESSION))
    localStorage.setItem('erp-local-auth', JSON.stringify(DEMO_SESSION))
  }
}

const originalSignOut = localAuth.signOut
localAuth.signOut = async () => {
  localStorage.setItem('erp-local-signed-out', '1')
  return originalSignOut()
}
const originalSignIn = localAuth.signInWithPassword
localAuth.signInWithPassword = async (creds) => {
  const result = await originalSignIn(creds)
  if (!result.error) localStorage.removeItem('erp-local-signed-out')
  return result
}

export const supabase = localClient
export const isSupabaseConfigured = true
export default supabase
