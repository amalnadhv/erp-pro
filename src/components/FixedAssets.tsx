import React, { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'
import ShareBar from './ShareBar'
import { logActivity } from '../utils/audit'

const num = (v: any) => Number(v || 0)

const annualDep = (a: any) => {
  const cost = num(a.cost)
  const salv = num(a.salvage_value)
  const life = num(a.useful_life)
  const acc = num(a.accumulated_depreciation)
  if (life <= 0) return 0
  if (a.method === 'Reducing balance') return Math.max(0, (cost - acc) * (1 / life))
  return Math.max(0, (cost - salv) / life)
}
const nbv = (a: any) => num(a.cost) - num(a.accumulated_depreciation)
const monthlyDep = (a: any) => annualDep(a) / 12
const lastDayOfMonth = (ym: string) => {
  const [y, m] = ym.split('-').map(Number)
  if (!y || !m) return new Date().toISOString().slice(0, 10)
  return new Date(y, m, 0).toISOString().slice(0, 10)
}

export default function FixedAssets() {
  const [assets, setAssets] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [profile, setProfile] = useState<any>(null)
  const [form, setForm] = useState({
    code: '', name: '', category: '', purchase_date: new Date().toISOString().slice(0, 10),
    cost: '', salvage_value: '0', useful_life: '', method: 'Straight-line', credit_account_id: '',
  })
  const [depMonth, setDepMonth] = useState(new Date().toISOString().slice(0, 7))

  useEffect(() => {
    (async () => {
      let p: any = null
      try { const { data } = await supabase.from('company_profile').select('*').single(); p = data } catch { /* */ }
      setProfile(p)
      const [a, ac] = await Promise.all([
        supabase.from('fixed_assets').select('*').order('purchase_date', { ascending: false }),
        supabase.from('accounts').select('id, code, name, type, current_balance').order('code'),
      ])
      setAssets(a.data || [])
      setAccounts(ac.data || [])
      const bank = (ac.data || []).find((x: any) => /bank|cash/i.test(x.name || ''))
      setForm((f) => ({ ...f, credit_account_id: bank ? bank.id : (ac.data && ac.data[0] ? ac.data[0].id : '') }))
      setLoading(false)
    })()
  }, [])

  const ensureAccount = async (name: string, type: string, prefix: string) => {
    const existing = accounts.find((x) => x.name === name && x.type === type)
    if (existing) return existing.id
    const code = prefix + Date.now().toString().slice(-6)
    const { data } = await supabase.from('accounts').insert({ code, name, type, is_group: false, status: 'Active' }).select()
    if (data && data.length) { setAccounts((p) => [...p, data[0]]); return data[0].id }
    return null
  }

  const postJournal = async (lines: any[], narration: string) => {
    const totalDebit = lines.reduce((s, l) => s + num(l.debit), 0)
    const totalCredit = lines.reduce((s, l) => s + num(l.credit), 0)
    const { data: je } = await supabase.from('journal_entries').insert({
      entry_date: new Date().toISOString().slice(0, 10),
      reference: 'FA',
      narration,
      status: 'Posted',
      total_debit: totalDebit,
      total_credit: totalCredit,
      currency: profile?.currency || 'AED',
    }).select()
    if (!je || !je.length) throw new Error('journal insert failed')
    const jeId = je[0].id
    const jeLines = lines.map((l, i) => ({ entry_id: jeId, line_no: i + 1, account_id: l.account_id, debit: num(l.debit), credit: num(l.credit), description: l.description }))
    await supabase.from('journal_lines').insert(jeLines)
    for (const l of lines) {
      const acct = accounts.find((a) => a.id === l.account_id)
      if (!acct) continue
      const newBal = num(acct.current_balance) + num(l.debit) - num(l.credit)
      await supabase.from('accounts').update({ current_balance: newBal }).eq('id', l.account_id)
    }
  }

  const saveAsset = async () => {
    setSaving(true); setMsg('')
    try {
      const cost = num(form.cost)
      if (!form.name || cost <= 0) { setMsg('Enter asset name and a positive cost.'); setSaving(false); return }
      const faAcct = await ensureAccount(`FA: ${form.name}`, 'Asset', 'FA')
      const { data: ins } = await supabase.from('fixed_assets').insert({
        code: form.code || `FA${Date.now().toString().slice(-5)}`,
        name: form.name, category: form.category, purchase_date: form.purchase_date,
        cost, salvage_value: num(form.salvage_value), useful_life: num(form.useful_life),
        method: form.method, asset_account_id: faAcct,
        accumulated_depreciation: 0, last_dep_date: form.purchase_date,
      }).select()
      await postJournal(
        [
          { account_id: faAcct, debit: cost, credit: 0, description: `Purchase of ${form.name}` },
          { account_id: form.credit_account_id, debit: 0, credit: cost, description: `Purchase of ${form.name}` },
        ],
        `Fixed asset purchase – ${form.name}`
      )
      if (ins && ins.length) setAssets((p) => [ins[0], ...p])
      logActivity('CREATE', 'Fixed Asset', `Registered ${form.name} cost ${cost}`)
      setMsg('Asset registered and purchase posted to ledger.')
      setShowForm(false)
      setForm({ ...form, code: '', name: '', category: '', cost: '', salvage_value: '0', useful_life: '' })
    } catch (e: any) {
      setMsg('Error: ' + (e?.message || e))
    }
    setSaving(false)
  }

  const postDep = async (a: any) => {
    setSaving(true); setMsg('')
    try {
      const amount = annualDep(a)
      if (amount <= 0 || nbv(a) <= num(a.salvage_value)) { setMsg('No further depreciation for this asset.'); setSaving(false); return }
      const expAcct = await ensureAccount('Depreciation Expense', 'Expense', 'EXP')
      const accDepAcct = await ensureAccount('Accumulated Depreciation', 'Asset', 'FAAD')
      await postJournal(
        [
          { account_id: expAcct, debit: amount, credit: 0, description: `Depreciation – ${a.name}` },
          { account_id: accDepAcct, debit: 0, credit: amount, description: `Depreciation – ${a.name}` },
        ],
        `Depreciation – ${a.name}`
      )
      await supabase.from('fixed_assets').update({
        accumulated_depreciation: num(a.accumulated_depreciation) + amount,
        last_dep_date: new Date().toISOString().slice(0, 10),
      }).eq('id', a.id)
      setAssets((p) => p.map((x) => (x.id === a.id ? { ...x, accumulated_depreciation: num(x.accumulated_depreciation) + amount, last_dep_date: new Date().toISOString().slice(0, 10) } : x)))
      setMsg(`Depreciation of ${amount.toFixed(2)} posted for ${a.name}.`)
    } catch (e: any) {
      setMsg('Error: ' + (e?.message || e))
    }
    setSaving(false)
  }

  const postAll = async () => {
    for (const a of assets) {
      if (annualDep(a) > 0 && nbv(a) > num(a.salvage_value)) await postDep(a)
    }
  }

  const postDepMonth = async (a: any) => {
    setSaving(true); setMsg('')
    try {
      const amount = monthlyDep(a)
      if (amount <= 0 || nbv(a) <= num(a.salvage_value)) { setMsg('No further depreciation for this asset.'); setSaving(false); return }
      const expAcct = await ensureAccount('Depreciation Expense', 'Expense', 'EXP')
      const accDepAcct = await ensureAccount('Accumulated Depreciation', 'Asset', 'FAAD')
      const monthEnd = lastDayOfMonth(depMonth)
      await postJournal(
        [
          { account_id: expAcct, debit: amount, credit: 0, description: `Depreciation – ${a.name} (${depMonth})` },
          { account_id: accDepAcct, debit: 0, credit: amount, description: `Depreciation – ${a.name} (${depMonth})` },
        ],
        `Depreciation – ${a.name} (${depMonth})`
      )
      await supabase.from('fixed_assets').update({
        accumulated_depreciation: num(a.accumulated_depreciation) + amount,
        last_dep_date: monthEnd,
      }).eq('id', a.id)
      setAssets((p) => p.map((x) => (x.id === a.id ? { ...x, accumulated_depreciation: num(x.accumulated_depreciation) + amount, last_dep_date: monthEnd } : x)))
      setMsg(`Monthly depreciation of ${amount.toFixed(2)} posted for ${a.name} (${depMonth}).`)
    } catch (e: any) {
      setMsg('Error: ' + (e?.message || e))
    }
    setSaving(false)
  }

  const postAllMonth = async () => {
    for (const a of assets) {
      if (monthlyDep(a) > 0 && nbv(a) > num(a.salvage_value)) await postDepMonth(a)
    }
  }

  const del = async (id: string) => {
    if (!confirm('Delete this asset? (ledger entries are not reversed)')) return
    await supabase.from('fixed_assets').delete().eq('id', id)
    setAssets((p) => p.filter((x) => x.id !== id))
  }

  const money = (v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const totalCost = assets.reduce((s, a) => s + num(a.cost), 0)
  const totalAcc = assets.reduce((s, a) => s + num(a.accumulated_depreciation), 0)
  const totalNbv = totalCost - totalAcc

  const cols = [
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Name' },
    { key: 'category', label: 'Category' },
    { key: 'purchase_date', label: 'Purchase Date' },
    { key: 'cost', label: 'Cost', numeric: true },
    { key: 'method', label: 'Method' },
    { key: 'useful_life', label: 'Life(Yrs)' },
    { key: 'accumulated_depreciation', label: 'Accum. Dep', numeric: true },
    { key: 'nbv', label: 'NBV', numeric: true },
    { key: 'annual', label: 'Annual Dep', numeric: true },
    { key: 'monthly', label: 'Monthly Dep', numeric: true },
  ]
  const rows = assets.map((a) => ({
    code: a.code, name: a.name, category: a.category, purchase_date: a.purchase_date,
    cost: money(num(a.cost)), method: a.method, useful_life: a.useful_life,
    accumulated_depreciation: money(num(a.accumulated_depreciation)),
    nbv: money(nbv(a)), annual: money(annualDep(a)), monthly: money(monthlyDep(a)),
  }))

  return (
    <div className="fa-wrap">
      <div className="fa-toolbar noprint">
        <div className="fa-summary">
          <span><b>Cost:</b> {money(totalCost)}</span>
          <span><b>Accum. Dep:</b> {money(totalAcc)}</span>
          <span><b>NBV:</b> {money(totalNbv)}</span>
        </div>
        <div className="fa-tools">
          <button className="doc-btn primary" onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancel' : '+ Asset Purchase'}</button>
           <button className="doc-btn" onClick={postAll} disabled={saving || !assets.length}>Post All Depreciation</button>
           <span className="fa-sep" />
           <label className="fa-month">Month<input type="month" value={depMonth} onChange={(e) => setDepMonth(e.target.value)} /></label>
           <button className="doc-btn" onClick={postAllMonth} disabled={saving || !assets.length}>Post Monthly ({depMonth})</button>
           <span className="fa-sep" />
          <ShareBar title="Fixed Assets Register" columns={cols} rows={rows} meta={{
            'Total Cost': money(totalCost), 'Total Accumulated Depreciation': money(totalAcc), 'Total NBV': money(totalNbv),
          }} />
        </div>
      </div>
      {msg && <div className="fa-msg noprint">{msg}</div>}

      {showForm && (
        <div className="fa-form noprint">
          <div className="fa-grid">
            <label>Code<input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="auto" /></label>
            <label>Asset Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label>Category<input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Machinery" /></label>
            <label>Purchase Date<input type="date" value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} /></label>
            <label>Cost<input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} /></label>
            <label>Salvage Value<input type="number" value={form.salvage_value} onChange={(e) => setForm({ ...form, salvage_value: e.target.value })} /></label>
            <label>Useful Life (yrs)<input type="number" value={form.useful_life} onChange={(e) => setForm({ ...form, useful_life: e.target.value })} /></label>
            <label>Method
              <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                <option>Straight-line</option><option>Reducing balance</option>
              </select>
            </label>
            <label>Credit Account (source of funds)
              <select value={form.credit_account_id} onChange={(e) => setForm({ ...form, credit_account_id: e.target.value })}>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
              </select>
            </label>
          </div>
          <button className="doc-btn primary" onClick={saveAsset} disabled={saving}>Save & Post Purchase</button>
        </div>
      )}

      <h3 className="fa-print-title">Fixed Assets Register</h3>
      <table className="fa-tbl">
        <thead>
          <tr>
            <th>Code</th><th>Name</th><th>Category</th><th>Purchase Date</th><th>Cost</th>
             <th>Method</th><th>Life</th><th>Accum. Dep</th><th>NBV</th><th>Annual Dep</th><th>Monthly Dep</th>
             <th className="noprint">Action</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((a) => (
            <tr key={a.id}>
              <td>{a.code}</td>
              <td>{a.name}</td>
              <td>{a.category}</td>
              <td>{a.purchase_date}</td>
              <td className="num">{money(num(a.cost))}</td>
              <td>{a.method}</td>
              <td>{a.useful_life}</td>
              <td className="num">{money(num(a.accumulated_depreciation))}</td>
               <td className="num">{money(nbv(a))}</td>
               <td className="num">{money(annualDep(a))}</td>
               <td className="num">{money(monthlyDep(a))}</td>
               <td className="fa-act noprint">
                 <button className="doc-btn sm" onClick={() => postDep(a)} disabled={saving}>Annual</button>
                 <button className="doc-btn sm" onClick={() => postDepMonth(a)} disabled={saving}>Monthly</button>
                 <button className="doc-btn sm danger" onClick={() => del(a.id)}>Delete</button>
               </td>
            </tr>
          ))}
          {!assets.length && <tr><td colSpan={12} className="fa-empty">No fixed assets registered yet.</td></tr>}
        </tbody>
        {assets.length > 0 && (
          <tfoot>
            <tr>
              <td colSpan={4} className="num"><b>Totals</b></td>
              <td className="num"><b>{money(totalCost)}</b></td>
              <td></td><td></td>
              <td className="num"><b>{money(totalAcc)}</b></td>
              <td className="num"><b>{money(totalNbv)}</b></td>
              <td className="num"><b>{money(assets.reduce((s, a) => s + annualDep(a), 0))}</b></td>
              <td className="num"><b>{money(assets.reduce((s, a) => s + monthlyDep(a), 0))}</b></td>
              <td className="noprint"></td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}
