import { useState } from 'react'
import { supabase } from '../utils/supabaseClient'

interface Props {
  invoice: any
  fmtMoney: (n: number) => string
  onClose: () => void
}

export default function PaymentLinks({ invoice, fmtMoney, onClose }: Props) {
  const [copied, setCopied] = useState('')
  const [emailTo, setEmailTo] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState('')

  const payUrl = `${window.location.origin}/#/pay/${invoice.invoice_no || invoice.id}`
  const amount = Number(invoice.grand_total || invoice.balance || 0)

  const copyLink = (type: string, url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(type)
      setTimeout(() => setCopied(''), 2000)
    })
  }

  const smsText = encodeURIComponent(`Invoice ${invoice.invoice_no}\nAmount: ${fmtMoney(amount)}\nPay here: ${payUrl}`)
  const whatsappText = encodeURIComponent(`📋 Invoice ${invoice.invoice_no}\n💰 Amount: ${fmtMoney(amount)}\n🔗 Pay now: ${payUrl}`)

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1e293b;">Invoice Payment Request</h2>
      <p>Hello,</p>
      <p>Please find the payment details below:</p>
      <div style="background: #f8fafc; padding: 16px; border-radius: 10px; border: 1px solid #e2e8f0; margin: 16px 0;">
        <p style="margin: 4px 0;"><b>Invoice:</b> ${invoice.invoice_no}</p>
        <p style="margin: 4px 0;"><b>Customer:</b> ${invoice.customer_name || ''}</p>
        <p style="margin: 4px 0;"><b>Amount:</b> <span style="font-size: 18px; color: #8b5cf6; font-weight: 800;">${fmtMoney(amount)}</span></p>
        <p style="margin: 4px 0;"><b>Date:</b> ${(invoice.invoice_date || '').slice(0, 10)}</p>
      </div>
      <a href="${payUrl}" style="display: inline-block; padding: 12px 24px; background: #8b5cf6; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 700;">Pay Now →</a>
      <p style="margin-top: 16px; font-size: 12px; color: #94a3b8;">This payment link is secure and will update your invoice automatically.</p>
    </div>
  `

  const sendEmail = async () => {
    if (!emailTo.trim()) return
    setSending(true); setResult('')
    try {
      await supabase.functions.invoke('send-email', {
        body: {
          to: emailTo,
          subject: `Invoice ${invoice.invoice_no} - Payment Request`,
          html: emailHtml,
        },
      })
      setResult('✅ Email sent successfully!')
    } catch (err) {
      setResult('❌ Failed to send email. Try copying the link instead.')
    }
    setSending(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 16, width: 480, maxWidth: '95%', padding: 24, maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>💳 Payment Link</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: '#64748b' }}>✕</button>
        </div>

        <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16, marginBottom: 16, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{invoice.invoice_no}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>{invoice.customer_name}</div>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#8b5cf6' }}>{fmtMoney(amount)}</div>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Direct Payment Link</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input readOnly value={payUrl} style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 11, fontFamily: 'monospace', background: '#f8fafc' }} />
            <button onClick={() => copyLink('link', payUrl)} style={{ padding: '8px 14px', borderRadius: 8, background: copied === 'link' ? '#22c55e' : '#8b5cf6', color: '#fff', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {copied === 'link' ? '✓ Copied!' : '📋 Copy'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <a href={`https://wa.me/?text=${whatsappText}`} target="_blank" rel="noopener noreferrer" style={{ flex: 1, display: 'block', textAlign: 'center', padding: '10px 0', borderRadius: 8, background: '#25d366', color: '#fff', textDecoration: 'none', fontSize: 12, fontWeight: 600 }}>
            💬 WhatsApp
          </a>
          <a href={`sms:?body=${smsText}`} style={{ flex: 1, display: 'block', textAlign: 'center', padding: '10px 0', borderRadius: 8, background: '#3b82f6', color: '#fff', textDecoration: 'none', fontSize: 12, fontWeight: 600 }}>
            📱 SMS
          </a>
          <a href={`mailto:?subject=Invoice ${invoice.invoice_no} - Payment Request&body=Pay here: ${payUrl}`} style={{ flex: 1, display: 'block', textAlign: 'center', padding: '10px 0', borderRadius: 8, background: '#6366f1', color: '#fff', textDecoration: 'none', fontSize: 12, fontWeight: 600 }}>
            📧 Email
          </a>
        </div>

        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 14 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Send Payment Link via Email</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input type="email" placeholder="customer@email.com" value={emailTo} onChange={(e) => setEmailTo(e.target.value)} style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
            <button onClick={sendEmail} disabled={sending || !emailTo.trim()} style={{ padding: '8px 14px', borderRadius: 8, background: sending ? '#94a3b8' : '#8b5cf6', color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: sending ? 'not-allowed' : 'pointer' }}>
              {sending ? '...' : 'Send'}
            </button>
          </div>
          {result && <div style={{ marginTop: 8, fontSize: 12 }}>{result}</div>}
        </div>
      </div>
    </div>
  )
}
