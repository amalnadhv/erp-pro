import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../utils/supabaseClient'

const FIELDS = [
  { key: 'date', label: 'Date', sample: '31/08/2026', color: '#1d4ed8' },
  { key: 'payee', label: 'Payee Name', sample: 'John Smith Trading LLC', color: '#059669' },
  { key: 'amount', label: 'Amount (Figures)', sample: '1,500.00 SAR', color: '#dc2626' },
  { key: 'words', label: 'Amount (Words)', sample: 'One Thousand Five Hundred Only', color: '#7c3aed' },
  { key: 'chequeno', label: 'Cheque No', sample: '001234', color: '#ea580c' },
]

const DEFAULTS = {
  date: { x: 150, y: 12 },
  payee: { x: 20, y: 38 },
  amount: { x: 150, y: 38 },
  words: { x: 20, y: 58 },
  chequeno: { x: 150, y: 78 },
}

const SCALE = 3.2

export default function ChequeTemplates() {
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<any>(null)
  const [msg, setMsg] = useState('')
  const [dragging, setDragging] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [activeField, setActiveField] = useState<string | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  const load = async () => {
    const { data } = await supabase.from('cheque_templates').select('*').order('bank_name')
    setList(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const newForm = () => {
    setForm({ id: null, bank_name: '', leaf_w_mm: 215, leaf_h_mm: 95, bg_url: '', positions: { ...DEFAULTS }, is_default: false })
    setShowPreview(true)
  }

  const edit = (t: any) => {
    setForm({ ...t, positions: { ...DEFAULTS, ...(t.positions || {}) } })
    setShowPreview(true)
  }

  const cancel = () => { setForm(null); setMsg(''); setDragging(null); setActiveField(null) }

  const upload = async (file: File) => {
    const path = `tpl-${Date.now()}-${file.name.replace(/\s+/g, '_')}`
    const { error } = await supabase.storage.from('cheques').upload(path, file, { upsert: true, contentType: file.type })
    if (error) { setMsg('Upload failed: ' + error.message); return }
    const { data } = supabase.storage.from('cheques').getPublicUrl(path)
    setForm((prev: any) => ({ ...prev, bg_url: data.publicUrl }))
  }

  const save = async () => {
    setMsg('')
    if (!form.bank_name) { setMsg('Enter a bank name.'); return }
    const pos = { ...DEFAULTS, ...(form.positions || {}) }
    const payload = {
      bank_name: form.bank_name,
      leaf_w_mm: Number(form.leaf_w_mm),
      leaf_h_mm: Number(form.leaf_h_mm),
      bg_url: form.bg_url || null,
      positions: pos,
      is_default: !!form.is_default,
    }
    let err: any = null
    if (form.id) {
      const { error } = await supabase.from('cheque_templates').update(payload).eq('id', form.id)
      err = error
    } else {
      const { error } = await supabase.from('cheque_templates').insert(payload).select()
      err = error
    }
    if (err) { setMsg('Error: ' + err.message); return }
    if (form.is_default) {
      await supabase.from('cheque_templates').update({ is_default: false }).neq('id', form.id || '00000000-0000-0000-0000-000000000000')
    }
    setForm(null)
    setMsg('Template saved!')
    load()
  }

  const del = async (id: string) => {
    if (!window.confirm('Delete this template?')) return
    await supabase.from('cheque_templates').delete().eq('id', id)
    load()
  }

  const setDef = async (id: string) => {
    await supabase.from('cheque_templates').update({ is_default: false }).neq('id', id)
    await supabase.from('cheque_templates').update({ is_default: true }).eq('id', id)
    load()
  }

  const positions = form?.positions || DEFAULTS

  const handleMouseDown = useCallback((fieldKey: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(fieldKey)
    setActiveField(fieldKey)
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !previewRef.current) return
    const rect = previewRef.current.getBoundingClientRect()
    const xPx = e.clientX - rect.left
    const yPx = e.clientY - rect.top
    const xMm = Math.max(0, Math.round(xPx / SCALE * 10) / 10)
    const yMm = Math.max(0, Math.round(yPx / SCALE * 10) / 10)
    setForm((prev: any) => ({
      ...prev,
      positions: { ...prev.positions, [dragging]: { x: xMm, y: yMm } }
    }))
  }, [dragging])

  const handleMouseUp = useCallback(() => {
    setDragging(null)
  }, [])

  const handleTouchStart = useCallback((fieldKey: string, e: React.TouchEvent) => {
    e.preventDefault()
    setDragging(fieldKey)
    setActiveField(fieldKey)
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragging || !previewRef.current) return
    const touch = e.touches[0]
    const rect = previewRef.current.getBoundingClientRect()
    const xPx = touch.clientX - rect.left
    const yPx = touch.clientY - rect.top
    const xMm = Math.max(0, Math.round(xPx / SCALE * 10) / 10)
    const yMm = Math.max(0, Math.round(yPx / SCALE * 10) / 10)
    setForm((prev: any) => ({
      ...prev,
      positions: { ...prev.positions, [dragging]: { x: xMm, y: yMm } }
    }))
  }, [dragging])

  const imgW = form ? Math.round(form.leaf_w_mm * SCALE) : 0
  const imgH = form ? Math.round(form.leaf_h_mm * SCALE) : 0

  if (loading) return <div className="report-wrap"><div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>Loading...</div></div>

  return (
    <div className="report-wrap">
      <div className="report-head">
        <h3>🖨️ Cheque Template Designer</h3>
        <div className="report-controls">
          {!form && <button className="doc-btn primary" onClick={newForm} style={{ background: '#8b5cf6', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>➕ New Template</button>}
        </div>
      </div>

      {msg && <div style={{ padding: '8px 14px', borderRadius: 8, background: msg.includes('Error') ? '#fef2f2' : '#f0fdf4', color: msg.includes('Error') ? '#dc2626' : '#16a34a', marginBottom: 12, fontSize: 13 }}>{msg}</div>}

      {!form && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
          {list.map((t) => (
            <div key={t.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', transition: 'box-shadow 0.2s' }}>
              {t.bg_url && (
                <div style={{ height: 120, background: `url(${t.bg_url}) center/cover`, borderBottom: '1px solid #e2e8f0' }} />
              )}
              {!t.bg_url && (
                <div style={{ height: 120, background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 24 }}>📄</div>
              )}
              <div style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>{t.bank_name}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{t.leaf_w_mm} × {t.leaf_h_mm} mm</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {t.is_default && <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>DEFAULT</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                  <button onClick={() => edit(t)} style={{ flex: 1, padding: '6px 0', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>✏️ Edit</button>
                  {!t.is_default && <button onClick={() => setDef(t.id)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 11, cursor: 'pointer' }}>⭐</button>}
                  <button onClick={() => del(t.id)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #fecaca', background: '#fff', color: '#dc2626', fontSize: 11, cursor: 'pointer' }}>✕</button>
                </div>
              </div>
            </div>
          ))}
          {!list.length && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: '#94a3b8' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🏦</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>No cheque templates yet</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Click "New Template" to design one for your bank</div>
            </div>
          )}
        </div>
      )}

      {form && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, alignItems: 'start' }}>
          <div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontSize: 15 }}>{form.id ? '✏️ Edit' : '➕ New'} Template</h4>
              <div style={{ flex: 1 }} />
              <button onClick={() => setShowPreview(!showPreview)} style={{ padding: '5px 12px', borderRadius: 6, border: `1px solid ${showPreview ? '#8b5cf6' : '#e2e8f0'}`, background: showPreview ? '#8b5cf6' : '#fff', color: showPreview ? '#fff' : '#475569', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                {showPreview ? '🗺️ Fields' : '👁️ Preview'}
              </button>
            </div>

            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 16, marginBottom: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Bank Name *</label>
                  <input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} placeholder="e.g. Al Rajhi, SNB, Riyad Bank" style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Leaf Width (mm)</label>
                  <input type="number" value={form.leaf_w_mm} onChange={(e) => setForm({ ...form, leaf_w_mm: Number(e.target.value) })} style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Leaf Height (mm)</label>
                  <input type="number" value={form.leaf_h_mm} onChange={(e) => setForm({ ...form, leaf_h_mm: Number(e.target.value) })} style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }} />
                </div>
              </div>
              <div style={{ marginTop: 10 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>📷 Upload Blank Cheque Image</label>
                <label style={{ display: 'inline-block', padding: '8px 16px', borderRadius: 8, border: '2px dashed #8b5cf6', background: '#f5f3ff', color: '#7c3aed', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  📁 Choose Image
                  <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f) }} style={{ display: 'none' }} />
                </label>
                {form.bg_url && <span style={{ marginLeft: 10, fontSize: 11, color: '#16a34a' }}>✅ Image uploaded</span>}
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 12, color: '#475569', cursor: 'pointer' }}>
                <input type="checkbox" checked={!!form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} />
                Make default (used when no bank match)
              </label>
            </div>

            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', position: 'relative', overflow: 'hidden' }}>
              <div style={{ padding: '8px 14px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>
                  {showPreview ? '👁️ Live Preview — Drag fields on the cheque image' : '🗺️ Position Editor — Drag fields to reposition'}
                </span>
                <span style={{ fontSize: 10, color: '#94a3b8' }}>Scale: {SCALE}px per mm</span>
              </div>

              <div
                ref={previewRef}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleMouseUp}
                style={{
                  position: 'relative',
                  width: imgW || 688,
                  height: imgH || 304,
                  margin: 16,
                  borderRadius: 8,
                  border: '2px solid #e2e8f0',
                  overflow: 'hidden',
                  cursor: dragging ? 'grabbing' : 'default',
                  background: form.bg_url ? `url(${form.bg_url}) center/contain no-repeat` : 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
                }}
              >
                {!form.bg_url && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>📄</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Upload a cheque image</div>
                    <div style={{ fontSize: 11, marginTop: 4 }}>Fields will overlay on the image</div>
                  </div>
                )}

                {FIELDS.map((f) => {
                  const pos = positions[f.key] || { x: 0, y: 0 }
                  const xPx = pos.x * SCALE
                  const yPx = pos.y * SCALE
                  const isActive = activeField === f.key
                  const isDragging = dragging === f.key

                  return (
                    <div
                      key={f.key}
                      onMouseDown={(e) => handleMouseDown(f.key, e)}
                      onTouchStart={(e) => handleTouchStart(f.key, e)}
                      onClick={() => setActiveField(f.key)}
                      style={{
                        position: 'absolute',
                        left: xPx,
                        top: yPx,
                        padding: '3px 8px',
                        borderRadius: 4,
                        background: isActive ? f.color : 'rgba(255,255,255,0.92)',
                        color: isActive ? '#fff' : f.color,
                        border: `1.5px ${isDragging ? 'solid' : 'dashed'} ${f.color}`,
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: isDragging ? 'grabbing' : 'grab',
                        whiteSpace: 'nowrap',
                        boxShadow: isDragging ? `0 4px 12px ${f.color}44` : '0 1px 4px rgba(0,0,0,0.1)',
                        zIndex: isDragging ? 100 : isActive ? 50 : 10,
                        transition: isDragging ? 'none' : 'box-shadow 0.2s',
                        userSelect: 'none',
                        transform: isDragging ? 'scale(1.05)' : 'scale(1)',
                      }}
                    >
                      {showPreview ? f.sample : f.label}
                      <span style={{ fontSize: 9, opacity: 0.7, marginLeft: 4 }}>{pos.x},{pos.y}</span>
                    </div>
                  )
                })}

                {form.bg_url && showPreview && (
                  <div style={{
                    position: 'absolute',
                    right: 8,
                    bottom: 8,
                    background: 'rgba(0,0,0,0.6)',
                    color: '#fff',
                    padding: '3px 8px',
                    borderRadius: 4,
                    fontSize: 9,
                  }}>
                    Sample data shown — real values print here
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ position: 'sticky', top: 0 }}>
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 14 }}>
              <h4 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: '#1e293b' }}>📍 Field Positions (mm)</h4>
              {FIELDS.map((f) => {
                const pos = positions[f.key] || { x: 0, y: 0 }
                const isActive = activeField === f.key
                return (
                  <div key={f.key} onClick={() => setActiveField(f.key)} style={{
                    padding: '8px 10px', borderRadius: 8, marginBottom: 6, cursor: 'pointer',
                    background: isActive ? `${f.color}11` : '#f8fafc',
                    border: `1px solid ${isActive ? f.color : '#e2e8f0'}`,
                    transition: 'all 0.15s',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: f.color }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#1e293b' }}>{f.label}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 9, color: '#94a3b8' }}>X (mm)</label>
                        <input type="number" step="0.5" value={pos.x} onChange={(e) => setForm((prev: any) => ({ ...prev, positions: { ...prev.positions, [f.key]: { ...pos, x: Number(e.target.value) } } }))} style={{ width: '100%', padding: '4px 6px', borderRadius: 4, border: '1px solid #d1d5db', fontSize: 12, textAlign: 'center' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 9, color: '#94a3b8' }}>Y (mm)</label>
                        <input type="number" step="0.5" value={pos.y} onChange={(e) => setForm((prev: any) => ({ ...prev, positions: { ...prev.positions, [f.key]: { ...pos, y: Number(e.target.value) } } }))} style={{ width: '100%', padding: '4px 6px', borderRadius: 4, border: '1px solid #d1d5db', fontSize: 12, textAlign: 'center' }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={save} style={{ flex: 1, padding: '10px 0', borderRadius: 8, background: '#8b5cf6', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>💾 Save Template</button>
              <button onClick={cancel} style={{ padding: '10px 16px', borderRadius: 8, background: '#fff', color: '#475569', border: '1px solid #d1d5db', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
