import { useEffect, useState } from 'react'

const LOCAL_API = (import.meta as any).env?.VITE_LOCAL_API || '/api'

type Entity = { key: string; label: string; source: string; note: string }
type ReportRow = { entity: string; source?: string; imported: number; skipped: number; errors: string[]; ms?: number }

const ENTITIES: Entity[] = [
  { key: 'accounts', label: 'Chart of Accounts', source: 'asmast', note: 'Legacy GL accounts with opening balances' },
  { key: 'customers', label: 'Customers', source: 'asmast + ASADR', note: 'Accounts with type 1205/1210 plus address book' },
  { key: 'suppliers', label: 'Suppliers', source: 'asmast + ASADR', note: 'Accounts with type 2205/2210 plus address book' },
  { key: 'products', label: 'Stock Items', source: 'asicm', note: 'Item master with cost, price, VAT and stock' },
  { key: 'invoices', label: 'A/R Invoices', source: 'asinv', note: 'Sales invoices (headers only)' },
  { key: 'purchase_invoices', label: 'A/P Invoices', source: 'aspinv', note: 'Purchase invoices (headers only)' },
  { key: 'journal_entries', label: 'Journal Entries (GL)', source: 'astran', note: 'Posted double-entry vouchers. Max rows = number of vouchers' },
  { key: 'stock_movements', label: 'Stock Movements', source: 'asict', note: 'Item in/out movements from sales, purchases and returns' },
]

const DEFAULT_FORM = {
  server: '',
  port: '1433',
  instanceName: '',
  database: '',
  user: '',
  password: '',
  encrypt: false,
  trustServerCertificate: true,
}

