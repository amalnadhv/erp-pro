import { useState, useRef } from 'react'
import { supabase } from '../utils/supabaseClient'

interface Props { fmtMoney: (n: number, curr?: string) => string; onClose: () => void }

export default function BankCsvImport({ fmtMoney, onClose }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<any[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({ date: '', description: '', debit: '', credit: '', reference: '' })
  const [bankAccount, setBankAccount] = useState('')
  const [accounts, setAccounts] = useState<any[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState('')
  const [step, setStep] = useState(1)
  const fileRef = useRef<HTMLInputElement>(null)

  useState(() => {
    supabase.from('accounts').select('id, code, name, type').eq('type', 'Bank').then(({ data }) => setAccounts(data || []))
  })

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const lines = text.split('\n').filter((l) => l.trim())
      if (lines.length < 2) { setResult('CSV has no data rows'); return }
      const hdrs = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''))
      setHeaders(hdrs)
      const rows = lines.slice(1, 51).map((line) => {
        const vals = line.split(',').map((v) => v.trim().replace(/"/g, ''))
        const obj: Record<string, string> = {}
        hdrs.forEach((h, i) => obj[h] = vals[i] || '')
        return obj
      })
      setPreview(rows)
      // Auto-detect mapping
      const autoMap: Record<string, string> = {}
      hdrs.forEach((h) => {
        const lower = h.toLowerCase()
        if (lower.includes('date') && !autoMap.date) autoMap.date = h
        if ((lower.includes('desc') || lower.includes('narr') || lower.includes('particular')) && !autoMap.description) autoMap.description = h
        if ((lower.includes('debit') || lower.includes('withdrawal') || lower.includes('dr')) && !autoMap.debit) autoMap.debit = h
        if ((lower.includes('credit') || lower.includes('deposit') || lower.includes('cr')) && !autoMap.credit) autoMap.credit = h
        if ((lower.includes('ref') || lower.includes('cheque') || lower.includes('chq')) && !autoMap.reference) autoMap.reference = h
      })
      setMapping(autoMap)
      setStep(2)
    }
    reader.readAsText(f)
  }

  const doImport = async () => {
    if (!mapping.date || !bankAccount) { setResult('Please map the Date column and select a bank account.'); return }
    setImporting(true); setResult('')
    let imported = 0, failed = 0
    for (const row of preview) {
      const dateVal = row[mapping.date]
      const desc = row[mapping.description] || ''
      const debit = Number(row[mapping.debit]?.replace(/,/g, '') || 0)
      const credit = Number(row[mapping.credit]?.replace(/,/g, '') || 0)
      const ref = row[mapping.reference] || ''
      const amount = credit - debit
      if (!dateVal || amount === 0) { failed++; continue }
      try {
        // Create journal entry
        const { data: je } = await supabase.from('journal_entries').insert({
          entry_date: dateVal, reference: ref || `CSV-${Date.now()}`, narration: desc || 'Bank Import',
          status: 'Posted', total_debit: Math.abs(amount), total_credit: Math.abs(amount), currency: 'USD',
        }).select()
        if (!je?.length) { failed++; continue }
        const jeId = je[0].id
        const bankAcctId = bankAccount
        const suspenseAcct = accounts.find((a) => a.name.toLowerCase().includes('suspense'))?.id || accounts.find((a) => a.type === 'Income')?.id
        const lines = [
          { entry_id: jeId, line_no: 1, account_id: bankAcctId, debit: amount > 0 ? amount : 0, credit: amount < 0 ? Math.abs(amount) : 0, description: desc },
          { entry_id: jeId, line_no: 2, account_id: suspenseAcct, debit: amount < 0 ? Math.abs(amount) : 0, credit: amount > 0 ? amount : 0, description: desc },
        ]
        await supabase.from('journal_lines').insert(lines)
        imported++
      } catch (e) { failed++ }
    }
    setResult(`✅ Imported ${imported} transactions${failed > 0 ? `, ${failed} failed` : ''}.`)
    setImporting(false)
    if (imported > 0) setStep(3)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 16, width: 600, maxWidth: '95%', maxHeight: '90vh', overflow: 'auto', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>🏦 Bank CSV Import</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: '#64748b' }}>✕</button>
        </div>

        {step === 1 && (
          <div>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>Upload a CSV file from your bank. Supported formats: Date, Description, Debit, Credit, Reference.</p>
            <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} style={{ display: 'none' }} />
            <button onClick={() => fileRef.current?.click()} style={{ width: '100%', padding: '20px 0', borderRadius: 12, border: '2px dashed #d1d5db', background: '#f8fafc', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#475569' }}>
              📁 Click to select CSV file
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Bank Account</label>
              <select value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}>
                <option value="">Select bank account...</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
              </select>
            </div>

            <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 8 }}>Column Mapping:</div>
            {['date', 'description', 'debit', 'credit', 'reference'].map((field) => (
              <div key={field} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                <span style={{ width: 90, fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>{field}:</span>
                <select value={mapping[field]} onChange={(e) => setMapping({ ...mapping, [field]: e.target.value })} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12 }}>
                  <option value="">— Skip —</option>
                  {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}

            {preview.length > 0 && (
              <div style={{ marginTop: 14, maxHeight: 200, overflow: 'auto', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead><tr style={{ background: '#f1f5f9' }}>{headers.slice(0, 6).map((h) => <th key={h} style={{ padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>{h}</th>)}</tr></thead>
                  <tbody>{preview.slice(0, 10).map((row, i) => <tr key={i}>{headers.slice(0, 6).map((h) => <td key={h} style={{ padding: '4px 8px', borderBottom: '1px solid #f1f5f9' }}>{row[h]?.substring(0, 30)}</td>)}</tr>)}</tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button onClick={() => setStep(1)} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>← Back</button>
              <button onClick={doImport} disabled={importing} style={{ flex: 2, padding: '10px 0', borderRadius: 8, background: importing ? '#94a3b8' : '#8b5cf6', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: importing ? 'not-allowed' : 'pointer' }}>
                {importing ? 'Importing...' : `📥 Import ${preview.length} Transactions`}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Import Complete</div>
            <div style={{ fontSize: 13, color: '#64748b' }}>{result}</div>
            <button onClick={onClose} style={{ marginTop: 16, padding: '10px 24px', borderRadius: 8, background: '#8b5cf6', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Done</button>
          </div>
        )}

        {result && step < 3 && <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: result.startsWith('✅') ? '#f0fdf4' : '#fef2f2', color: result.startsWith('✅') ? '#16a34a' : '#dc2626', fontSize: 12 }}>{result}</div>}
      </div>
    </div>
  )
}
