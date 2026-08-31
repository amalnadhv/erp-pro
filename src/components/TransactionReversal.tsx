import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'

interface Props { fmtMoney: (n: number) => string }

export default function TransactionReversal({ fmtMoney }: Props) {
  const [entries, setEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [reason, setReason] = useState('')
  const [reversing, setReversing] = useState<string | null>(null)
  const [result, setResult] = useState('')

  useEffect(() => {
    supabase.from('journal_entries').select('*').eq('status', 'Posted').order('created_at', { ascending: false }).limit(200)
      .then(({ data }) => { setEntries(data || []); setLoading(false) })
  }, [])

  const filtered = entries.filter((e) => !search || e.reference?.toLowerCase().includes(search.toLowerCase()) || e.narration?.toLowerCase().includes(search.toLowerCase()))

  const reverseEntry = async (entry: any) => {
    if (!reason.trim()) { setResult('Please enter a reversal reason.'); return }
    setReversing(entry.id); setResult('')
    try {
      // Create reversal entry
      const { data: newJE } = await supabase.from('journal_entries').insert({
        entry_date: new Date().toISOString().slice(0, 10),
        reference: `REV-${entry.reference || entry.id?.slice(0, 8)}`,
        narration: `REVERSAL of ${entry.reference}: ${reason}`,
        status: 'Posted',
        total_debit: entry.total_debit,
        total_credit: entry.total_credit,
        currency: entry.currency || 'USD',
      }).select()
      if (!newJE?.length) throw new Error('Failed to create reversal entry')
      const newId = newJE[0].id

      // Get original lines and reverse them
      const { data: origLines } = await supabase.from('journal_lines').select('*').eq('entry_id', entry.id)
      if (origLines) {
        const reversedLines = origLines.map((l, i) => ({
          entry_id: newId, line_no: i + 1,
          account_id: l.account_id,
          debit: Number(l.credit || 0),
          credit: Number(l.debit || 0),
          description: `REV: ${l.description || ''}`,
        }))
        await supabase.from('journal_lines').insert(reversedLines)

        // Update account balances
        for (const l of reversedLines) {
          const { data: acct } = await supabase.from('accounts').select('current_balance').eq('id', l.account_id).single()
          if (acct) {
            const newBal = Number(acct.current_balance || 0) + Number(l.debit || 0) - Number(l.credit || 0)
            await supabase.from('accounts').update({ current_balance: newBal }).eq('id', l.account_id)
          }
        }
      }

      // Mark original as Reversed
      await supabase.from('journal_entries').update({ status: 'Reversed' }).eq('id', entry.id)

      setResult(`✅ Entry ${entry.reference} reversed successfully. New entry: REV-${entry.reference}`)
      setReason('')
      setEntries((prev) => prev.map((e) => e.id === entry.id ? { ...e, status: 'Reversed' } : e))
    } catch (e: any) {
      setResult('❌ Error: ' + (e.message || e))
    }
    setReversing(null)
  }

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>🔄 Transaction Reversal</h2>

      <input type="text" placeholder="🔍 Search by reference or narration..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, marginBottom: 14 }} />

      <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 8, background: '#fffbeb', border: '1px solid #fde68a', fontSize: 12 }}>
        ⚠️ Reversing a journal entry creates an equal and opposite entry to undo the original posting. All account balances will be adjusted automatically.
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading...</div> : (
        <table className="data-grid report-table">
          <thead>
            <tr>
              <th>REFERENCE</th>
              <th>DATE</th>
              <th>NARRATION</th>
              <th className="col-money">DEBIT</th>
              <th className="col-money">CREDIT</th>
              <th>STATUS</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan="7" className="empty">No posted entries found</td></tr>}
            {filtered.map((e) => (
              <tr key={e.id} style={e.status === 'Reversed' ? { opacity: 0.5 } : {}}>
                <td style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>{e.reference || '—'}</td>
                <td>{(e.entry_date || e.created_at || '').slice(0, 10)}</td>
                <td style={{ fontSize: 12 }}>{e.narration || '—'}</td>
                <td className="col-money">{fmtMoney(Number(e.total_debit || 0))}</td>
                <td className="col-money">{fmtMoney(Number(e.total_credit || 0))}</td>
                <td>
                  <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: e.status === 'Reversed' ? '#fef2f2' : '#f0fdf4', color: e.status === 'Reversed' ? '#dc2626' : '#16a34a' }}>
                    {e.status}
                  </span>
                </td>
                <td>
                  {e.status === 'Posted' && (
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <input type="text" placeholder="Reason..." value={reversing === e.id ? reason : ''} onChange={(ev) => { setReversing(e.id); setReason(ev.target.value) }} style={{ width: 120, padding: '4px 8px', borderRadius: 4, border: '1px solid #e2e8f0', fontSize: 11 }} />
                      <button onClick={() => reverseEntry(e)} disabled={!reason.trim() || reversing === e.id + '-done'} style={{ padding: '4px 10px', borderRadius: 4, background: '#dc2626', color: '#fff', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                        {reversing === e.id ? '...' : '↩ Reverse'}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {result && <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: result.startsWith('✅') ? '#f0fdf4' : '#fef2f2', color: result.startsWith('✅') ? '#16a34a' : '#dc2626', fontSize: 13 }}>{result}</div>}
    </div>
  )
}
