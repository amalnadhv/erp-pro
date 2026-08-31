import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'

interface Props { fmtMoney: (n: number) => string; currentCompany: any; onSwitch: (company: any) => void }

export default function MultiCompany({ fmtMoney, currentCompany, onSwitch }: Props) {
  const [companies, setCompanies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ company_name: '', country: 'UAE', base_currency: 'AED', vat_rate: 5, tax_id: '', vat_number: '' })

  const load = () => {
    setLoading(true)
    supabase.from('company_profile').select('*').order('company_name').then(({ data }) => { setCompanies(data || []); setLoading(false) })
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    if (!form.company_name.trim()) { alert('Company name is required'); return }
    await supabase.from('company_profile').insert(form)
    setShowForm(false)
    setForm({ company_name: '', country: 'UAE', base_currency: 'AED', vat_rate: 5, tax_id: '', vat_number: '' })
    load()
  }

  const deleteCompany = async (id: string) => {
    if (companies.length <= 1) { alert('Cannot delete the only company.'); return }
    if (!confirm('Delete this company? This cannot be undone.')) return
    await supabase.from('company_profile').delete().eq('id', id)
    if (currentCompany?.id === id) onSwitch(companies.find((c) => c.id !== id))
    load()
  }

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>🏢 Multi-Company</h2>

      <div style={{ marginBottom: 16, padding: '14px', borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe', fontSize: 13 }}>
        <b>Current Company:</b> {currentCompany?.company_name || 'Not set'} · {currentCompany?.base_currency || 'USD'} · {currentCompany?.country || 'Global'}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button onClick={() => setShowForm(true)} style={{ padding: '8px 18px', borderRadius: 8, background: '#8b5cf6', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+ Add Company</button>
      </div>

      {showForm && (
        <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16, marginBottom: 14, border: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 12px', fontSize: 14 }}>New Company</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Company Name
              <input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} style={{ width: '100%', marginTop: 4, padding: '7px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Country
              <select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} style={{ width: '100%', marginTop: 4, padding: '7px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12 }}>
                {['UAE', 'Saudi Arabia', 'India', 'UK', 'USA', 'Global'].map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Currency
              <select value={form.base_currency} onChange={(e) => setForm({ ...form, base_currency: e.target.value })} style={{ width: '100%', marginTop: 4, padding: '7px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12 }}>
                {['AED', 'SAR', 'USD', 'EUR', 'GBP', 'INR'].map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Tax Rate (%)
              <input type="number" min="0" max="100" value={form.vat_rate} onChange={(e) => setForm({ ...form, vat_rate: Number(e.target.value) })} style={{ width: '100%', marginTop: 4, padding: '7px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Tax ID
              <input value={form.tax_id} onChange={(e) => setForm({ ...form, tax_id: e.target.value })} style={{ width: '100%', marginTop: 4, padding: '7px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12 }} />
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={() => setShowForm(false)} style={{ padding: '7px 16px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            <button onClick={save} style={{ padding: '7px 16px', borderRadius: 6, background: '#8b5cf6', color: '#fff', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Create Company</button>
          </div>
        </div>
      )}

      {loading ? <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading...</div> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {companies.map((c) => (
            <div key={c.id} onClick={() => onSwitch(c)} style={{ padding: 16, borderRadius: 12, border: `2px solid ${currentCompany?.id === c.id ? '#8b5cf6' : '#e2e8f0'}`, background: currentCompany?.id === c.id ? '#f5f3ff' : '#fff', cursor: 'pointer', transition: 'all 0.15s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{c.company_name}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{c.country} · {c.base_currency}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Tax: {c.vat_rate}% {c.vat_number ? `· ${c.vat_number}` : ''}</div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {currentCompany?.id === c.id && <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: '#8b5cf6', color: '#fff' }}>ACTIVE</span>}
                  <button onClick={(e) => { e.stopPropagation(); deleteCompany(c.id) }} style={{ border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 14 }}>🗑️</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