async function call(path: string, body: any) {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('erp-token') : null
  const res = await fetch(`${LOCAL_API}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({ data: null, error: { message: `HTTP ${res.status}` } }))
  if (json?.error) throw new Error(json.error.message || 'Request failed')
  return json.data
}

const SqlServerImport = () => {
  const [form, setForm] = useState<any>({ ...DEFAULT_FORM })
  const [testing, setTesting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [info, setInfo] = useState<any>(null)
  const [error, setError] = useState('')
  const [report, setReport] = useState<ReportRow[] | null>(null)
  const [selected, setSelected] = useState<string[]>(ENTITIES.map((e) => e.key))
  const [limit, setLimit] = useState('2000')
  const [progress, setProgress] = useState<{ done: number; total: number; current: string; startedAt: number } | null>(null)
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!importing) return
    const id = setInterval(() => setTick((t) => t + 1), 500)
    return () => clearInterval(id)
  }, [importing])

  const set = (key: string, value: any) => setForm((f: any) => ({ ...f, [key]: value }))
  const labelOf = (key: string) => ENTITIES.find((e) => e.key === key)?.label || key

  const connection = () => ({
    ...form,
    port: Number(form.port) || 1433,
    encrypt: Boolean(form.encrypt),
  })

  const test = async () => {
    setTesting(true); setError(''); setInfo(null); setReport(null)
    try {
      const result = await call('/mssql/test', { connection: connection() })
      setInfo(result)
    } catch (e: any) {
      setError(e?.message || 'Connection failed')
    }
    setTesting(false)
  }

  const run = async () => {
    if (!selected.length) { setError('Select at least one entity.'); return }
    setImporting(true); setError(''); setReport([])
    const startedAt = Date.now()
    const rows: ReportRow[] = []
    setProgress({ done: 0, total: selected.length, current: selected[0], startedAt })
    try {
      for (let i = 0; i < selected.length; i++) {
        const key = selected[i]
        setProgress({ done: i, total: selected.length, current: key, startedAt })
        const result = await call('/mssql/import', {
          connection: connection(),
          entities: [key],
          limit: Number(limit) || 0,
        })
        rows.push(...(result.report || []))
        setReport([...rows])
        setProgress({ done: i + 1, total: selected.length, current: key, startedAt })
      }
    } catch (e: any) {
      setError(e?.message || 'Import failed')
    }
    setImporting(false)
    setProgress(null)
  }

  const toggle = (key: string) => {
    setSelected((list) => (list.includes(key) ? list.filter((k) => k !== key) : [...list, key]))
  }

  const stats: Record<string, number> = info?.tables || {}
  const sourceCount = (source: string) => {
    const table = source.split(' ')[0]
    return stats[table]
  }

  return (
    <div className="doc-workspace">
      <div className="coa-head"><h3>🗄️ SQL Server Migration — import legacy ERP data</h3></div>

      <p style={{ fontSize: 12, color: '#64748b', margin: '6px 0 0' }}>
        Connects to your Microsoft SQL Server with the credentials below, reads the legacy tables and writes the rows into
        <b> this company</b>. Credentials are used for this request only and are not stored. Re-running is safe: rows whose
        key already exists are skipped.
      </p>

      {error && <div className="inv-error" style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>⚠️ {error}</div>}

      <div className="report-section" style={{ marginTop: 14 }}>
        <h4 style={{ margin: '0 0 10px' }}>1. Connection</h4>
        <div className="inv-grid coa-form-grid">
          <label>Server / host
            <input value={form.server} onChange={(e) => set('server', e.target.value)} placeholder="sreeji, sreeji\SQ2022 or sreeji,1475" />
          </label>
          <label>Port
            <input value={form.port} onChange={(e) => set('port', e.target.value)} placeholder="1433" />
          </label>
          <label>Instance (optional)
            <input value={form.instanceName} onChange={(e) => set('instanceName', e.target.value)} placeholder="SQ2022" />
          </label>
          <label>Database
            <input value={form.database} onChange={(e) => set('database', e.target.value)} placeholder="COM_BARAB" />
          </label>
          <label>SQL login
            <input value={form.user} onChange={(e) => set('user', e.target.value)} placeholder="readonly_user" autoComplete="off" />
          </label>
          <label>Password
            <input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} autoComplete="new-password" />
          </label>
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap', fontSize: 13 }}>
          <label><input type="checkbox" checked={Boolean(form.encrypt)} onChange={(e) => set('encrypt', e.target.checked)} /> Encrypt connection</label>
          <label><input type="checkbox" checked={Boolean(form.trustServerCertificate)} onChange={(e) => set('trustServerCertificate', e.target.checked)} /> Trust server certificate</label>
        </div>
        <div style={{ marginTop: 10 }}>
          <button className="btn-primary" disabled={testing || importing} onClick={test}>
            {testing ? 'Connecting…' : '🔌 Test connection'}
          </button>
        </div>

        {info && (
          <div style={{ marginTop: 12, padding: '10px 12px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, fontSize: 13 }}>
            ✅ Connected to <b>{info.server}</b> / <b>{info.database}</b> (SQL Server {info.version}).
            <div style={{ marginTop: 4, color: '#475569' }}>
              Legacy rows: {ENTITIES.map((e) => {
                const n = sourceCount(e.source)
                return n === undefined ? null : <span key={e.key} style={{ marginRight: 12 }}>{e.source.split(' ')[0]}={n.toLocaleString()}</span>
              })}
            </div>
          </div>
        )}
      </div>

      <div className="report-section" style={{ marginTop: 14 }}>
        <h4 style={{ margin: '0 0 10px' }}>2. What to import</h4>
        <table className="data-grid report-table">
          <thead><tr><th style={{ width: 40 }}>✓</th><th>Entity</th><th>Source table</th><th>Legacy rows</th><th>Notes</th></tr></thead>
          <tbody>
            {ENTITIES.map((e) => {
              const count = sourceCount(e.source)
              return (
                <tr key={e.key}>
                  <td><input type="checkbox" checked={selected.includes(e.key)} onChange={() => toggle(e.key)} /></td>
                  <td>{e.label}</td>
                  <td><code>{e.source}</code></td>
                  <td>{count === undefined ? '—' : count.toLocaleString()}</td>
                  <td style={{ color: '#64748b' }}>{e.note}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
          <label style={{ fontSize: 13 }}>Max rows per entity
            <input style={{ width: 110, marginLeft: 6 }} value={limit} onChange={(e) => setLimit(e.target.value)} />
          </label>
          <span style={{ fontSize: 12, color: '#64748b' }}>0 = everything (may take a while)</span>
          <button className="btn-primary" disabled={importing || testing || !info} onClick={run}>
            {importing ? 'Importing… keep this tab open' : '⬇️ Start import'}
          </button>
        </div>
        {importing && progress && (() => {
          const pct = Math.round((progress.done / Math.max(progress.total, 1)) * 100)
          const seconds = Math.max(0, Math.round((Date.now() - progress.startedAt) / 1000))
          return (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#475569', marginBottom: 5 }}>
                <span>{`Importing ${labelOf(progress.current)}… (${progress.done}/${progress.total})`}</span>
                <span>{pct}% · {seconds}s</span>
              </div>
              <div className="mig-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
                <div className="mig-progress-fill" style={{ width: `${Math.max(pct, 3)}%` }} />
              </div>
            </div>
          )
        })()}
      </div>

      {report && (
        <div className="report-section" style={{ marginTop: 14 }}>
          <h4 style={{ margin: '0 0 10px' }}>3. Result</h4>
          <table className="data-grid report-table">
            <thead><tr><th>Entity</th><th>Source</th><th>Imported</th><th>Skipped</th><th>Errors</th><th>Time</th></tr></thead>
            <tbody>
              {report.map((r) => (
                <tr key={r.entity}>
                  <td>{ENTITIES.find((e) => e.key === r.entity)?.label || r.entity}</td>
                  <td><code>{r.source || '—'}</code></td>
                  <td style={{ color: r.imported ? '#047857' : undefined }}><b>{r.imported}</b></td>
                  <td>{r.skipped}</td>
                  <td style={{ color: r.errors.length ? '#dc2626' : undefined }}>{r.errors.length}</td>
                  <td>{r.ms ? `${(r.ms / 1000).toFixed(1)}s` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {report.some((r) => r.errors.length > 0) && (
            <pre style={{ marginTop: 10, padding: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, fontSize: 12, whiteSpace: 'pre-wrap' }}>
              {report.flatMap((r) => r.errors.map((e) => `${r.entity}: ${e}`)).slice(0, 40).join('\n')}
            </pre>
          )}
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
            Open <b>Chart of Accounts</b>, <b>Customer</b>, <b>Supplier</b>, <b>Stock Master</b>, <b>A/R Invoice</b>, <b>A/P Invoice</b>,
            <b> Journal Entries</b> or <b>Stock In / Out</b> to see the imported rows.
          </p>
        </div>
      )}
    </div>
  )
}

export default SqlServerImport
