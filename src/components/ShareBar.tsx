import React, { useState } from 'react'
import { exportExcel, exportPdf, Col } from '../utils/export'

export default function ShareBar({
  title, columns, rows, meta, text, subject, docNo, customerName, customerEmail, grandTotal, balance,
  onPrint, onPdf, onExcel, onSendEmail,
}: {
  title: string
  columns?: Col[]
  rows?: any[]
  meta?: Record<string, string>
  text?: string
  subject?: string
  docNo?: string
  customerName?: string
  customerEmail?: string
  grandTotal?: number
  balance?: number
  onPrint?: () => void
  onPdf?: () => void
  onExcel?: () => void
  onSendEmail?: (email: string) => Promise<{ success: boolean; error?: string }>
}) {
  const [showEmail, setShowEmail] = useState(false)
  const [email, setEmail] = useState(customerEmail || '')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState('')

  const isTable = !!(columns && rows)
  const buildText = () => {
    if (text) return text
    if (isTable) {
      const head = (columns as Col[]).map((c) => c.label).join('\t')
      const body = (rows as any[]).map((r) => (columns as Col[]).map((c) => r[c.key]).join('\t')).join('\n')
      return `${title}\n\n${head}\n${body}`
    }
    return title
  }

  const doPrint = onPrint || (() => window.print())
  const doPdf = onPdf || (() => {
    if (isTable) exportPdf(title, title, columns as Col[], rows as any[], meta)
    else exportPdf(title, title, [{ key: 't', label: '' }], [{ t: text || title }])
  })
  const doExcel = onExcel || (() => {
    if (isTable) exportExcel(title, title, columns as Col[], rows as any[])
    else exportExcel(title, title, [{ key: 't', label: '' }], [{ t: text || title }])
  })

  const doWhatsApp = () => {
    const fmt = (n: number) => (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })
    let msg = ''
    if (docNo && grandTotal !== undefined) {
      msg = `📄 *${title}*\n\n`
      if (docNo) msg += `📋 No: ${docNo}\n`
      if (customerName) msg += `👤 To: ${customerName}\n`
      msg += `💰 Total: SAR ${fmt(grandTotal)}\n`
      if (balance !== undefined && balance > 0) msg += `⚠️ Balance Due: SAR ${fmt(balance)}\n`
      msg += `\nGenerated from ERP Pro`
    } else {
      msg = `${subject ? subject + '\n' : ''}${buildText()}`
    }
    const encoded = encodeURIComponent(msg)
    window.open(`https://wa.me/?text=${encoded}`, '_blank', 'width=600,height=700')
  }

  const doEmail = async () => {
    if (!showEmail) {
      setEmail(customerEmail || '')
      setResult('')
      setShowEmail(true)
      return
    }
    if (!email.trim()) { setResult('⚠️ Enter an email address'); return }
    if (!onSendEmail) { window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject || title)}&body=${encodeURIComponent(buildText())}`; setShowEmail(false); return }
    setSending(true); setResult('')
    const r = await onSendEmail(email)
    setSending(false)
    setResult(r.success ? '✅ Email sent successfully!' : '⚠️ ' + (r.error || 'Failed to send'))
    if (r.success) { setShowEmail(false); setResult('') }
  }

  return (
    <>
      <div className="share-bar noprint" style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="doc-btn" onClick={doPrint} title="Print" style={{ fontSize: 11 }}>🖨️</button>
        <button className="doc-btn" onClick={doPdf} title="Save as PDF" style={{ fontSize: 11 }}>📄 PDF</button>
        <button className="doc-btn" onClick={doExcel} title="Export to Excel" style={{ fontSize: 11 }}>📊 Excel</button>
        <button className="doc-btn" onClick={doEmail} title="Send Email" style={{ fontSize: 11, background: showEmail ? '#8b5cf6' : undefined, color: showEmail ? '#fff' : undefined }}>✉️ Email</button>
        <button className="doc-btn" onClick={doWhatsApp} title="Share via WhatsApp" style={{ fontSize: 11 }}>💬 WhatsApp</button>
      </div>

      {showEmail && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginTop: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>📧 Send to:</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="customer@email.com"
              style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 12 }}
            />
            <button
              onClick={doEmail}
              disabled={sending}
              style={{ padding: '6px 14px', borderRadius: 6, background: '#8b5cf6', color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              {sending ? 'Sending...' : '📤 Send'}
            </button>
            <button
              onClick={() => { setShowEmail(false); setResult('') }}
              style={{ padding: '6px 10px', borderRadius: 6, background: '#fff', color: '#475569', border: '1px solid #d1d5db', fontSize: 12, cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
          {result && <div style={{ fontSize: 12, color: result.includes('✅') ? '#16a34a' : '#dc2626' }}>{result}</div>}
        </div>
      )}
    </>
  )
}
