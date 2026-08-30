import React, { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'
import ShareBar from './ShareBar'
import { numberToWords } from '../utils/numwords'
import { logActivity } from '../utils/audit'

const num = (v: any) => Number(v || 0)
const money = (v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const ensureAcct = async (name: string, type: string, prefix: string, accts: any[]) => {
  const ex = (accts || []).find((a: any) => a.name === name && a.type === type)
  if (ex) return ex.id
  const code = prefix + Date.now().toString().slice(-6)
  const { data } = await supabase.from('accounts').insert({ code, name, type, is_group: false, status: 'Active' }).select()
  if (data && data.length) return data[0].id
  return null
}
const postJournal = async (lines: any[], narration: string, date: string, baseCurrency: string) => {
  const totalDebit = lines.reduce((s, l) => s + num(l.debit), 0)
  const totalCredit = lines.reduce((s, l) => s + num(l.credit), 0)
  const { data: je } = await supabase.from('journal_entries').insert({ entry_date: date, reference: 'PDC', narration, status: 'Posted', total_debit: totalDebit, total_credit: totalCredit, currency: baseCurrency }).select()
  if (!je || !je.length) throw new Error('journal insert failed')
  const jeLines = lines.map((l, i) => ({ entry_id: je[0].id, line_no: i + 1, account_id: l.account_id, debit: num(l.debit), credit: num(l.credit), description: l.description }))
  await supabase.from('journal_lines').insert(jeLines)
}

const monthRanges = (f: string, t: string) => {
  const out: { label: string; start: string; end: string; asOf: string }[] = []
  if (!f || !t) return out
  let d = new Date(f); d.setDate(1)
  const end = new Date(t)
  while (d <= end) {
    const y = d.getFullYear(); const m = d.getMonth() + 1
    const start = new Date(y, m - 1, 1).toISOString().slice(0, 10)
    const e = new Date(y, m, 0).toISOString().slice(0, 10)
    out.push({ label: `${y}-${String(m).padStart(2, '0')}`, start, end: e, asOf: e })
    d = new Date(y, m + 1, 1)
  }
  return out
}

export default function PdcReport({ accounts }: any) {
  const [cheques, setCheques] = useState<any[]>([])
  const [parties, setParties] = useState<any[]>([])
  const [company, setCompany] = useState<any>(null)
  const [templates, setTemplates] = useState<any[]>([])
  const [printCheque, setPrintCheque] = useState<any>(null)
  const [selTpl, setSelTpl] = useState<string>('__none__')
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState(() => { const x = new Date(); x.setFullYear(x.getFullYear() - 1); return x.toISOString().slice(0, 10) })
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [dir, setDir] = useState<'all' | 'Received' | 'Issued'>('all')
  const [form, setForm] = useState({ direction: 'Received', cheque_no: '', cheque_date: new Date().toISOString().slice(0, 10), amount: '', party_name: '', bank: '', status: 'Pending' })
  const [msg, setMsg] = useState('')

  useEffect(() => { load() }, [])
  const load = async () => {
    const [{ data: c }, { data: cs }, { data: ss }, { data: cp }, { data: ts }] = await Promise.all([
      supabase.from('pdc_cheques').select('*').order('cheque_date', { ascending: false }),
      supabase.from('customers').select('id,name'),
      supabase.from('suppliers').select('id,name'),
      supabase.from('company_profile').select('*').single(),
      supabase.from('cheque_templates').select('*'),
    ])
    setCompany(cp || null)
    setTemplates(ts || [])
    setCheques(c || [])
    setParties([...(cs || []).map((x: any) => ({ id: x.id, name: x.name, type: 'customer' })), ...(ss || []).map((x: any) => ({ id: x.id, name: x.name, type: 'supplier' }))])
    setLoading(false)
  }

  const filtered = cheques.filter((c) => (dir === 'all' || c.direction === dir) && c.cheque_date >= from && c.cheque_date <= to)
  const rec = filtered.filter((c) => c.direction === 'Received')
  const iss = filtered.filter((c) => c.direction === 'Issued')
  const onHand = cheques.filter((c) => c.direction === 'Received' && c.status === 'Pending').reduce((s, c) => s + num(c.amount), 0)
  const issuedOut = cheques.filter((c) => c.direction === 'Issued' && c.status === 'Pending').reduce((s, c) => s + num(c.amount), 0)

  const months = monthRanges(from, to)
  const monthTable = (list: any[], label: string) => months.map((mo) => {
    const inMonth = list.filter((c) => c.cheque_date >= mo.start && c.cheque_date <= mo.end)
    const outstanding = list.filter((c) => c.cheque_date <= mo.asOf && c.status === 'Pending').reduce((s, c) => s + num(c.amount), 0)
    return { month: mo.label, count: inMonth.length, amount: inMonth.reduce((s, c) => s + num(c.amount), 0), outstanding }
  })

  const recRows = monthTable(rec, 'Received')
  const issRows = monthTable(iss, 'Issued')

  const save = async () => {
    setMsg('')
    if (!form.cheque_no || num(form.amount) <= 0) { setMsg('Enter cheque no and a positive amount.'); return }
    const party = parties.find((p) => p.name === form.party_name)
    const { error } = await supabase.from('pdc_cheques').insert({
      direction: form.direction, cheque_no: form.cheque_no, cheque_date: form.cheque_date,
      amount: num(form.amount), party_name: form.party_name || '', party_id: party?.id || null, bank: form.bank, status: form.status,
    })
    if (error) { setMsg('Error: ' + error.message); return }
    logActivity('CREATE', 'PDC', `${form.direction} cheque ${form.cheque_no} ${money(num(form.amount))}`)
    setForm({ ...form, cheque_no: '', amount: '' })
    load()
  }
  const setStatus = async (id: string, status: string) => {
    await supabase.from('pdc_cheques').update({ status }).eq('id', id)
    logActivity('UPDATE', 'PDC', `Cheque ${id} -> ${status}`)
    load()
  }
  const del = async (id: string) => {
    if (!window.confirm('Delete this cheque?')) return
    await supabase.from('pdc_cheques').delete().eq('id', id); load()
  }

  const transferToBank = async (c: any) => {
    if (c.status !== 'Pending') return
    const amt = num(c.amount)
    const isRec = c.direction === 'Received'
    const clName = isRec ? 'PDC Receipts Clearing' : 'PDC Payments Clearing'
    const clId = await ensureAcct(clName, isRec ? 'Asset' : 'Liability', 'PDC', accounts)
    const bankAcct = (accounts || []).find((a: any) => a.name.toLowerCase().includes('bank') && !a.is_group)
    if (!clId || !bankAcct) { setMsg('Need a PDC Clearing account and a Bank account.'); return }
    const lines = isRec
      ? [{ account_id: bankAcct.id, debit: amt, credit: 0, description: `PDC cleared ${c.cheque_no}` }, { account_id: clId, debit: 0, credit: amt, description: `Clearing ${c.cheque_no}` }]
      : [{ account_id: clId, debit: amt, credit: 0, description: `Clearing ${c.cheque_no}` }, { account_id: bankAcct.id, debit: 0, credit: amt, description: `PDC cleared ${c.cheque_no}` }]
    try {
      await postJournal(lines, `PDC ${isRec ? 'receipt' : 'payment'} cleared ${c.cheque_no}`, c.cheque_date, 'AED')
      await supabase.from('pdc_cheques').update({ status: 'Cleared' }).eq('id', c.id)
      logActivity('UPDATE', 'PDC', `Transferred to bank: ${c.cheque_no}`)
      load()
    } catch (e: any) { setMsg('Error: ' + (e?.message || e)) }
  }

  const today = new Date().toISOString().slice(0, 10)
  const in7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  const maturing = cheques.filter((c) => c.status === 'Pending' && c.cheque_date >= today && c.cheque_date <= in7)
  const overdue = cheques.filter((c) => c.status === 'Pending' && c.cheque_date < today)
  const transferAllDue = async () => { for (const c of [...overdue, ...maturing]) await transferToBank(c) }

  const currency = company?.currency || 'AED'
  const defaultTplFor = (c: any) => {
    const b = (c.bank || '').toLowerCase().trim()
    if (b) {
      const m = templates.find((t: any) => { const n = (t.bank_name || '').toLowerCase(); return n && (n.includes(b) || b.includes(n)) })
      if (m) return m.id
    }
    const def = templates.find((t: any) => t.is_default)
    if (def) return def.id
    return '__none__'
  }
  const printLeaf = (c: any) => { setPrintCheque(c); setSelTpl(defaultTplFor(c)) }
  const doPrint = () => {
    const w: any = window
    const prev = w.onafterprint
    document.body.classList.add('printing-cheque')
    w.onafterprint = () => { document.body.classList.remove('printing-cheque'); w.onafterprint = prev }
    w.print()
  }
  const DEF_POS = { date: { x: 150, y: 12 }, payee: { x: 20, y: 38 }, amount: { x: 150, y: 38 }, words: { x: 20, y: 58 }, chequeno: { x: 150, y: 78 } }
  const payeeName = printCheque ? (printCheque.direction === 'Issued' ? printCheque.party_name : (company?.company_name || '')) : ''
  const tpl = (selTpl && selTpl !== '__none__') ? templates.find((t: any) => t.id === selTpl) : null
  const tplBg = tpl ? tpl.bg_url : ''
  const tplW = (tpl ? tpl.leaf_w_mm : 215) || 215
  const tplH = (tpl ? tpl.leaf_h_mm : 95) || 95
  const tplPos = tpl ? { ...DEF_POS, ...(tpl.positions || {}) } : null

  const cols = (title: string) => [
    { key: 'month', label: 'Month' },
    { key: 'count', label: 'Count', numeric: true },
    { key: 'amount', label: `${title} Amt`, numeric: true },
    { key: 'outstanding', label: 'Outstanding (Pending)', numeric: true },
  ]
  const rowsFor = (rows: any[], title: string) => rows.map((r) => ({ month: r.month, count: r.count, amount: money(r.amount), outstanding: money(r.outstanding) }))

  if (loading) return <div className="report-wrap"><div className="fa-msg">Loading…</div></div>

  return (
    <div className="report-wrap">
      <div className="report-head">
        <h3>🏦 PDC Report (Received / Issued)</h3>
        <div className="report-controls">
          <select value={dir} onChange={(e) => setDir(e.target.value as any)}>
            <option value="all">All</option><option value="Received">Received (On Hand)</option><option value="Issued">Issued</option>
          </select>
          <label>From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label>To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
          <ShareBar title={`PDC Report ${dir}`} text={`PDC ${dir} from ${from} to ${to}`} />
        </div>
      </div>
      {msg && <div className="fa-msg noprint">{msg}</div>}

      <div className={`report-balance-bar balanced`}>
        <span>On Hand (Received, Pending): <b>{money(onHand)}</b></span>
        <span>Issued (Pending): <b>{money(issuedOut)}</b></span>
      </div>

      <div className="fa-msg noprint" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <span>📅 Maturing ≤7 days: <b>{maturing.length}</b> (Rec {maturing.filter((c) => c.direction === 'Received').length} / Iss {maturing.filter((c) => c.direction === 'Issued').length})</span>
        <span style={{ color: '#dc2626' }}>⚠️ Overdue: <b>{overdue.length}</b></span>
        {(maturing.length + overdue.length) > 0 && <button className="doc-btn primary" onClick={transferAllDue}>🏦 Transfer all due to Bank</button>}
      </div>

      <div className="report-sections">
        <div className="report-section" style={{ flexBasis: '100%' }}>
          <h4>📥 Received — Month-wise (On Hand)</h4>
          <table className="data-grid report-table">
            <thead><tr><th>MONTH</th><th className="col-money">COUNT</th><th className="col-money">RECEIVED</th><th className="col-money">OUTSTANDING (PENDING)</th></tr></thead>
            <tbody>
              {recRows.map((r) => <tr key={r.month}><td>{r.month}</td><td className="col-money">{r.count}</td><td className="col-money">{money(r.amount)}</td><td className="col-money">{money(r.outstanding)}</td></tr>)}
              {!recRows.length && <tr><td colSpan={4} className="fa-empty">No received cheques in range.</td></tr>}
            </tbody>
            <tfoot><tr className="total-row"><td><b>Total</b></td><td className="col-money"><b>{recRows.reduce((s, r) => s + r.count, 0)}</b></td><td className="col-money"><b>{money(recRows.reduce((s, r) => s + r.amount, 0))}</b></td><td className="col-money"><b>{money(recRows.reduce((s, r) => s + r.outstanding, 0))}</b></td></tr></tfoot>
          </table>
        </div>
        <div className="report-section" style={{ flexBasis: '100%' }}>
          <h4>📤 Issued — Month-wise</h4>
          <table className="data-grid report-table">
            <thead><tr><th>MONTH</th><th className="col-money">COUNT</th><th className="col-money">ISSUED</th><th className="col-money">OUTSTANDING (PENDING)</th></tr></thead>
            <tbody>
              {issRows.map((r) => <tr key={r.month}><td>{r.month}</td><td className="col-money">{r.count}</td><td className="col-money">{money(r.amount)}</td><td className="col-money">{money(r.outstanding)}</td></tr>)}
              {!issRows.length && <tr><td colSpan={4} className="fa-empty">No issued cheques in range.</td></tr>}
            </tbody>
            <tfoot><tr className="total-row"><td><b>Total</b></td><td className="col-money"><b>{issRows.reduce((s, r) => s + r.count, 0)}</b></td><td className="col-money"><b>{money(issRows.reduce((s, r) => s + r.amount, 0))}</b></td><td className="col-money"><b>{money(issRows.reduce((s, r) => s + r.outstanding, 0))}</b></td></tr></tfoot>
          </table>
        </div>
      </div>

      <div className="fa-form noprint" style={{ marginTop: 16 }}>
        <h4>➕ Add PDC</h4>
        <div className="fa-grid">
          <label>Direction<select value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })}><option>Received</option><option>Issued</option></select></label>
          <label>Cheque No<input value={form.cheque_no} onChange={(e) => setForm({ ...form, cheque_no: e.target.value })} /></label>
          <label>Cheque Date<input type="date" value={form.cheque_date} onChange={(e) => setForm({ ...form, cheque_date: e.target.value })} /></label>
          <label>Amount<input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label>
          <label>Party<select value={form.party_name} onChange={(e) => setForm({ ...form, party_name: e.target.value })}><option value="">—</option>{parties.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}</select></label>
          <label>Bank<input value={form.bank} onChange={(e) => setForm({ ...form, bank: e.target.value })} /></label>
          <label>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>Pending</option><option>Cleared</option><option>Bounced</option><option>Cancelled</option></select></label>
          <button className="doc-btn primary" onClick={save}>Save Cheque</button>
        </div>
      </div>

      <div className="report-sections" style={{ marginTop: 12 }}>
        <div className="report-section" style={{ flexBasis: '100%' }}>
          <h4>📋 Register</h4>
          <table className="data-grid report-table">
            <thead><tr><th>DATE</th><th>DIR</th><th>CHEQUE NO</th><th>PARTY</th><th>BANK</th><th className="col-money">AMOUNT</th><th>STATUS</th><th className="noprint"></th></tr></thead>
            <tbody>
              {cheques.filter((c) => dir === 'all' || c.direction === dir).map((c) => (
                <tr key={c.id}>
                  <td>{c.cheque_date}</td><td>{c.direction}</td><td>{c.cheque_no}</td><td>{c.party_name}</td><td>{c.bank}</td>
                  <td className="col-money">{money(num(c.amount))}</td>
                  <td><select value={c.status} onChange={(e) => setStatus(c.id, e.target.value)}><option>Pending</option><option>Cleared</option><option>Bounced</option><option>Cancelled</option></select></td>
                  <td className="noprint">
                    <button className="doc-btn sm" onClick={() => printLeaf(c)} style={{ marginRight: 4 }}>🖨 Print</button>
                    {c.status === 'Pending' && <button className="doc-btn sm" onClick={() => transferToBank(c)} style={{ marginRight: 4 }}>Transfer</button>}
                    <button className="doc-btn sm danger" onClick={() => del(c.id)}>✕</button>
                  </td>
                </tr>
              ))}
              {!cheques.length && <tr><td colSpan={8} className="fa-empty">No cheques recorded.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {printCheque && (
        <div className="cheque-overlay">
          <div>
            <div style={{ marginBottom: 8 }} className="noprint">
              <label>Template:{' '}
                <select value={selTpl} onChange={(e) => setSelTpl(e.target.value)}>
                  <option value="__none__">Styled default</option>
                  {templates.map((t) => <option key={t.id} value={t.id}>{t.bank_name}{t.is_default ? ' (default)' : ''}</option>)}
                </select>
              </label>
            </div>
            <div className="cheque-leaf" style={tplBg ? { width: tplW + 'mm', height: tplH + 'mm', backgroundImage: `url(${tplBg})`, backgroundSize: '100% 100%', border: 'none', padding: 0, position: 'relative' } : { position: 'relative' }}>
              {tplBg && tplPos ? (
                <>
                  <div style={{ position: 'absolute', left: tplPos.date.x + 'mm', top: tplPos.date.y + 'mm', fontSize: 12 }}>{printCheque.cheque_date}</div>
                  <div style={{ position: 'absolute', left: tplPos.payee.x + 'mm', top: tplPos.payee.y + 'mm', fontWeight: 'bold', fontSize: 12 }}>{payeeName}</div>
                  <div style={{ position: 'absolute', left: tplPos.amount.x + 'mm', top: tplPos.amount.y + 'mm', fontWeight: 'bold', fontSize: 12 }}>{currency} {money(num(printCheque.amount))}</div>
                  <div style={{ position: 'absolute', left: tplPos.words.x + 'mm', top: tplPos.words.y + 'mm', fontSize: 11, maxWidth: '62%' }}>{numberToWords(num(printCheque.amount))}</div>
                  <div style={{ position: 'absolute', left: tplPos.chequeno.x + 'mm', top: tplPos.chequeno.y + 'mm', fontSize: 12 }}>No: {printCheque.cheque_no}</div>
                </>
              ) : (
                <>
                  <div className="ch-top">
                    <div>
                      <div className="ch-bank">{printCheque.direction === 'Issued' ? (company?.company_name || 'Your Company') : printCheque.party_name}</div>
                      <div className="ch-drawer">{printCheque.direction === 'Issued' ? (company?.address || '') : ''}</div>
                    </div>
                    <div className="ch-date">Date: {printCheque.cheque_date}</div>
                  </div>
                  <div className="ch-pay">
                    <span className="ch-to">Pay</span>
                    <span className="ch-payee">{printCheque.direction === 'Issued' ? printCheque.party_name : (company?.company_name || '')}</span>
                    <span className="ch-amt-box">{currency} {money(num(printCheque.amount))}</span>
                  </div>
                  <div className="ch-words">{numberToWords(num(printCheque.amount))}</div>
                  <div className="ch-stamp">A/C PAYEE</div>
                  <div className="ch-bottom">
                    <div className="ch-sign">Authorised Signatory</div>
                    <div className="ch-no">Cheque No: {printCheque.cheque_no}</div>
                  </div>
                </>
              )}
            </div>
            <div className="noprint" style={{ marginTop: 12, textAlign: 'center' }}>
              <button className="doc-btn primary" onClick={doPrint}>🖨 Print</button>
              <button className="doc-btn" onClick={() => setPrintCheque(null)} style={{ marginLeft: 8 }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
