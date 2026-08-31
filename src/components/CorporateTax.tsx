import React, { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'

export default function CorporateTax({ country: initialCountry }: { country?: string }) {
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [country, setCountry] = useState(initialCountry || 'UAE')
  const [rate, setRate] = useState(20)
  const [excluded, setExcluded] = useState<string[]>([])
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [countryList, setCountryList] = useState<any[]>([])

  useEffect(() => {
    Promise.all([
      supabase.from('accounts').select('id, code, name, type, current_balance').order('code'),
      supabase.from('tax_config').select('country, tax_name, standard_rate').eq('is_active', true).order('country'),
    ]).then(([accRes, tcRes]) => {
      setAccounts(accRes.data || [])
      setCountryList(tcRes.data || [])
      setLoading(false)
    })
  }, [])

  const onCountry = (c: string) => {
    setCountry(c)
    const tc = countryList.find((x) => x.country === c)
    if (tc) setRate(Number(tc.standard_rate) || 20)
  }

  const pl = accounts.filter((a) => a.type === 'Income' || a.type === 'Expense')
  const isExc = (id: string) => excluded.includes(id)
  const inc = pl.filter((a) => a.type === 'Income' && !isExc(a.id))
  const exp = pl.filter((a) => a.type === 'Expense' && !isExc(a.id))
  const sum = (arr: any[]) => arr.reduce((s, a) => s + Number(a.current_balance || 0), 0)
  const totInc = sum(inc)
  const totExp = sum(exp)
  const taxable = totInc - totExp
  const r = Number(rate) || 0
  const tax = taxable * r / 100
  const net = taxable - tax
  const exc = pl.filter((a) => isExc(a.id))

  const toggle = (id: string) => setExcluded((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id])
  const money = (v: number) => (v < 0 ? '(' + Math.abs(v).toFixed(2) + ')' : v.toFixed(2))

  return (
    <div className="tax-wrap">
      <div className="tax-head">
        <h3>🏛️ Corporate Taxation — {country === 'Saudi Arabia' ? 'ZATCA / Saudi CIT' : country + ' Corporate Tax'}</h3>
        <p className="tax-sub">Taxable base = Total Income − Total Expense. Tick any account to exclude it from the tax base (e.g. exempt income, non-deductible expenses).</p>
      </div>

      <div className="tax-controls">
        <label>Country / Regime
          <select value={country} onChange={(e) => onCountry(e.target.value)}>
            {countryList.map((tc) => <option key={tc.country} value={tc.country}>{tc.country} ({tc.tax_name}, CIT {tc.standard_rate}%)</option>)}
            {countryList.length === 0 && <>
              <option value="Saudi Arabia">Saudi Arabia (ZATCA, CIT 20%)</option>
              <option value="UAE">UAE (Corporate Tax 9%)</option>
              <option value="Oman">Oman (CIT 15%)</option>
              <option value="Other">Other</option>
            </>}
          </select>
        </label>
        <label>Period From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label>Period To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <label>Corporate Tax Rate (%)<input type="number" min="0" step="0.1" value={rate} onChange={(e) => setRate(Number(e.target.value))} /></label>
      </div>

      {loading ? <div className="empty">Loading accounts…</div> : (
        <div className="tax-body">
          <div className="tax-excl">
            <h4>Exclude Accounts from Tax Base</h4>
            <div className="tax-excl-list">
              {pl.map((a) => (
                <label key={a.id} className={`tax-excl-item ${isExc(a.id) ? 'on' : ''}`}>
                  <input type="checkbox" checked={isExc(a.id)} onChange={() => toggle(a.id)} />
                  <span className="tc-code">{a.code}</span>
                  <span className="tc-name">{a.name}</span>
                  <span className="tc-bal">{money(Number(a.current_balance || 0))}</span>
                  <span className="tc-type">{a.type}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="tax-summary">
            <div className="ts-row"><span>Total Income (included)</span><b>{money(totInc)}</b></div>
            <div className="ts-row"><span>Total Expense (included)</span><b>{money(totExp)}</b></div>
            <div className="ts-row total"><span>Taxable Income</span><b>{money(taxable)}</b></div>
            <div className="ts-row"><span>Tax Rate</span><b>{r}%</b></div>
            <div className="ts-row"><span>Tax Payable</span><b>{money(tax)}</b></div>
            <div className="ts-row total"><span>Net After Tax</span><b>{money(net)}</b></div>
            {exc.length > 0 && <div className="ts-exc">Excluded {exc.length} account(s): {exc.map((a) => a.code).join(', ')}</div>}
            <button className="btn-print" onClick={() => window.print()}>🖨️ Print</button>
          </div>
        </div>
      )}
    </div>
  )
}
