import React, { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'
import ShareBar from './ShareBar'

const FRAMEWORK_BY_COUNTRY = (country?: string): string => {
  if (!country) return 'IFRS'
  const c = country.toLowerCase()
  if (c.includes('united states') || c.includes('usa') || c.includes('u.s')) return 'US GAAP'
  if (c.includes('united kingdom') || c.includes('uk') || c.includes('britain')) return 'UK GAAP'
  if (c.includes('india')) return 'Indian GAAP'
  return 'IFRS'
}

const OPINION_TEXT: Record<string, (c: string, f: string, d: string) => string> = {
  Unmodified: (c, f, d) => `We have audited the financial statements of ${c} for the year ended ${d}, which comprise the statement of profit or loss and other comprehensive income, the statement of financial position, the statement of changes in equity, the statement of cash flows, and notes to the financial statements, including a summary of significant accounting policies. In our opinion, the accompanying financial statements present fairly, in all material respects, the financial position of ${c} as at ${d}, and its financial performance and its cash flows for the year then ended in accordance with ${f}.`,
  Qualified: (c, f, d) => `We have audited the financial statements of ${c} for the year ended ${d}. In our opinion, except for the matter described in the Basis for Qualified Opinion section, the financial statements present fairly, in all material respects, the financial position of ${c} as at ${d}, and its financial performance and its cash flows for the year then ended in accordance with ${f}.`,
  Adverse: (c, f, d) => `We have audited the financial statements of ${c} for the year ended ${d}. In our opinion, the financial statements do not present fairly, in all material respects, the financial position of ${c} as at ${d}, and its financial performance and its cash flows for the year then ended in accordance with ${f}.`,
  Disclaimer: (c) => `We do not express an opinion on the financial statements of ${c}. Because of the significance of the matter(s) described in the Basis for Disclaimer of Opinion section, we have not been able to obtain sufficient appropriate audit evidence to provide a basis for an audit opinion.`,
}

const fmt = (v: number) =>
  (v < 0 ? '(' + Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ')' : v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))

