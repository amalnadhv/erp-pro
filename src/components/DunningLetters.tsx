import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'

interface Props { fmtMoney: (n: number) => string }

export default function DunningLetters({ fmtMoney }: Props) {
  const [overdue, setOverdue] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [companyName, setCompanyName] = useState('')
  const [sent, setSent] = useState<string[]>([])

  useEffect(() => {
    Promise.all([
      supabase.from('invoices').select('id, invoice_no, customer_name, grand_total, amount_paid, invoice_date, due_date, status').in('status', ['Approved', 'Sent', 'overdue']),
      supabase.from('company_profile').select('company_name').limit(1),
    ]).then(([invRes, compRes]) => {
      const invoices = (invRes.data || []).filter((inv) => {
        const due = inv.due_date || inv.invoice_date
        if (!due) return false
        const daysOver = Math.floor((Date.now() - new Date(due).getTime()) / 86400000)
        return daysOver > 0 && (Number(inv.grand_total) - Number(inv.amount_paid || 0)) > 0
      }).map((inv) => {
        const due = inv.due_date || inv.invoice_date
        const daysOver = Math.floor((Date.now() - new Date(due).getTime()) / 86400000)
        return { ...inv, balance: Number(inv.grand_total) - Number(inv.amount_paid || 0), daysOver }
      }).sort((a, b) => b.daysOver - a.daysOver)
      setOverdue(invoices)
      setCompanyName(compRes.data?.[0]?.company_name || 'Your Company')
      setLoading(false)
    })
  }, [])

  const getLevel = (days: number) => {
    if (days <= 30) return { level: 1, label: 'Friendly Reminder', color: '#f59e0b', bg: '#fffbeb' }
    if (days <= 60) return { level: 2, label: 'Second Notice', color: '#f97316', bg: '#fff7ed' }
    if (days <= 90) return { level: 3, label: 'Urgent - Final Notice', color: '#dc2626', bg: '#fef2f2' }
    return { level: 4, label: 'Legal Action Required', color: '#7f1d1d', bg: '#450a0a' }
  }

  const generateLetter = (inv: any) => {
    const { label, level } = getLevel(inv.daysOver)
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<!DOCTYPE html><html><head><style>
      body{font-family:Arial,sans-serif;padding:40px;max-width:700px;margin:0 auto}
      .header{border-bottom:2px solid #1e293b;padding-bottom:12px;margin-bottom:20px}
      .badge{display:inline-block;padding:4px 12px;border-radius:6px;font-size:11px;font-weight:700;margin-left:8px}
      .level-${level}{background:${level >= 3 ? '#fef2f2' : '#fffbeb'};color:${level >= 3 ? '#dc2626' : '#f59e0b'}}
      table{width:100%;border-collapse:collapse;margin:16px 0}
      th,td{padding:8px 12px;border:1px solid #e2e8f0;text-align:left;font-size:13px}
      th{background:#f8fafc;font-weight:600}
      .total{font-size:18px;font-weight:800;color:#dc2626;margin:16px 0}
      .footer{margin-top:30px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:11px;color:#64748b}
    </style></head><body>
      <div class="header">
        <h2>${companyName}</h2>
        <div style="font-size:11px;color:#64748b">Payment Reminder</div>
      </div>
      <div style="margin-bottom:16px">
        <span class="badge level-${level}">${label}</span>
        <span style="font-size:12px;color:#64748b;margin-left:8px">Level ${level} · ${inv.daysOver} days overdue</span>
      </div>
      <p><b>To:</b> ${inv.customer_name}</p>
      <p><b>Date:</b> ${new Date().toLocaleDateString()}</p>
      <p>Dear ${inv.customer_name},</p>
      <p>${level === 1 ? 'This is a friendly reminder that the following invoice is now past due. Please arrange payment at your earliest convenience.' :
        level === 2 ? 'Our records indicate that the following invoice remains unpaid. Please remit payment immediately to avoid further action.' :
        level === 3 ? 'Despite previous reminders, this invoice remains outstanding. We urge you to settle this amount immediately to avoid account suspension.' :
        'This is our final notice before legal action is initiated to recover the outstanding amount. Please contact us immediately to resolve this matter.'}</p>
      <table>
        <tr><th>Invoice #</th><th>Invoice Date</th><th>Due Date</th><th>Days Overdue</th><th>Amount Due</th></tr>
        <tr><td>${inv.invoice_no}</td><td>${(inv.invoice_date || '').slice(0, 10)}</td><td>${(inv.due_date || '').slice(0, 10)}</td><td style="color:#dc2626;font-weight:700">${inv.daysOver}</td><td style="font-weight:700">${fmtMoney(inv.balance)}</td></tr>
      </table>
      <div class="total">Total Outstanding: ${fmtMoney(inv.balance)}</div>
      <p>Please make payment via bank transfer or any accepted method. If payment has already been made, please disregard this notice.</p>
      <p>If you have any questions, please contact our accounts department.</p>
      <div class="footer">
        <p><b>${companyName}</b> · Accounts Receivable Department</p>
        <p>This is an automated dunning notice. Please do not reply directly to this email.</p>
      </div>
    </body></html>`)
    w.document.close()
    setTimeout(() => w.print(), 500)
  }

  const totalOverdue = overdue.reduce((s, i) => s + i.balance, 0)

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>📧 Dunning Letters</h2>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, padding: 14, borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca' }}>
          <div style={{ fontSize: 11, color: '#dc2626', fontWeight: 600 }}>OVERDUE INVOICES</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#b91c1c' }}>{overdue.length}</div>
        </div>
        <div style={{ flex: 1, padding: 14, borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca' }}>
          <div style={{ fontSize: 11, color: '#dc2626', fontWeight: 600 }}>TOTAL OVERDUE</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#b91c1c' }}>{fmtMoney(totalOverdue)}</div>
        </div>
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading...</div> : (
        <table className="data-grid report-table">
          <thead>
            <tr>
              <th>CUSTOMER</th>
              <th>INVOICE #</th>
              <th>DUE DATE</th>
              <th className="col-money">BALANCE</th>
              <th>DAYS OVERDUE</th>
              <th>LEVEL</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {overdue.length === 0 && <tr><td colSpan="7" className="empty">No overdue invoices 🎉</td></tr>}
            {overdue.map((inv) => {
              const { label, color, bg } = getLevel(inv.daysOver)
              return (
                <tr key={inv.id}>
                  <td style={{ fontWeight: 600 }}>{inv.customer_name}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{inv.invoice_no}</td>
                  <td>{(inv.due_date || '').slice(0, 10)}</td>
                  <td className="col-money" style={{ fontWeight: 700, color: '#dc2626' }}>{fmtMoney(inv.balance)}</td>
                  <td><span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: bg, color }}>{inv.daysOver} days</span></td>
                  <td><span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: bg, color }}>{label}</span></td>
                  <td>
                    <button onClick={() => generateLetter(inv)} style={{ padding: '5px 12px', borderRadius: 6, background: '#8b5cf6', color: '#fff', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                      📄 Generate Letter
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
