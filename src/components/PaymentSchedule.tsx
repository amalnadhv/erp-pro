import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'

interface Props {
  invoice: any
  fmtMoney: (n: number, curr?: string) => string
  onClose: () => void
  onSave: () => void
}

export default function PaymentSchedule({ invoice, fmtMoney, onClose, onSave }: Props) {
  const [installments, setInstallments] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState('')
  const total = Number(invoice.grand_total || invoice.balance || 0)

  useEffect(() => {
    // Load existing schedule
    supabase.from('payment_schedules').select('*').eq('invoice_id', invoice.id).order('due_date')
      .then(({ data }) => {
        if (data && data.length) setInstallments(data)
        else setInstallments([{ due_date: new Date().toISOString().slice(0, 10), amount: total, status: 'Pending', notes: '' }])
      })
  }, [invoice.id])

  const addInstallment = () => {
    const remaining = total - installments.reduce((s, i) => s + (Number(i.amount) || 0), 0)
    setInstallments([...installments, { due_date: '', amount: remaining > 0 ? remaining : 0, status: 'Pending', notes: '' }])
  }

  const updateInstallment = (idx: number, field: string, value: any) => {
    const updated = [...installments]
    updated[idx] = { ...updated[idx], [field]: value }
    setInstallments(updated)
  }

  const removeInstallment = (idx: number) => {
    if (installments.length <= 1) return
    setInstallments(installments.filter((_, i) => i !== idx))
  }

  const allocated = installments.reduce((s, i) => s + (Number(i.amount) || 0), 0)
  const diff = total - allocated

  const saveSchedule = async () => {
    if (Math.abs(diff) > 0.01) { setResult('⚠️ Amounts do not match invoice total.'); return }
    setSaving(true); setResult('')
    try {
      // Delete old schedule
      await supabase.from('payment_schedules').delete().eq('invoice_id', invoice.id)
      // Insert new
      const rows = installments.map((i) => ({
        invoice_id: invoice.id, invoice_no: invoice.invoice_no || invoice.pin_no || '',
        customer_name: invoice.customer_name || invoice.party_name || '',
        due_date: i.due_date, amount: Number(i.amount) || 0,
        status: i.status || 'Pending', notes: i.notes || '',
      }))
      await supabase.from('payment_schedules').insert(rows)
      setResult('✅ Payment schedule saved!')
      onSave()
    } catch (e: any) {
      setResult('❌ Error: ' + (e.message || e))
    }
    setSaving(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 16, width: 550, maxWidth: '95%', maxHeight: '90vh', overflow: 'auto', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>📅 Payment Schedule</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: '#64748b' }}>✕</button>
        </div>

        <div style={{ background: '#f8fafc', borderRadius: 10, padding: 14, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{invoice.invoice_no || invoice.pin_no || ''}</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>{invoice.customer_name || invoice.party_name || ''}</div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#8b5cf6' }}>{fmtMoney(total)}</div>
        </div>

        {installments.map((inst, idx) => (
          <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 90px 40px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <input type="date" value={inst.due_date} onChange={(e) => updateInstallment(idx, 'due_date', e.target.value)} style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12 }} />
            <input type="number" min="0" step="0.01" value={inst.amount} onChange={(e) => updateInstallment(idx, 'amount', Number(e.target.value))} style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12, textAlign: 'right' }} />
            <select value={inst.status} onChange={(e) => updateInstallment(idx, 'status', e.target.value)} style={{ padding: '7px 8px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 11 }}>
              <option value="Pending">Pending</option>
              <option value="Paid">Paid</option>
              <option value="Overdue">Overdue</option>
            </select>
            <button onClick={() => removeInstallment(idx)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 16 }}>✕</button>
          </div>
        ))}

        <button onClick={addInstallment} style={{ width: '100%', padding: '8px 0', borderRadius: 8, border: '1px dashed #8b5cf6', background: '#f5f3ff', color: '#7c3aed', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 4 }}>+ Add Installment</button>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, padding: '10px 14px', borderRadius: 8, background: Math.abs(diff) < 0.01 ? '#f0fdf4' : '#fef2f2' }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>Allocated: {fmtMoney(allocated)}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: Math.abs(diff) < 0.01 ? '#16a34a' : '#dc2626' }}>
            {diff === 0 ? '✓ Balanced' : `Remaining: ${fmtMoney(Math.abs(diff))}`}
          </span>
        </div>

        {result && <div style={{ marginTop: 10, fontSize: 12, padding: '8px 12px', borderRadius: 8, background: result.startsWith('✅') ? '#f0fdf4' : '#fef2f2', color: result.startsWith('✅') ? '#16a34a' : '#dc2626' }}>{result}</div>}

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={saveSchedule} disabled={saving} style={{ flex: 2, padding: '10px 0', borderRadius: 8, background: saving ? '#94a3b8' : '#8b5cf6', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Saving...' : '💾 Save Schedule'}
          </button>
        </div>
      </div>
    </div>
  )
}