export default function AuditReport() {
  const [profile, setProfile] = useState<any>(null)
  const [acc, setAcc] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [addressee, setAddressee] = useState('To the Members of the Company')
  const [framework, setFramework] = useState('IFRS')
  const [opinion, setOpinion] = useState('Unmodified')
  const [auditorFirm, setAuditorFirm] = useState('')
  const [auditorName, setAuditorName] = useState('')
  const [auditorTitle, setAuditorTitle] = useState('Statutory Auditor')
  const [auditorLocation, setAuditorLocation] = useState('')
const [auditorLicense, setAuditorLicense] = useState('')
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10))
  const [periodEnd, setPeriodEnd] = useState(`${new Date().getFullYear()}-12-31`)
  const [tenure, setTenure] = useState('')
  const [goingConcern, setGoingConcern] = useState(true)
  const [materiality, setMateriality] = useState('')
  const [kams, setKams] = useState<string[]>([''])
  const [emphasis, setEmphasis] = useState('')
  const [otherInfo, setOtherInfo] = useState(
    'The directors are responsible for the other information. The other information comprises the directors’ report and the corporate governance statement, which is published with the financial statements. Our opinion on the financial statements does not cover the other information and we do not express any form of assurance conclusion thereon.'
  )

  useEffect(() => {
    (async () => {
      let profileData: any = null
      try {
        const { data } = await supabase.from('company_profile').select('*').single()
        profileData = data
      } catch { /* no profile row yet */ }
      let accData: any[] = []
      try {
        const { data } = await supabase.from('accounts').select('id, code, name, type, current_balance').order('code')
        accData = data || []
      } catch { /* no accounts */ }
      setProfile(profileData)
      setAcc(accData)
      setFramework(FRAMEWORK_BY_COUNTRY(profileData?.country))
      setAuditorFirm(profileData?.auditor_firm || (profileData?.name ? `${profileData.name} Audit LLP` : ''))
      if (profileData?.auditor_name) setAuditorName(profileData?.auditor_name)
      if (profileData?.auditor_address) setAuditorLocation(profileData.auditor_address)
      if (profileData?.auditor_license) setAuditorLicense(profileData.auditor_license)
      setLoading(false)
    })()
  }, [])

  const byType = (t: string) => acc.filter((a) => a.type === t)
  const sum = (t: string) => byType(t).reduce((s, a) => s + Number(a.current_balance || 0), 0)
  const assets = byType('Asset')
  const liabs = byType('Liability')
  const eqty = byType('Equity')
  const income = byType('Income')
  const expense = byType('Expense')
  const totalAssets = sum('Asset')
  const totalLiab = sum('Liability')
  const totalEquity = sum('Equity')
  const revenue = sum('Income')
  const expenses = sum('Expense')
  const netProfit = revenue - expenses
  const company = profile?.name || 'the Company'
  const cashAccounts = acc.filter((a) => a.type === 'Asset' && /cash|bank|petty/i.test(a.name || ''))
  const closingCash = cashAccounts.reduce((s, a) => s + Number(a.current_balance || 0), 0)
  const mat = materiality ? Number(materiality) : Math.max(1, Math.round(revenue * 0.005))

  const setKam = (i: number, v: string) => setKams((p) => p.map((x, j) => (j === i ? v : x)))
  const addKam = () => setKams((p) => [...p, ''])
  const delKam = (i: number) => setKams((p) => p.filter((_, j) => j !== i))

  const Stmt = ({ rows, total }: { rows: any[]; total?: { label: string; value: number } }) => (
    <table className="audit-stmt">
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className={r.head ? 'stmt-head' : r.sub ? 'stmt-sub' : ''}>
            <td>{r.label}</td>
            <td className="num">{r.value !== undefined ? fmt(r.value) : ''}</td>
          </tr>
        ))}
        {total && (
          <tr className="stmt-total">
            <td>{total.label}</td>
            <td className="num">{fmt(total.value)}</td>
          </tr>
        )}
      </tbody>
    </table>
  )

  return (
    <div className="audit-wrap">
      <div className="audit-controls">
        <h4>Report Settings</h4>
        <label>Addressee<input value={addressee} onChange={(e) => setAddressee(e.target.value)} /></label>
        <label>Reporting Framework
          <select value={framework} onChange={(e) => setFramework(e.target.value)}>
            <option>IFRS</option><option>US GAAP</option><option>UK GAAP</option><option>Indian GAAP</option><option>Other</option>
          </select>
        </label>
        <label>Opinion Type
          <select value={opinion} onChange={(e) => setOpinion(e.target.value)}>
            <option>Unmodified</option><option>Qualified</option><option>Adverse</option><option>Disclaimer</option>
          </select>
        </label>
        <label>Auditor Firm<input value={auditorFirm} onChange={(e) => setAuditorFirm(e.target.value)} /></label>
        <label>Auditor Name<input value={auditorName} onChange={(e) => setAuditorName(e.target.value)} /></label>
        <label>Auditor License No.<input value={auditorLicense} onChange={(e) => setAuditorLicense(e.target.value)} placeholder="License / reg. no." /></label>
        <label>Auditor Title<input value={auditorTitle} onChange={(e) => setAuditorTitle(e.target.value)} placeholder="Statutory Auditor" /></label>
        <label>Location<input value={auditorLocation} onChange={(e) => setAuditorLocation(e.target.value)} /></label>
        <label>Report Date<input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} /></label>
        <label>Period End<input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} /></label>
        <label>Auditor Tenure (since)<input value={tenure} onChange={(e) => setTenure(e.target.value)} placeholder="e.g. 2019" /></label>
        <label>Materiality<input value={materiality} onChange={(e) => setMateriality(e.target.value)} placeholder={String(mat)} /></label>
        <label className="audit-gc"><input type="checkbox" checked={goingConcern} onChange={(e) => setGoingConcern(e.target.checked)} /> Going concern assumed</label>
        <label>Other Information<textarea value={otherInfo} onChange={(e) => setOtherInfo(e.target.value)} rows={3} /></label>
        <label>Emphasis of Matter (optional)<textarea value={emphasis} onChange={(e) => setEmphasis(e.target.value)} rows={3} /></label>
        <div className="audit-kams">
          <div className="audit-kams-head">Key Audit Matters<button onClick={addKam}>+ Add</button></div>
          {kams.map((k, i) => (
            <div key={i} className="audit-kam-row">
              <textarea value={k} onChange={(e) => setKam(i, e.target.value)} rows={2} placeholder="Describe a key audit matter…" />
              <button className="att-del" onClick={() => delKam(i)}>✕</button>
            </div>
          ))}
        </div>
        <ShareBar
          title={`Audit Report – ${company}`}
          subject={`Audit Report ${company} ${periodEnd}`}
          text={`Independent Auditor's Report & Financial Statements\nEntity: ${company}\nPeriod end: ${periodEnd}\nFramework: ${framework}\nOpinion: ${opinion}\n\nTotal Assets: ${fmt(totalAssets)}\nTotal Liabilities: ${fmt(totalLiab)}\nTotal Equity: ${fmt(totalEquity)}\nRevenue: ${fmt(revenue)}\nExpenses: ${fmt(expenses)}\nNet Profit: ${fmt(netProfit)}`}
        />
      </div>

      <div className="audit-doc">
        {/* ===== FACE SHEET (COVER) ===== */}
        <section className="audit-facesheet audit-section">
          <div className="fs-firm">{auditorFirm || `${company} Audit LLP`}</div>
          <h1 className="fs-co">{company}</h1>
          <div className="fs-sub">Independent Auditor's Report<br />and Financial Statements</div>
          <div className="fs-period">For the year ended {periodEnd}</div>
          <table className="fs-meta">
            <tbody>
              <tr><td>Entity</td><td>{company}</td></tr>
              <tr><td>Reporting framework</td><td>{framework}</td></tr>
              <tr><td>Auditor</td><td>{auditorFirm || '—'}</td></tr>
              <tr><td>Report date</td><td>{reportDate}</td></tr>
              <tr><td>Opinion expressed</td><td>{opinion}</td></tr>
            </tbody>
          </table>
        </section>

        {/* ===== TABLE OF CONTENTS ===== */}
        <h2 className="audit-title">Independent Auditor's Report</h2>
        <p className="audit-addr">{addressee}</p>
        <div className="audit-toc">
          <strong>Contents</strong>
          <ol>
            <li>Report on the audit of the financial statements — Opinion</li>
            <li>Basis for Opinion</li>
            <li>Conclusions relating to going concern</li>
            <li>Overview of our audit approach</li>
            <li>Key Audit Matters</li>
            <li>Other Information</li>
            <li>Responsibilities of Management for the Financial Statements</li>
            <li>Auditor's Responsibilities for the Audit</li>
            <li>Use of our Report</li>
            <li>Signature</li>
            <li>Financial Statements (Position, P&L, Changes in Equity, Cash Flows)</li>
            <li>Notes to the Financial Statements</li>
          </ol>
        </div>

        {/* ===== AUDITOR'S REPORT ===== */}
        <section className="audit-section">
          <h3>Report on the audit of the financial statements</h3>
          <h4 style={{ margin: '10px 0 4px' }}>Opinion</h4>
          <p>{OPINION_TEXT[opinion](company, framework, periodEnd)}</p>

          <h4 style={{ margin: '14px 0 4px' }}>Basis for {opinion === 'Disclaimer' ? 'Disclaimer of' : 'Qualified'} Opinion</h4>
          <p>We conducted our audit in accordance with International Standards on Auditing (ISAs). Our responsibilities under those standards are further described in the Auditor's Responsibilities section of our report. We are independent of ${company} in accordance with the ethical requirements that are relevant to our audit, and we have fulfilled our other ethical responsibilities in accordance with these requirements. We believe that the audit evidence we have obtained is sufficient and appropriate to provide a basis for our opinion.</p>
        </section>

        <section className="audit-section">
          <h3>Conclusions relating to going concern</h3>
          <p>In auditing the financial statements, we have concluded that management's use of the going concern basis of accounting in the preparation of the financial statements is appropriate. {goingConcern ? 'Based on the work we have performed, we have not identified any material uncertainties relating to events or conditions that, individually or collectively, may cast significant doubt on the Company\'s ability to continue as a going concern for a period of at least twelve months from when the financial statements are authorised for issue.' : 'We draw attention to the uncertainty disclosed in note X regarding the Company\'s ability to continue as a going concern.'}</p>
        </section>

        <section className="audit-section">
          <h3>Overview of our audit approach</h3>
          <p><strong>Materiality.</strong> The scope of our audit was determined by reference to materiality, which we set at {fmt(mat)} based on a benchmark of {framework} reported revenue. Misstatements in the financial statements, individually or in aggregate, that exceed this threshold are considered material.</p>
          <p><strong>Scope.</strong> Our audit included obtaining an understanding of internal control relevant to the preparation of the financial statements, assessing the risks of material misstatement, and performing audit procedures responsive to those risks. The audit was designed to obtain reasonable assurance, and included testing of the underlying records from which the financial statements are prepared.</p>
        </section>

        <section className="audit-section">
          <h3>Key Audit Matters</h3>
          {kams.filter((k) => k.trim()).length === 0 ? (
            <p>We have determined that there are no key audit matters to communicate in our report.</p>
          ) : (
            <ol>{kams.filter((k) => k.trim()).map((k, i) => <li key={i}>{k}</li>)}</ol>
          )}
        </section>

        <section className="audit-section">
          <h3>Other Information</h3>
          <p>{otherInfo}</p>
          {emphasis.trim() && (<><h4 style={{ margin: '12px 0 4px' }}>Emphasis of Matter</h4><p>{emphasis}</p></>)}
        </section>

        <section className="audit-section">
          <h3>Responsibilities of Management for the Financial Statements</h3>
          <p>Management is responsible for the preparation and fair presentation of the financial statements in accordance with ${framework}, and for such internal control as management determines is necessary to enable the preparation of financial statements that are free from material misstatement, whether due to fraud or error.</p>
          {goingConcern && <p>In preparing the financial statements, management is responsible for assessing the Company's ability to continue as a going concern, disclosing, as applicable, matters related to going concern and using the going concern basis of accounting unless management either intends to liquidate the Company or to cease operations, or has no realistic alternative but to do so.</p>}
        </section>

        <section className="audit-section">
          <h3>Auditor's Responsibilities for the Audit of the Financial Statements</h3>
          <p>Our objectives are to obtain reasonable assurance about whether the financial statements as a whole are free from material misstatement, whether due to fraud or error, and to issue an auditor's report that includes our opinion. Reasonable assurance is a high level of assurance, but is not a guarantee that an audit conducted in accordance with ISAs will always detect a material misstatement when it exists. Misstatements can arise from fraud or error and are considered material if, individually or in aggregate, they could reasonably be expected to influence the economic decisions of users taken on the basis of these financial statements.</p>
        </section>

        <section className="audit-section">
          <h3>Use of our Report</h3>
          <p>This report is made solely to the Company's members, as a body, in accordance with the applicable statute. Our audit work has been undertaken so that we might state to the Company's members those matters we are required to state to them in an auditor's report and for no other purpose. To the fullest extent permitted by law, we do not accept or assume responsibility to anyone other than the Company and the Company's members as a body for our audit work, for this report, or for the opinions we have formed.</p>
        </section>

        <section className="audit-section">
          <h3>Signature</h3>
          <div className="audit-sign">
            <p>{auditorFirm || '___________________'}</p>
        <p>{auditorName ? `${auditorName} (${auditorTitle})` : 'Authorised Signature'}</p>
        {auditorLocation && <p>{auditorLocation}</p>}
        {auditorLicense && <p>License No.: {auditorLicense}</p>}
            <p>Date: {reportDate}</p>
            {tenure && <p>We have served as the Company's auditor continuously since {tenure}.</p>}
          </div>
        </section>

        {/* ===== FINANCIAL STATEMENTS ===== */}
        <section className="audit-section">
          <h2 className="audit-stmt-title">Financial Statements of {company}</h2>
          <h3>Statement of Financial Position as at {periodEnd}</h3>
          <Stmt
            rows={[
              { head: true, label: 'ASSETS' },
              ...assets.map((a) => ({ label: `${a.code}  ${a.name}`, value: Number(a.current_balance || 0) })),
              { sub: true, label: 'Total assets', value: totalAssets },
              { head: true, label: 'LIABILITIES' },
              ...liabs.map((a) => ({ label: `${a.code}  ${a.name}`, value: Number(a.current_balance || 0) })),
              { sub: true, label: 'Total liabilities', value: totalLiab },
              { head: true, label: 'EQUITY' },
              ...eqty.map((a) => ({ label: `${a.code}  ${a.name}`, value: Number(a.current_balance || 0) })),
              { sub: true, label: 'Total equity', value: totalEquity },
              { sub: true, label: 'Total equity and liabilities', value: totalLiab + totalEquity },
            ]}
          />
        </section>

        <section className="audit-section">
          <h3>Statement of Profit or Loss and Other Comprehensive Income for the year ended {periodEnd}</h3>
          <Stmt
            rows={[
              { head: true, label: 'REVENUE' },
              ...income.map((a) => ({ label: `${a.code}  ${a.name}`, value: Number(a.current_balance || 0) })),
              { sub: true, label: 'Total revenue', value: revenue },
              { head: true, label: 'EXPENSES' },
              ...expense.map((a) => ({ label: `${a.code}  ${a.name}`, value: Number(a.current_balance || 0) })),
              { sub: true, label: 'Total expenses', value: expenses },
              { sub: true, label: 'Profit for the year', value: netProfit },
            ]}
          />
        </section>

        <section className="audit-section">
          <h3>Statement of Changes in Equity for the year ended {periodEnd}</h3>
          <Stmt
            rows={[
              { label: 'Opening equity', value: totalEquity - netProfit },
              { label: 'Profit for the year', value: netProfit },
              { sub: true, label: 'Closing equity', value: totalEquity },
            ]}
          />
        </section>

        <section className="audit-section">
          <h3>Statement of Cash Flows for the year ended {periodEnd}</h3>
          <p className="audit-note-inline">Prepared on the indirect basis; closing cash and cash equivalents are derived from the ledger.</p>
          <Stmt
            rows={[
              { label: 'Net cash flow from operating activities (illustrative)', value: netProfit },
              { label: 'Net cash from investing activities (illustrative)', value: 0 },
              { label: 'Net cash from financing activities (illustrative)', value: 0 },
              { sub: true, label: 'Cash and cash equivalents at end of period', value: closingCash },
            ]}
          />
        </section>

        {/* ===== NOTES ===== */}
        <section className="audit-section">
          <h2 className="audit-stmt-title">Notes to the Financial Statements</h2>

          <h4 style={{ margin: '12px 0 4px' }}>1. Basis of preparation</h4>
          <p>These financial statements have been prepared in accordance with {framework} under the historical cost convention, except as disclosed in the accounting policies below. The preparation of financial statements requires management to exercise judgement and to make estimates and assumptions about the future that affect the application of policies and reported amounts.</p>

          <h4 style={{ margin: '12px 0 4px' }}>2. Summary of significant accounting policies</h4>
          <p>The Company applies the following material accounting policies: revenue is recognised when control of goods or services transfers to the customer; property, plant and equipment are stated at cost less accumulated depreciation; inventories are stated at the lower of cost and net realisable value; financial instruments are recognised at fair value on initial recognition with subsequent measurement at amortised cost; and provisions are recognised when there is a present obligation and a reliable estimate can be made.</p>

          <h4 style={{ margin: '12px 0 4px' }}>3. Breakdown of assets</h4>
          <Stmt rows={assets.map((a) => ({ label: `${a.code}  ${a.name}`, value: Number(a.current_balance || 0) }))} total={{ label: 'Total assets', value: totalAssets }} />

          <h4 style={{ margin: '12px 0 4px' }}>4. Breakdown of liabilities</h4>
          <Stmt rows={liabs.map((a) => ({ label: `${a.code}  ${a.name}`, value: Number(a.current_balance || 0) }))} total={{ label: 'Total liabilities', value: totalLiab }} />

          <h4 style={{ margin: '12px 0 4px' }}>5. Breakdown of equity</h4>
          <Stmt rows={eqty.map((a) => ({ label: `${a.code}  ${a.name}`, value: Number(a.current_balance || 0) }))} total={{ label: 'Total equity', value: totalEquity }} />

          <h4 style={{ margin: '12px 0 4px' }}>6. Revenue and expenses by nature</h4>
          <Stmt
            rows={[
              { label: 'Revenue', value: revenue },
              ...expense.map((a) => ({ label: a.name, value: Number(a.current_balance || 0) })),
              { sub: true, label: 'Profit for the year', value: netProfit },
            ]}
          />

          <h4 style={{ margin: '12px 0 4px' }}>7. Financial risk management</h4>
          <p>The Company's activities expose it to market risk, credit risk and liquidity risk. The Board of Directors is responsible for setting the objectives and principles of financial risk management. The Company manages its exposure to these risks through ongoing monitoring of cash flows, counterparty credit limits and, where appropriate, the use of financial instruments.</p>

          <h4 style={{ margin: '12px 0 4px' }}>8. Related party transactions</h4>
          <p>No related party transactions outside the normal course of business have been identified during the period. Transactions with key management personnel are limited to remuneration approved by the Board.</p>

          <h4 style={{ margin: '12px 0 4px' }}>9. Auditor's remuneration</h4>
          <p>Fees paid or payable to the auditor for the audit of the financial statements are disclosed in the engagement letter. No non-audit services that could impair independence were provided during the period.</p>

          <h4 style={{ margin: '12px 0 4px' }}>10. Going concern</h4>
          <p>Management has assessed the Company's ability to continue as a going concern for at least twelve months from the date of authorisation of these financial statements and is of the opinion that there are no material uncertainties that cast significant doubt on the Company's ability to continue as a going concern.</p>

          <h4 style={{ margin: '12px 0 4px' }}>11. Property, plant and equipment</h4>
          <p>The following classes of property, plant and equipment are recognised at cost less accumulated depreciation and any accumulated impairment losses. Depreciation is provided on a straight-line basis over the estimated useful lives of the assets.</p>
          <Stmt rows={assets.map((a) => ({ label: `${a.code}  ${a.name}`, value: Number(a.current_balance || 0) }))} total={{ label: 'Total PPE / non-current assets', value: totalAssets }} />

          <h4 style={{ margin: '12px 0 4px' }}>12. Trade and other receivables</h4>
          <Stmt rows={assets.filter((a) => /receiv|debtor|prepaid/i.test(a.name || '')).map((a) => ({ label: a.name, value: Number(a.current_balance || 0) }))} total={{ label: 'Total receivables', value: assets.filter((a) => /receiv|debtor|prepaid/i.test(a.name || '')).reduce((s, a) => s + Number(a.current_balance || 0), 0) }} />

          <h4 style={{ margin: '12px 0 4px' }}>13. Provisions and contingent liabilities</h4>
          <Stmt rows={liabs.filter((a) => /provision|payable|accrual/i.test(a.name || '')).map((a) => ({ label: a.name, value: Number(a.current_balance || 0) }))} total={{ label: 'Total provisions', value: liabs.filter((a) => /provision|payable|accrual/i.test(a.name || '')).reduce((s, a) => s + Number(a.current_balance || 0), 0) }} />
          <p>No contingent liabilities that are reasonably possible of crystallising have been identified other than those disclosed above.</p>

          <h4 style={{ margin: '12px 0 4px' }}>14. Events after the reporting period</h4>
          <p>No adjusting or non-adjusting events subsequent to the reporting date that would require adjustment to, or disclosure in, these financial statements have been identified.</p>

          <h4 style={{ margin: '12px 0 4px' }}>15. Dividends</h4>
          <p>No dividend has been proposed or declared in respect of the year ended {periodEnd} at the date of authorisation of these financial statements.</p>

          <h4 style={{ margin: '12px 0 4px' }}>16. Segment information</h4>
          <p>The Company operates as a single reportable segment and is managed on an entity-wide basis. All of the Company's assets, liabilities, revenue and expenses are attributable to this segment.</p>
        </section>
      </div>
    </div>
  )
}
