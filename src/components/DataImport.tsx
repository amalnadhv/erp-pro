import { useState, useEffect, useRef } from 'react'
import { supabase } from '../utils/supabaseClient'

type Field = { key: string; label: string; req?: boolean; num?: boolean; bool?: boolean; aliases?: string[]; norm?: (v: string) => any }

const SOURCES: any = {
  Excel: { note: 'Export any sheet to CSV, copy the block, or use the Upload button.' },
  Tally: { note: 'Tally: Gateway of Tally → Display → List of Accounts / Vouchers → Press Alt+E (Export) → Format CSV/XML. Open in Excel, copy the rows.' },
  Odoo: { note: 'Odoo: open the list (Invoices, Products, Customers…) → ⚙️ Action → Export → Export to CSV with desired fields. Paste here.' },
  Zoho: { note: 'Zoho Books: Reports/Modules → Export → CSV. For items use Inventory → Products → Export.' },
  'SAP B1': { note: 'SAP Business One: right-click the grid → Export → CSV/Excel. Map columns below.' },
  'MS Dynamics': { note: 'Dynamics 365: View → Export to Excel → Static worksheet → copy rows or save CSV and Upload.' },
  Generic: { note: 'Any system that exports CSV/Excel. Paste or upload; headers are auto-matched.' },
}

