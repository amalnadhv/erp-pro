import React, { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'
import ShareBar from './ShareBar'

export default function AuditLog() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { (async () => {
    const { data } = await supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(500)
    setLogs(data || [])
    setLoading(false)
  })() }, [])

  const cols = [
    { key: 'created_at', label: 'Time' },
    { key: 'action', label: 'Action' },
    { key: 'entity', label: 'Entity' },
    { key: 'entity_id', label: 'Record ID' },
    { key: 'detail', label: 'Detail' },
    { key: 'user_email', label: 'User' },
  ]
  const rows = logs.map((l) => ({
    created_at: l.created_at, action: l.action, entity: l.entity,
    entity_id: l.entity_id || '', detail: l.detail || '', user_email: l.user_email || '',
  }))

  return (
    <div className="report-wrap">
      <div className="report-head">
        <h3>📜 Activity / Audit Log</h3>
        <div className="report-controls">
          <ShareBar title="Audit Log" columns={cols} rows={rows} text={'Audit Log export generated on ' + new Date().toLocaleDateString()} />
        </div>
      </div>
      <div className="report-sections">
        <div className="report-section" style={{ flexBasis: '100%' }}>
          <table className="data-grid report-table">
            <thead>
              <tr><th>TIME</th><th>ACTION</th><th>ENTITY</th><th>RECORD</th><th>DETAIL</th><th>USER</th></tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td>{l.created_at}</td>
                  <td><b>{l.action}</b></td>
                  <td>{l.entity}</td>
                  <td>{l.entity_id || '—'}</td>
                  <td>{l.detail || '—'}</td>
                  <td>{l.user_email || '—'}</td>
                </tr>
              ))}
              {!logs.length && <tr><td colSpan={6} className="fa-empty">No activity recorded yet. Saving profiles, partners, products, journal entries and documents is logged automatically.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
