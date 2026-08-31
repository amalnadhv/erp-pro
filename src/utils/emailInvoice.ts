import { supabase } from './supabaseClient'

const esc = (s: any) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const fmt = (n: number) => Number(n || 0).toFixed(2)

interface EmailInvoiceParams {
  to: string
  inv: any
  companyProfile: any
  items: any[]
  docType?: string
  isReminder?: boolean
}

export const emailInvoice = async ({ to, inv, companyProfile, items, docType = 'Tax Invoice', isReminder = false }: EmailInvoiceParams): Promise<{ success: boolean; error?: string }> => {
  try {
    const subtotal = items.reduce((s, it) => s + (Number(it.total) || Number(it.qty) * Number(it.price) || 0), 0)
    const vatAmount = Number(inv.vat_amount || (subtotal * Number(inv.vat_percent || 15) / 100))
    const grandTotal = Number(inv.grand_total || (subtotal + vatAmount))
    const balance = inv.balance || (grandTotal - Number(inv.amount_paid || 0))

    const itemRows = items.map((it, i) => {
      const total = Number(it.total) || Number(it.qty) * Number(it.price) || 0
      return `<tr>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center;color:#6b7280;font-size:12px">${i + 1}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#1f2937">${esc(it.name || it.description || '')}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:12px;color:#6b7280">${it.qty || it.quantity || ''}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:12px;color:#6b7280">${fmt(it.price || it.rate || 0)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:12px;font-weight:600;color:#1f2937">${fmt(total)}</td>
      </tr>`
    }).join('')

    const companyName = esc(companyProfile?.company_name || 'Your Company')
    const invNo = esc(inv.invoice_no || inv.pin_no || inv.note_no || '—')
    const invDate = esc(inv.doc_date || inv.invoice_date || inv.created_at?.slice(0, 10) || '—')
    const customerName = esc(inv.customer_name || inv.party_name || '—')
    const statusColor = inv.status === 'Paid' ? '#16a34a' : inv.status === 'Outstanding' ? '#dc2626' : '#d97706'

    const subject = isReminder
      ? `Payment Reminder — Invoice ${invNo}`
      : `${docType} ${invNo} from ${companyName}`

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;margin-top:20px;margin-bottom:20px;box-shadow:0 4px 16px rgba(0,0,0,.08)">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#6a11cb,#2575fc);padding:24px 30px;text-align:center">
    <div style="font-size:20px;font-weight:800;color:#fff;letter-spacing:0.5px">${companyName}</div>
    <div style="font-size:11px;color:rgba(255,255,255,.8);margin-top:4px">
      ${esc(companyProfile?.address || '')} ${esc(companyProfile?.city || '')} ${esc(companyProfile?.country || '')}
    </div>
  </div>

  <!-- Title -->
  <div style="padding:24px 30px 0">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-size:18px;font-weight:700;color:#1f2937">${isReminder ? '⏰ Payment Reminder' : '📄 ' + docType}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:4px">Sent to <b>${customerName}</b></div>
      </div>
      <div style="text-align:right">
        <div style="font-size:24px;font-weight:800;color:#6a11cb">${fmt(grandTotal)}</div>
        <div style="font-size:11px;color:${statusColor};font-weight:700;text-transform:uppercase">${esc(inv.status || 'Pending')}</div>
      </div>
    </div>
  </div>

  <!-- Invoice Details -->
  <div style="padding:20px 30px">
    <table style="width:100%;border-collapse:collapse;background:#f9fafb;border-radius:8px;overflow:hidden">
      <tr>
        <td style="padding:10px 14px;font-size:11px;color:#6b7280;width:50%">Invoice #</td>
        <td style="padding:10px 14px;font-size:12px;font-weight:700;color:#1f2937">${invNo}</td>
      </tr>
      <tr>
        <td style="padding:10px 14px;font-size:11px;color:#6b7280">Date</td>
        <td style="padding:10px 14px;font-size:12px;color:#1f2937">${invDate}</td>
      </tr>
      ${inv.due_date ? `<tr>
        <td style="padding:10px 14px;font-size:11px;color:#6b7280">Due Date</td>
        <td style="padding:10px 14px;font-size:12px;color:#dc2626;font-weight:600">${esc(inv.due_date)}</td>
      </tr>` : ''}
    </table>
  </div>

  <!-- Items Table -->
  <div style="padding:0 30px">
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:#6a11cb">
          <th style="padding:8px 10px;font-size:10px;color:#fff;font-weight:700;text-align:left">#</th>
          <th style="padding:8px 10px;font-size:10px;color:#fff;font-weight:700;text-align:left">Description</th>
          <th style="padding:8px 10px;font-size:10px;color:#fff;font-weight:700;text-align:center">Qty</th>
          <th style="padding:8px 10px;font-size:10px;color:#fff;font-weight:700;text-align:right">Price</th>
          <th style="padding:8px 10px;font-size:10px;color:#fff;font-weight:700;text-align:right">Amount</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>
  </div>

  <!-- Totals -->
  <div style="padding:20px 30px;text-align:right">
    <table style="margin-left:auto;border-collapse:collapse;width:240px">
      <tr>
        <td style="padding:4px 0;font-size:12px;color:#6b7280;text-align:left">Subtotal</td>
        <td style="padding:4px 0;font-size:12px;color:#1f2937;text-align:right">${fmt(inv.subtotal || subtotal)}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;font-size:12px;color:#6b7280;text-align:left">Tax (${inv.vat_percent || 0}%)</td>
        <td style="padding:4px 0;font-size:12px;color:#1f2937;text-align:right">${fmt(inv.vat_amount || vatAmount)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;font-size:14px;font-weight:800;color:#6a11cb;text-align:left;border-top:2px solid #6a11cb">Total</td>
        <td style="padding:8px 0;font-size:14px;font-weight:800;color:#6a11cb;text-align:right;border-top:2px solid #6a11cb">${fmt(inv.grand_total || grandTotal)}</td>
      </tr>
      ${inv.amount_paid ? `<tr>
        <td style="padding:4px 0;font-size:12px;color:#16a34a;text-align:left">Paid</td>
        <td style="padding:4px 0;font-size:12px;color:#16a34a;text-align:right">-${fmt(inv.amount_paid)}</td>
      </tr>` : ''}
      ${balance > 0 ? `<tr>
        <td style="padding:8px 0;font-size:13px;font-weight:700;color:#dc2626;text-align:left">Balance Due</td>
        <td style="padding:8px 0;font-size:13px;font-weight:700;color:#dc2626;text-align:right">${fmt(balance)}</td>
      </tr>` : ''}
    </table>
  </div>

  ${isReminder ? `
  <!-- Reminder Box -->
  <div style="padding:0 30px">
    <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:14px 18px">
      <div style="font-size:12px;font-weight:700;color:#92400e;margin-bottom:4px">⚠️ Payment Overdue</div>
      <div style="font-size:11px;color:#92400e">This is a friendly reminder that your invoice <b>${invNo}</b> is past due. Please arrange payment at your earliest convenience. If you have already paid, please disregard this notice.</div>
    </div>
  </div>` : ''}

  <!-- Notes -->
  ${inv.notes ? `<div style="padding:16px 30px">
    <div style="background:#f9fafb;border-radius:8px;padding:12px 16px;border:1px solid #e5e7eb">
      <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;margin-bottom:4px">Notes</div>
      <div style="font-size:11px;color:#374151">${esc(inv.notes)}</div>
    </div>
  </div>` : ''}

  <!-- Footer -->
  <div style="background:#f9fafb;padding:20px 30px;text-align:center;border-top:1px solid #e5e7eb">
    <div style="font-size:10px;color:#9ca3af;line-height:1.6">
      ${companyName} | TRN: ${esc(companyProfile?.vat_no || '—')} | ${esc(companyProfile?.phone || '')}<br>
      This is a computer-generated email. Please do not reply directly to this message.
    </div>
  </div>
</div>
</body></html>`

    const { data, error } = await supabase.functions.invoke('send-email', {
      body: { to, subject, html },
    })

    if (error) throw error
    if (data?.error) throw new Error(data.error)

    return { success: true }
  } catch (e: any) {
    return { success: false, error: e?.message || 'Failed to send email' }
  }
}
