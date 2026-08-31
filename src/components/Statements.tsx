import React, { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'
import ShareBar from './ShareBar'
import { logActivity } from '../utils/audit'

const num = (v: any) => Number(v || 0)
const money = (v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const getDate = (x: any) => x?.date || x?.doc_date || x?.invoice_date || x?.payment_date || x?.created_at || ''
const getRef = (x: any) => x?.invoice_no || x?.pin_no || x?.memo_no || x?.return_no || x?.grn_no || x?.reference || x?.no || ''

const buckets = (ageDays: number) => {
  if (ageDays <= 30) return 'b0'
  if (ageDays <= 60) return 'b30'
  if (ageDays <= 90) return 'b60'
  return 'b90'
}

const monthEnds = (f: string, t: string) => {
  const out: { label: string; asOf: string }[] = []
  if (!f || !t) return out
  let d = new Date(f); d.setDate(1)
  const end = new Date(t)
  while (d <= end) {
    const y = d.getFullYear(); const m = d.getMonth() + 1
    const last = new Date(y, m, 0)
    if (last <= end) out.push({ label: `${y}-${String(m).padStart(2, '0')}`, asOf: last.toISOString().slice(0, 10) })
    d = new Date(y, m + 1, 1)
  }
  return out
}

export default function Statements() {
  const [tab, setTab] = useState<'customer' | 'supplier'>('customer')
  const [mode, setMode] = useState<'single' | 'group'>('single')
  const [cust, setCust] = useState<any[]>([])
  const [supp, setSupp] = useState<any[]>([])
  const [inv, setInv] = useState<any[]>([])
  const [pinv, setPInv] = useState<any[]>([])
  const [credits, setCredits] = useState<any[]>([])
  const [pcredits, setPCredits] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [pays, setPays] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sel, setSel] = useState('')
  const [from, setFrom] = useState(() => { const x = new Date(); x.setFullYear(x.getFullYear() - 1); return x.toISOString().slice(0, 10) })
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [msg, setMsg] = useState('')

  useEffect(() => { load() }, [])
  const load = async () => {
    const [c, s, i, pi, cm, sr, acm, pr, ip, op] = await Promise.all([
      supabase.from('customers').select('id,name,email,stmt_consent,stmt_schedule'),
      supabase.from('suppliers').select('id,name,email,stmt_consent,stmt_schedule'),
      supabase.from('invoices').select('*'),
      supabase.from('purchase_invoices').select('*'),
      supabase.from('ar_credit_memos').select('*'),
      supabase.from('sales_returns').select('*'),
      supabase.from('ap_credit_memos').select('*'),
      supabase.from('purchase_returns').select('*'),
      supabase.from('incoming_payments').select('*'),
      supabase.from('outgoing_payments').select('*'),
    ])
    setCust(c.data || []); setSupp(s.data || [])
    setInv(i.data || []); setPInv(pi.data || [])
    setCredits([...(cm.data || []), ...(sr.data || [])])
    setPCredits([...(acm.data || []), ...(pr.data || [])])
    setPayments(ip.data || []); setPays(op.data || [])
    setLoading(false)
  }

  const list = tab === 'customer' ? cust : supp
  const cols = tab === 'customer' ? inv : pinv
  const creds = tab === 'customer' ? credits : pcredits
  const pay = tab === 'customer' ? payments : pays

  const partyKey = (p: any) => (tab === 'customer' ? p.customer_name : p.party_name)
  const partyIdKey = (p: any) => (tab === 'customer' ? p.customer_id : p.supplier_id)

  const computeParty = (name: string, id?: string, asOf: string = to) => {
    const matchCol = (x: any) => partyKey(x) === name || (id && partyIdKey(x) === id)
    const invs = cols.filter(matchCol)
    const crs = creds.filter((x) => x.party_name === name || (id && x.party_id === id))
    const pys = pay.filter((x) => (tab === 'customer' ? x.customer_id === id : x.supplier_id === id))
    const oustInv = (x: any) => num(x.grand_total) - num(x.amount_paid)
    // opening
    let opDebit = invs.filter((x) => getDate(x) < from).reduce((s, x) => s + num(x.grand_total), 0)
    let opCredit = pys.filter((x) => getDate(x) < from).reduce((s, x) => s + num(x.amount), 0)
    opCredit += crs.filter((x) => getDate(x) < from).reduce((s, x) => s + num(x.grand_total), 0)
    const opening = opDebit - opCredit
    // transactions in range
    const txns: any[] = []
    invs.filter((x) => getDate(x) >= from && getDate(x) <= asOf).forEach((x) => txns.push({ date: getDate(x), type: tab === 'customer' ? 'Invoice' : 'Bill', ref: getRef(x), debit: num(x.grand_total), credit: 0 }))
    pys.filter((x) => getDate(x) >= from && getDate(x) <= asOf).forEach((x) => txns.push({ date: getDate(x), type: tab === 'customer' ? 'Receipt' : 'Payment', ref: getRef(x), debit: 0, credit: num(x.amount) }))
    crs.filter((x) => getDate(x) >= from && getDate(x) <= asOf).forEach((x) => txns.push({ date: getDate(x), type: tab === 'customer' ? 'Credit Memo' : 'Credit Memo', ref: getRef(x), debit: 0, credit: num(x.grand_total) }))
    txns.sort((a, b) => a.date.localeCompare(b.date))
    let bal = opening
    txns.forEach((t) => { bal += t.debit - t.credit; t.balance = bal })
    const closing = bal
    // aging (from outstanding invoices as of 'to')
    const aging = { b0: 0, b30: 0, b60: 0, b90: 0 }
    let totalOut = 0
    invs.filter((x) => getDate(x) <= asOf).forEach((x) => {
      const o = oustInv(x); if (o <= 0) return
      totalOut += o
      const age = Math.max(0, Math.round((new Date(asOf).getTime() - new Date(getDate(x)).getTime()) / 86400000))
      aging[buckets(age)] += o
    })
    return { opening, txns, closing, aging, totalOut }
  }

  const selParty = list.find((p) => p.id === sel)
  const stmt = selParty ? computeParty(selParty.name, selParty.id) : null

  // groupwise aging
  const groupRows = list.map((p) => {
    const c = computeParty(p.name, p.id)
    return { ...p, ...c }
  })

  const months = monthEnds(from, to)
  const monthRows = list.map((p) => {
    const per = months.map((mo) => computeParty(p.name, p.id, mo.asOf).closing)
    return { name: p.name, per, total: per[per.length - 1] || 0 }
  })
  const monthCols = [
    { key: 'name', label: 'Party' },
    ...months.map((m) => ({ key: m.label, label: m.label, numeric: true })),
    { key: 'total', label: 'Latest', numeric: true },
  ]
  const monthExport = monthRows.map((r) => ({
    name: r.name,
    ...months.reduce((o: any, m, i) => { o[m.label] = money(r.per[i]); return o }, {}),
    total: money(r.total),
  }))

  const toggleConsent = async (p: any) => {
    const tbl = tab === 'customer' ? 'customers' : 'suppliers'
    const next = !p.stmt_consent
    await supabase.from(tbl).update({ stmt_consent: next }).eq('id', p.id)
    if (tab === 'customer') setCust((l) => l.map((x) => x.id === p.id ? { ...x, stmt_consent: next } : x))
    else setSupp((l) => l.map((x) => x.id === p.id ? { ...x, stmt_consent: next } : x))
    logActivity('UPDATE', tbl, `Statement consent ${next ? 'granted' : 'revoked'} for ${p.name}`, p.id)
  }
  const setSchedule = async (p: any, val: string) => {
    const tbl = tab === 'customer' ? 'customers' : 'suppliers'
    await supabase.from(tbl).update({ stmt_schedule: val }).eq('id', p.id)
    if (tab === 'customer') setCust((l) => l.map((x) => x.id === p.id ? { ...x, stmt_schedule: val } : x))
    else setSupp((l) => l.map((x) => x.id === p.id ? { ...x, stmt_schedule: val } : x))
  }

  const emailOne = async (p: any) => {
    const c = computeParty(p.name, p.id)
    const body = `Dear ${p.name},\n\nPlease find your statement of account as of ${to}.\n\nOutstanding: ${money(c.totalOut)}\nCurrent: ${money(c.aging.b0)}\n31-60: ${money(c.aging.b30)}\n61-90: ${money(c.aging.b60)}\n90+: ${money(c.aging.b90)}\n\nThank you.`
    const subject = `Statement of Account - ${p.name} - ${to}`
    try {
      const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px"><h2 style="color:#1e293b">Statement of Account</h2><p>Dear <b>${p.name}</b>,</p><p>Please find your statement of account as of <b>${to}</b>.</p><table style="width:100%;border-collapse:collapse;margin:16px 0"><tr style="background:#f1f5f9"><td style="padding:10px;font-weight:600">Outstanding</td><td style="padding:10px;text-align:right;font-weight:700;color:#dc2626">${money(c.totalOut)}</td></tr><tr><td style="padding:10px">Current</td><td style="padding:10px;text-align:right">${money(c.aging.b0)}</td></tr><tr><td style="padding:10px">31-60 days</td><td style="padding:10px;text-align:right">${money(c.aging.b30)}</td></tr><tr><td style="padding:10px">61-90 days</td><td style="padding:10px;text-align:right">${money(c.aging.b60)}</td></tr><tr><td style="padding:10px">90+ days</td><td style="padding:10px;text-align:right">${money(c.aging.b90)}</td></tr></table><p>Thank you for your business.</p></div>`
      await supabase.functions.invoke('send-email', { body: { to: p.email, subject, html, text: body } })
      logActivity('EMAIL', tab === 'customer' ? 'Customer' : 'Supplier', `Statement emailed to ${p.name}`, p.id)
    } catch {
      window.open(`mailto:${p.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`)
      logActivity('EMAIL', tab === 'customer' ? 'Customer' : 'Supplier', `Statement emailed to ${p.name} (mailto fallback)`, p.id)
    }
  }
  const sendAllConsented = () => {
    const consented = groupRows.filter((p) => p.stmt_consent && p.email)
    if (!consented.length) { setMsg('No consented parties with email found.'); return }
    consented.forEach((p) => emailOne(p))
    setMsg(`Opened email drafts for ${consented.length} consented ${tab}(s).`)
  }

  const groupCols = [
    { key: 'name', label: 'Party' },
    { key: 'totalOut', label: 'Outstanding', numeric: true },
    { key: 'b0', label: '0-30', numeric: true },
    { key: 'b30', label: '31-60', numeric: true },
    { key: 'b60', label: '61-90', numeric: true },
    { key: 'b90', label: '90+', numeric: true },
    { key: 'email', label: 'Email' },
    { key: 'stmt_schedule', label: 'Schedule' },
  ]
  const groupExport = groupRows.map((r) => ({
    name: r.name, totalOut: money(r.totalOut), b0: money(r.aging.b0), b30: money(r.aging.b30),
    b60: money(r.aging.b60), b90: money(r.aging.b90), email: r.email || '', stmt_schedule: r.stmt_schedule || '',
  }))

  if (loading) return <div className="report-wrap"><div className="fa-msg">Loading…</div></div>

  return (
    <div className="report-wrap">
      <div className="report-head">
        <h3>📑 Statements & Aging</h3>
        <div className="report-controls">
          <select value={tab} onChange={(e) => { setTab(e.target.value as any); setSel('') }}>
            <option value="customer">Receivables (Customers)</option>
            <option value="supplier">Payables (Suppliers)</option>
          </select>
          <select value={mode} onChange={(e) => setMode(e.target.value as any)}>
            <option value="single">Single Statement</option>
            <option value="group">Groupwise Aging</option>
            <option value="month">Month-wise</option>
          </select>
          {mode === 'single' && (
            <select value={sel} onChange={(e) => setSel(e.target.value)}>
              <option value="">Select {tab}…</option>
              {list.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          <label>From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label>To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
          {mode === 'month'
            ? <ShareBar title={`${tab === 'customer' ? 'Customer' : 'Supplier'} Month-wise Outstanding`} columns={monthCols} rows={monthExport} text={`Month-wise outstanding ${from} to ${to}`} />
            : mode === 'group'
            ? <ShareBar title={`${tab === 'customer' ? 'Customer' : 'Supplier'} Aging`} columns={groupCols} rows={groupExport} text={`Aging as of ${to}`} />
            : <ShareBar title={`Statement - ${selParty?.name || ''}`} text={stmt ? `Outstanding: ${money(stmt.totalOut)}` : ''} />}
        </div>
      </div>
      {msg && <div className="fa-msg noprint">{msg}</div>}

      {mode === 'single' && (
        selParty && stmt ? (
          <div className="report-sections">
            <div className="report-section" style={{ flexBasis: '100%' }}>
              <h4>{tab === 'customer' ? '🧾 Statement of Account' : '🧾 Supplier Statement'} — {selParty.name}</h4>
              <div className={`report-balance-bar ${stmt.closing >= 0 ? 'balanced' : 'unbalanced'}`}>
                <span>Opening: <b>{money(stmt.opening)}</b></span>
                <span>Closing Outstanding: <b>{money(stmt.closing)}</b></span>
              </div>
              <table className="data-grid report-table">
                <thead><tr><th>DATE</th><th>TYPE</th><th>REF</th><th className="col-money">DEBIT</th><th className="col-money">CREDIT</th><th className="col-money">BALANCE</th></tr></thead>
                <tbody>
                  <tr><td>—</td><td>Opening Balance</td><td>—</td><td className="col-money">{money(Math.max(0, stmt.opening))}</td><td className="col-money">{money(Math.max(0, -stmt.opening))}</td><td className="col-money">{money(stmt.opening)}</td></tr>
                  {stmt.txns.map((t: any, i: number) => (
                    <tr key={i}><td>{t.date}</td><td>{t.type}</td><td>{t.ref}</td><td className="col-money">{t.debit ? money(t.debit) : ''}</td><td className="col-money">{t.credit ? money(t.credit) : ''}</td><td className="col-money">{money(t.balance)}</td></tr>
                  ))}
                  {!stmt.txns.length && <tr><td colSpan={6} className="fa-empty">No transactions in this period.</td></tr>}
                </tbody>
              </table>
              <h4 style={{ marginTop: 16 }}>Aging of Outstanding</h4>
              <table className="data-grid report-table">
                <tbody>
                  <tr><td>Current (0-30)</td><td className="col-money">{money(stmt.aging.b0)}</td></tr>
                  <tr><td>31-60 days</td><td className="col-money">{money(stmt.aging.b30)}</td></tr>
                  <tr><td>61-90 days</td><td className="col-money">{money(stmt.aging.b60)}</td></tr>
                  <tr><td>90+ days</td><td className="col-money">{money(stmt.aging.b90)}</td></tr>
                  <tr className="total-row"><td><b>Total Outstanding</b></td><td className="col-money"><b>{money(stmt.totalOut)}</b></td></tr>
                </tbody>
              </table>
              <div className="inv-actions noprint" style={{ marginTop: 12 }}>
                <button className="doc-btn primary" onClick={() => emailOne(selParty)} disabled={!selParty.email}>✉️ Email Statement</button>
                <span className="sub">{selParty.email ? `To: ${selParty.email}` : 'No email on record'}</span>
              </div>
            </div>
          </div>
        ) : <div className="fa-msg">Select a {tab} to view the statement.</div>
      )}

      {mode === 'month' && (
        <div className="report-sections">
          <div className="report-section" style={{ flexBasis: '100%' }}>
            <h4>📅 Month-wise Outstanding ({tab === 'customer' ? 'Receivables' : 'Payables'})</h4>
            <table className="data-grid report-table">
              <thead>
                <tr>
                  <th>PARTY</th>
                  {months.map((m) => <th key={m.label} className="col-money">{m.label}</th>)}
                  <th className="col-money">LATEST</th>
                </tr>
              </thead>
              <tbody>
                {monthRows.map((r) => (
                  <tr key={r.name}>
                    <td>{r.name}</td>
                    {r.per.map((v: number, i: number) => <td key={i} className="col-money">{money(v)}</td>)}
                    <td className="col-money"><b>{money(r.total)}</b></td>
                  </tr>
                ))}
                {!monthRows.length && <tr><td colSpan={months.length + 2} className="fa-empty">No {tab}s found.</td></tr>}
              </tbody>
              <tfoot>
                <tr className="total-row">
                  <td><b>Total</b></td>
                  {months.map((m, i) => <td key={i} className="col-money"><b>{money(monthRows.reduce((s, r) => s + (r.per[i] || 0), 0))}</b></td>)}
                  <td className="col-money"><b>{money(monthRows.reduce((s, r) => s + r.total, 0))}</b></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {mode === 'group' && (
        <div className="report-sections">
          <div className="report-section" style={{ flexBasis: '100%' }}>
            <div className="inv-actions noprint" style={{ marginBottom: 8 }}>
              <button className="doc-btn primary" onClick={sendAllConsented}>📨 Send to all consented ({tab}s)</button>
              <span className="sub">Only parties with consent + email are included.</span>
            </div>
            <table className="data-grid report-table">
              <thead>
                <tr><th>PARTY</th><th className="col-money">OUTSTANDING</th><th className="col-money">0-30</th><th className="col-money">31-60</th><th className="col-money">61-90</th><th className="col-money">90+</th><th>EMAIL</th><th>CONSENT</th><th>SCHEDULE</th></tr>
              </thead>
              <tbody>
                {groupRows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td className="col-money">{money(r.totalOut)}</td>
                    <td className="col-money">{money(r.aging.b0)}</td>
                    <td className="col-money">{money(r.aging.b30)}</td>
                    <td className="col-money">{money(r.aging.b60)}</td>
                    <td className="col-money">{money(r.aging.b90)}</td>
                    <td>{r.email || '—'}</td>
                    <td className="noprint"><input type="checkbox" checked={!!r.stmt_consent} onChange={() => toggleConsent(r)} title="Consent to receive statements by email" /></td>
                    <td className="noprint">
                      <select value={r.stmt_schedule || 'Monthly'} onChange={(e) => setSchedule(r, e.target.value)}>
                        <option>Weekly</option><option>Monthly</option><option>Quarterly</option>
                      </select>
                    </td>
                  </tr>
                ))}
                {!groupRows.length && <tr><td colSpan={9} className="fa-empty">No {tab}s found.</td></tr>}
              </tbody>
              <tfoot>
                <tr className="total-row">
                  <td><b>Total</b></td>
                  <td className="col-money"><b>{money(groupRows.reduce((s, r) => s + r.totalOut, 0))}</b></td>
                  <td className="col-money"><b>{money(groupRows.reduce((s, r) => s + r.aging.b0, 0))}</b></td>
                  <td className="col-money"><b>{money(groupRows.reduce((s, r) => s + r.aging.b30, 0))}</b></td>
                  <td className="col-money"><b>{money(groupRows.reduce((s, r) => s + r.aging.b60, 0))}</b></td>
                  <td className="col-money"><b>{money(groupRows.reduce((s, r) => s + r.aging.b90, 0))}</b></td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
