import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'

interface Props {}

export default function Integrations({}: Props) {
  const [profile, setProfile] = useState<any>(null)
  const [zatcaStatus, setZatcaStatus] = useState('idle')
  const [zatcaResult, setZatcaResult] = useState('')
  const [bankStatus, setBankStatus] = useState('idle')
  const [bankResult, setBankResult] = useState('')
  const [invoices, setInvoices] = useState<any[]>([])
  const [selectedInv, setSelectedInv] = useState('')
  const [whatsappMsg, setWhatsappMsg] = useState('')
  const [whatsappStatus, setWhatsappStatus] = useState('idle')

  useEffect(() => {
    supabase.from('company_profile').select('*').limit(1).then(({ data }) => setProfile(data?.[0] || null))
    supabase.from('sales_invoices').select('id, invoice_no, customer_name, grand_total, status').order('created_at', { ascending: false }).limit(50).then(({ data }) => setInvoices(data || []))
  }, [])

  // ZATCA Submit
  const submitZatca = async () => {
    if (!profile?.zatca_enabled || !profile?.zatca_csid) { setZatcaResult('⚠️ Enable ZATCA and configure CSID token in Company Profile first.'); return }
    setZatcaStatus('loading')
    try {
      const { data, error } = await supabase.functions.invoke('zatca-submit', {
        body: {
          endpoint: profile.zatca_endpoint || 'https://api.zatca.gov.sa/simulation',
          csid: profile.zatca_csid,
          invoices: invoices.filter((i) => i.status === 'Approved' || i.status === 'Posted').slice(0, 10).map((i) => ({
            invoice_no: i.invoice_no,
            customer_name: i.customer_name,
            total: i.grand_total,
          })),
        },
      })
      if (error) throw error
      setZatcaStatus('success')
      setZatcaResult(`✅ Submitted ${invoices.filter((i) => i.status === 'Approved' || i.status === 'Posted').length} invoices to ZATCA. Response: ${JSON.stringify(data || {}).slice(0, 200)}`)
    } catch (e: any) {
      setZatcaStatus('error')
      setZatcaResult(`❌ ZATCA submission failed: ${e?.message || 'Configure send-email Edge Function or deploy zatca-submit Edge Function.'}`)
    }
  }

  // Bank Feed Import
  const importBankFeed = async () => {
    setBankStatus('loading')
    try {
      const { data, error } = await supabase.functions.invoke('bank-feed', { body: { action: 'fetch_transactions' } })
      if (error) throw error
      setBankStatus('success')
      setBankResult(`✅ Fetched ${data?.transactions?.length || 0} bank transactions. Import to Journal Entry?`)
    } catch (e: any) {
      setBankStatus('error')
      setBankResult(`❌ Bank feed not configured. Deploy bank-feed Edge Function or connect Open Banking API.`)
    }
  }

  // WhatsApp
  const sendWhatsApp = () => {
    if (!whatsappMsg.trim()) return
    const url = `https://wa.me/?text=${encodeURIComponent(whatsappMsg)}`
    window.open(url, '_blank')
    setWhatsappStatus('sent')
  }

  const statusBadge = (s: string) => {
    const m: any = { idle: '#64748b', loading: '#f59e0b', success: '#10b981', error: '#dc2626', sent: '#10b981' }
    return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: m[s] || '#64748b', marginRight: 6 }} />
  }

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>🔌 API Integrations</h2>

      {/* ZATCA */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 24 }}>🧾</span>
          <div>
            <h3 style={{ margin: 0, fontSize: 16 }}>ZATCA e-Invoicing (Saudi Arabia)</h3>
            <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Submit invoices to ZATCA FATOORA platform for Saudi compliance</p>
          </div>
        </div>
        <table className="data-grid report-table" style={{ marginBottom: 12 }}>
          <tbody>
            <tr><td>Status</td><td>{profile?.zatca_enabled ? <span className="badge b-green">Enabled</span> : <span className="badge b-amber">Disabled</span>}</td></tr>
            <tr><td>CSID Token</td><td>{profile?.zatca_csid ? <span className="badge b-green">Configured</span> : <span className="badge b-red">Not Configured</span>}</td></tr>
            <tr><td>Endpoint</td><td style={{ fontFamily: 'monospace', fontSize: 11 }}>{profile?.zatca_endpoint || 'Not set'}</td></tr>
            <tr><td>Ready Invoices</td><td><b>{invoices.filter((i) => i.status === 'Approved' || i.status === 'Posted').length}</b> (Approved/Posted)</td></tr>
          </tbody>
        </table>
        <button onClick={submitZatca} disabled={zatcaStatus === 'loading'} style={{ padding: '8px 18px', borderRadius: 8, background: '#0ea5e9', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: zatcaStatus === 'loading' ? 'not-allowed' : 'pointer' }}>
          {zatcaStatus === 'loading' ? '⏳ Submitting...' : '🚀 Submit to ZATCA'}
        </button>
        {zatcaResult && <div style={{ marginTop: 10, padding: 10, borderRadius: 8, fontSize: 12, background: zatcaStatus === 'success' ? '#dcfce7' : '#fef3c7', color: zatcaStatus === 'success' ? '#166534' : '#92400e' }}>{zatcaResult}</div>}
        <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>Requires: ZATCA credentials in Company Profile + zatca-submit Edge Function deployed in Supabase.</p>
      </div>

      {/* Bank Feeds */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 24 }}>🏦</span>
          <div>
            <h3 style={{ margin: 0, fontSize: 16 }}>Bank Feeds (Auto-Import)</h3>
            <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Auto-import bank transactions via Open Banking API or CSV</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button onClick={importBankFeed} disabled={bankStatus === 'loading'} style={{ padding: '8px 18px', borderRadius: 8, background: '#10b981', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: bankStatus === 'loading' ? 'not-allowed' : 'pointer' }}>
            {bankStatus === 'loading' ? '⏳ Fetching...' : '🔄 Fetch Bank Transactions'}
          </button>
          <button onClick={() => window.open('#/banking', '_self')} style={{ padding: '8px 18px', borderRadius: 8, background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            📁 Manual CSV Import
          </button>
        </div>
        {bankResult && <div style={{ marginTop: 10, padding: 10, borderRadius: 8, fontSize: 12, background: bankStatus === 'success' ? '#dcfce7' : '#fef3c7', color: bankStatus === 'success' ? '#166534' : '#92400e' }}>{bankResult}</div>}
        <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>Supported: Open Banking (PSD2), Plaid, Yodlee, or manual CSV upload. Deploy bank-feed Edge Function for API integration.</p>
      </div>

      {/* WhatsApp */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 24 }}>💬</span>
          <div>
            <h3 style={{ margin: 0, fontSize: 16 }}>WhatsApp Business</h3>
            <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Send invoices and payment reminders via WhatsApp</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <select value={selectedInv} onChange={(e) => {
            const inv = invoices.find((i) => i.id === e.target.value)
            setSelectedInv(e.target.value)
            if (inv) setWhatsappMsg(`Invoice ${inv.invoice_no}\nCustomer: ${inv.customer_name}\nAmount: ${Number(inv.grand_total).toFixed(2)}\nStatus: ${inv.status}`)
          }} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}>
            <option value="">Select an invoice...</option>
            {invoices.filter((i) => i.status === 'Approved' || i.status === 'Posted').map((i) => <option key={i.id} value={i.id}>{i.invoice_no} — {i.customer_name} — {Number(i.grand_total).toFixed(2)}</option>)}
          </select>
        </div>
        <textarea rows={3} value={whatsappMsg} onChange={(e) => setWhatsappMsg(e.target.value)} placeholder="Type message or select an invoice above..." style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, resize: 'vertical', boxSizing: 'border-box' }} />
        <button onClick={sendWhatsApp} style={{ marginTop: 8, padding: '8px 18px', borderRadius: 8, background: '#25d366', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          💬 Send via WhatsApp
        </button>
      </div>

      {/* API Status */}
      <div style={{ background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>📋 Integration Status</h3>
        <table className="data-grid report-table">
          <thead><tr><th>SERVICE</th><th>STATUS</th><th>NOTES</th></tr></thead>
          <tbody>
            <tr>
              <td><b>Supabase Auth</b></td>
              <td><span className="badge b-green">Connected</span></td>
              <td>Email/password authentication</td>
            </tr>
            <tr>
              <td><b>Supabase Storage</b></td>
              <td><span className="badge b-green">Connected</span></td>
              <td>File attachments, cheque templates</td>
            </tr>
            <tr>
              <td><b>Resend (Email)</b></td>
              <td><span className="badge b-green">Connected</span></td>
              <td>send-email Edge Function</td>
            </tr>
            <tr>
              <td><b>ZATCA e-Invoice</b></td>
              <td>{profile?.zatca_enabled ? <span className="badge b-green">Enabled</span> : <span className="badge b-amber">Not Enabled</span>}</td>
              <td>Configure in Company Profile</td>
            </tr>
            <tr>
              <td><b>Bank Feeds</b></td>
              <td><span className="badge b-amber">Manual</span></td>
              <td>CSV import available, API requires Edge Function</td>
            </tr>
            <tr>
              <td><b>WhatsApp</b></td>
              <td><span className="badge b-green">Ready</span></td>
              <td>Opens WhatsApp Web with pre-filled message</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
