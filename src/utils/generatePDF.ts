import html2pdf from 'html2pdf.js'

const fmt = (n: number) => Number(n || 0).toFixed(2)

export const generateInvoicePDF = async (inv: any, companyProfile: any, items: any[], docType: string = 'TAX INVOICE'): Promise<Blob> => {
  const subtotal = items.reduce((s, it) => s + (Number(it.total) || Number(it.qty) * Number(it.price) || 0), 0)
  const vatAmount = Number(inv.vat_amount || (subtotal * Number(inv.vat_percent || 15) / 100))
  const grandTotal = Number(inv.grand_total || (subtotal + vatAmount))

  const itemRows = items.map((it: any, i: number) => {
    const total = Number(it.total) || Number(it.qty) * Number(it.price) || 0
    return `<tr>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:11px">${i + 1}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:11px">${esc(it.name || it.description || '')}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:11px">${esc(it.qty || it.quantity || '')}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:11px">${fmt(it.price || it.rate || 0)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:11px;font-weight:600">${fmt(total)}</td>
    </tr>`
  }).join('')

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; background: #fff; }
  .page { width: 210mm; min-height: 297mm; padding: 15mm; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #6a11cb; padding-bottom: 16px; margin-bottom: 20px; }
  .company-name { font-size: 22px; font-weight: 800; color: #6a11cb; }
  .company-detail { font-size: 10px; color: #6b7280; line-height: 1.6; }
  .doc-title { font-size: 18px; font-weight: 700; color: #1f2937; text-align: right; }
  .doc-meta { font-size: 10px; color: #6b7280; text-align: right; margin-top: 4px; }
  .parties { display: flex; justify-content: space-between; margin-bottom: 20px; gap: 20px; }
  .party-box { flex: 1; background: #f9fafb; border-radius: 8px; padding: 12px 16px; border: 1px solid #e5e7eb; }
  .party-label { font-size: 9px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
  .party-name { font-size: 13px; font-weight: 700; color: #1f2937; }
  .party-detail { font-size: 10px; color: #6b7280; line-height: 1.5; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { background: #6a11cb; color: #fff; padding: 8px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; }
  th:first-child { border-radius: 6px 0 0 0; }
  th:last-child { border-radius: 0 6px 0 0; text-align: right; }
  .totals { display: flex; justify-content: flex-end; margin-bottom: 20px; }
  .totals-box { width: 260px; }
  .totals-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 11px; }
  .totals-row.total { border-top: 2px solid #6a11cb; padding-top: 8px; margin-top: 4px; font-size: 14px; font-weight: 800; color: #6a11cb; }
  .footer { border-top: 1px solid #e5e7eb; padding-top: 12px; font-size: 9px; color: #9ca3af; text-align: center; line-height: 1.6; }
  .notes { background: #f9fafb; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; border: 1px solid #e5e7eb; }
  .notes-title { font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; margin-bottom: 4px; }
  .notes-text { font-size: 10px; color: #374151; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 9px; font-weight: 700; text-transform: uppercase; }
  .badge-paid { background: #dcfce7; color: #166534; }
  .badge-pending { background: #fef3c7; color: #92400e; }
  .badge-outstanding { background: #fee2e2; color: #991b1b; }
</style></head><body>
<div class="page">
  <div class="header">
    <div>
      ${companyProfile?.logo ? `<img src="${companyProfile.logo}" style="max-height:50px;max-width:160px;object-fit:contain;margin-bottom:6px"/>` : ''}
      <div class="company-name">${esc(companyProfile?.company_name || 'Your Company')}</div>
      <div class="company-detail">
        ${esc(companyProfile?.address || '')}<br>
        ${esc(companyProfile?.city || '')} ${esc(companyProfile?.country || '')}<br>
        TRN: ${esc(companyProfile?.vat_no || companyProfile?.trn || '—')}<br>
        Tel: ${esc(companyProfile?.phone || '')} | ${esc(companyProfile?.email || '')}
      </div>
    </div>
    <div>
      <div class="doc-title">${docType}</div>
      <div class="doc-meta">
        Invoice #: <b>${esc(inv.invoice_no || inv.pin_no || inv.note_no || '—')}</b><br>
        Date: <b>${esc(inv.doc_date || inv.invoice_date || inv.created_at?.slice(0, 10) || '—')}</b><br>
        ${inv.due_date ? `Due Date: <b>${esc(inv.due_date)}</b><br>` : ''}
        <span class="badge ${inv.status === 'Paid' ? 'badge-paid' : inv.status === 'Outstanding' ? 'badge-outstanding' : 'badge-pending'}">${esc(inv.status || 'Pending')}</span>
      </div>
    </div>
  </div>

  <div class="parties">
    <div class="party-box">
      <div class="party-label">Bill To</div>
      <div class="party-name">${esc(inv.customer_name || inv.party_name || '—')}</div>
      <div class="party-detail">
        ${inv.customer_address ? esc(inv.customer_address) + '<br>' : ''}
        ${inv.customer_vat ? 'TRN: ' + esc(inv.customer_vat) : ''}
      </div>
    </div>
    ${inv.payment_method ? `<div class="party-box" style="max-width:160px">
      <div class="party-label">Payment</div>
      <div class="party-detail">
        Method: <b>${esc(inv.payment_method)}</b><br>
        ${inv.amount_paid ? 'Paid: <b>' + fmt(inv.amount_paid) + '</b><br>' : ''}
        ${inv.balance || inv.amount_paid ? 'Balance: <b>' + fmt(inv.balance || (grandTotal - Number(inv.amount_paid || 0))) + '</b>' : ''}
      </div>
    </div>` : ''}
  </div>

  <table>
    <thead><tr>
      <th style="width:30px">#</th>
      <th style="text-align:left">Description</th>
      <th style="width:50px">Qty</th>
      <th style="width:80px;text-align:right">Unit Price</th>
      <th style="width:90px">Amount</th>
    </tr></thead>
    <tbody>${itemRows || `<tr><td colspan="5" style="padding:12px;text-align:center;color:#9ca3af;font-size:11px">No items</td></tr>`}</tbody>
  </table>

  <div class="totals">
    <div class="totals-box">
      <div class="totals-row"><span>Subtotal</span><span>${fmt(inv.subtotal || subtotal)}</span></div>
      <div class="totals-row"><span>Tax (${inv.vat_percent || 0}%)</span><span>${fmt(inv.vat_amount || vatAmount)}</span></div>
      <div class="totals-row total"><span>Total</span><span>${fmt(inv.grand_total || grandTotal)}</span></div>
      ${inv.amount_paid ? `<div class="totals-row"><span>Paid</span><span style="color:#16a34a">-${fmt(inv.amount_paid)}</span></div>` : ''}
      ${(inv.balance || inv.amount_paid) ? `<div class="totals-row total"><span>Balance Due</span><span>${fmt(inv.balance || (grandTotal - Number(inv.amount_paid || 0)))}</span></div>` : ''}
    </div>
  </div>

  ${inv.notes ? `<div class="notes"><div class="notes-title">Notes</div><div class="notes-text">${esc(inv.notes)}</div></div>` : ''}

  <div class="footer">
    ${esc(companyProfile?.company_name || 'Your Company')} | ${esc(companyProfile?.address || '')} | TRN: ${esc(companyProfile?.vat_no || '—')}<br>
    This is a computer-generated document. Thank you for your business.
  </div>
</div>
</body></html>`

  const el = document.createElement('div')
  el.innerHTML = html
  el.style.position = 'fixed'
  el.style.left = '-9999px'
  el.style.top = '0'
  document.body.appendChild(el)

  const pdfBlob = await html2pdf().set({
    margin: 0,
    filename: `${docType.replace(/\s+/g, '_')}_${inv.invoice_no || inv.pin_no || inv.note_no || 'draft'}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
  }).from(el).outputPdf('blob')

  document.body.removeChild(el)
  return pdfBlob
}

export const downloadPDF = async (inv: any, companyProfile: any, items: any[], docType?: string) => {
  const blob = await generateInvoicePDF(inv, companyProfile, items, docType)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${docType || 'Invoice'}_${inv.invoice_no || inv.pin_no || inv.note_no || 'draft'}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

const esc = (s: any) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
