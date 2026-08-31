import React, { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'
import ShareBar from './ShareBar'

export default function AuditLog() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('All')
  const [entityFilter, setEntityFilter] = useState('All')

  useEffect(() => { (async () => {
    const { data } = await supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(1000)
    setLogs(data || [])
    setLoading(false)
  })() }, [])

  const actions = ['All', ...Array.from(new Set(logs.map((l) => l.action).filter(Boolean)))]
  const entities = ['All', ...Array.from(new Set(logs.map((l) => l.entity).filter(Boolean)))]

  const filtered = logs.filter((l) => {
    const matchSearch = !search || (l.detail || '').toLowerCase().includes(search.toLowerCase()) || (l.user_email || '').toLowerCase().includes(search.toLowerCase()) || (l.entity || '').toLowerCase().includes(search.toLowerCase()) || (l.entity_id || '').toLowerCase().includes(search.toLowerCase())
    const matchAction = actionFilter === 'All' || l.action === actionFilter
    const matchEntity = entityFilter === 'All' || l.entity === entityFilter
    return matchSearch && matchAction && matchEntity
  })

  const cols = [
    { key: 'created_at', label: 'Time' },
    { key: 'action', label: 'Action' },
    { key: 'entity', label: 'Entity' },
    { key: 'entity_id', label: 'Record ID' },
    { key: 'detail', label: 'Detail' },
    { key: 'user_email', label: 'User' },
  ]
  const rows = filtered.map((l) => ({
    created_at: l.created_at, action: l.action, entity: l.entity,
    entity_id: l.entity_id || '', detail: l.detail || '', user_email: l.user_email || '',
  }))

  const actionBadge = (a: string) => {
    const m: any = { CREATE: '#10b981', UPDATE: '#3b82f6', DELETE: '#dc2626', POST: '#8b5cf6', EMAIL: '#f59e0b' }
    return <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: m[a] || '#64748b', color: '#fff' }}>{a}</span>
  }

  return (
    <div className="report-wrap">
      <div className="report-head">
        <h3>📜 Activity / Audit Trail</h3>
        <div className="report-controls">
          <input className="coa-search" placeholder="🔍 Search detail, user, entity..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12 }}>
            {actions.map((a) => <option key={a}>{a}</option>)}
          </select>
          <select value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)} style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12 }}>
            {entities.map((e) => <option key={e}>{e}</option>)}
          </select>
          <ShareBar title="Audit Log" columns={cols} rows={rows} text={'Audit Log export generated on ' + new Date().toLocaleDateString()} />
        </div>
      </div>
      <div className="report-sections">
        <div className="report-section" style={{ flexBasis: '100%' }}>
          <div style={{ marginBottom: 8, fontSize: 12, color: '#64748b' }}>{filtered.length} of {logs.length} records</div>
          <table className="data-grid report-table">
            <thead>
              <tr><th>TIME</th><th>ACTION</th><th>ENTITY</th><th>RECORD</th><th>DETAIL</th><th>USER</th></tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="empty">Loading...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={6} className="fa-empty">No activity recorded yet. Saving profiles, partners, products, journal entries and documents is logged automatically.</td></tr>}
              {filtered.map((l) => (
                <tr key={l.id}>
                  <td style={{ fontSize: 11, whiteSpace: 'nowrap' }}>{l.created_at ? new Date(l.created_at).toLocaleString() : '—'}</td>
                  <td>{actionBadge(l.action)}</td>
                  <td><b>{l.entity}</b></td>
                  <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{l.entity_id ? l.entity_id.slice(0, 8) + '…' : '—'}</td>
                  <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.detail || '—'}</td>
                  <td style={{ fontSize: 12 }}>{l.user_email || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
