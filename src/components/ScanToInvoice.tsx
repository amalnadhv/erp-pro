import { useState } from 'react'
import { supabase } from '../utils/supabaseClient'

export default function ScanToInvoice({ realId, entityType, onFill, triggerLabel = '📷 Scan Invoice' }: any) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [data, setData] = useState<any>(null)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [showAi, setShowAi] = useState(false)
  const [ai, setAi] = useState<any>(() => { try { return JSON.parse(localStorage.getItem('aiOcr') || '{}') } catch { return {} } })

  const saveAi = () => { localStorage.setItem('aiOcr', JSON.stringify(ai)); setShowAi(false) }
  const onPick = (f: File | null) => {
    setFile(f); setPreview(''); setData(null); setErr(''); setMsg('')
    if (f && f.type.startsWith('image/')) { const r = new FileReader(); r.onload = () => setPreview(r.result as string); r.readAsDataURL(f) }
  }

  const extract = async () => {
    setErr(''); setBusy(true)
    try {
      if (!ai.apiKey || !ai.endpoint) { setErr('Configure the AI endpoint and API key first (⚙️).'); setBusy(false); return }
      if (!file) { setErr('Choose a scanned invoice image/PDF first.'); setBusy(false); return }
      const dataUrl = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(file) })
      const isPdf = file.type === 'application/pdf'
      const contentPart = isPdf ? { type: 'pdf', pdf: { base64: dataUrl.split(',')[1] || dataUrl } } : { type: 'image_url', image_url: { url: dataUrl } }
      const body = {
        model: ai.model || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an invoice data extractor. Return ONLY valid JSON (no markdown) with keys: invoice_no, invoice_date (YYYY-MM-DD), due_date (YYYY-MM-DD or null), supplier_name, currency, tax_percent (number), notes, line_items: [{description, quantity (number), unit_price (number)}]. If a field is missing use null or empty array.' },
          { role: 'user', content: [{ type: 'text', text: 'Extract the fields from this invoice ' + (isPdf ? 'PDF' : 'image') + '.' }, contentPart] },
        ],
        response_format: { type: 'json_object' },
      }
      const res = await fetch(ai.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + ai.apiKey }, body: JSON.stringify(body) })
      const j = await res.json()
      if (!res.ok) { setErr('AI error: ' + (j?.error?.message || res.statusText)); setBusy(false); return }
      setData(JSON.parse(j?.choices?.[0]?.message?.content || '{}'))
    } catch (e: any) { setErr('Extract failed: ' + (e?.message || e)) }
    setBusy(false)
  }

  const attachScan = async () => {
    setErr(''); setMsg('')
    if (!realId) { setErr('Save the invoice first, then reopen Scan to attach the source file.'); return }
    if (!file) { setErr('No file selected.'); return }
    try {
      const path = `${realId}/${Date.now()}-${(file.name || 'scan').replace(/\s+/g, '_')}`
      const { error } = await supabase.storage.from('attachments').upload(path, file, { upsert: true, contentType: file.type })
      if (error) { setErr('Upload failed: ' + error.message); return }
      const { data: pu } = supabase.storage.from('attachments').getPublicUrl(path)
      await supabase.from('attachments').insert({ entity_type: entityType, entity_id: realId, file_name: file.name, file_path: path, file_url: pu.publicUrl, file_size: file.size, mime_type: file.type })
      setMsg('✅ Scan attached to this invoice.')
    } catch (e: any) { setErr('Attach failed: ' + (e?.message || e)) }
  }

  return (
    <>
      <button className="btn-print" onClick={() => setOpen(true)}>{triggerLabel}</button>
      {open && (
        <div className="cheque-overlay">
          <div style={{ background: '#fff', color: '#111', width: 560, maxWidth: '100%', padding: 20, borderRadius: 6 }} onPaste={(e) => {
            const it: any = Array.from((e as any).clipboardData?.items || []).find((x: any) => x.type.startsWith('image/') || x.type === 'application/pdf')
            if (it) { const f = it.getAsFile(); if (f) onPick(f) }
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h3 style={{ margin: 0 }}>📷 Scan Invoice to Entry</h3>
              <div>
                <button className="doc-btn sm" onClick={() => setShowAi(!showAi)} title="AI settings">⚙️</button>
                <button className="doc-btn sm" onClick={() => setOpen(false)}>✕</button>
              </div>
            </div>
            {showAi && (
              <div style={{ border: '1px solid #ddd', padding: 10, marginBottom: 10, borderRadius: 4 }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>AI / OCR Settings (stored in this browser)</div>
                <label style={{ display: 'block', marginBottom: 6 }}>Endpoint (OpenAI-compatible vision)
                  <input style={{ width: '100%' }} value={ai.endpoint || ''} onChange={(e) => setAi({ ...ai, endpoint: e.target.value })} placeholder="https://api.openai.com/v1/chat/completions" />
                </label>
                <label style={{ display: 'block', marginBottom: 6 }}>API Key
                  <input style={{ width: '100%' }} type="password" value={ai.apiKey || ''} onChange={(e) => setAi({ ...ai, apiKey: e.target.value })} placeholder="sk-..." />
                </label>
                <label style={{ display: 'block', marginBottom: 6 }}>Model
                  <input style={{ width: '100%' }} value={ai.model || ''} onChange={(e) => setAi({ ...ai, model: e.target.value })} placeholder="gpt-4o-mini" />
                </label>
                <button className="doc-btn primary" onClick={saveAi}>Save Settings</button>
              </div>
            )}
            <input type="file" accept="image/*,application/pdf" onChange={(e) => onPick(e.target.files?.[0] || null)} />
            <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Image or PDF. You can also paste from clipboard (Ctrl/Cmd+V).</div>
            {preview && <img src={preview} alt="scan" style={{ maxWidth: '100%', marginTop: 8, border: '1px solid #ccc' }} />}
            {file && !preview && <div style={{ marginTop: 8, fontStyle: 'italic' }}>📄 {file.name}</div>}
            {err && <div className="inv-error" style={{ marginTop: 8 }}>⚠️ {err}</div>}
            {msg && <div style={{ marginTop: 8, color: '#15803d' }}>{msg}</div>}
            <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn-primary" disabled={busy} onClick={extract}>{busy ? 'Extracting…' : '🔍 Extract'}</button>
              <button className="doc-btn" disabled={!file || !realId} onClick={attachScan} title={realId ? 'Store the scanned source with this invoice' : 'Save the invoice first'}>📎 Attach scan to invoice</button>
            </div>
            {data && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Extracted (review before filling):</div>
                <pre style={{ background: '#f5f5f5', padding: 8, borderRadius: 4, maxHeight: 200, overflow: 'auto', fontSize: 12 }}>{JSON.stringify(data, null, 2)}</pre>
                <button className="btn-primary" style={{ marginTop: 8 }} onClick={() => { onFill(data); setOpen(false) }}>✅ Fill Entry Form</button>
              </div>
            )}
            <p style={{ fontSize: 11, color: '#666', marginTop: 10 }}>Requires an OpenAI-compatible vision model (e.g. gpt-4o / gpt-4o-mini) with an API key and internet access from your browser. PDF input needs a model that supports PDF (e.g. gpt-4o).</p>
          </div>
        </div>
      )}
    </>
  )
}
