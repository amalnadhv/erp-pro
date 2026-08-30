import { supabase } from './supabaseClient'

const esc = (s: any) => String(s == null ? '' : s)

export const printWithTemplate = async (docType: string, data: any) => {
  const { data: tpl, error } = await supabase
    .from('document_templates')
    .select('*')
    .eq('doc_type', docType)
    .limit(1)
    .maybeSingle()

  if (error) { window.alert('Template load error: ' + error.message); return }
  if (!tpl) {
    window.alert(`No template saved for "${docType}". Please design one in ADMINISTRATION → Screen Designer and Save it.`)
    return
  }

  const w = window.open('', '_blank')
  if (!w) { window.alert('Pop-up blocked. Allow pop-ups to print.'); return }

  const layout: any[] = tpl.layout || []
  const head = tpl.header || ''
  const foot = tpl.footer || ''
  const W = 720
  const HEAD_H = 90
  const FOOT_H = 90

  const items = data.items || []
  const itemRows = items.map((it: any, i: number) => {
    const total = it.total ?? (Number(it.qty) * Number(it.price))
    return `<tr>
      <td style="border:1px solid #e2e8f0;padding:5px">${i + 1}</td>
      <td style="border:1px solid #e2e8f0;padding:5px">${esc(it.name)}</td>
      <td style="border:1px solid #e2e8f0;padding:5px">${esc(it.qty)}</td>
      <td style="border:1px solid #e2e8f0;padding:5px">${esc(it.price)}</td>
      <td style="border:1px solid #e2e8f0;padding:5px">${esc(total)}</td>
    </tr>`
  }).join('')

  const els = layout.map((el: any) => {
    const base = `position:absolute;left:${el.x}px;top:${el.y}px;width:${el.w}px;height:${el.h}px;` +
      `font-size:${el.fontSize}px;font-weight:${el.bold ? 700 : 400};text-align:${el.align};` +
      `display:flex;align-items:center;box-sizing:border-box;padding:4px 6px;`
    if (el.type === 'label') return `<div style="${base}">${esc(el.text)}</div>`
    if (el.type === 'field') return `<div style="${base}">${esc(data[el.binding] ?? ('{' + el.binding + '}'))}</div>`
    if (el.type === 'image') {
      const url = data[el.binding]
      return `<div style="${base}">${url ? `<img src="${url}" style="max-height:100%;max-width:100%"/>` : 'LOGO'}</div>`
    }
    if (el.type === 'line') return `<div style="position:absolute;left:${el.x}px;top:${el.y}px;width:${el.w}px;height:${el.h}px;"><hr style="border:none;border-top:1px solid #94a3b8;margin:0"/></div>`
    if (el.type === 'table') return `<div style="position:absolute;left:${el.x}px;top:${el.y}px;width:${el.w}px;height:${el.h}px;overflow:auto">
      <table style="width:100%;border-collapse:collapse;font-size:${el.fontSize}px">
        <thead><tr>
          <th style="border:1px solid #cbd5e1;padding:4px;background:#f1f5f9">#</th>
          <th style="border:1px solid #cbd5e1;padding:4px;background:#f1f5f9">Item</th>
          <th style="border:1px solid #cbd5e1;padding:4px;background:#f1f5f9">Qty</th>
          <th style="border:1px solid #cbd5e1;padding:4px;background:#f1f5f9">Price</th>
          <th style="border:1px solid #cbd5e1;padding:4px;background:#f1f5f9">Total</th>
        </tr></thead>
        <tbody>${itemRows}</tbody>
      </table></div>`
    return ''
  }).join('')

  w.document.write(`<!DOCTYPE html><html><head><title>${esc(docType)}</title>
  <style>
    body{font-family:Arial,sans-serif;margin:0;padding:20px;background:#f1f5f9}
    .page{position:relative;width:${W}px;min-height:980px;margin:0 auto;background:#fff;box-shadow:0 4px 20px rgba(0,0,0,.15)}
    .band{position:absolute;left:0;right:0;padding:10px 16px;font-size:12px;color:#334155;white-space:pre-wrap}
    .head{top:0;height:${HEAD_H}px;border-bottom:1px solid #e2e8f0}
    .foot{bottom:0;height:${FOOT_H}px;border-top:1px solid #e2e8f0}
  </style></head>
  <body>
    <div class="page">
      <div class="band head">${esc(head)}</div>
      ${els}
      <div class="band foot">${esc(foot)}</div>
    </div>
    <script>window.onload=function(){window.print();}</script>
  </body></html>`)
  w.document.close()
}
