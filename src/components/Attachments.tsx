import React, { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'

const BUCKET = 'attachments'

export default function Attachments({ entityType, entityId, label }: { entityType: string; entityId: string | null | undefined; label?: string }) {
  const [rows, setRows] = useState<any[]>([])
  const [busy, setBusy] = useState(false)

  const load = async () => {
    if (!entityId) { setRows([]); return }
    const { data } = await supabase.from('attachments').select('*').eq('entity_type', entityType).eq('entity_id', String(entityId)).order('uploaded_at')
    setRows(data || [])
  }
  useEffect(() => { load() }, [entityType, entityId])

  const onFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || !entityId || !files.length) return
    setBusy(true)
    try {
      for (const file of Array.from(files)) {
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const path = `${entityType}/${entityId}/${Date.now()}_${safe}`
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { cacheControl: '3600', upsert: false })
        if (upErr) { alert('Upload failed: ' + upErr.message); continue }
        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
        await supabase.from('attachments').insert({ entity_type: entityType, entity_id: String(entityId), file_name: file.name, file_path: path, file_url: urlData.publicUrl, file_size: file.size, mime_type: file.type })
      }
      await load()
    } finally { setBusy(false); e.target.value = '' }
  }

  const remove = async (r: any) => {
    if (!window.confirm('Delete attachment "' + r.file_name + '"?')) return
    await supabase.storage.from(BUCKET).remove([r.file_path])
    await supabase.from('attachments').delete().eq('id', r.id)
    await load()
  }

  if (!entityId) return <div className="att-box att-empty">Save the record first to attach files.</div>

  return (
    <div className="att-box">
      <div className="att-head">
        <span className="att-title">📎 {label || 'Attachments'}</span>
        <label className="att-add">＋ Attach<input type="file" multiple onChange={onFiles} /></label>
      </div>
      {busy && <div className="att-busy">Uploading…</div>}
      <ul className="att-list">
        {rows.length === 0 && <li className="att-none">No attachments yet.</li>}
        {rows.map((r) => (
          <li key={r.id} className="att-item">
            <a href={r.file_url} target="_blank" rel="noreferrer" className="att-link">{r.file_name}</a>
            <span className="att-meta">{r.file_size ? (r.file_size / 1024).toFixed(0) + ' KB' : ''}</span>
            <button className="att-del" onClick={() => remove(r)} title="Delete">✕</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
