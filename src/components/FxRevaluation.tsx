import React, { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'
import ShareBar from './ShareBar'

const num = (v: any) => Number(v || 0)
const money = (v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function FxRevaluation({ accounts, baseCurrency }: any) {
  const [rates, setRates] = useState<any[]>([])
  const [asOf, setAsOf] = useState(new Date().toISOString().slice(0, 10))
  const [rows, setRows] = useState<any[]>([])
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { (async () => { const { data } = await supabase.from('exchange_rates').select('*').order('rate_date', { ascending: false }); setRates(data || []) })() }, [])
  useEffect(() => { build() }, [asOf, rates, accounts, baseCurrency])

  const rateFor = (cur: string) => {
    const direct = rates.filter((r: any) => r.from_currency === cur && r.to_currency === baseCurrency && r.rate_date <= asOf)
      .sort((a: any, b: any) => b.rate_date.localeCompare(a.rate_date))[0]
    if (direct) return direct.rate
    const inv = rates.filter((r: any) => r.from_currency === baseCurrency && r.to_currency === cur && r.rate_date <= asOf)
      .sort((a: any, b: any) => b.rate_date.localeCompare(a.rate_date))[0]
    if (inv && inv.rate) return 1 / inv.rate
    return null
  }

  const build = () => {
    const fx = (accounts || []).filter((a: any) => a.currency && a.currency !== baseCurrency)
    setRows(fx.map((a: any) => {
      const rate = rateFor(a.currency)
      const baseBal = num(a.current_balance)
      const foreignBal = rate ? baseBal / rate : 0
      return { id: a.id, code: a.code, name: a.name, currency: a.currency, baseBal, rate, foreignBal, revalued: rate ? foreignBal * rate : baseBal, diff: rate ? foreignBal * rate - baseBal : 0 }
    }))
  }

  const setForeign = (id: string, val: number) => setRows((r) => r.map((x) => {
    if (x.id !== id) return x
    const foreignBal = val; const rate = x.rate; const revalued = rate ? foreignBal * rate : x.baseBal
    return { ...x, foreignBal, revalued, diff: revalued - x.baseBal }
  }))

  const ensureAccount = async (name: string, type: string, prefix: string) => {
    const existing = (accounts || []).find((x: any) => x.name === name && x.type === type)
    if (existing) return existing.id
    const code = prefix + Date.now().toString().slice(-6)
    const { data } = await supabase.from('accounts').insert({ code, name, type, is_group: false, status: 'Active' }).select()
    if (data && data.length) return data[0].id
    return null
  }

  const postJournal = async (lines: any[], narration: string) => {
    const totalDebit = lines.reduce((s, l) => s + num(l.debit), 0)
    const totalCredit = lines.reduce((s, l) => s + num(l.credit), 0)
    const { data: je } = await supabase.from('journal_entries').insert({ entry_date: asOf, reference: 'FX', narration, status: 'Posted', total_debit: totalDebit, total_credit: totalCredit, currency: baseCurrency }).select()
    if (!je || !je.length) throw new Error('journal insert failed')
    const jeLines = lines.map((l, i) => ({ entry_id: je[0].id, line_no: i + 1, account_id: l.account_id, debit: num(l.debit), credit: num(l.credit), description: l.description }))
    await supabase.from('journal_lines').insert(jeLines)
  }

  const postAll = async () => {
    setSaving(true); setMsg('')
    try {
      const fxGain = await ensureAccount('FX Gain/Loss', 'Income', 'FX')
      let posted = 0
      for (const r of rows) {
        if (!r.rate || Math.abs(r.diff) < 0.005) continue
        const lines = r.diff > 0
          ? [{ account_id: r.id, debit: r.diff, credit: 0, description: `FX revaluation ${r.currency}` }, { account_id: fxGain, debit: 0, credit: r.diff, description: `FX gain ${r.currency}` }]
          : [{ account_id: fxGain, debit: -r.diff, credit: 0, description: `FX loss ${r.currency}` }, { account_id: r.id, debit: 0, credit: -r.diff, description: `FX revaluation ${r.currency}` }]
        await postJournal(lines, `FX revaluation ${r.name} @ ${asOf}`)
        await supabase.from('accounts').update({ current_balance: r.baseBal + r.diff }).eq('id', r.id)
        posted++
      }
      setMsg(posted ? `Revaluation posted for ${posted} account(s).` : 'No balances to revalue.')
    } catch (e: any) { setMsg('Error: ' + (e?.message || e)) }
    setSaving(false)
  }

  const cols = [
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Account' },
    { key: 'currency', label: 'Ccy' },
    { key: 'baseBal', label: 'Book (Base)', numeric: true },
    { key: 'rate', label: 'Rate', numeric: true },
    { key: 'foreignBal', label: 'Foreign Bal', numeric: true },
    { key: 'diff', label: 'Gain/(Loss)', numeric: true },
  ]
  const exportRows = rows.map((r) => ({
    code: r.code, name: r.name, currency: r.currency,
    baseBal: money(r.baseBal), rate: r.rate ?? '', foreignBal: money(r.foreignBal), diff: money(r.diff),
  }))

  return (
    <div className="fa-wrap">
      <div className="fa-toolbar noprint">
        <div className="fa-summary">
          <span><b>Base:</b> {baseCurrency}</span>
          <span><b>As of:</b> {asOf}</span>
          <span><b>FX Accounts:</b> {rows.length}</span>
        </div>
        <div className="fa-tools">
          <label className="fa-month">As of<input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} /></label>
          <button className="doc-btn primary" onClick={postAll} disabled={saving || !rows.length}>Post Revaluation</button>
          <ShareBar title="FX Revaluation" columns={cols} rows={exportRows} meta={{ 'Total Gain/(Loss)': money(rows.reduce((s, r) => s + r.diff, 0)) }} />
        </div>
      </div>
      {msg && <div className="fa-msg noprint">{msg}</div>}
      <h3 className="fa-print-title">Foreign Currency Revaluation</h3>
      <table className="fa-tbl">
        <thead>
          <tr>
            <th>Code</th><th>Account</th><th>Ccy</th><th className="num">Book (Base)</th>
            <th className="num">Rate→{baseCurrency}</th><th className="num">Foreign Balance</th><th className="num">Gain/(Loss)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.code}</td>
              <td>{r.name}</td>
              <td>{r.currency}</td>
              <td className="num">{money(r.baseBal)}</td>
              <td className="num">{r.rate ?? '—'}</td>
              <td className="num">
                <input type="number" step="0.01" value={Number(r.foreignBal.toFixed(2))} onChange={(e) => setForeign(r.id, Number(e.target.value))} style={{ width: 110, textAlign: 'right' }} />
              </td>
              <td className={`num ${r.diff >= 0 ? 'cr' : 'dr'}`}>{money(r.diff)}</td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={7} className="fa-empty">No foreign-currency accounts found (set a currency ≠ {baseCurrency} on accounts).</td></tr>}
        </tbody>
        {rows.length > 0 && (
          <tfoot>
            <tr>
              <td colSpan={6} className="num"><b>Total Gain/(Loss)</b></td>
              <td className={`num ${rows.reduce((s, r) => s + r.diff, 0) >= 0 ? 'cr' : 'dr'}`}><b>{money(rows.reduce((s, r) => s + r.diff, 0))}</b></td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}