const ENT: any = {
  accounts: {
    name: 'Chart of Accounts', table: 'accounts',
    fields: [
      { key: 'code', label: 'Code', req: true, aliases: ['code', 'acode', 'account code', 'acc code'] },
      { key: 'name', label: 'Name', req: true, aliases: ['name', 'account', 'account name', 'acname', 'parent'] },
      { key: 'type', label: 'Type', req: true, aliases: ['type', 'account type', 'group type'], norm: (v: string) => {
        const s = v.trim().toLowerCase()
        if (s.startsWith('a') && !s.startsWith('e')) return 'Asset'
        if (s.startsWith('l')) return 'Liability'
        if (s.startsWith('e')) return 'Equity'
        if (s.startsWith('i')) return 'Income'
        if (s.startsWith('x') || s.startsWith('c') || s.startsWith('exp')) return 'Expense'
        return v.trim()
      } },
      { key: 'opening_balance', label: 'Opening Balance', num: true, aliases: ['opening', 'op bal', 'opening balance', 'balance', 'ob', 'closing'] },
      { key: 'is_group', label: 'Is Group (Y/N)', bool: true, aliases: ['is group', 'group', 'group?'] },
    ],
  },
  customers: {
    name: 'Customers', table: 'customers',
    fields: [
      { key: 'code', label: 'Code', aliases: ['code', 'cust code', 'customer code'] },
      { key: 'name', label: 'Name', req: true, aliases: ['name', 'customer', 'customer name', 'party', 'client', 'debtor'] },
      { key: 'vat', label: 'VAT/Tax No', aliases: ['vat', 'tax', 'gst', 'tin', 'trn'] },
      { key: 'email', label: 'Email', aliases: ['email', 'mail', 'e-mail'] },
      { key: 'phone', label: 'Phone', aliases: ['phone', 'mobile', 'tel', 'contact'] },
      { key: 'opening_balance', label: 'Opening Balance', num: true, aliases: ['opening', 'op bal', 'balance', 'receivable'] },
    ],
  },
  suppliers: {
    name: 'Suppliers', table: 'suppliers',
    fields: [
      { key: 'code', label: 'Code', aliases: ['code', 'supp code', 'supplier code'] },
      { key: 'name', label: 'Name', req: true, aliases: ['name', 'supplier', 'supplier name', 'party', 'vendor', 'creditor'] },
      { key: 'vat', label: 'VAT/Tax No', aliases: ['vat', 'tax', 'gst', 'tin', 'trn'] },
      { key: 'email', label: 'Email', aliases: ['email', 'mail', 'e-mail'] },
      { key: 'phone', label: 'Phone', aliases: ['phone', 'mobile', 'tel', 'contact'] },
      { key: 'opening_balance', label: 'Opening Balance', num: true, aliases: ['opening', 'op bal', 'balance', 'payable'] },
    ],
  },
  products: {
    name: 'Products (incl. Opening Stock)', table: 'products',
    fields: [
      { key: 'code', label: 'Code', aliases: ['code', 'item code', 'sku', 'product code'] },
      { key: 'name', label: 'Name', req: true, aliases: ['name', 'item', 'product', 'description', 'item name'] },
      { key: 'category', label: 'Category', aliases: ['category', 'cat', 'group'] },
      { key: 'unit', label: 'Unit', aliases: ['unit', 'uom', 'u/m'] },
      { key: 'price', label: 'Selling Price', num: true, aliases: ['price', 'selling', 'sale price', 'rate'] },
      { key: 'cost_price', label: 'Cost Price', num: true, aliases: ['cost', 'cost price', 'cprice'] },
      { key: 'stock_quantity', label: 'Opening Stock Qty', num: true, aliases: ['stock', 'qty', 'quantity', 'opening stock', 'on hand'] },
      { key: 'barcode', label: 'Barcode', aliases: ['barcode', 'bar', 'ean'] },
    ],
  },
  opening: {
    name: 'Opening Balances (GL)', table: '_journal',
    fields: [
      { key: 'entry_date', label: 'Date', aliases: ['date', 'entry date', 'voucher date'] },
      { key: 'account', label: 'Account (code or name)', req: true, aliases: ['account', 'acc', 'account code', 'account name', 'gl'] },
      { key: 'debit', label: 'Debit', num: true, aliases: ['debit', 'dr'] },
      { key: 'credit', label: 'Credit', num: true, aliases: ['credit', 'cr'] },
      { key: 'description', label: 'Description', aliases: ['desc', 'description', 'narration', 'particulars'] },
    ],
  },
  ar_invoices: {
    name: 'Open A/R Invoices', table: 'invoices', kind: 'ar',
    fields: [
      { key: 'invoice_no', label: 'Invoice No', aliases: ['invoice no', 'inv no', 'bill no', 'reference', 'no'] },
      { key: 'date', label: 'Invoice Date', aliases: ['date', 'invoice date', 'bill date'] },
      { key: 'customer', label: 'Customer', req: true, aliases: ['customer', 'customer name', 'party', 'debtor', 'client'] },
      { key: 'subtotal', label: 'Subtotal', num: true, aliases: ['subtotal', 'amount', 'net', 'taxable'] },
      { key: 'vat', label: 'VAT', num: true, aliases: ['vat', 'tax', 'vat amount', 'tax amount'] },
      { key: 'grand_total', label: 'Grand Total', num: true, aliases: ['grand total', 'total', 'grand', 'amount due'] },
      { key: 'due_date', label: 'Due Date', aliases: ['due', 'due date', 'maturity'] },
      { key: 'description', label: 'Description', aliases: ['desc', 'description', 'narration'] },
    ],
  },
  ap_invoices: {
    name: 'Open A/P Invoices', table: 'purchase_invoices', kind: 'ap',
    fields: [
      { key: 'pin_no', label: 'Invoice No', aliases: ['invoice no', 'bill no', 'pin no', 'reference', 'no'] },
      { key: 'date', label: 'Invoice Date', aliases: ['date', 'invoice date', 'bill date', 'doc date'] },
      { key: 'due_date', label: 'Due Date', aliases: ['due', 'due date', 'maturity'] },
      { key: 'supplier', label: 'Supplier', req: true, aliases: ['supplier', 'supplier name', 'party', 'vendor', 'creditor'] },
      { key: 'subtotal', label: 'Subtotal', num: true, aliases: ['subtotal', 'amount', 'net', 'taxable'] },
      { key: 'vat', label: 'VAT', num: true, aliases: ['vat', 'tax', 'vat amount', 'tax amount'] },
      { key: 'grand_total', label: 'Grand Total', num: true, aliases: ['grand total', 'total', 'grand', 'amount due'] },
    ],
  },
  ar_credit_memos: {
    name: 'Open AR Credit Memos', table: 'ar_credit_memos', kind: 'arc',
    fields: [
      { key: 'memo_no', label: 'Memo No', aliases: ['memo no', 'credit note', 'cn no', 'reference', 'no'] },
      { key: 'date', label: 'Date', aliases: ['date', 'memo date', 'doc date'] },
      { key: 'customer', label: 'Customer', req: true, aliases: ['customer', 'customer name', 'party', 'debtor', 'client'] },
      { key: 'subtotal', label: 'Subtotal', num: true, aliases: ['subtotal', 'amount', 'net', 'taxable'] },
      { key: 'vat', label: 'VAT', num: true, aliases: ['vat', 'tax', 'vat amount', 'tax amount'] },
      { key: 'grand_total', label: 'Grand Total', num: true, aliases: ['grand total', 'total', 'grand', 'amount due'] },
    ],
  },
  ap_credit_memos: {
    name: 'Open AP Credit Memos', table: 'ap_credit_memos', kind: 'apc',
    fields: [
      { key: 'memo_no', label: 'Memo No', aliases: ['memo no', 'credit note', 'cn no', 'reference', 'no'] },
      { key: 'date', label: 'Date', aliases: ['date', 'memo date', 'doc date'] },
      { key: 'supplier', label: 'Supplier', req: true, aliases: ['supplier', 'supplier name', 'party', 'vendor', 'creditor'] },
      { key: 'subtotal', label: 'Subtotal', num: true, aliases: ['subtotal', 'amount', 'net', 'taxable'] },
      { key: 'vat', label: 'VAT', num: true, aliases: ['vat', 'tax', 'vat amount', 'tax amount'] },
      { key: 'grand_total', label: 'Grand Total', num: true, aliases: ['grand total', 'total', 'grand', 'amount due'] },
    ],
  },
  pdc: {
    name: 'Open PDC Cheques', table: 'pdc_cheques', kind: 'pdc',
    fields: [
      { key: 'direction', label: 'Direction (Received/Issued)', req: true, aliases: ['direction', 'type', 'received/issued', 'in/out'] },
      { key: 'cheque_no', label: 'Cheque No', aliases: ['cheque no', 'chq no', 'no'] },
      { key: 'date', label: 'Cheque Date', aliases: ['date', 'cheque date', 'due date', 'maturity'] },
      { key: 'party', label: 'Party', aliases: ['party', 'customer', 'supplier', 'name'] },
      { key: 'amount', label: 'Amount', num: true, req: true, aliases: ['amount', 'value', 'total'] },
      { key: 'bank', label: 'Bank', aliases: ['bank', 'bank name'] },
    ],
  },
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

const DataImport = () => {
  const [source, setSource] = useState<string>('Excel')
  const [entity, setEntity] = useState<string>('accounts')
  const [text, setText] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<Record<string, number>>({})
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [accounts, setAccounts] = useState<any[]>([])
  const [postStock, setPostStock] = useState(true)
  const fileRef = useRef<HTMLInputElement>(null)

  const cfg = ENT[entity]
  useEffect(() => { supabase.from('accounts').select('id,code,name,type').then(({ data }) => setAccounts(data || [])) }, [])

  const detectDelim = (line: string) => {
    if (line.includes('\t')) return '\t'
    const com = (line.match(/,/g) || []).length
    const sem = (line.match(/;/g) || []).length
    return com >= sem ? ',' : ';'
  }
  const autoMap = (hdrs: string[]) => {
    const m: Record<string, number> = {}
    cfg.fields.forEach((f: Field) => {
      const idx = hdrs.findIndex((h) => {
        const nh = norm(h)
        if (nh === norm(f.key) || nh === norm(f.label)) return true
        return (f.aliases || []).some((a) => nh === norm(a) || nh.includes(norm(a)))
      })
      m[f.key] = idx
    })
    setMapping(m)
  }
  const parse = () => {
    setMsg('')
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length)
    if (lines.length < 2) { setMsg('Paste/upload at least a header row + one data row.'); return }
    const d = detectDelim(lines[0])
    setHeaders(lines[0].split(d).map((h) => h.trim()))
    setRows(lines.slice(1).map((l) => l.split(d)))
    autoMap(lines[0].split(d).map((h) => h.trim()))
  }
  const onFile = (e: any) => {
    const f = e.target.files?.[0]; if (!f) return
    const r = new FileReader(); r.onload = () => { setText(r.result as string); setHeaders([]); setRows([]); setMapping({}) }; r.readAsText(f)
  }
  const sample = () => {
    const hdrs = cfg.fields.map((f: Field) => f.label)
    const ex: any = {}; cfg.fields.forEach((f: Field) => { ex[f.label] = f.key === 'type' ? 'Asset' : f.bool ? 'N' : f.num ? '0' : 'Sample' })
    const csv = [hdrs.join(','), cfg.fields.map((f: Field) => ex[f.label]).join(',')].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' }); const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = entity + '_sample.csv'; a.click(); URL.revokeObjectURL(url)
  }

  const findAcct = (pred: (a: any) => boolean) => accounts.find(pred)
  const ensureAcct = async (name: string, type: string, prefix: string) => {
    const ex = accounts.find((a) => a.name === name && a.type === type)
    if (ex) return ex.id
    const code = prefix + Date.now().toString().slice(-6)
    const { data } = await supabase.from('accounts').insert({ code, name, type, is_group: false, status: 'Active' }).select()
    if (data && data.length) { setAccounts([...accounts, data[0]]); return data[0].id }
    return null
  }
  const postJournal = async (lines: any[], narration: string, date: string) => {
    const total = lines.reduce((s, l) => s + Number(l.debit), 0)
    const { data: je } = await supabase.from('journal_entries').insert({ entry_date: date, reference: 'IMPORT', narration, status: 'Posted', total_debit: total, total_credit: total, currency: 'AED' }).select()
    if (!je || !je.length) throw new Error('journal insert failed')
    await supabase.from('journal_lines').insert(lines.map((l, i) => ({ entry_id: je[0].id, line_no: i + 1, account_id: l.account_id, debit: Number(l.debit), credit: Number(l.credit), description: l.description })))
  }
  const val = (f: Field, raw: string) => {
    const v = (raw || '').trim()
    if (f.num) return Number(v.replace(/,/g, '')) || 0
    if (f.bool) return /^(y|yes|true|1|group)$/i.test(v)
    return v
  }
  const get = (r: string[], key: string) => { const i = mapping[key]; return i >= 0 ? (r[i] || '') : '' }

  const importData = async () => {
    setMsg(''); setBusy(true)
    try {
      const errs: string[] = []
      if (entity === 'opening') {
        const obId = await ensureAcct('Opening Balances', 'Equity', 'OB')
        let ok = 0
        for (let ri = 0; ri < rows.length; ri++) {
          const r = rows[ri]
          const accStr = get(r, 'account'); const dr = val({ num: true } as Field, get(r, 'debit')); const cr = val({ num: true } as Field, get(r, 'credit'))
          const acc = accounts.find((a) => a.code === accStr || a.name === accStr)
          if (!acc) { errs.push(`Row ${ri + 2}: account "${accStr}" not found`); continue }
          const desc = get(r, 'description') || 'Opening balance'; const lines: any[] = []
          if (dr > 0) { lines.push({ account_id: acc.id, debit: dr, credit: 0, description: desc }); if (obId) lines.push({ account_id: obId, debit: 0, credit: dr, description: 'Opening' }) }
          else if (cr > 0) { lines.push({ account_id: acc.id, debit: 0, credit: cr, description: desc }); if (obId) lines.push({ account_id: obId, debit: cr, credit: 0, description: 'Opening' }) }
          else { errs.push(`Row ${ri + 2}: no debit/credit`); continue }
          await postJournal(lines, desc, get(r, 'entry_date') || new Date().toISOString().slice(0, 10)); ok++
        }
        setMsg(`Opening Balances: ${ok} imported, ${errs.length} skipped.\n` + errs.slice(0, 8).join('\n'))
      } else if (cfg.kind) {
        const kind = cfg.kind
        const isAr = kind === 'ar'; const isAp = kind === 'ap'; const isArc = kind === 'arc'; const isApc = kind === 'apc'; const isPdc = kind === 'pdc'
        const rec = isAr ? await ensureAcct('Accounts Receivable', 'Asset', '1200')
          : isAp ? await ensureAcct('Accounts Payable', 'Liability', '2100')
          : isArc ? await ensureAcct('Accounts Receivable', 'Asset', '1200')
          : isApc ? await ensureAcct('Accounts Payable', 'Liability', '2100') : null
        const sales = await ensureAcct('Sales Revenue', 'Income', '4000')
        const purch = await ensureAcct('Purchase', 'Expense', '5000')
        const outVat = await ensureAcct('Output VAT', 'Liability', '2200')
        const inVat = await ensureAcct('Input VAT', 'Asset', '1301')
        let ok = 0
        for (let ri = 0; ri < rows.length; ri++) {
          const r = rows[ri]
          const sub = val({ num: true } as Field, get(r, 'subtotal')); const vat = val({ num: true } as Field, get(r, 'vat')); const gt = val({ num: true } as Field, get(r, 'grand_total')) || (sub + vat)
          const date = get(r, 'date') || new Date().toISOString().slice(0, 10)
          const due = get(r, 'due_date')
          const party = get(r, isPdc ? 'party' : (isAr || isArc) ? 'customer' : 'supplier')
          const invNo = get(r, isPdc ? 'cheque_no' : isAr || isArc ? 'memo_no' : 'pin_no')
          const desc = get(r, 'description') || ((isAr ? 'Opening A/R ' : isAp ? 'Opening A/P ' : isArc ? 'AR Credit ' : isApc ? 'AP Credit ' : 'PDC ') + invNo)
          try {
            if (isPdc) {
              const dir = /issued|out|pay|supplier/i.test(get(r, 'direction')) ? 'Issued' : 'Received'
              const { error } = await supabase.from('pdc_cheques').insert({ direction: dir, cheque_no: invNo, cheque_date: date, amount: gt, party_name: party, bank: get(r, 'bank'), status: 'Pending' })
              if (error) throw error
            } else if (isAr) {
              const { data: cd } = await supabase.from('customers').select('id').eq('name', party).maybeSingle()
              const { error } = await supabase.from('invoices').insert({ invoice_no: invNo, customer_name: party, customer_id: cd?.id || null, customer_vat: '', invoice_date: date, due_date: due || null, subtotal: sub, vat_amount: vat, grand_total: gt, amount_paid: 0, balance: gt, status: 'Outstanding', created_at: date, notes: desc, items: '[]' })
              if (error) throw error
              await postJournal([{ account_id: rec!, debit: gt, credit: 0, description: desc }, { account_id: sales, debit: 0, credit: sub, description: 'Sales' }, { account_id: outVat, debit: 0, credit: vat, description: 'Output VAT' }], desc, date)
            } else if (isAp) {
              const { error } = await supabase.from('purchase_invoices').insert({ pin_no: invNo, party_name: party, doc_date: date, due_date: due || null, subtotal: sub, vat_percent: sub ? +(vat / sub * 100).toFixed(2) : 0, vat_amount: vat, grand_total: gt, status: 'Outstanding', notes: desc })
              if (error) throw error
              await postJournal([{ account_id: purch, debit: sub, credit: 0, description: 'Purchase' }, { account_id: inVat, debit: vat, credit: 0, description: 'Input VAT' }, { account_id: rec!, debit: 0, credit: gt, description: desc }], desc, date)
            } else if (isArc) {
              const { error } = await supabase.from('ar_credit_memos').insert({ memo_no: invNo, party_name: party, doc_date: date, subtotal: sub, vat_percent: sub ? +(vat / sub * 100).toFixed(2) : 0, vat_amount: vat, grand_total: gt, status: 'Outstanding', notes: desc })
              if (error) throw error
              await postJournal([{ account_id: rec!, debit: 0, credit: gt, description: desc }, { account_id: sales, debit: sub, credit: 0, description: 'Sales return' }, { account_id: outVat, debit: vat, credit: 0, description: 'Output VAT' }], desc, date)
            } else if (isApc) {
              const { error } = await supabase.from('ap_credit_memos').insert({ memo_no: invNo, party_name: party, doc_date: date, subtotal: sub, vat_percent: sub ? +(vat / sub * 100).toFixed(2) : 0, vat_amount: vat, grand_total: gt, status: 'Outstanding', notes: desc })
              if (error) throw error
              await postJournal([{ account_id: rec!, debit: gt, credit: 0, description: desc }, { account_id: purch, debit: 0, credit: sub, description: 'Purchase return' }, { account_id: inVat, debit: 0, credit: vat, description: 'Input VAT' }], desc, date)
            }
            ok++
          } catch (e: any) { errs.push(`Row ${ri + 2} (${invNo}): ${e?.message || e}`) }
        }
        setMsg(`${cfg.name}: ${ok} imported, ${errs.length} skipped.\n` + errs.slice(0, 8).join('\n'))
      } else {
        const recs: any[] = []
        let stockValue = 0
        for (let ri = 0; ri < rows.length; ri++) {
          const r = rows[ri]; const rec: any = {}
          for (const f of cfg.fields) { const v = val(f, get(r, f.key)); if (f.key === 'is_group') rec.is_group = v; else if (v !== '' || f.req) rec[f.key] = v }
          if (entity === 'customers' || entity === 'suppliers') rec.status = 'Active'
          if (entity === 'products') { rec.status = rec.status || 'Active'; rec.stock_quantity = rec.stock_quantity || 0; rec.reorder_level = rec.reorder_level || 0; stockValue += (Number(rec.stock_quantity) || 0) * (Number(rec.cost_price) || 0) }
          const missing = cfg.fields.filter((f: Field) => f.req && (rec[f.key] === undefined || rec[f.key] === ''))
          if (missing.length) { errs.push(`Row ${ri + 2}: missing ${missing.map((m: Field) => m.label).join(', ')}`); continue }
          recs.push(rec)
        }
        if (!recs.length) { setMsg('Nothing to import.\n' + errs.join('\n')); setBusy(false); return }
        const { error } = await supabase.from(cfg.table).insert(recs)
        if (error) setMsg('Import error: ' + error.message)
        else {
          let extra = ''
          if (entity === 'products' && postStock && stockValue > 0) {
            const inv = await ensureAcct('Inventory', 'Asset', '1300')
            const ob = await ensureAcct('Opening Balances', 'Equity', 'OB')
            if (inv && ob) { try { await postJournal([{ account_id: inv, debit: stockValue, credit: 0, description: 'Opening stock' }, { account_id: ob, debit: 0, credit: stockValue, description: 'Opening stock' }], 'Opening stock import', new Date().toISOString().slice(0, 10)); extra = ' Opening stock posted to Inventory.' } catch (e: any) { extra = ' (stock GL post skipped: ' + (e?.message || e) + ')' } }
          }
          setMsg(`Imported ${recs.length} ${cfg.name}.${errs.length ? ' Skipped ' + errs.length + ': ' + errs.slice(0, 8).join('; ') : ''}` + extra)
        }
      }
    } catch (e: any) { setMsg('Error: ' + (e?.message || e)) }
    setBusy(false)
  }

  return (
    <div className="doc-workspace">
      <div className="coa-head"><h3>📥 Data Import — migrate from Tally / Odoo / Zoho / SAP / Dynamics / Excel</h3></div>
      {msg && <div className="inv-error" style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>⚠️ {msg}</div>}

      <div className="report-section" style={{ marginTop: 14 }}>
        <div className="inv-grid coa-form-grid">
          <label>Source system
            <select value={source} onChange={(e) => setSource(e.target.value)}>
              {Object.keys(SOURCES).map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </label>
          <label>Entity
            <select value={entity} onChange={(e) => { setEntity(e.target.value); setHeaders([]); setRows([]); setMapping({}) }}>
              {Object.keys(ENT).map((k) => <option key={k} value={k}>{ENT[k].name}</option>)}
            </select>
          </label>
        </div>
        <p style={{ fontSize: 12, color: '#64748b', margin: '6px 0 0' }}>ℹ️ {SOURCES[source]?.note}</p>

        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <button className="doc-btn" onClick={() => fileRef.current?.click()}>📁 Upload CSV</button>
          <input ref={fileRef} type="file" accept=".csv,text/csv,application/vnd.ms-excel" style={{ display: 'none' }} onChange={onFile} />
          <button className="doc-btn" onClick={sample}>⬇ Download Sample</button>
          <button className="doc-btn" onClick={parse}>🔍 Parse</button>
          {entity === 'products' && <label style={{ alignSelf: 'center', fontSize: 13 }}><input type="checkbox" checked={postStock} onChange={(e) => setPostStock(e.target.checked)} /> Post opening stock to Inventory (GL)</label>}
        </div>

        <label style={{ display: 'block', marginTop: 8 }}>Paste rows (tab / comma / semicolon; first row = headers) — or use Upload
          <textarea rows={8} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, fontFamily: 'monospace' }} value={text} onChange={(e) => setText(e.target.value)} placeholder={'code,name,type,opening_balance\n1001,Cash Asset,Asset,5000'} />
        </label>

        {headers.length > 0 && (
          <>
            <h4 style={{ marginTop: 12 }}>Map columns → {cfg.name} fields</h4>
            <table className="data-grid report-table">
              <thead><tr><th>YOUR COLUMN</th><th>→ TARGET FIELD</th></tr></thead>
              <tbody>
                {cfg.fields.map((f: Field) => (
                  <tr key={f.key}>
                    <td>{mapping[f.key] >= 0 ? headers[mapping[f.key]] : <em style={{ color: '#94a3b8' }}>(not mapped)</em>}</td>
                    <td>
                      <select value={mapping[f.key] ?? -1} onChange={(e) => setMapping({ ...mapping, [f.key]: Number(e.target.value) })}>
                        <option value={-1}>— ignore —</option>
                        {headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                      </select>
                      {f.req && <span style={{ color: '#dc2626' }}> *</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 10 }}>
              <button className="btn-primary" disabled={busy || !rows.length} onClick={importData}>{busy ? 'Importing…' : `✅ Import ${rows.length} row(s)`}</button>
            </div>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
              Headers auto-matched. <b>Open A/R &amp; A/P Invoices</b> and <b>Open Credit Memos</b> are posted to the ledger (Receivable/Payable, Sales/Purchase, VAT) so aged reports tie out; <b>Open PDC Cheques</b> load as Pending. <b>Opening Balances</b> offset to an auto-created Opening Balances equity account.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default DataImport
