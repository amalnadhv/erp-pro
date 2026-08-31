import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'

interface Props { fmtMoney: (n: number) => string }

const DOC_TYPES = ['A/R Invoice', 'A/P Invoice', 'Sales Quotation', 'Sales Order', 'Purchase Order', 'Journal Entry', 'Debit Note', 'Credit Note']

export default function ApprovalWorkflow({ fmtMoney }: Props) {
  const [workflows, setWorkflows] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'rules' | 'pending' | 'history'>('rules')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ doc_type: 'A/R Invoice', level_no: 1, approver_role: '', min_amount: 0, max_amount: 999999999 })

  const load = () => {
    setLoading(true)
    Promise.all([
      supabase.from('approval_workflow').select('*').order('doc_type'),
      supabase.from('approval_logs').select('*').order('acted_at', { ascending: false }).limit(100),
    ]).then(([wRes, lRes]) => { setWorkflows(wRes.data || []); setLogs(lRes.data || []); setLoading(false) })
  }
  useEffect(() => { load() }, [])

  const saveRule = async () => {
    if (!form.doc_type) return
    await supabase.from('approval_workflow').insert({
      doc_type: form.doc_type, level_no: form.level_no,
      approver_role: form.approver_role, min_amount: Number(form.min_amount),
      max_amount: Number(form.max_amount), is_active: true,
    })
    setShowForm(false)
    load()
  }

  const deleteRule = async (id: string) => {
    if (!confirm('Delete this approval rule?')) return
    await supabase.from('approval_workflow').delete().eq('id', id)
    load()
  }

  const pendingDocs = [
    { type: 'A/R Invoice', no: 'INV-2601-0015', amount: 12500, date: '2026-01-15', submittedBy: 'Ahmad' },
    { type: 'Purchase Order', no: 'PO-2601-0008', amount: 45000, date: '2026-01-14', submittedBy: 'Sara' },
    { type: 'Journal Entry', no: 'JE-2601-0022', amount: 8000, date: '2026-01-14', submittedBy: 'Omar' },
  ]

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>✅ Approval Workflow</h2>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {(['rules', 'pending', 'history'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '6px 14px', borderRadius: 8, border: tab === t ? '2px solid #8b5cf6' : '1px solid #e2e8f0', background: tab === t ? '#f5f3ff' : '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}>
            {t} {t === 'pending' ? `(${pendingDocs.length})` : ''}
          </button>
        ))}
      </div>

      {tab === 'rules' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button onClick={() => setShowForm(true)} style={{ padding: '8px 18px', borderRadius: 8, background: '#8b5cf6', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+ Add Rule</button>
          </div>
          {showForm && (
            <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16, marginBottom: 14, border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 12px', fontSize: 14 }}>New Approval Rule</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Document Type
                  <select value={form.doc_type} onChange={(e) => setForm({ ...form, doc_type: e.target.value })} style={{ width: '100%', marginTop: 4, padding: '7px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12 }}>
                    {DOC_TYPES.map((d) => <option key={d}>{d}</option>)}
                  </select>
                </label>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Level
                  <input type="number" min="1" max="5" value={form.level_no} onChange={(e) => setForm({ ...form, level_no: Number(e.target.value) })} style={{ width: '100%', marginTop: 4, padding: '7px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12 }} />
                </label>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Approver Role
                  <input value={form.approver_role} onChange={(e) => setForm({ ...form, approver_role: e.target.value })} placeholder="e.g. Manager, Director" style={{ width: '100%', marginTop: 4, padding: '7px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12 }} />
                </label>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Min Amount
                  <input type="number" min="0" value={form.min_amount} onChange={(e) => setForm({ ...form, min_amount: Number(e.target.value) })} style={{ width: '100%', marginTop: 4, padding: '7px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12 }} />
                </label>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Max Amount
                  <input type="number" min="0" value={form.max_amount} onChange={(e) => setForm({ ...form, max_amount: Number(e.target.value) })} style={{ width: '100%', marginTop: 4, padding: '7px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12 }} />
                </label>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button onClick={() => setShowForm(false)} style={{ padding: '7px 16px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button onClick={saveRule} style={{ padding: '7px 16px', borderRadius: 6, background: '#8b5cf6', color: '#fff', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Save Rule</button>
              </div>
            </div>
          )}
          <table className="data-grid report-table">
            <thead><tr><th>DOC TYPE</th><th>LEVEL</th><th>APPROVER ROLE</th><th className="col-money">MIN AMOUNT</th><th className="col-money">MAX AMOUNT</th><th>STATUS</th><th></th></tr></thead>
            <tbody>
              {workflows.length === 0 && <tr><td colSpan="7" className="empty">No approval rules configured. Documents will be auto-approved.</td></tr>}
              {workflows.map((w) => (
                <tr key={w.id}>
                  <td style={{ fontWeight: 600 }}>{w.doc_type}</td>
                  <td>Level {w.level_no}</td>
                  <td>{w.approver_role || 'Any'}</td>
                  <td className="col-money">{fmtMoney(Number(w.min_amount))}</td>
                  <td className="col-money">{fmtMoney(Number(w.max_amount))}</td>
                  <td><span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: w.is_active ? '#dcfce7' : '#f1f5f9', color: w.is_active ? '#16a34a' : '#64748b' }}>{w.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td><button onClick={() => deleteRule(w.id)} style={{ border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 14 }}>🗑️</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {tab === 'pending' && (
        <table className="data-grid report-table">
          <thead><tr><th>DOC TYPE</th><th>DOC NO</th><th className="col-money">AMOUNT</th><th>DATE</th><th>SUBMITTED BY</th><th>ACTION</th></tr></thead>
          <tbody>
            {pendingDocs.map((d, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600 }}>{d.type}</td>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{d.no}</td>
                <td className="col-money">{fmtMoney(d.amount)}</td>
                <td>{d.date}</td>
                <td>{d.submittedBy}</td>
                <td style={{ display: 'flex', gap: 4 }}>
                  <button style={{ padding: '4px 10px', borderRadius: 4, background: '#16a34a', color: '#fff', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>✅ Approve</button>
                  <button style={{ padding: '4px 10px', borderRadius: 4, background: '#dc2626', color: '#fff', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>❌ Reject</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === 'history' && (
        <table className="data-grid report-table">
          <thead><tr><th>DATE</th><th>DOC TYPE</th><th>DOC NO</th><th>LEVEL</th><th>APPROVER</th><th>ACTION</th><th>REASON</th></tr></thead>
          <tbody>
            {logs.length === 0 && <tr><td colSpan="7" className="empty">No approval history yet</td></tr>}
            {logs.map((l) => (
              <tr key={l.id}>
                <td>{(l.acted_at || '').slice(0, 16)}</td>
                <td>{l.doc_type}</td>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{l.doc_no}</td>
                <td>Level {l.level_no}</td>
                <td>{l.approver_name}</td>
                <td><span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: l.action === 'Approved' ? '#dcfce7' : '#fef2f2', color: l.action === 'Approved' ? '#16a34a' : '#dc2626' }}>{l.action}</span></td>
                <td style={{ fontSize: 12, color: '#64748b' }}>{l.reason || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
