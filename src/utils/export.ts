// Reusable export helpers: CSV/Excel (.xls), printable PDF (via new window), and print.

function esc(v: any): string {
  if (v == null) return ''
  return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export type Col = { key: string; label: string; numeric?: boolean }

export function exportExcel(filename: string, title: string, columns: Col[], rows: any[]) {
  const head = '<tr>' + columns.map((c) => `<th>${esc(c.label)}</th>`).join('') + '</tr>'
  const body = rows
    .map((r) => '<tr>' + columns.map((c) => `<td>${esc(r[c.key])}</td>`).join('') + '</tr>')
    .join('')
  const html =
    `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">` +
    `<head><meta charset="utf-8"><style>table{border-collapse:collapse;width:100%}` +
    `td,th{border:1px solid #cbd5e1;padding:4px 8px;font-size:12px}` +
    `th{background:#f1f5f9;text-align:left}td.num{text-align:right}</style></head><body>` +
    `<h3>${esc(title)}</h3><table>${head}${body}</table></body></html>`
  download(filename + '.xls', html, 'application/vnd.ms-excel')
}

export function exportPdf(filename: string, title: string, columns: Col[], rows: any[], meta?: Record<string, string>) {
  const metaHtml = meta
    ? '<div style="margin-bottom:10px;font-size:12px;color:#475569">' +
      Object.entries(meta).map(([k, v]) => `<div><b>${esc(k)}:</b> ${esc(v)}</div>`).join('') +
      '</div>'
    : ''
  const head = '<tr>' + columns.map((c) => `<th>${esc(c.label)}</th>`).join('') + '</tr>'
  const body = rows
    .map((r) => '<tr>' + columns.map((c) => `<td class="${c.numeric ? 'num' : ''}">${esc(r[c.key])}</td>`).join('') + '</tr>')
    .join('')
  const html =
    `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>` +
    `<style>body{font-family:Segoe UI,Arial,sans-serif;padding:24px}` +
    `h2{margin:0 0 4px}.sub{color:#64748b;font-size:12px;margin-bottom:16px}` +
    `table{border-collapse:collapse;width:100%}td,th{border:1px solid #cbd5e1;padding:6px 9px;font-size:12px}` +
    `th{background:#f1f5f9;text-align:left}td.num{text-align:right;font-variant-numeric:tabular-nums}` +
    `@media print{.noprint{display:none}}</style></head><body>` +
    `<h2>${esc(title)}</h2><div class="sub">Generated ${new Date().toLocaleString()}</div>` +
    metaHtml + `<table>${head}${body}</table>` +
    `<script>window.onload=function(){setTimeout(function(){window.print()},250)}</script>` +
    `</body></html>`
  const w = window.open('', '_blank', 'width=900,height=700')
  if (!w) { alert('Pop-up blocked. Allow pop-ups to export PDF.'); return }
  w.document.open(); w.document.write(html); w.document.close()
}

export function printCurrent() { window.print() }
