import React from 'react'
import { exportExcel, exportPdf, Col } from '../utils/export'

export default function ShareBar({
  title, columns, rows, meta, text, subject, onPrint, onPdf, onExcel, onEmail, onWhatsApp,
}: {
  title: string
  columns?: Col[]
  rows?: any[]
  meta?: Record<string, string>
  text?: string
  subject?: string
  onPrint?: () => void
  onPdf?: () => void
  onExcel?: () => void
  onEmail?: () => void
  onWhatsApp?: () => void
}) {
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
  const doEmail = onEmail || (() => {
    const s = encodeURIComponent(subject || title)
    const b = encodeURIComponent(buildText())
    window.location.href = `mailto:?subject=${s}&body=${b}`
  })
  const doWa = onWhatsApp || (() => {
    const t = encodeURIComponent(`${subject ? subject + '\n' : ''}${buildText()}`)
    window.open(`https://wa.me/?text=${t}`, '_blank', 'width=600,height=700')
  })
  return (
    <div className="share-bar noprint">
      <button className="doc-btn" onClick={doPrint} title="Print">🖨️ Print</button>
      <button className="doc-btn" onClick={doPdf} title="Save as PDF">📄 PDF</button>
      <button className="doc-btn" onClick={doExcel} title="Export to Excel">📊 Excel</button>
      <button className="doc-btn" onClick={doEmail} title="Email">✉️ Email</button>
      <button className="doc-btn" onClick={doWa} title="Share on WhatsApp">💬 WhatsApp</button>
    </div>
  )
}
