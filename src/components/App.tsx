import React, { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient'
import ScreenDesigner from './ScreenDesigner'
import { printWithTemplate } from '../utils/printTemplate'
import Attachments from './Attachments'
import AttachmentButton from './AttachmentButton'
import CorporateTax from './CorporateTax'
import AuditReport from './AuditReport'
import FixedAssets from './FixedAssets'
import FxRevaluation from './FxRevaluation'
import InventoryValuation from './InventoryValuation'
import AuditLog from './AuditLog'
import Statements from './Statements'
import PdcReport from './PdcReport'
import ChequeTemplates from './ChequeTemplates'
import StockTransfer from './StockTransfer'
import ShareBar from './ShareBar'
import ScanToInvoice from './ScanToInvoice'
import Production from './Production'
import DataImport from './DataImport'
import Login from './Login'
import CreditDashboard from './CreditDashboard'
import Dashboard from './Dashboard'
import StockAlerts from './StockAlerts'
import RecurringInvoices from './RecurringInvoices'
import BarcodeScanner from './BarcodeScanner'
import InventoryMovementReport from './InventoryMovementReport'
import AgedReceivables from './AgedReceivables'
import PaymentLinks from './PaymentLinks'
import BankCsvImport from './BankCsvImport'
import BarcodeLabelPrint from './BarcodeLabelPrint'
import PaymentSchedule from './PaymentSchedule'
import DunningLetters from './DunningLetters'
import TransactionReversal from './TransactionReversal'
import LicensePage from './LicensePage'
import { logActivity } from '../utils/audit'
import { downloadPDF } from '../utils/generatePDF'
import { emailInvoice } from '../utils/emailInvoice'
import { fetchTaxConfig, TaxConfig } from '../utils/taxConfig'
import './App.css'

const MENUS = [
  { key: 'a', label: 'ADMINISTRATION', icon: '⚙️', color: '#64748b', color2: '#475569', items: [
    { label: 'Company Profile', icon: '🏢' },
    { label: 'Users & Roles', icon: '👤' },
    { label: 'Authorization', icon: '🔐' },
    { label: 'Screen Designer', icon: '🖼️' },
    { label: 'Document Numbering', icon: '🔢' },
    { label: 'Import / Export', icon: '📥' },
    { label: 'Audit Log', icon: '📜' },
    { label: 'Backup & Restore', icon: '💾' },
    { label: 'License', icon: '🔑' },
  ]},
  { key: 'f', label: 'FINANCIALS', icon: '💼', color: '#8b5cf6', color2: '#7c3aed', items: [
    { label: 'Chart of Accounts', icon: '📒' },
    { label: 'Journal Entry', icon: '✏️' },
    { label: 'Cash Book', icon: '💵' },
    { label: 'Bank Book', icon: '🏦' },
    { label: 'Bank Reconciliation', icon: '🔗' },
    { label: 'Debit Note', icon: '📄' },
    { label: 'Credit Note', icon: '📄' },
    { label: 'Corporate Tax', icon: '🏛️' },
    { label: 'Exchange Rates', icon: '💱' },
    { label: 'Fx Revaluation', icon: '💱' },
    { label: 'Cost Center', icon: '🎯' },
    { label: 'Budget', icon: '💰' },
    { label: 'Tax Report', icon: '🧾' },
    { label: 'Audit Report', icon: '📋' },
    { label: 'Fixed Assets', icon: '🏭' },
    { label: 'Petty Cash', icon: '💵' },
  ]},
  { key: 's', label: 'SALES — A/R', icon: '💰', color: '#10b981', color2: '#059669', items: [
    { label: 'Sales Quotation', icon: '💼' },
    { label: 'Sales Order', icon: '📋' },
    { label: 'A/R Invoice', icon: '🧾' },
    { label: 'Delivery Note', icon: '🚚' },
    { label: 'A/R Credit Memo', icon: '📄' },
    { label: 'Sales Return', icon: '🔄' },
      { label: 'Customer', icon: '🧑' },
      { label: 'Customer Ledger', icon: '📒' },
    { label: 'Sales Person', icon: '🧑‍💼' },
    { label: 'Leads & Opportunities', icon: '🎯' },
    { label: 'Sales Target', icon: '🏆' },
    { label: 'Recurring Invoices', icon: '🔁' },
  ]},
  { key: 'p', label: 'PURCHASING — A/P', icon: '🛒', color: '#f59e0b', color2: '#d97706', items: [
    { label: 'Purchase Requisition', icon: '📝' },
    { label: 'Purchase Order', icon: '📑' },
    { label: 'Goods Receipt PO', icon: '📥' },
    { label: 'A/P Invoice', icon: '🧾' },
    { label: 'A/P Credit Memo', icon: '📄' },
    { label: 'Purchase Return', icon: '🔄' },
    { label: 'Landed Cost', icon: '🚢' },
      { label: 'Supplier', icon: '🏭' },
      { label: 'Supplier Ledger', icon: '📒' },
  ]},
  { key: 'i', label: 'INVENTORY', icon: '🏪', color: '#ec4899', color2: '#db2777', items: [
    { label: 'Stock Master', icon: '📦' },
    { label: 'Item Groups', icon: '🏷️' },
    { label: 'Warehouses', icon: '🏬' },
    { label: 'Price Lists', icon: '💲' },
    { label: 'Stock Transfer', icon: '🔄' },
    { label: 'Production / BOM', icon: '🏭' },
    { label: 'Stock Adjustment', icon: '⚖️' },
    { label: 'Stock In / Out', icon: '📥' },
    { label: 'Batch / Serial', icon: '🔢' },
    { label: 'Physical Stock', icon: '📋' },
    { label: 'Pick & Pack', icon: '📦' },
    { label: 'Barcode Management', icon: '📱' },
    { label: 'Stock Alerts', icon: '⚠️' },
    { label: 'Stock Aging', icon: '⏳' },
    { label: 'Inventory Valuation', icon: '⚖️' },
    { label: 'Print Barcode Labels', icon: '🏷️' },
  ]},
  { key: 'b', label: 'BANKING', icon: '🏦', color: '#06b6d4', color2: '#0891b2', items: [
    { label: 'Incoming Payments', icon: '💵' },
    { label: 'Outgoing Payments', icon: '💸' },
    { label: 'Deposits', icon: '🏦' },
    { label: 'Check Management', icon: '📋' },
    { label: 'Payment Wizard', icon: '🧙' },
    { label: 'PDC Report', icon: '🏦' },
    { label: 'Cheque Templates', icon: '🖨' },
    { label: 'Reconciliation', icon: '🔗' },
    { label: 'Bank CSV Import', icon: '📁' },
    { label: 'Payment Schedules', icon: '📅' },
    { label: 'Dunning Letters', icon: '📧' },
  ]},
  { key: 'r', label: 'REPORTS', icon: '📊', color: '#f97316', color2: '#ea580c', items: [
    { label: 'Sales Report', icon: '📈' },
    { label: 'Purchase Report', icon: '📉' },
    { label: 'Stock Report', icon: '📦' },
    { label: 'Stock Aging Report', icon: '⏳' },
    { label: 'Customer Balance', icon: '👥' },
    { label: 'Supplier Balance', icon: '🏭' },
    { label: 'Profit & Loss Statement', icon: '💰' },
    { label: 'Trial Balance Report', icon: '📊' },
    { label: 'Balance Sheet Report', icon: '📋' },
    { label: 'Cash Flow Statement', icon: '💵' },
    { label: 'Statements & Aging', icon: '📑' },
    { label: 'Inventory Movement Report', icon: '📦' },
    { label: 'Aged Receivables', icon: '📊' },
    { label: 'Transaction Reversal', icon: '🔄' },
    { label: 'Dashboard', icon: '🖥️' },
  ]},
]

const DEFAULT_COLUMNS = [
  { key: 'created_at', label: 'DATE', type: 'date' },
  { key: 'name', label: 'NAME' },
]

const fmtMoney = (v, currency) => `${currency || 'USD'} ${Number(v || 0).toLocaleString('en', { minimumFractionDigits: 2 })}`

const LISTINGS = {
  'Stock Master': {
    table: 'products',
    columns: [
      { key: 'code', label: 'CODE' },
      { key: 'name', label: 'NAME' },
      { key: 'sku', label: 'SKU' },
      { key: 'category', label: 'CATEGORY' },
      { key: 'unit', label: 'UNIT' },
      { key: 'price', label: 'SELL PRICE', type: 'money' },
      { key: 'cost_price', label: 'COST', type: 'money' },
      { key: 'stock_quantity', label: 'QTY' },
      { key: 'reorder_level', label: 'REORDER' },
      { key: 'location', label: 'LOCATION' },
      { key: 'status', label: 'STATUS' },
    ],
  },
  'Customer': {
    table: 'customers',
    columns: [
      { key: 'created_at', label: 'DATE', type: 'date' },
      { key: 'code', label: 'CODE' },
      { key: 'name', label: 'NAME' },
      { key: 'phone', label: 'PHONE' },
      { key: 'city', label: 'CITY' },
      { key: 'vat_no', label: 'VAT NO' },
      { key: 'credit_limit', label: 'CREDIT LIMIT', type: 'money' },
      { key: 'status', label: 'STATUS' },
    ],
  },
  'Supplier': {
    table: 'suppliers',
    columns: [
      { key: 'created_at', label: 'DATE', type: 'date' },
      { key: 'code', label: 'CODE' },
      { key: 'name', label: 'NAME' },
      { key: 'phone', label: 'PHONE' },
      { key: 'city', label: 'CITY' },
      { key: 'sup_type', label: 'TYPE' },
      { key: 'bank_name', label: 'BANK' },
      { key: 'status', label: 'STATUS' },
    ],
  },
}

const MODULES = {
  'ZATCA e-Invoice': { icon: '🧾', fields: [
    { key: 'invoice_no', label: 'Invoice No', required: true },
    { key: 'customer_name', label: 'Customer' },
    { key: 'doc_date', label: 'Date', type: 'date' },
    { key: 'amount_excl', label: 'Amount (Excl. VAT)', type: 'money' },
    { key: 'vat_amount', label: 'VAT Amount', type: 'money' },
    { key: 'zatca_status', label: 'ZATCA Status', type: 'select', options: ['Pending', 'Submitted', 'Validated', 'Rejected'] },
    { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
  ], columns: [
    { key: 'invoice_no', label: 'INVOICE NO' },
    { key: 'customer_name', label: 'CUSTOMER' },
    { key: 'doc_date', label: 'DATE', type: 'date' },
    { key: 'amount_excl', label: 'AMOUNT', type: 'money' },
    { key: 'vat_amount', label: 'VAT', type: 'money' },
    { key: 'status', label: 'STATUS', type: 'status' },
  ]},
  'Sales Person': { icon: '🧑‍💼', fields: [
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Name', required: true },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'commission_rate', label: 'Commission %', type: 'number' },
    { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
  ], columns: [
    { key: 'code', label: 'CODE' },
    { key: 'name', label: 'NAME' },
    { key: 'phone', label: 'PHONE' },
    { key: 'commission_rate', label: 'COM %' },
    { key: 'status', label: 'STATUS', type: 'status' },
  ]},
  'Leads & Opportunities': { icon: '🎯', fields: [
    { key: 'lead_name', label: 'Lead Name', required: true },
    { key: 'company', label: 'Company' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'source', label: 'Source', type: 'select', options: ['Website', 'Referral', 'Cold Call', 'Trade Show', 'Social'] },
    { key: 'stage', label: 'Stage', type: 'select', options: ['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost'] },
    { key: 'estimated_value', label: 'Est. Value', type: 'money' },
    { key: 'status', label: 'Status', type: 'select', options: ['Open', 'Closed'] },
  ], columns: [
    { key: 'lead_name', label: 'LEAD' },
    { key: 'company', label: 'COMPANY' },
    { key: 'stage', label: 'STAGE' },
    { key: 'estimated_value', label: 'EST. VALUE', type: 'money' },
    { key: 'status', label: 'STATUS', type: 'status' },
  ]},
  'Sales Target': { icon: '🏆', fields: [
    { key: 'sales_person', label: 'Sales Person', required: true },
    { key: 'fiscal_year', label: 'Fiscal Year' },
    { key: 'period', label: 'Period', type: 'select', options: ['Monthly', 'Quarterly', 'Annual'] },
    { key: 'target_amount', label: 'Target', type: 'money' },
    { key: 'achieved', label: 'Achieved', type: 'money' },
    { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Closed'] },
  ], columns: [
    { key: 'sales_person', label: 'SALES PERSON' },
    { key: 'fiscal_year', label: 'YEAR' },
    { key: 'period', label: 'PERIOD' },
    { key: 'target_amount', label: 'TARGET', type: 'money' },
    { key: 'achieved', label: 'ACHIEVED', type: 'money' },
    { key: 'status', label: 'STATUS', type: 'status' },
  ]},
  'Item Groups': { icon: '🏷️', fields: [
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Name', required: true },
    { key: 'parent_group', label: 'Parent Group' },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
  ], columns: [
    { key: 'code', label: 'CODE' },
    { key: 'name', label: 'NAME' },
    { key: 'parent_group', label: 'PARENT' },
    { key: 'status', label: 'STATUS', type: 'status' },
  ]},
  'Warehouses': { icon: '🏬', fields: [
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Name', required: true },
    { key: 'location', label: 'Location' },
    { key: 'manager', label: 'Manager' },
    { key: 'capacity_units', label: 'Capacity (units)', type: 'number' },
    { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
  ], columns: [
    { key: 'code', label: 'CODE' },
    { key: 'name', label: 'NAME' },
    { key: 'location', label: 'LOCATION' },
    { key: 'capacity_units', label: 'CAPACITY' },
    { key: 'status', label: 'STATUS', type: 'status' },
  ]},
  'Price Lists': { icon: '💲', fields: [
    { key: 'name', label: 'Name', required: true },
    { key: 'currency', label: 'Currency', type: 'select', options: ['AED', 'SAR', 'USD', 'EUR'] },
    { key: 'base_pricelist', label: 'Base Price List' },
    { key: 'valid_from', label: 'Valid From', type: 'date' },
    { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
  ], columns: [
    { key: 'name', label: 'NAME' },
    { key: 'currency', label: 'CURRENCY' },
    { key: 'valid_from', label: 'VALID FROM', type: 'date' },
    { key: 'status', label: 'STATUS', type: 'status' },
  ]},
  'Stock Transfer': { icon: '🔄', fields: [
    { key: 'transfer_no', label: 'Transfer No' },
    { key: 'product_name', label: 'Item' },
    { key: 'from_wh', label: 'From Warehouse' },
    { key: 'to_wh', label: 'To Warehouse' },
    { key: 'qty', label: 'Qty', type: 'number' },
    { key: 'requested_by', label: 'Requested By' },
    { key: 'status', label: 'Status', type: 'select', options: ['Requested', 'Dispatched', 'Received', 'Cancelled'] },
  ], columns: [
    { key: 'transfer_no', label: 'TRANSFER NO' },
    { key: 'product_name', label: 'ITEM' },
    { key: 'from_wh', label: 'FROM' },
    { key: 'to_wh', label: 'TO' },
    { key: 'qty', label: 'QTY' },
    { key: 'status', label: 'STATUS', type: 'status' },
  ]},
  'Batch / Serial': { icon: '🔢', fields: [
    { key: 'batch_no', label: 'Batch No', required: true },
    { key: 'item_name', label: 'Item', required: true },
    { key: 'quantity', label: 'Qty', type: 'number' },
    { key: 'expiry_date', label: 'Expiry', type: 'date' },
    { key: 'serial_range', label: 'Serial Range' },
    { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Expired', 'Used'] },
  ], columns: [
    { key: 'batch_no', label: 'BATCH NO' },
    { key: 'item_name', label: 'ITEM' },
    { key: 'quantity', label: 'QTY' },
    { key: 'expiry_date', label: 'EXPIRY', type: 'date' },
    { key: 'status', label: 'STATUS', type: 'status' },
  ]},
  'Pick & Pack': { icon: '📦', fields: [
    { key: 'order_ref', label: 'Order Ref', required: true },
    { key: 'warehouse', label: 'Warehouse' },
    { key: 'packed_by', label: 'Packed By' },
    { key: 'pack_date', label: 'Pack Date', type: 'date' },
    { key: 'status', label: 'Status', type: 'select', options: ['Picked', 'Packed', 'Shipped', 'Partial'] },
  ], columns: [
    { key: 'order_ref', label: 'ORDER REF' },
    { key: 'warehouse', label: 'WAREHOUSE' },
    { key: 'packed_by', label: 'PACKED BY' },
    { key: 'pack_date', label: 'PACK DATE', type: 'date' },
    { key: 'status', label: 'STATUS', type: 'status' },
  ]},
  'Barcode Management': { icon: '📱', fields: [
    { key: 'item_name', label: 'Item', required: true },
    { key: 'barcode', label: 'Barcode' },
    { key: 'format', label: 'Format', type: 'select', options: ['Code128', 'QR', 'EAN13', 'UPC'] },
    { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
  ], columns: [
    { key: 'item_name', label: 'ITEM' },
    { key: 'barcode', label: 'BARCODE' },
    { key: 'format', label: 'FORMAT' },
    { key: 'status', label: 'STATUS', type: 'status' },
  ]},
}

const getDocMenus = (vatRate: number = 0) => ({
  'A/R Invoice': { table: 'invoices', noField: 'invoice_no', title: '🧾 A/R Invoice', party: 'customer', vat: vatRate, partyNameKey: 'customer_name', inv: true },
  'Delivery Note': { table: 'delivery_notes', noField: 'delivery_no', title: '🚚 Delivery Note', party: 'customer', vat: 0, partyNameKey: 'party_name', partyIdKey: 'party_id' },
  'A/R Credit Memo': { table: 'ar_credit_memos', noField: 'memo_no', title: '📄 A/R Credit Memo', party: 'customer', vat: vatRate, partyNameKey: 'party_name', partyIdKey: 'party_id' },
  'Sales Return': { table: 'sales_returns', noField: 'return_no', title: '🔄 Sales Return', party: 'customer', vat: vatRate, partyNameKey: 'party_name', partyIdKey: 'party_id' },
  'Purchase Requisition': { table: 'purchase_requisitions', noField: 'req_no', title: '📝 Purchase Requisition', party: 'supplier', vat: 0, partyNameKey: 'party_name', partyIdKey: 'party_id', convertTo: 'Purchase Order', convertLabel: '📑 Convert to PO' },
  'Purchase Order': { table: 'purchase_orders', noField: 'po_no', title: '📑 Purchase Order', party: 'supplier', vat: 0, partyNameKey: 'party_name', partyIdKey: 'party_id', convertTo: 'Goods Receipt PO', convertLabel: '📥 Convert to GRN', sourceField: 'source_doc_no' },
  'Goods Receipt PO': { table: 'goods_receipts', noField: 'grn_no', title: '📥 Goods Receipt PO', party: 'supplier', vat: 0, partyNameKey: 'party_name', partyIdKey: 'party_id', convertTo: 'A/P Invoice', convertLabel: '🧾 Convert to AP Invoice', sourceField: 'source_doc_no', stockImpact: true },
  'A/P Invoice': { table: 'purchase_invoices', noField: 'pin_no', title: '🧾 A/P Invoice', party: 'supplier', vat: vatRate, partyNameKey: 'party_name', partyIdKey: 'party_id', sourceField: 'source_doc_no' },
  'A/P Credit Memo': { table: 'ap_credit_memos', noField: 'memo_no', title: '📄 A/P Credit Memo', party: 'supplier', vat: vatRate, partyNameKey: 'party_name', partyIdKey: 'party_id' },
  'Purchase Return': { table: 'purchase_returns', noField: 'return_no', title: '🔄 Purchase Return', party: 'supplier', vat: vatRate, partyNameKey: 'party_name', partyIdKey: 'party_id' },
  'Landed Cost': { table: 'landed_costs', noField: 'lc_no', title: '🚢 Landed Cost', party: 'supplier', vat: 0, partyNameKey: 'party_name', partyIdKey: 'party_id' },
})
const DOC_MENUS = getDocMenus(0)

const BarChart = ({ labels, values }) => {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = canvas.parentElement.offsetWidth
    const H = 180
    canvas.width = W * 2
    canvas.height = H * 2
    canvas.style.width = W + 'px'
    canvas.style.height = H + 'px'
    ctx.scale(2, 2)
    ctx.clearRect(0, 0, W, H)
    const max = Math.max(...values, 1)
    const barW = Math.max(20, (W - 60) / labels.length - 12)
    const chartH = H - 40
    ctx.font = '11px Segoe UI, sans-serif'
    ctx.textAlign = 'center'
    labels.forEach((lbl, i) => {
      const x = 40 + i * (barW + 12)
      const h = (values[i] / max) * chartH
      const grad = ctx.createLinearGradient(x, H - 28 - h, x, H - 28)
      grad.addColorStop(0, '#8b5cf6')
      grad.addColorStop(1, '#ec4899')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.roundRect(x, H - 28 - h, barW, h, [4, 4, 0, 0])
      ctx.fill()
      ctx.fillStyle = '#1e1b4b'
      ctx.fillText(lbl, x + barW / 2, H - 10)
      if (values[i] > 0) {
        ctx.fillStyle = '#6d28d9'
        ctx.fillText(values[i].toFixed(0), x + barW / 2, H - 32 - h)
      }
    })
  }, [labels, values])
  return <div className="bar-chart"><canvas ref={canvasRef} /></div>
}

const DonutChart = ({ data }) => {
  const canvasRef = useRef(null)
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#f97316', '#8b5cf6', '#ef4444']
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const S = 180
    canvas.width = S * 2
    canvas.height = S * 2
    canvas.style.width = S + 'px'
    canvas.style.height = S + 'px'
    ctx.scale(2, 2)
    ctx.clearRect(0, 0, S, S)
    const total = data.reduce((s, d) => s + d.value, 0) || 1
    let start = -Math.PI / 2
    const cx = S / 2, cy = S / 2, R = 65, r = 38
    data.forEach((d, i) => {
      const angle = (d.value / total) * Math.PI * 2
      ctx.beginPath()
      ctx.arc(cx, cy, R, start, start + angle)
      ctx.arc(cx, cy, r, start + angle, start, true)
      ctx.closePath()
      ctx.fillStyle = COLORS[i % COLORS.length]
      ctx.fill()
      start += angle
    })
    ctx.beginPath()
    ctx.arc(cx, cy, r - 2, 0, Math.PI * 2)
    ctx.fillStyle = '#fff'
    ctx.fill()
    ctx.font = 'bold 14px Segoe UI'
    ctx.fillStyle = '#1e1b4b'
    ctx.textAlign = 'center'
    ctx.fillText(total, cx, cy + 2)
    ctx.font = '10px Segoe UI'
    ctx.fillStyle = '#64748b'
    ctx.fillText('items', cx, cy + 16)
    let ly = S - 12
    data.slice(0, 4).forEach((d, i) => {
      const lx = 8 + i * (S / 4)
      ctx.fillStyle = COLORS[i % COLORS.length]
      ctx.fillRect(lx, ly - 8, 8, 8)
      ctx.fillStyle = '#1e1b4b'
      ctx.font = '10px Segoe UI'
      ctx.textAlign = 'left'
      ctx.fillText(`${d.name} (${d.value})`, lx + 12, ly)
    })
  }, [data])
  return <div className="donut-chart"><canvas ref={canvasRef} /></div>
}

const StockForm = ({ form, patch, save, close }) => {
  const d = form.data
  const set = (k, v) => patch({ data: { ...d, [k]: v } })
  const firstRef = useRef(null)
  const wrapRef = useRef(null)

  useEffect(() => {
    if (firstRef.current) firstRef.current.focus()
  }, [])

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      const tag = e.target.tagName
      if (tag === 'TEXTAREA') return
      e.preventDefault()
      const inputs = Array.from(wrapRef.current.querySelectorAll('input, select, textarea'))
      const idx = inputs.indexOf(e.target)
      if (idx < inputs.length - 1) inputs[idx + 1].focus()
      else { const btn = wrapRef.current.querySelector('.btn-primary'); if (btn) btn.click() }
    }
  }

  const addAltUnit = () => {
    const units = [...(d.alt_units || []), { name: '', factor: 1, price: 0 }]
    set('alt_units', units)
  }

  const updateAltUnit = (idx, field, value) => {
    const units = [...(d.alt_units || [])]
    units[idx] = { ...units[idx], [field]: field === 'name' ? value : Number(value) || 0 }
    set('alt_units', units)
  }

  const removeAltUnit = (idx) => {
    const units = (d.alt_units || []).filter((_, i) => i !== idx)
    set('alt_units', units)
  }

  return (
    <div className="stock-wrap" onKeyDown={onKeyDown} ref={wrapRef}>
      {form.savedCode ? (
        <div className="inv-card success">
          <div className="success-ico">✅</div>
          <h3>Item Saved</h3>
          <p className="success-no">Code: <b>{form.savedCode}</b></p>
          <p className="success-sum">{d.name} · {d.category || 'Uncategorized'} · Qty: {d.stock_quantity}</p>
          <Attachments entityType="product" entityId={form.recId || null} />
          <ShareBar title={'Item ' + (form.savedCode || '')} text={'Item: ' + (form.savedCode || '') + '\nName: ' + (d.name || '') + '\nCategory: ' + (d.category || '') + '\nQty: ' + (d.stock_quantity || 0)} />
          <div className="inv-actions center">
            <button className="btn-primary" onClick={() => close(form.id)}>Close Tab</button>
          </div>
        </div>
      ) : (
        <>
          <div className="stock-head">
            <h3>📦 {form.recId ? 'Edit Item' : 'New Item'}</h3>
            {d.code && <span className="stock-code">{d.code}</span>}
          </div>
          {form.error && <div className="inv-error">⚠️ {form.error}</div>}

          <div className="stock-section">
            <h4>📋 Basic Information</h4>
            <div className="inv-grid">
              <label>Product Code<input ref={firstRef} value={d.code} onChange={(e) => set('code', e.target.value)} placeholder="auto-generated if blank" /></label>
              <label>SKU / Part No.<input value={d.sku} onChange={(e) => set('sku', e.target.value)} placeholder="internal code" /></label>
              <label>Product Name *<input value={d.name} onChange={(e) => set('name', e.target.value)} placeholder="item name" /></label>
              <label>Barcode / EAN<input value={d.barcode} onChange={(e) => set('barcode', e.target.value)} placeholder="scan or enter" /></label>
              <label>Description<input value={d.description} onChange={(e) => set('description', e.target.value)} placeholder="short description" /></label>
              <label>Category
                <input list={`stock-cat-${form.id}`} value={d.category} onChange={(e) => set('category', e.target.value)} placeholder="e.g. Electronics" />
                <datalist id={`stock-cat-${form.id}`}>
                  <option value="Electronics" />
                  <option value="Raw Material" />
                  <option value="Packaging" />
                  <option value="Consumable" />
                  <option value="Spare Parts" />
                  <option value="General" />
                </datalist>
              </label>
              <label>Primary Unit
                <select value={d.unit} onChange={(e) => set('unit', e.target.value)}>
                  <option>Pcs</option><option>Kg</option><option>Litre</option><option>Meter</option>
                  <option>Box</option><option>Set</option><option>Roll</option><option>Pair</option>
                  <option>Carton</option><option>Pallet</option>
                </select>
              </label>
              <label>Status
                <select value={d.status} onChange={(e) => set('status', e.target.value)}>
                  <option>Active</option><option>Inactive</option><option>Discontinued</option>
                </select>
              </label>
            </div>
          </div>

          <div className="stock-section">
            <h4>⚖️ Multi-Unit Conversion</h4>
            <p className="stock-hint">Define alternate units (e.g. 1 Box = 12 Pcs, 1 Carton = 6 Boxes)</p>
            <div className="alt-units">
              <div className="alt-header">
                <span className="au-unit">Unit</span>
                <span className="au-factor">= How many {d.unit || 'Pcs'}</span>
                <span className="au-price">Alt Price (SAR)</span>
                <span className="au-del"></span>
              </div>
              {(d.alt_units || []).map((au, idx) => (
                <div className="alt-row" key={idx}>
                  <input className="au-unit" value={au.name} onChange={(e) => updateAltUnit(idx, 'name', e.target.value)} placeholder="e.g. Box" />
                  <input className="au-factor" type="number" min="1" value={au.factor} onChange={(e) => updateAltUnit(idx, 'factor', e.target.value)} />
                  <input className="au-price" type="number" min="0" step="0.01" value={au.price} onChange={(e) => updateAltUnit(idx, 'price', e.target.value)} />
                  <button className="au-del" onClick={() => removeAltUnit(idx)} title="Remove">✕</button>
                </div>
              ))}
              <button className="btn-add-unit" onClick={addAltUnit}>＋ Add Unit</button>
            </div>
          </div>

          <div className="stock-section">
            <h4>💰 Pricing</h4>
            <div className="inv-grid">
              <label>Selling Price ({d.unit || 'Pcs'})<input type="number" min="0" step="0.01" value={d.price} onChange={(e) => set('price', e.target.value)} /></label>
              <label>Cost Price ({d.unit || 'Pcs'})<input type="number" min="0" step="0.01" value={d.cost_price} onChange={(e) => set('cost_price', e.target.value)} /></label>
              <label>VAT Rate %<input type="number" min="0" max="100" step="0.01" value={d.vat_rate} onChange={(e) => set('vat_rate', e.target.value)} /></label>
              <label>HSN / SAC Code<input value={d.hsn_code} onChange={(e) => set('hsn_code', e.target.value)} placeholder="for tax classification" /></label>
            </div>
          </div>

          <div className="stock-section">
            <h4>📦 Stock Levels</h4>
            <div className="inv-grid">
              <label>Current Quantity<input type="number" min="0" value={d.stock_quantity} onChange={(e) => set('stock_quantity', e.target.value)} /></label>
              <label>Reorder Level<input type="number" min="0" value={d.reorder_level} onChange={(e) => set('reorder_level', e.target.value)} /></label>
              <label>Min Stock<input type="number" min="0" value={d.min_stock} onChange={(e) => set('min_stock', e.target.value)} /></label>
              <label>Max Stock<input type="number" min="0" value={d.max_stock} onChange={(e) => set('max_stock', e.target.value)} /></label>
              <label>Location / Bin<input value={d.location} onChange={(e) => set('location', e.target.value)} placeholder="warehouse shelf" /></label>
              <label>Supplier<input value={d.supplier_id} onChange={(e) => set('supplier_id', e.target.value)} placeholder="supplier name or ID" /></label>
            </div>
          </div>

          <div className="stock-section">
            <h4>📝 Notes</h4>
            <div className="inv-grid">
              <label className="wide">Notes<textarea value={d.notes} onChange={(e) => set('notes', e.target.value)} rows="2" placeholder="remarks…" /></label>
            </div>
          </div>

          <div className="inv-actions">
            <button className="btn-cancel" onClick={() => close(form.id)}>✕ Cancel</button>
            <button className="btn-primary" disabled={form.saving} onClick={() => save(form)}>
              {form.saving ? 'Saving…' : '💾 Save Item'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

const InvoiceWorkspace = ({ inv, products, patch, addItem, updItem, rmItem, lookup, save, openNew, close }) => {
  const fmt = (v, t) => {
    if (t === 'money') return `SAR ${Number(v || 0).toFixed(2)}`
    if (t === 'date') return v ? new Date(v).toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' }) : ''
    return v || ''
  }
  const realInvId = inv.dbId || (typeof inv.id === 'string' && !inv.id.startsWith('inv-') ? inv.id : null)

  const [scanOpen, setScanOpen] = useState(false)
  const [scanFile, setScanFile] = useState<File | null>(null)
  const [scanPreview, setScanPreview] = useState('')
  const [scanData, setScanData] = useState<any>(null)
  const [scanErr, setScanErr] = useState('')
  const [scanBusy, setScanBusy] = useState(false)
  const [showAi, setShowAi] = useState(false)
  const [scanMsg, setScanMsg] = useState('')
  const [barcodeOpen, setBarcodeOpen] = useState(false)
  const [ai, setAi] = useState<any>(() => { try { return JSON.parse(localStorage.getItem('aiOcr') || '{}') } catch { return {} } })
  const [emailOpen, setEmailOpen] = useState(false)
  const [emailTo, setEmailTo] = useState('')
  const [emailSending, setEmailSending] = useState(false)
  const [emailResult, setEmailResult] = useState('')

  const saveAi = () => { localStorage.setItem('aiOcr', JSON.stringify(ai)); setShowAi(false) }

  const isAP = inv.title.includes('A/P') || inv.title.toLowerCase().includes('purchase')
  const docLabel = isAP ? 'AP Invoice' : 'AR Invoice'
  const subtotal = inv.items.reduce((s: number, it: any) => s + (Number(it.price) || 0) * (Number(it.qty) || 1) * (1 - (Number(it.discount) || 0) / 100), 0)
  const vatAmt = subtotal * (Number(inv.vat) || 0) / 100
  const grandTotal = subtotal + vatAmt
  const amountPaid = Number(inv.payment?.paid) || 0

  const invoiceData = {
    invoice_no: inv.savedNo,
    invoice_date: inv.date || '',
    due_date: inv.dueDate || '',
    customer_name: inv.customer?.name,
    customer_vat: inv.customer?.vat,
    customer_address: inv.customer?.address,
    subtotal, vat_percent: inv.vat, vat_amount: vatAmt,
    grand_total: grandTotal, amount_paid: amountPaid,
    balance: grandTotal - amountPaid,
    status: amountPaid >= grandTotal ? 'Paid' : amountPaid > 0 ? 'Partial' : 'Outstanding',
    notes: inv.notes || inv.payment?.notes || '',
  }

  const invItems = inv.items.map((it: any) => ({ name: it.description || it.name, qty: it.qty, price: it.price, total: (Number(it.price) || 0) * (Number(it.qty) || 1) * (1 - (Number(it.discount) || 0) / 100) }))

  const handleDownloadPDF = async () => {
    await downloadPDF(invoiceData, companyProfile, invItems, docLabel)
  }

  const handleSendEmail = async (emailAddr?: string) => {
    const to = emailAddr || emailTo
    if (!to.trim()) { setEmailResult('⚠️ Enter an email address'); return { success: false, error: 'No email' } }
    setEmailSending(true); setEmailResult('')
    const r = await emailInvoice({ to, inv: invoiceData, companyProfile, items: invItems, docType: docLabel })
    setEmailSending(false)
    setEmailResult(r.success ? '✅ Invoice emailed successfully!' : '⚠️ ' + (r.error || 'Failed to send'))
    if (r.success) { setEmailOpen(false); setEmailTo('') }
    return r
  }

  const handleSendReminder = async () => {
    if (!emailTo.trim()) { setEmailResult('⚠️ Enter an email address'); return }
    setEmailSending(true); setEmailResult('')
    const r = await emailInvoice({ to: emailTo, inv: invoiceData, companyProfile, items: invItems, docType: docLabel, isReminder: true })
    setEmailSending(false)
    setEmailResult(r.success ? '✅ Reminder sent!' : '⚠️ ' + (r.error || 'Failed to send'))
    if (r.success) { setEmailOpen(false); setEmailTo('') }
  }

  const extract = async () => {
    setScanErr(''); setScanBusy(true)
    try {
      if (!ai.apiKey || !ai.endpoint) { setScanErr('Configure the AI endpoint and API key first (⚙️).'); setScanBusy(false); return }
      if (!scanFile) { setScanErr('Choose a scanned invoice image first.'); setScanBusy(false); return }
      const dataUrl = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(scanFile) })
      const isPdf = scanFile.type === 'application/pdf'
      const contentPart = isPdf
        ? { type: 'pdf', pdf: { base64: dataUrl.split(',')[1] || dataUrl } }
        : { type: 'image_url', image_url: { url: dataUrl } }
      const body = {
        model: ai.model || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an invoice data extractor. Return ONLY valid JSON (no markdown) with keys: invoice_no, invoice_date (YYYY-MM-DD), due_date (YYYY-MM-DD or null), supplier_name, currency, tax_percent (number), notes, line_items: [{description, quantity (number), unit_price (number)}]. If a field is missing use null or empty array.' },
          { role: 'user', content: [{ type: 'text', text: 'Extract the fields from this invoice ' + (isPdf ? 'PDF' : 'image') + '.' }, contentPart] },
        ],
        response_format: { type: 'json_object' },
      }
      const res = await fetch(ai.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + ai.apiKey }, body: JSON.stringify(body) })
      const j = await res.json()
      if (!res.ok) { setScanErr('AI error: ' + (j?.error?.message || res.statusText)); setScanBusy(false); return }
      const content = j?.choices?.[0]?.message?.content || ''
      setScanData(JSON.parse(content))
    } catch (e: any) { setScanErr('Extract failed: ' + (e?.message || e)) }
    setScanBusy(false)
  }

  const fillFromScan = () => {
    const d = scanData || {}
    const items = (d.line_items || []).map((l: any) => ({ code: '', description: l.description || '', price: Number(l.unit_price || 0), qty: Number(l.quantity || 1), discount: 0 }))
    patch({
      customer: { ...inv.customer, name: d.supplier_name || inv.customer.name },
      poRef: d.invoice_no || inv.poRef,
      date: d.invoice_date || inv.date,
      dueDate: d.due_date || inv.dueDate,
      vat: d.tax_percent != null ? Number(d.tax_percent) : inv.vat,
      notes: d.notes || inv.notes,
      items: items.length ? items : inv.items,
    })
    setScanOpen(false); setScanData(null); setScanFile(null); setScanPreview('')
    patch({ step: 2 })
  }

  const attachScan = async () => {
    setScanMsg(''); setScanErr('')
    if (!realInvId) { setScanErr('Save the invoice first, then reopen Scan to attach the source file.'); return }
    if (!scanFile) { setScanErr('No file selected.'); return }
    try {
      const path = `${realInvId}/${Date.now()}-${(scanFile.name || 'scan').replace(/\s+/g, '_')}`
      const { error } = await supabase.storage.from('attachments').upload(path, scanFile, { upsert: true, contentType: scanFile.type })
      if (error) { setScanErr('Upload failed: ' + error.message); return }
      const { data } = supabase.storage.from('attachments').getPublicUrl(path)
      const entType = inv.title.includes('A/P') || inv.title.toLowerCase().includes('purchase') ? 'ap_invoice' : 'ar_invoice'
      await supabase.from('attachments').insert({ entity_type: entType, entity_id: realInvId, file_name: scanFile.name, file_path: path, file_url: data.publicUrl, file_size: scanFile.size, mime_type: scanFile.type })
      setScanMsg('✅ Scan attached to this invoice.')
    } catch (e: any) { setScanErr('Attach failed: ' + (e?.message || e)) }
  }

  return (
    <div className="inv-wrap">
      <div className="inv-head">
        <h3>🧾 {inv.title}</h3>
        {inv.savedNo && <span className="inv-number">{inv.savedNo}</span>}
        <button className="btn-print" style={{ marginLeft: 'auto' }} onClick={() => setScanOpen(true)}>📷 Scan Invoice</button>
      </div>

      <div className="inv-steps">
        {['Customer', 'Items', 'Payment', 'Done'].map((s, i) => (
          <div key={s} className={`inv-step ${i + 1 === inv.step ? 'active' : ''} ${i + 1 < inv.step ? 'done' : ''}`}>
            <span className="step-no">{i + 1 < inv.step ? '✓' : i + 1}</span>
            <span className="step-label">{s}</span>
          </div>
        ))}
      </div>

      {inv.error && <div className="inv-error">⚠️ {inv.error}</div>}

      {inv.step === 1 && (
        <div className="inv-card">
          <h4>👤 Customer Details</h4>
          <div className="inv-grid">
            <label>Customer Name *<input value={inv.customer.name} onChange={(e) => patch({ customer: { ...inv.customer, name: e.target.value } })} placeholder="Full name / Company" /></label>
            <label>Email<input type="email" value={inv.customer.email} onChange={(e) => patch({ customer: { ...inv.customer, email: e.target.value } })} placeholder="email@company.com" /></label>
            <label>Phone<input value={inv.customer.phone} onChange={(e) => patch({ customer: { ...inv.customer, phone: e.target.value } })} placeholder="+966 ..." /></label>
            <label>VAT / TRN<input value={inv.customer.vat} onChange={(e) => patch({ customer: { ...inv.customer, vat: e.target.value } })} placeholder="VAT number" /></label>
            <label className="wide">Address<textarea value={inv.customer.address} onChange={(e) => patch({ customer: { ...inv.customer, address: e.target.value } })} rows="2" placeholder="Full address" /></label>
            <label>City<input value={inv.customer.city} onChange={(e) => patch({ customer: { ...inv.customer, city: e.target.value } })} /></label>
            <label>Country<input value={inv.customer.country} onChange={(e) => patch({ customer: { ...inv.customer, country: e.target.value } })} placeholder="Country" /></label>
          </div>
          <div className="inv-actions">
            <button className="btn-cancel" onClick={close}>✕ Cancel</button>
            <button className="btn-primary" onClick={() => {
              if (!inv.customer.name.trim()) { patch({ error: 'Customer name is required.' }); return }
              patch({ step: 2, error: '' })
            }}>Next: Items →</button>
          </div>
        </div>
      )}

      {inv.step === 2 && (
        <div className="inv-card">
          <h4>📦 Line Items</h4>
          <div className="items-table">
            <div className="items-header">
              <span className="col-code">Code / Product</span>
              <span className="col-desc">Description</span>
              <span className="col-price">Price</span>
              <span className="col-qty">Qty</span>
              <span className="col-disc">Disc%</span>
              <span className="col-total">Total</span>
              <span className="col-del"></span>
            </div>
            {inv.items.map((item, idx) => (
              <div className="item-row" key={idx}>
                <input className="col-code" value={item.code} onChange={(e) => updItem(idx, { code: e.target.value })} placeholder="ITM-0001" onBlur={(e) => lookup(idx, e.target.value)} />
                <input className="col-desc" value={item.description} onChange={(e) => updItem(idx, { description: e.target.value })} />
                <input className="col-price" type="number" min="0" step="0.01" value={item.price} onChange={(e) => updItem(idx, { price: e.target.value })} />
                <input className="col-qty" type="number" min="1" value={item.qty} onChange={(e) => updItem(idx, { qty: e.target.value })} />
                <input className="col-disc" type="number" min="0" max="100" value={item.discount} onChange={(e) => updItem(idx, { discount: e.target.value })} />
                <span className="col-total">{fmt(item.price * item.qty * (1 - (item.discount || 0) / 100), 'money')}</span>
                <button className="col-del" onClick={() => rmItem(idx)} title="Remove">✕</button>
              </div>
            ))}
            <button className="btn-add-item" onClick={addItem}>＋ Add Line</button>
            <button className="btn-add-item" onClick={() => setBarcodeOpen(true)} style={{ background: '#f5f3ff', color: '#7c3aed', border: '1px dashed #8b5cf6', marginLeft: 6 }}>📷 Scan Barcode</button>
            {barcodeOpen && <BarcodeScanner onProductFound={(p) => { addItem(); setTimeout(() => { const last = inv.items.length; updItem(last, { code: p.code || p.sku || '', description: p.name, price: p.price || 0 }) }, 50) }} onClose={() => setBarcodeOpen(false)} fmtMoney={(n) => `SAR ${n.toFixed(2)}`} />}
          </div>
          <div className="inv-totals">
            <div className="tot-row"><span>Subtotal</span><span>{fmt(inv.items.reduce((s, it) => s + it.price * it.qty * (1 - (it.discount || 0) / 100), 0), 'money')}</span></div>
            <div className="tot-row"><span>VAT ({inv.vat}%)</span><span>{fmt(inv.items.reduce((s, it) => s + it.price * it.qty * (1 - (it.discount || 0) / 100), 0) * inv.vat / 100, 'money')}</span></div>
            <div className="tot-row total"><span>Grand Total</span><span>{fmt(inv.items.reduce((s, it) => s + it.price * it.qty * (1 - (it.discount || 0) / 100), 0) * (1 + inv.vat / 100), 'money')}</span></div>
          </div>
          <div className="inv-actions">
            <button className="btn-cancel" onClick={() => patch({ step: 1 })}>← Back</button>
            <button className="btn-primary" onClick={() => {
              if (inv.items.length === 0) { patch({ error: 'Add at least one item.' }); return }
              patch({ step: 3, error: '' })
            }}>Next: Payment →</button>
          </div>
        </div>
      )}

      {inv.step === 3 && (
        <div className="inv-card">
          <h4>💳 Payment</h4>
          <div className="inv-grid">
            <label>Payment Method
              <select value={inv.payment.method} onChange={(e) => patch({ payment: { ...inv.payment, method: e.target.value } })}>
                <option>Cash</option><option>Credit Card</option><option>Bank Transfer</option><option>Cheque</option>
              </select>
            </label>
            <label>Amount Paid<input type="number" min="0" step="0.01" value={inv.payment.paid} onChange={(e) => patch({ payment: { ...inv.payment, paid: Number(e.target.value) } })} /></label>
            <label className="wide">Notes<textarea value={inv.payment.notes} onChange={(e) => patch({ payment: { ...inv.payment, notes: e.target.value } })} rows="2" /></label>
          </div>
          <div className="inv-totals">
            <div className="tot-row total"><span>Grand Total</span><span>{fmt(inv.items.reduce((s, it) => s + it.price * it.qty * (1 - (it.discount || 0) / 100), 0) * (1 + inv.vat / 100), 'money')}</span></div>
            <div className="tot-row"><span>Paid</span><span>{fmt(inv.payment.paid, 'money')}</span></div>
            <div className="tot-row"><span>Balance</span><span>{fmt(inv.items.reduce((s, it) => s + it.price * it.qty * (1 - (it.discount || 0) / 100), 0) * (1 + inv.vat / 100) - inv.payment.paid, 'money')}</span></div>
          </div>
          <div className="inv-actions">
            <button className="btn-cancel" onClick={() => patch({ step: 2 })}>← Back</button>
            <button className="btn-primary" disabled={inv.saving} onClick={save}>{inv.saving ? 'Saving…' : '💾 Save Invoice'}</button>
          </div>
        </div>
      )}

      {inv.step === 4 && (
        <div className="inv-card success">
          <div className="success-ico">✅</div>
          <h3>Invoice Saved!</h3>
          <p className="success-no">Invoice No: <b>{inv.savedNo}</b></p>
          <p className="success-sum">{inv.customer.name} · {fmt(inv.items.reduce((s, it) => s + it.price * it.qty * (1 - (it.discount || 0) / 100), 0) * (1 + inv.vat / 100), 'money')}</p>
          <ShareBar
            title={'Invoice ' + (inv.savedNo || '')}
            docNo={inv.savedNo}
            customerName={inv.customer?.name}
            customerEmail={inv.customer?.email}
            grandTotal={grandTotal}
            balance={grandTotal - amountPaid}
            text={'Invoice: ' + (inv.savedNo || '') + '\nCustomer: ' + (inv.customer?.name || '') + '\nDate: ' + (inv.date || '') + '\nTotal: ' + fmt(grandTotal, 'money') + '\nItems: ' + inv.items.length}
            onSendEmail={handleSendEmail}
          />
          <div className="inv-actions center">
            <button className="btn-print" onClick={() => printWithTemplate(docLabel, { ...companyProfile, invoice_no: inv.savedNo, invoice_date: inv.date || '', due_date: inv.dueDate || '', po_ref: inv.poRef || '', customer_name: inv.customer?.name, customer_vat: inv.customer?.vat, subtotal: invoiceData.subtotal, vat_percent: inv.vat, vat_amount: vatAmt, grand_total: grandTotal, amount_paid: amountPaid, balance: grandTotal - amountPaid, notes: inv.notes || '', items: invItems, company_name: companyProfile?.name, company_vat: companyProfile?.vat_no, company_logo: companyProfile?.logo_url })}>🖨️ Print</button>
            <button className="btn-print" onClick={handleDownloadPDF}>⬇️ Download PDF</button>
            <button className="btn-print" onClick={() => { setEmailTo(inv.customer?.email || ''); setEmailOpen(true); setEmailResult(''); }}>📧 Email Invoice</button>
            <button className="btn-primary" onClick={openNew}>＋ New Invoice</button>
            <button className="btn-cancel" onClick={close}>✕ Close</button>
          </div>
        </div>
      )}
      <Attachments entityType={isAP ? 'ap_invoice' : 'ar_invoice'} entityId={realInvId} label="Invoice Attachments" />

      {emailOpen && (
        <div className="cheque-overlay">
          <div style={{ background: '#fff', color: '#111', width: 440, maxWidth: '100%', padding: 24, borderRadius: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>📧 Email Invoice {inv.savedNo}</h3>
              <button className="doc-btn sm" onClick={() => setEmailOpen(false)}>✕</button>
            </div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Send To</label>
            <input type="email" value={emailTo} onChange={(e) => setEmailTo(e.target.value)} placeholder="customer@email.com" style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, marginBottom: 12, boxSizing: 'border-box' }} />
            <div style={{ background: '#f9fafb', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 11, color: '#6b7280', lineHeight: 1.5 }}>
              <b>{inv.customer?.name}</b> · {inv.savedNo}<br/>
              Total: <b style={{ color: '#6a11cb' }}>SAR {grandTotal.toFixed(2)}</b> · Balance: <b style={{ color: '#dc2626' }}>SAR {(grandTotal - amountPaid).toFixed(2)}</b>
            </div>
            {emailResult && <div style={{ padding: 8, borderRadius: 6, marginBottom: 12, fontSize: 12, background: emailResult.startsWith('✅') ? '#dcfce7' : '#fef3c7', color: emailResult.startsWith('✅') ? '#166534' : '#92400e' }}>{emailResult}</div>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn-cancel" onClick={() => setEmailOpen(false)}>Cancel</button>
              {invoiceData.balance > 0 && <button className="btn-print" disabled={emailSending} onClick={handleSendReminder}>⏰ Send Reminder</button>}
              <button className="btn-primary" disabled={emailSending} onClick={handleSendEmail}>{emailSending ? 'Sending…' : '📧 Send Invoice'}</button>
            </div>
          </div>
        </div>
      )}

      {scanOpen && (
        <div className="cheque-overlay">
          <div style={{ background: '#fff', color: '#111', width: 560, maxWidth: '100%', padding: 20, borderRadius: 6 }} onPaste={(e) => {
            const item = Array.from((e as any).clipboardData?.items || []).find((it: any) => (it as any).type.startsWith('image/') || (it as any).type === 'application/pdf')
            if (item) { const f = (item as any).getAsFile(); if (f) { setScanFile(f); setScanPreview(''); if (f.type.startsWith('image/')) { const r = new FileReader(); r.onload = () => setScanPreview(r.result as string); r.readAsDataURL(f) } } }
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h3 style={{ margin: 0 }}>📷 Scan Invoice to Entry</h3>
              <div>
                <button className="doc-btn sm" onClick={() => setShowAi(!showAi)} title="AI settings">⚙️</button>
                <button className="doc-btn sm" onClick={() => setScanOpen(false)}>✕</button>
              </div>
            </div>
            {showAi && (
              <div style={{ border: '1px solid #ddd', padding: 10, marginBottom: 10, borderRadius: 4 }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>AI / OCR Settings (stored in this browser)</div>
                <label style={{ display: 'block', marginBottom: 6 }}>Endpoint (OpenAI-compatible vision)
                  <input style={{ width: '100%' }} value={ai.endpoint || ''} onChange={(e) => setAi({ ...ai, endpoint: e.target.value })} placeholder="https://api.openai.com/v1/chat/completions" />
                </label>
                <label style={{ display: 'block', marginBottom: 6 }}>API Key
                  <input style={{ width: '100%' }} type="password" value={ai.apiKey || ''} onChange={(e) => setAi({ ...ai, apiKey: e.target.value })} placeholder="sk-..." />
                </label>
                <label style={{ display: 'block', marginBottom: 6 }}>Model
                  <input style={{ width: '100%' }} value={ai.model || ''} onChange={(e) => setAi({ ...ai, model: e.target.value })} placeholder="gpt-4o-mini" />
                </label>
                <button className="doc-btn primary" onClick={saveAi}>Save Settings</button>
              </div>
            )}
            <input type="file" accept="image/*,application/pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setScanFile(f); setScanPreview(''); if (f.type.startsWith('image/')) { const r = new FileReader(); r.onload = () => setScanPreview(r.result as string); r.readAsDataURL(f) } } }} />
            <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Image or PDF. You can also paste from clipboard (Ctrl/Cmd+V).</div>
            {scanPreview && <img src={scanPreview} alt="scan" style={{ maxWidth: '100%', marginTop: 8, border: '1px solid #ccc' }} />}
            {scanFile && !scanPreview && <div style={{ marginTop: 8, fontStyle: 'italic' }}>📄 {scanFile.name}</div>}
            {scanErr && <div className="inv-error" style={{ marginTop: 8 }}>⚠️ {scanErr}</div>}
            {scanMsg && <div style={{ marginTop: 8, color: '#15803d' }}>{scanMsg}</div>}
            <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn-primary" disabled={scanBusy} onClick={extract}>{scanBusy ? 'Extracting…' : '🔍 Extract'}</button>
              <button className="doc-btn" disabled={!scanFile || !realInvId} onClick={attachScan} title={realInvId ? 'Store the scanned source with this invoice' : 'Save the invoice first'}>📎 Attach scan to invoice</button>
            </div>
            {scanData && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Extracted (review before filling):</div>
                <pre style={{ background: '#f5f5f5', padding: 8, borderRadius: 4, maxHeight: 200, overflow: 'auto', fontSize: 12 }}>{JSON.stringify(scanData, null, 2)}</pre>
                <button className="btn-primary" style={{ marginTop: 8 }} onClick={fillFromScan}>✅ Fill Entry Form</button>
              </div>
            )}
            <p style={{ fontSize: 11, color: '#666', marginTop: 10 }}>Requires an OpenAI-compatible vision model (e.g. gpt-4o / gpt-4o-mini) with an API key and internet access from your browser. The scanned file is sent to the configured endpoint. PDF input needs a model that supports PDF (e.g. gpt-4o).</p>
          </div>
        </div>
      )}
    </div>
  )
}

const ACCOUNT_OPTIONS = {
  customer: ['1100 - Accounts Receivable', '1101 - AR - Trade', '1102 - AR - Services', '1103 - AR - Projects'],
  supplier: ['2100 - Accounts Payable', '2101 - AP - Trade', '2102 - AP - Services', '2103 - AP - Projects'],
}

const PartnerForm = ({ form, patch, save, close }) => {
  const d = form.data
  const kind = form.kind || 'customer'
  const kindLabel = kind === 'supplier' ? 'Supplier' : 'Customer'
  const set = (k, v) => patch({ data: { ...d, [k]: v } })
  const isProspect = d.status === 'Prospect'
  const firstRef = useRef(null)
  const wrapRef = useRef(null)

  useEffect(() => { if (firstRef.current) firstRef.current.focus() }, [])

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      const tag = e.target.tagName
      if (tag === 'TEXTAREA') return
      e.preventDefault()
      const inputs = Array.from(wrapRef.current.querySelectorAll('input, select, textarea'))
      const idx = inputs.indexOf(e.target)
      if (idx < inputs.length - 1) inputs[idx + 1].focus()
      else { const btn = wrapRef.current.querySelector('.btn-primary'); if (btn) btn.click() }
    }
  }

  return (
    <div className={`cust-wrap kind-${kind}`} onKeyDown={onKeyDown} ref={wrapRef}>
      {form.savedCode ? (
        <div className="inv-card success">
          <div className="success-ico">✅</div>
          <h3>{kindLabel} Saved</h3>
          <p className="success-no">Code: <b>{form.savedCode}</b></p>
          <p className="success-sum">Ledger Account: <b>{d.account_code}</b> · Status: <b>{d.status}</b></p>
          <Attachments entityType={kind} entityId={form.recId || null} />
          <ShareBar title={kindLabel + ' ' + (form.savedCode || '')} text={kindLabel + ': ' + (form.savedCode || '') + '\nLedger Account: ' + (d.account_code || '') + '\nStatus: ' + (d.status || '')} />
          <div className="inv-actions center">
            <button className="btn-primary" onClick={close}>Close Tab</button>
          </div>
        </div>
      ) : (
        <>
          <div className="cust-head">
            <h3>{kind === 'supplier' ? '🏭' : '👤'} {form.recId ? `Edit ${kindLabel}` : `New ${kindLabel}`}</h3>
            {d.code && <div className="cust-head-right"><span className="cust-code">{d.code}</span><span className={`badge ${d.status === 'Active' ? 'b-green' : d.status === 'Prospect' ? 'b-amber' : 'b-gray'}`}>{d.status}</span></div>}
          </div>

          {form.error && <div className="inv-error">⚠️ {form.error}</div>}

          <div className="cust-section">
            <h4>🗂️ Basic Information</h4>
            <div className="inv-grid">
              <label>{kindLabel} Code<input ref={firstRef} value={d.code} onChange={(e) => set('code', e.target.value)} placeholder={kind === 'supplier' ? 'SUP-xxxx if blank' : 'CUST-xxxx if blank'} /></label>
              <label>{kindLabel} Name *<input value={d.name} onChange={(e) => set('name', e.target.value)} placeholder="Full name / Company name" /></label>
              <label>Type
                <select value={d.cust_type} onChange={(e) => set('cust_type', e.target.value)}>
                  <option>Company</option><option>Individual</option><option>Government</option><option>NGO</option>
                </select>
              </label>
              <label>Category
                <input list={`cat-${form.id}`} value={d.category} onChange={(e) => set('category', e.target.value)} placeholder="VIP, Regular…" />
                <datalist id={`cat-${form.id}`}>
                  <option value="VIP" /><option value="Regular" /><option value="Wholesale" /><option value="Retail" />
                </datalist>
              </label>
              <label>Email<input type="email" value={d.email} onChange={(e) => set('email', e.target.value)} placeholder="name@company.com" /></label>
              <label>Phone<input value={d.phone} onChange={(e) => set('phone', e.target.value)} /></label>
              <label>Mobile<input value={d.mobile} onChange={(e) => set('mobile', e.target.value)} placeholder="+966 ..." /></label>
              <label>Website<input value={d.website} onChange={(e) => set('website', e.target.value)} placeholder="www.company.com" /></label>
            </div>
          </div>

          <div className="cust-section">
            <h4>📍 Contact & Address</h4>
            <div className="inv-grid">
              <label>Address<textarea value={d.address} onChange={(e) => set('address', e.target.value)} rows="2" /></label>
              <label>City<input value={d.city} onChange={(e) => set('city', e.target.value)} /></label>
              <label>Region / State<input value={d.region} onChange={(e) => set('region', e.target.value)} /></label>
              <label>Postal Code<input value={d.postal_code} onChange={(e) => set('postal_code', e.target.value)} /></label>
              <label>Country
                <select value={d.country} onChange={(e) => set('country', e.target.value)}>
                  <option>Saudi Arabia</option><option>UAE</option><option>Kuwait</option><option>Bahrain</option><option>Oman</option><option>Qatar</option><option>Egypt</option><option>India</option><option>Pakistan</option><option>Turkey</option><option>Jordan</option><option>Lebanon</option><option>Iraq</option><option>Other</option>
                </select>
              </label>
              <label>Status
                <select value={d.status} onChange={(e) => set('status', e.target.value)}>
                  <option>Active</option><option>Prospect</option><option>Inactive</option>
                </select>
              </label>
            </div>
          </div>

          <div className="cust-section">
            <h4>🏦 Financial & Accounts (linked to Ledger)</h4>
            <div className="inv-grid">
              <label>VAT / TRN No.<input value={d.vat_no} onChange={(e) => set('vat_no', e.target.value)} placeholder="VAT registration number" /></label>
              <label>Linked A/C (Ledger)
                <input list={`acct-${form.id}`} value={d.account_code} onChange={(e) => set('account_code', e.target.value)} placeholder={kind === 'supplier' ? 'auto: AP-<code>' : 'auto: AR-<code>'} />
                <datalist id={`acct-${form.id}`}>
                  {ACCOUNT_OPTIONS[kind].map((a) => (<option key={a} value={a} />))}
                </datalist>
              </label>
              <label>Currency
                <select value={d.currency} onChange={(e) => set('currency', e.target.value)}>
                  <option>SAR</option><option>USD</option><option>AED</option><option>EUR</option>
                </select>
              </label>
              <label>Payment Terms
                <select value={d.payment_terms} onChange={(e) => set('payment_terms', e.target.value)}>
                  <option>Cash</option><option>Net 15</option><option>Net 30</option><option>Net 60</option>
                </select>
              </label>
              <label>Credit Days<input type="number" min="0" value={d.credit_days} onChange={(e) => set('credit_days', e.target.value)} /></label>
              <label>Credit Limit<input type="number" min="0" step="0.01" value={d.credit_limit} onChange={(e) => set('credit_limit', e.target.value)} /></label>
              <label>Opening Balance<input type="number" step="0.01" value={d.opening_balance} onChange={(e) => set('opening_balance', e.target.value)} /></label>
            </div>
          </div>

          {kind === 'customer' ? (
            <div className="cust-section">
              <h4>🚚 Sales & Shipping</h4>
              <div className="inv-grid">
                <label>Ship-to Address<input className="wide-input" value={d.ship_address} onChange={(e) => set('ship_address', e.target.value)} placeholder="delivery location if different" /></label>
                <label>Price List<input value={d.price_list} onChange={(e) => set('price_list', e.target.value)} placeholder="Standard / VIP…" /></label>
                <label>Sales Person<input value={d.sales_person} onChange={(e) => set('sales_person', e.target.value)} /></label>
              </div>
            </div>
          ) : (
            <div className="cust-section">
              <h4>📦 Purchase & Payment Details</h4>
              <div className="inv-grid">
                <label>Supplier Type
                  <select value={d.sup_type} onChange={(e) => set('sup_type', e.target.value)}>
                    <option>Manufacturer</option><option>Distributor</option><option>Trader</option><option>Service Provider</option>
                  </select>
                </label>
                <label>Contact Person<input value={d.contact_person} onChange={(e) => set('contact_person', e.target.value)} placeholder="sales rep name" /></label>
                <label>Lead Time (days)<input type="number" min="0" value={d.lead_time_days} onChange={(e) => set('lead_time_days', e.target.value)} /></label>
                <label>Min. Order Qty<input type="number" min="1" value={d.min_order_qty} onChange={(e) => set('min_order_qty', e.target.value)} /></label>
                <label>Bank Name<input value={d.bank_name} onChange={(e) => set('bank_name', e.target.value)} placeholder="supplier's bank" /></label>
                <label>IBAN / Account No.<input value={d.bank_iban} onChange={(e) => set('bank_iban', e.target.value)} placeholder="SA00 0000 0000 0000" /></label>
                <label>Preferred Payment
                  <select value={d.pref_payment} onChange={(e) => set('pref_payment', e.target.value)}>
                    <option>Bank Transfer</option><option>Cash</option><option>Cheque</option><option>LC (Letter of Credit)</option>
                  </select>
                </label>
              </div>
            </div>
          )}

          <div className="cust-section">
            <h4>📝 Other</h4>
            <div className="inv-grid">
              <label className="wide">Notes<textarea value={d.notes} onChange={(e) => set('notes', e.target.value)} rows="2" placeholder="remarks…" /></label>
            </div>
          </div>

          <div className="inv-actions">
            {isProspect && (
              <button className="btn-convert" disabled={form.saving} onClick={() => { patch({ data: { ...d, status: 'Active' } }); setTimeout(save, 50) }}>
                🔄 Save & Convert to {kindLabel}
              </button>
            )}
            <button className="btn-primary" disabled={form.saving} onClick={save}>
              {form.saving ? 'Saving…' : `💾 Save ${kindLabel}`}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

const ACC_TYPE_COLORS = { Asset: '#3b82f6', Liability: '#ef4444', Equity: '#8b5cf6', Income: '#10b981', Expense: '#f59e0b' }
const ACC_TYPE_ICONS = { Asset: '📊', Liability: '📉', Equity: '🏛️', Income: '💰', Expense: '💸' }

const ChartOfAccounts = ({ accounts, expanded, toggleExpand, onEdit, onAddChild, onDelete, search, setSearch, typeFilter, setTypeFilter, onSave, form, setForm, closeForm }) => {
  const firstRef = useRef(null)
  const wrapRef = useRef(null)

  useEffect(() => { if (firstRef.current) firstRef.current.focus() }, [form])

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      const tag = e.target.tagName
      if (tag === 'TEXTAREA') return
      e.preventDefault()
      const inputs = Array.from(wrapRef.current.querySelectorAll('input, select, textarea'))
      const idx = inputs.indexOf(e.target)
      if (idx < inputs.length - 1) inputs[idx + 1].focus()
      else { const btn = wrapRef.current.querySelector('.btn-primary'); if (btn) btn.click() }
    }
  }

  const roots = accounts.filter((a) => !a.parent_id)
  const childMap = {}
  accounts.forEach((a) => { if (a.parent_id) { if (!childMap[a.parent_id]) childMap[a.parent_id] = []; childMap[a.parent_id].push(a) } })

  const totalByType = {}
  accounts.filter((a) => !a.is_group).forEach((a) => { totalByType[a.type] = (totalByType[a.type] || 0) + Number(a.current_balance || 0) })

  const filtered = (() => {
    let list = accounts
    if (typeFilter !== 'All') list = list.filter((a) => a.type === typeFilter)
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      const matchIds = new Set()
      list.forEach((a) => { if (a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)) { matchIds.add(a.id); let p = a.parent_id; while (p) { matchIds.add(p); const pa = accounts.find((x) => x.id === p); p = pa?.parent_id } } })
      list = list.filter((a) => matchIds.has(a.id))
    }
    return list
  })()

  const renderNode = (account, depth = 0) => {
    const children = childMap[account.id] || []
    const isExpanded = expanded.has(account.id)
    const hasChildren = children.length > 0
    const color = ACC_TYPE_COLORS[account.type] || '#64748b'
    return (
      <React.Fragment key={account.id}>
        <div className={`coa-row ${account.is_group ? 'coa-group' : 'coa-leaf'}`} style={{ paddingLeft: 12 + depth * 24 }}>
          <span className="coa-expand" style={{ width: 24, cursor: hasChildren ? 'pointer' : 'default', opacity: hasChildren ? 1 : 0.3 }} onClick={() => hasChildren && toggleExpand(account.id)}>
            {hasChildren ? (isExpanded ? '▾' : '▸') : '•'}
          </span>
          <span className="coa-type-dot" style={{ background: color }} />
          <span className="coa-code">{account.code}</span>
          <span className={`coa-name ${account.is_group ? 'coa-name-group' : ''}`}>{account.name}</span>
          {account.is_group && <span className="coa-badge-group">GROUP</span>}
          <span className="coa-balance" style={{ color: account.current_balance > 0 ? '#10b981' : account.current_balance < 0 ? '#ef4444' : '#94a3b8' }}>
            {account.is_group ? '' : `${account.currency || 'AED'} ${Number(account.current_balance || 0).toLocaleString('en', { minimumFractionDigits: 2 })}`}
          </span>
          <span className={`coa-status ${account.status === 'Active' ? 'st-active' : 'st-inactive'}`}>{account.status}</span>
          <div className="coa-actions">
            <button className="coa-act coa-edit" title="Edit" onClick={() => onEdit(account)}>✏️</button>
            {account.is_group && <button className="coa-act coa-add" title="Add sub-account" onClick={() => onAddChild(account)}>＋</button>}
            {!account.is_group && <button className="coa-act coa-del" title="Delete" onClick={() => onDelete(account)}>🗑</button>}
          </div>
        </div>
        {isExpanded && children.sort((a, b) => a.code.localeCompare(b.code)).map((child) => renderNode(child, depth + 1))}
      </React.Fragment>
    )
  }

  return (
    <div className="coa-wrap">
      {form ? (
        <div className="coa-form-wrap" onKeyDown={onKeyDown} ref={wrapRef}>
          <div className="coa-form-head">
            <h3>{form.recId ? '✏️ Edit Account' : '＋ New Account'}</h3>
            {form.parentName && <span className="coa-form-parent">under: <b>{form.parentName}</b></span>}
          </div>
          {form.error && <div className="inv-error">⚠️ {form.error}</div>}
          <div className="inv-grid coa-form-grid">
            <label>Account Code *
              <input ref={firstRef} value={form.data.code} onChange={(e) => setForm({ ...form, data: { ...form.data, code: e.target.value } })} placeholder="e.g. 1110" />
            </label>
            <label>Account Name *
              <input value={form.data.name} onChange={(e) => setForm({ ...form, data: { ...form.data, name: e.target.value } })} placeholder="Account name" />
            </label>
            <label>Account Type
              <select value={form.data.type} onChange={(e) => setForm({ ...form, data: { ...form.data, type: e.target.value } })} disabled={!!form.parentId}>
                <option>Asset</option><option>Liability</option><option>Equity</option><option>Income</option><option>Expense</option>
              </select>
            </label>
            <label>Parent Account
              <select value={form.data.parent_id || ''} onChange={(e) => setForm({ ...form, data: { ...form.data, parent_id: e.target.value || null } })}>
                <option value="">— None (Top Level) —</option>
                {accounts.filter((a) => a.is_group && a.id !== form.recId).sort((a, b) => a.code.localeCompare(b.code)).map((a) => (
                  <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                ))}
              </select>
            </label>
            <label>Opening Balance
              <input type="number" step="0.01" value={form.data.opening_balance} onChange={(e) => setForm({ ...form, data: { ...form.data, opening_balance: e.target.value } })} />
            </label>
            <label>Currency
              <select value={form.data.currency} onChange={async (e) => {
                const cur = e.target.value
                let rate = 1
                if (cur !== companyProfile?.base_currency && cur !== 'AED') {
                  try {
                    const { data } = await supabase.from('exchange_rates')
                      .select('rate').eq('from_currency', cur).eq('to_currency', companyProfile?.base_currency || 'AED')
                      .eq('is_active', true).order('rate_date', { ascending: false }).limit(1)
                    if (data?.length) rate = Number(data[0].rate)
                  } catch (_) {}
                }
                setForm({ ...form, data: { ...form.data, currency: cur, exchange_rate: rate } })
              }}>
                <option>AED</option><option>USD</option><option>SAR</option><option>EUR</option><option>GBP</option><option>INR</option><option>PKR</option>
              </select>
            </label>
            {form.data.currency !== 'AED' && form.data.currency !== (companyProfile?.base_currency || 'AED') && (
              <label>Exchange Rate
                <input type="number" step="0.0001" min="0" value={form.data.exchange_rate} onChange={(e) => setForm({ ...form, data: { ...form.data, exchange_rate: Number(e.target.value) } })} />
              </label>
            )}
            {form.data.currency !== 'AED' && form.data.currency !== (companyProfile?.base_currency || 'AED') && form.data.exchange_rate > 0 && (
              <div style={{ gridColumn: '1 / -1', background: '#eff6ff', borderRadius: 6, padding: '6px 10px', fontSize: 11, color: '#1e40af' }}>
                💱 {form.data.amount || 0} {form.data.currency} = <b>{((Number(form.data.amount) || 0) * form.data.exchange_rate).toFixed(2)} {companyProfile?.base_currency || 'AED'}</b> at rate {form.data.exchange_rate}
              </div>
            )}
            <label>Status
              <select value={form.data.status} onChange={(e) => setForm({ ...form, data: { ...form.data, status: e.target.value } })}>
                <option>Inactive</option><option>Active</option>
              </select>
            </label>
            <label className="wide">Notes
              <textarea value={form.data.notes} onChange={(e) => setForm({ ...form, data: { ...form.data, notes: e.target.value } })} rows="2" placeholder="Optional notes…" />
            </label>
          </div>
          <div className="inv-actions">
            <button className="btn-cancel" onClick={closeForm}>✕ Cancel</button>
            <button className="btn-primary" disabled={form.saving} onClick={() => onSave(form)}>
              {form.saving ? 'Saving…' : '💾 Save Account'}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="coa-head">
            <h3>📒 Chart of Accounts</h3>
            <div className="coa-head-right">
              <input className="coa-search" placeholder="🔍 Search code or name..." value={search} onChange={(e) => setSearch(e.target.value)} />
              <button className="btn-add" onClick={() => onAddChild(null)}>＋ New Account</button>
            </div>
          </div>
          <div className="coa-type-tabs">
            {['All', 'Asset', 'Liability', 'Equity', 'Income', 'Expense'].map((t) => (
              <button key={t} className={`coa-type-tab ${typeFilter === t ? 'active' : ''}`} style={typeFilter === t ? { borderColor: ACC_TYPE_COLORS[t] || '#6366f1', color: ACC_TYPE_COLORS[t] || '#6366f1' } : {}} onClick={() => setTypeFilter(t)}>
                {t !== 'All' && <span className="coa-tab-dot" style={{ background: ACC_TYPE_COLORS[t] }} />}
                {t}
                {t !== 'All' && <span className="coa-tab-count">{accounts.filter((a) => a.type === t && !a.is_group).length}</span>}
              </button>
            ))}
          </div>
          <div className="coa-summary">
            {Object.entries(ACC_TYPE_COLORS).map(([type, color]) => (
              <div key={type} className="coa-sum-card" style={{ borderLeftColor: color }}>
                <span className="coa-sum-type">{ACC_TYPE_ICONS[type]} {type}</span>
                <span className="coa-sum-value" style={{ color }}>AED {(totalByType[type] || 0).toLocaleString('en', { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
          </div>
          <div className="coa-tree">
            <div className="coa-tree-header">
              <span style={{ width: 24 }} />
              <span className="coa-th-type" />
              <span className="coa-th-code">CODE</span>
              <span className="coa-th-name">NAME</span>
              <span className="coa-th-bal">BALANCE</span>
              <span className="coa-th-status">STATUS</span>
              <span className="coa-th-act" />
            </div>
            {filtered.length === 0 && <div className="coa-empty">No accounts found</div>}
            {filtered.sort((a, b) => a.code.localeCompare(b.code)).map((a) => renderNode(a))}
          </div>
        </>
      )}
    </div>
  )
}

const JournalEntry = ({ entries, accounts, form, setForm, onSave, onPost, onDelete, onVoid, onCopy, onPrint, search, setSearch, statusFilter, setStatusFilter, loadEntries, recurringTemplates, onLoadRecurring, onSaveRecurring, onDeleteRecurring, onPauseRecurring }) => {
  const firstRef = useRef(null)
  const wrapRef = useRef(null)

  useEffect(() => { if (firstRef.current) firstRef.current.focus() }, [form])

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      const tag = e.target.tagName
      if (tag === 'TEXTAREA') return
      e.preventDefault()
      const inputs = Array.from(wrapRef.current.querySelectorAll('input, select, textarea'))
      const idx = inputs.indexOf(e.target)
      if (idx < inputs.length - 1) inputs[idx + 1].focus()
      else { const btn = wrapRef.current.querySelector('.btn-primary'); if (btn) btn.click() }
    }
  }

  const leafAccounts = accounts.filter((a) => !a.is_group && a.status === 'Active').sort((a, b) => a.code.localeCompare(b.code))
  const [view, setView] = useState('entries')
  const [recurringForm, setRecurringForm] = useState(null)

  const totalDebit = form ? form.data.lines.reduce((s, l) => s + Number(l.debit || 0), 0) : 0
  const totalCredit = form ? form.data.lines.reduce((s, l) => s + Number(l.credit || 0), 0) : 0
  const diff = totalDebit - totalCredit
  const isBalanced = Math.abs(diff) < 0.001 && totalDebit > 0

  if (form) {
    return (
      <div className="je-wrap" onKeyDown={onKeyDown} ref={wrapRef}>
        <div className="je-form-head">
          <h3>✏️ {form.recId ? 'Edit Journal Entry' : 'New Journal Entry'}</h3>
          {form.data.entry_no && <span className="je-form-no">{form.data.entry_no}</span>}
        </div>
        <Attachments entityType="journal_entry" entityId={form.recId || null} />
        {form.error && <div className="inv-error">⚠️ {form.error}</div>}

        <div className="je-meta-grid">
          <label>Date
            <input ref={firstRef} type="date" value={form.data.entry_date} onChange={(e) => setForm({ ...form, data: { ...form.data, entry_date: e.target.value } })} />
          </label>
          <label>Reference
            <input value={form.data.reference} onChange={(e) => setForm({ ...form, data: { ...form.data, reference: e.target.value } })} placeholder="e.g. INV-001, PO-045" />
          </label>
          <label className="wide">Narration / Memo
            <textarea value={form.data.narration} onChange={(e) => setForm({ ...form, data: { ...form.data, narration: e.target.value } })} rows="2" placeholder="Description of this journal entry…" />
          </label>
        </div>

        <div className="je-lines-wrap">
          <div className="je-lines-head">
            <span className="jl-no">#</span>
            <span className="jl-acct">Account</span>
            <span className="jl-desc">Description</span>
            <span className="jl-dr">Debit</span>
            <span className="jl-cr">Credit</span>
            <span className="jl-del"></span>
          </div>
          {form.data.lines.map((line, idx) => (
            <div className="je-line-row" key={idx}>
              <span className="jl-no">{idx + 1}</span>
              <select className="jl-acct" value={line.account_id} onChange={(e) => {
                const newLines = [...form.data.lines]
                newLines[idx] = { ...newLines[idx], account_id: e.target.value }
                setForm({ ...form, data: { ...form.data, lines: newLines } })
              }}>
                <option value="">— Select Account —</option>
                {leafAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                ))}
              </select>
              <input className="jl-desc" value={line.description} onChange={(e) => {
                const newLines = [...form.data.lines]
                newLines[idx] = { ...newLines[idx], description: e.target.value }
                setForm({ ...form, data: { ...form.data, lines: newLines } })
              }} placeholder="Line description" />
              <input className="jl-dr" type="number" min="0" step="0.01" value={line.debit} onChange={(e) => {
                const newLines = [...form.data.lines]
                newLines[idx] = { ...newLines[idx], debit: e.target.value, credit: Number(e.target.value) > 0 ? '0' : newLines[idx].credit }
                setForm({ ...form, data: { ...form.data, lines: newLines } })
              }} />
              <input className="jl-cr" type="number" min="0" step="0.01" value={line.credit} onChange={(e) => {
                const newLines = [...form.data.lines]
                newLines[idx] = { ...newLines[idx], credit: e.target.value, debit: Number(e.target.value) > 0 ? '0' : newLines[idx].debit }
                setForm({ ...form, data: { ...form.data, lines: newLines } })
              }} />
              <button className="jl-del" onClick={() => {
                const newLines = form.data.lines.filter((_, i) => i !== idx)
                setForm({ ...form, data: { ...form.data, lines: newLines } })
              }} title="Remove line">✕</button>
            </div>
          ))}
          <button className="je-add-line" onClick={() => {
            const newLines = [...form.data.lines, { account_id: '', description: '', debit: 0, credit: 0 }]
            setForm({ ...form, data: { ...form.data, lines: newLines } })
          }}>＋ Add Line</button>
        </div>

        <div className={`je-balance-bar ${isBalanced ? 'je-balanced' : diff > 0 ? 'je-over-dr' : 'je-over-cr'}`}>
          <span>Total Debit: <b>{fmtMoney(totalDebit)}</b></span>
          <span>Total Credit: <b>{fmtMoney(totalCredit)}</b></span>
          <span className="je-diff">
            {isBalanced ? '✓ Balanced' : diff > 0 ? `Over Debit by ${fmtMoney(diff)}` : `Over Credit by ${fmtMoney(Math.abs(diff))}`}
          </span>
        </div>

        <div className="inv-actions">
          <button className="btn-cancel" onClick={() => setForm(null)}>✕ Cancel</button>
          <button className="btn-primary" disabled={form.saving || !isBalanced} onClick={() => onSave(form)}>
            {form.saving ? 'Saving…' : '💾 Save Draft'}
          </button>
        </div>
      </div>
    )
  }

  const filtered = (() => {
    let list = entries
    if (statusFilter !== 'All') list = list.filter((e) => e.status === statusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((e) => e.entry_no?.toLowerCase().includes(q) || e.reference?.toLowerCase().includes(q) || e.narration?.toLowerCase().includes(q))
    }
    return list
  })()

  return (
    <div className="je-list-wrap">
      <div className="coa-head">
        <h3>📝 Journal Entries</h3>
        <div className="coa-head-right">
          <input className="coa-search" placeholder="🔍 Search entry no, reference..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="btn-add" onClick={() => setForm({
            id: `je-${Date.now()}`, recId: null,
            data: { entry_no: '', entry_date: new Date().toISOString().slice(0, 10), reference: '', narration: '', currency: 'AED', status: 'Draft', lines: [{ account_id: '', description: '', debit: 0, credit: 0 }, { account_id: '', description: '', debit: 0, credit: 0 }] },
            saving: false, error: ''
          })}>＋ New Entry</button>
        </div>
      </div>
      <div className="je-status-tabs">
        {['All', 'Draft', 'Posted', 'Void'].map((s) => (
          <button key={s} className={`coa-type-tab ${statusFilter === s && view === 'entries' ? 'active' : ''}`} onClick={() => { setStatusFilter(s); setView('entries') }}>
            {s} <span className="coa-tab-count">{entries.filter((e) => s === 'All' || e.status === s).length}</span>
          </button>
        ))}
        <button className={`coa-type-tab ${view === 'recurring' ? 'active' : ''}`} style={view === 'recurring' ? { borderColor: '#8b5cf6', color: '#8b5cf6' } : {}} onClick={() => { setView('recurring'); onLoadRecurring() }}>
          🔁 Recurring <span className="coa-tab-count">{recurringTemplates.length}</span>
        </button>
      </div>

      {view === 'entries' && (
        <ShareBar title="Journal Entries" columns={[{ key: 'reference', label: 'Reference' }, { key: 'date', label: 'Date' }, { key: 'narration', label: 'Narration' }, { key: 'debit', label: 'Debit', numeric: true }, { key: 'credit', label: 'Credit', numeric: true }, { key: 'status', label: 'Status' }]} rows={entries.map((e) => ({ reference: e.reference || '', date: (e.entry_date || e.created_at || '').slice(0, 10), narration: e.narration || '', debit: fmtMoney(e.total_debit || 0), credit: fmtMoney(e.total_credit || 0), status: e.status || '' }))} />
      )}

      {view === 'recurring' && (
        <div className="je-recurring-wrap">
          {recurringForm ? (
            <div className="je-recurring-form">
              <div className="je-form-head">
                <h3>{recurringForm.recId ? '✏️ Edit Recurring Template' : '🔁 New Recurring Template'}</h3>
              </div>
              {recurringForm.error && <div className="inv-error">⚠️ {recurringForm.error}</div>}
              <div className="inv-grid coa-form-grid">
                <label>Template Name *
                  <input value={recurringForm.data.template_name} onChange={(e) => setRecurringForm({ ...recurringForm, data: { ...recurringForm.data, template_name: e.target.value } })} placeholder="e.g. Monthly Depreciation" />
                </label>
                <label>Reference
                  <input value={recurringForm.data.reference} onChange={(e) => setRecurringForm({ ...recurringForm, data: { ...recurringForm.data, reference: e.target.value } })} placeholder="e.g. DEP-001" />
                </label>
                <label>Frequency
                  <select value={recurringForm.data.frequency} onChange={(e) => setRecurringForm({ ...recurringForm, data: { ...recurringForm.data, frequency: e.target.value } })}>
                    <option>Monthly</option><option>Quarterly</option><option>Semi-Annual</option><option>Annual</option><option>Weekly</option><option>Bi-Weekly</option>
                  </select>
                </label>
                <label>Start Date
                  <input type="date" value={recurringForm.data.start_date} onChange={(e) => setRecurringForm({ ...recurringForm, data: { ...recurringForm.data, start_date: e.target.value } })} />
                </label>
                <label>End Date
                  <input type="date" value={recurringForm.data.end_date || ''} onChange={(e) => setRecurringForm({ ...recurringForm, data: { ...recurringForm.data, end_date: e.target.value || null } })} />
                </label>
                <label>Narration
                  <textarea value={recurringForm.data.narration} onChange={(e) => setRecurringForm({ ...recurringForm, data: { ...recurringForm.data, narration: e.target.value } })} rows="2" placeholder="Description…" />
                </label>
              </div>

              <div className="je-lines-wrap">
                <div className="je-lines-head">
                  <span className="jl-no">#</span>
                  <span className="jl-acct">Account</span>
                  <span className="jl-desc">Description</span>
                  <span className="jl-dr">Debit</span>
                  <span className="jl-cr">Credit</span>
                  <span className="jl-del"></span>
                </div>
                {recurringForm.data.lines.map((line, idx) => (
                  <div className="je-line-row" key={idx}>
                    <span className="jl-no">{idx + 1}</span>
                    <select className="jl-acct" value={line.account_id} onChange={(e) => {
                      const newLines = [...recurringForm.data.lines]; newLines[idx] = { ...newLines[idx], account_id: e.target.value }; setRecurringForm({ ...recurringForm, data: { ...recurringForm.data, lines: newLines } })
                    }}>
                      <option value="">— Select Account —</option>
                      {leafAccounts.map((a) => (<option key={a.id} value={a.id}>{a.code} — {a.name}</option>))}
                    </select>
                    <input className="jl-desc" value={line.description} onChange={(e) => {
                      const newLines = [...recurringForm.data.lines]; newLines[idx] = { ...newLines[idx], description: e.target.value }; setRecurringForm({ ...recurringForm, data: { ...recurringForm.data, lines: newLines } })
                    }} placeholder="Line description" />
                    <input className="jl-dr" type="number" min="0" step="0.01" value={line.debit} onChange={(e) => {
                      const newLines = [...recurringForm.data.lines]; newLines[idx] = { ...newLines[idx], debit: e.target.value, credit: Number(e.target.value) > 0 ? '0' : newLines[idx].credit }; setRecurringForm({ ...recurringForm, data: { ...recurringForm.data, lines: newLines } })
                    }} />
                    <input className="jl-cr" type="number" min="0" step="0.01" value={line.credit} onChange={(e) => {
                      const newLines = [...recurringForm.data.lines]; newLines[idx] = { ...newLines[idx], credit: e.target.value, debit: Number(e.target.value) > 0 ? '0' : newLines[idx].debit }; setRecurringForm({ ...recurringForm, data: { ...recurringForm.data, lines: newLines } })
                    }} />
                    <button className="jl-del" onClick={() => { setRecurringForm({ ...recurringForm, data: { ...recurringForm.data, lines: recurringForm.data.lines.filter((_, i) => i !== idx) } }) }}>✕</button>
                  </div>
                ))}
                <button className="je-add-line" onClick={() => { setRecurringForm({ ...recurringForm, data: { ...recurringForm.data, lines: [...recurringForm.data.lines, { account_id: '', description: '', debit: 0, credit: 0 }] } }) }}>＋ Add Line</button>
              </div>

              <div className="inv-actions">
                <button className="btn-cancel" onClick={() => setRecurringForm(null)}>✕ Cancel</button>
                <button className="btn-primary" disabled={recurringForm.saving} onClick={() => onSaveRecurring(recurringForm, setRecurringForm)}>
                  {recurringForm.saving ? 'Saving…' : '💾 Save Template'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="coa-head">
                <h3>🔁 Recurring Journal Templates</h3>
                <div className="coa-head-right">
                  <button className="btn-add" onClick={() => setRecurringForm({
                    id: `rj-${Date.now()}`, recId: null,
                    data: { template_name: '', reference: '', narration: '', frequency: 'Monthly', start_date: new Date().toISOString().slice(0, 10), end_date: '', currency: 'AED', status: 'Active', lines: [{ account_id: '', description: '', debit: 0, credit: 0 }, { account_id: '', description: '', debit: 0, credit: 0 }] },
                    saving: false, error: ''
                  })}>＋ New Template</button>
                </div>
              </div>
              {recurringTemplates.length === 0 && <div className="coa-empty">No recurring templates yet. Create one to auto-generate monthly entries like depreciation.</div>}
              {recurringTemplates.map((tmpl, i) => (
                <div key={tmpl.id || i} className="je-recurring-card">
                  <div className="je-rcard-head">
                    <span className="je-rcard-name">{tmpl.template_name}</span>
                    <span className={`badge ${tmpl.status === 'Active' ? 'b-green' : tmpl.status === 'Paused' ? 'b-amber' : 'b-gray'}`}>{tmpl.status}</span>
                  </div>
                  <div className="je-rcard-meta">
                    <span>🔁 {tmpl.frequency}</span>
                    <span>📅 Next: {tmpl.next_run_date ? new Date(tmpl.next_run_date).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
                    {tmpl.last_run_date && <span>✅ Last: {new Date(tmpl.last_run_date).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                    <span>Runs: {tmpl.run_count}</span>
                  </div>
                  {tmpl.narration && <div className="je-rcard-note">{tmpl.narration}</div>}
                  <div className="je-rcard-lines">
                    {(tmpl.lines || []).map((l, li) => (
                      <span key={li} className="je-rcard-line">
                        {l.account_id ? (accounts.find((a) => a.id === l.account_id)?.code || '????') : '????'}
                        {Number(l.debit) > 0 ? ` Dr ${l.debit}` : Number(l.credit) > 0 ? ` Cr ${l.credit}` : ''}
                      </span>
                    ))}
                  </div>
                  <div className="je-rcard-actions">
                    <button className="act edit" title="Edit" onClick={() => setRecurringForm({ id: `rj-${Date.now()}`, recId: tmpl.id, data: { ...tmpl, lines: tmpl.lines || [] }, saving: false, error: '' })}>✏️</button>
                    <button className="act conv" title={tmpl.status === 'Paused' ? 'Resume' : 'Pause'} onClick={() => onPauseRecurring(tmpl)}>{tmpl.status === 'Paused' ? '▶️' : '⏸'}</button>
                    <button className="act del" title="Delete" onClick={() => onDeleteRecurring(tmpl)}>🗑️</button>
                    <button className="act" title="Generate Now" style={{ fontSize: '13px' }} onClick={() => onCopy({ ...tmpl, _fromRecurring: true })}>⚡ Generate</button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {view === 'entries' && (
      <div className="grid-wrap">
        <table className="data-grid">
          <thead>
            <tr>
              <th className="th-actions"></th>
              <th>ENTRY NO</th>
              <th>DATE</th>
              <th>REFERENCE</th>
              <th>NARRATION</th>
              <th>DEBIT</th>
              <th>CREDIT</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan="8" className="empty">No journal entries found</td></tr>}
            {filtered.map((e, i) => (
              <tr key={e.id || i} className={i % 2 ? 'alt' : ''}>
                <td className="td-actions">
                  {e.status === 'Draft' && <>
                    <button className="act edit" title="Edit" onClick={() => {
                      loadEntries()
                      setForm({
                        id: `je-${Date.now()}`, recId: e.id,
                        data: { entry_no: e.entry_no, entry_date: e.entry_date, reference: e.reference || '', narration: e.narration || '', currency: e.currency || 'AED', status: e.status, lines: e.lines || [] },
                        saving: false, error: ''
                      })
                    }}>✏️</button>
                    <button className="act conv" title="Post" onClick={() => onPost(e)}>✅</button>
                    <button className="act del" title="Delete" onClick={() => onDelete(e)}>🗑️</button>
                  </>}
                  {e.status === 'Posted' && <>
                    <button className="act edit" title="Void" onClick={() => onVoid(e)}>🚫</button>
                    <button className="act conv" title="Make Recurring" onClick={() => {
                      setRecurringForm({
                        id: `rj-${Date.now()}`, recId: null,
                        data: { template_name: e.reference || e.narration || 'Recurring Entry', reference: e.reference || '', narration: e.narration || '', frequency: 'Monthly', start_date: e.entry_date || new Date().toISOString().slice(0, 10), end_date: '', currency: e.currency || 'AED', status: 'Active', lines: (e.lines || []).map((l) => ({ account_id: l.account_id, description: l.description || '', debit: l.debit, credit: l.credit })) },
                        saving: false, error: ''
                      })
                      setView('recurring')
                    }}>🔁</button>
                  </>}
                  <button className="act" style={{ fontSize: '13px' }} title="Copy to New" onClick={() => onCopy(e)}>📋</button>
                  <button className="act" style={{ fontSize: '13px' }} title="Print" onClick={() => onPrint(e)}>🖨</button>
                  <AttachmentButton entityType="journal_entry" entityId={e.id} title="Journal Entry Attachments" />
                </td>
                <td><b>{e.entry_no}</b></td>
                <td>{e.entry_date ? new Date(e.entry_date).toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' }) : ''}</td>
                <td>{e.reference || '—'}</td>
                <td className="td-ellipsis">{e.narration || '—'}</td>
                <td className="money">{fmtMoney(e.total_debit)}</td>
                <td className="money">{fmtMoney(e.total_credit)}</td>
                <td><span className={`badge ${e.status === 'Posted' ? 'b-green' : e.status === 'Void' ? 'b-red' : 'b-amber'}`}>{e.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  )
}

const IncomingPayments = ({ payments, accounts, custList, form, setForm, onSave, onApprove, onCancel, onDelete, onPrint, search, setSearch, statusFilter, setStatusFilter }) => {
  const wrapRef = useRef(null)
  const firstRef = useRef(null)
  useEffect(() => { if (form && firstRef.current) firstRef.current.focus() }, [form])
  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      const tag = e.target.tagName
      if (tag === 'TEXTAREA') return
      e.preventDefault()
      const inputs = Array.from(wrapRef.current.querySelectorAll('input, select, textarea'))
      const idx = inputs.indexOf(e.target)
      if (idx < inputs.length - 1) inputs[idx + 1].focus()
      else { const btn = wrapRef.current.querySelector('.btn-primary'); if (btn) btn.click() }
    }
  }
  const filtered = payments.filter((p) => {
    const matchStatus = statusFilter === 'All' || p.status === statusFilter
    const matchSearch = !search || p.payment_no?.toLowerCase().includes(search.toLowerCase()) || p.customer_name?.toLowerCase().includes(search.toLowerCase()) || p.reference?.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })
  const totalAmount = filtered.reduce((s, p) => s + Number(p.amount || 0), 0)

  return (
    <div className="banking-wrap" ref={wrapRef} onKeyDown={onKeyDown}>
      {!form ? (
        <div className="je-list-wrap">
          <div className="coa-head">
            <h3>💵 Incoming Payments (Received from Customers)</h3>
            <div className="coa-head-right">
              <input className="coa-search" placeholder="🔍 Search payment no, customer..." value={search} onChange={(e) => setSearch(e.target.value)} />
              <button className="btn-add" onClick={() => setForm({
                id: `ip-${Date.now()}`, recId: null,
                data: { payment_date: new Date().toISOString().slice(0, 10), customer_id: '', payment_method: 'Bank Transfer', bank_account_id: '', reference: '', cheque_no: '', cheque_date: new Date().toISOString().slice(0, 10), amount: 0, currency: 'AED', exchange_rate: 1, notes: '', applied_to: 'AR Invoice' },
                saving: false, error: ''
              })}>＋ New Payment</button>
            </div>
          </div>
          <div className="je-status-tabs">
            {['All', 'Draft', 'Approved', 'Cancelled'].map((s) => (
              <button key={s} className={`coa-type-tab ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
                {s} <span className="coa-tab-count">{payments.filter((p) => s === 'All' || p.status === s).length}</span>
              </button>
            ))}
          </div>
          <div className="bank-summary">
            <div className="bank-stat hs-green"><div className="hstat-ico">💵</div><div className="hstat-body"><span className="hstat-label">Total Received</span><span className="hstat-value">{fmtMoney(totalAmount)}</span></div></div>
            <div className="bank-stat hs-blue"><div className="hstat-ico">📋</div><div className="hstat-body"><span className="hstat-label">Payments</span><span className="hstat-value">{filtered.length}</span></div></div>
          </div>
          <ShareBar title="Incoming Payments" columns={[{ key: 'payment_no', label: 'Payment No' }, { key: 'date', label: 'Date' }, { key: 'party', label: 'Customer' }, { key: 'method', label: 'Method' }, { key: 'reference', label: 'Reference' }, { key: 'amount', label: 'Amount', numeric: true }, { key: 'status', label: 'Status' }]} rows={filtered.map((p) => ({ payment_no: p.payment_no || '', date: (p.payment_date || '').slice(0, 10), party: p.customer_name || '', method: p.payment_method || '', reference: p.reference || '', amount: fmtMoney(p.amount || 0), status: p.status || '' }))} />
          <div className="grid-wrap">
            <table className="data-grid">
              <thead>
                <tr>
                  <th className="th-actions"></th>
                  <th>PAYMENT NO</th>
                  <th>DATE</th>
                  <th>CUSTOMER</th>
                  <th>METHOD</th>
                  <th>REFERENCE</th>
                  <th>AMOUNT</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan="8" className="empty">No incoming payments found</td></tr>}
                {filtered.map((p, i) => (
                  <tr key={p.id || i} className={i % 2 ? 'alt' : ''}>
                    <td className="td-actions">
                      {p.status === 'Draft' && <>
                        <button className="act edit" title="Edit" onClick={() => setForm({ id: `ip-${Date.now()}`, recId: p.id, data: { ...p }, saving: false, error: '' })}>✏️</button>
                        <button className="act conv" title="Approve" onClick={() => onApprove(p)}>✅</button>
                        <button className="act del" title="Delete" onClick={() => onDelete(p)}>🗑️</button>
                      </>}
                      {p.status === 'Approved' && <button className="act del" title="Cancel" onClick={() => onCancel(p)}>🚫</button>}
                      <button className="act" style={{ fontSize: '13px' }} title="Print" onClick={() => onPrint(p)}>🖨</button>
                      <AttachmentButton entityType="incoming_payment" entityId={p.id} title="Incoming Payment Attachments" />
                    </td>
                    <td><b>{p.payment_no}</b></td>
                    <td>{p.payment_date ? new Date(p.payment_date).toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' }) : ''}</td>
                    <td>{p.customer_name || '—'}</td>
                    <td><span className="badge b-cyan">{p.payment_method}</span></td>
                    <td>{p.reference || '—'}</td>
                    <td className="money">{fmtMoney(p.amount)}</td>
                    <td><span className={`badge ${p.status === 'Approved' ? 'b-green' : p.status === 'Cancelled' ? 'b-red' : 'b-amber'}`}>{p.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="banking-form">
          <div className="je-form-head">
            <h3>{form.recId ? '✏️ Edit Incoming Payment' : '💵 New Incoming Payment'}</h3>
          </div>
          {form.error && <div className="inv-error">⚠️ {form.error}</div>}
          <Attachments entityType="incoming_payment" entityId={form.recId || null} />
          <div className="inv-grid coa-form-grid">
            <label>Payment Date *
              <input ref={firstRef} type="date" value={form.data.payment_date} onChange={(e) => setForm({ ...form, data: { ...form.data, payment_date: e.target.value } })} />
            </label>
            <label>Customer *
              <select value={form.data.customer_id} onChange={(e) => setForm({ ...form, data: { ...form.data, customer_id: e.target.value } })}>
                <option value="">— Select Customer —</option>
                {custList.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label>Payment Method
              <select value={form.data.payment_method} onChange={(e) => setForm({ ...form, data: { ...form.data, payment_method: e.target.value } })}>
                <option>Cash</option><option>Bank Transfer</option><option>Cheque</option><option>PDC Cheque</option><option>Credit Card</option><option>Other</option>
              </select>
            </label>
            <label>Bank Account
              <select value={form.data.bank_account_id} onChange={(e) => setForm({ ...form, data: { ...form.data, bank_account_id: e.target.value } })}>
                <option value="">— Select Bank Account —</option>
                {accounts.filter((a) => a.name.toLowerCase().includes('bank') && !a.is_group).map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
              </select>
            </label>
            <label>Amount ({form.data.currency}) *
              <input type="number" min="0" step="0.01" value={form.data.amount} onChange={(e) => setForm({ ...form, data: { ...form.data, amount: e.target.value } })} placeholder="0.00" className="money-input" />
            </label>
            <label>Currency
              <select value={form.data.currency} onChange={(e) => setForm({ ...form, data: { ...form.data, currency: e.target.value } })}>
                <option>AED</option><option>USD</option><option>SAR</option><option>EUR</option><option>GBP</option><option>INR</option><option>PKR</option>
              </select>
            </label>
            <label>Reference
              <input value={form.data.reference} onChange={(e) => setForm({ ...form, data: { ...form.data, reference: e.target.value } })} placeholder="Cheque no, transfer ref..." />
            </label>
            {form.data.payment_method.includes('Cheque') && (
              <>
                <label>Cheque No *
                  <input value={form.data.cheque_no} onChange={(e) => setForm({ ...form, data: { ...form.data, cheque_no: e.target.value } })} placeholder="CHQ-0001" />
                </label>
                <label>Cheque Date *
                  <input type="date" value={form.data.cheque_date} onChange={(e) => setForm({ ...form, data: { ...form.data, cheque_date: e.target.value } })} />
                </label>
              </>
            )}
            <label>Applied To
              <select value={form.data.applied_to} onChange={(e) => setForm({ ...form, data: { ...form.data, applied_to: e.target.value } })}>
                <option>AR Invoice</option><option>Sales Order</option><option>Advance</option><option>Other</option>
              </select>
            </label>
            <label>Notes
              <textarea value={form.data.notes} onChange={(e) => setForm({ ...form, data: { ...form.data, notes: e.target.value } })} rows="2" placeholder="Additional notes..." />
            </label>
          </div>
          <div className="inv-actions">
            <button className="btn-cancel" onClick={() => setForm(null)}>✕ Cancel</button>
            <button className="btn-primary" disabled={form.saving} onClick={() => onSave(form, setForm)}>{form.saving ? 'Saving…' : '💾 Save Payment'}</button>
          </div>
        </div>
      )}
    </div>
  )
}

const OutgoingPayments = ({ payments, accounts, supList, form, setForm, onSave, onApprove, onCancel, onDelete, onPrint, search, setSearch, statusFilter, setStatusFilter }) => {
  const wrapRef = useRef(null)
  const firstRef = useRef(null)
  useEffect(() => { if (form && firstRef.current) firstRef.current.focus() }, [form])
  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      const tag = e.target.tagName
      if (tag === 'TEXTAREA') return
      e.preventDefault()
      const inputs = Array.from(wrapRef.current.querySelectorAll('input, select, textarea'))
      const idx = inputs.indexOf(e.target)
      if (idx < inputs.length - 1) inputs[idx + 1].focus()
      else { const btn = wrapRef.current.querySelector('.btn-primary'); if (btn) btn.click() }
    }
  }
  const filtered = payments.filter((p) => {
    const matchStatus = statusFilter === 'All' || p.status === statusFilter
    const matchSearch = !search || p.payment_no?.toLowerCase().includes(search.toLowerCase()) || p.supplier_name?.toLowerCase().includes(search.toLowerCase()) || p.reference?.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })
  const totalAmount = filtered.reduce((s, p) => s + Number(p.amount || 0), 0)

  return (
    <div className="banking-wrap" ref={wrapRef} onKeyDown={onKeyDown}>
      {!form ? (
        <div className="je-list-wrap">
          <div className="coa-head">
            <h3>💸 Outgoing Payments (Paid to Suppliers)</h3>
            <div className="coa-head-right">
              <input className="coa-search" placeholder="🔍 Search payment no, supplier..." value={search} onChange={(e) => setSearch(e.target.value)} />
              <button className="btn-add" onClick={() => setForm({
                id: `op-${Date.now()}`, recId: null,
                data: { payment_date: new Date().toISOString().slice(0, 10), supplier_id: '', payment_method: 'Bank Transfer', bank_account_id: '', reference: '', cheque_no: '', cheque_date: new Date().toISOString().slice(0, 10), amount: 0, currency: 'AED', exchange_rate: 1, notes: '', applied_to: 'AP Invoice' },
                saving: false, error: ''
              })}>＋ New Payment</button>
            </div>
          </div>
          <div className="je-status-tabs">
            {['All', 'Draft', 'Approved', 'Cancelled'].map((s) => (
              <button key={s} className={`coa-type-tab ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
                {s} <span className="coa-tab-count">{payments.filter((p) => s === 'All' || p.status === s).length}</span>
              </button>
            ))}
          </div>
          <div className="bank-summary">
            <div className="bank-stat hs-rose"><div className="hstat-ico">💸</div><div className="hstat-body"><span className="hstat-label">Total Paid</span><span className="hstat-value">{fmtMoney(totalAmount)}</span></div></div>
            <div className="bank-stat hs-blue"><div className="hstat-ico">📋</div><div className="hstat-body"><span className="hstat-label">Payments</span><span className="hstat-value">{filtered.length}</span></div></div>
          </div>
          <ShareBar title="Outgoing Payments" columns={[{ key: 'payment_no', label: 'Payment No' }, { key: 'date', label: 'Date' }, { key: 'party', label: 'Supplier' }, { key: 'method', label: 'Method' }, { key: 'reference', label: 'Reference' }, { key: 'amount', label: 'Amount', numeric: true }, { key: 'status', label: 'Status' }]} rows={filtered.map((p) => ({ payment_no: p.payment_no || '', date: (p.payment_date || '').slice(0, 10), party: p.supplier_name || '', method: p.payment_method || '', reference: p.reference || '', amount: fmtMoney(p.amount || 0), status: p.status || '' }))} />
          <div className="grid-wrap">
            <table className="data-grid">
              <thead>
                <tr>
                  <th className="th-actions"></th>
                  <th>PAYMENT NO</th>
                  <th>DATE</th>
                  <th>SUPPLIER</th>
                  <th>METHOD</th>
                  <th>REFERENCE</th>
                  <th>AMOUNT</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan="8" className="empty">No outgoing payments found</td></tr>}
                {filtered.map((p, i) => (
                  <tr key={p.id || i} className={i % 2 ? 'alt' : ''}>
                    <td className="td-actions">
                      {p.status === 'Draft' && <>
                        <button className="act edit" title="Edit" onClick={() => setForm({ id: `op-${Date.now()}`, recId: p.id, data: { ...p }, saving: false, error: '' })}>✏️</button>
                        <button className="act conv" title="Approve" onClick={() => onApprove(p)}>✅</button>
                        <button className="act del" title="Delete" onClick={() => onDelete(p)}>🗑️</button>
                      </>}
                      {p.status === 'Approved' && <button className="act del" title="Cancel" onClick={() => onCancel(p)}>🚫</button>}
                      <button className="act" style={{ fontSize: '13px' }} title="Print" onClick={() => onPrint(p)}>🖨</button>
                      <AttachmentButton entityType="outgoing_payment" entityId={p.id} title="Outgoing Payment Attachments" />
                    </td>
                    <td><b>{p.payment_no}</b></td>
                    <td>{p.payment_date ? new Date(p.payment_date).toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' }) : ''}</td>
                    <td>{p.supplier_name || '—'}</td>
                    <td><span className="badge b-cyan">{p.payment_method}</span></td>
                    <td>{p.reference || '—'}</td>
                    <td className="money">{fmtMoney(p.amount)}</td>
                    <td><span className={`badge ${p.status === 'Approved' ? 'b-green' : p.status === 'Cancelled' ? 'b-red' : 'b-amber'}`}>{p.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="banking-form">
          <div className="je-form-head">
            <h3>{form.recId ? '✏️ Edit Outgoing Payment' : '💸 New Outgoing Payment'}</h3>
          </div>
          {form.error && <div className="inv-error">⚠️ {form.error}</div>}
          <Attachments entityType="outgoing_payment" entityId={form.recId || null} />
          <div className="inv-grid coa-form-grid">
            <label>Payment Date *
              <input ref={firstRef} type="date" value={form.data.payment_date} onChange={(e) => setForm({ ...form, data: { ...form.data, payment_date: e.target.value } })} />
            </label>
            <label>Supplier *
              <select value={form.data.supplier_id} onChange={(e) => setForm({ ...form, data: { ...form.data, supplier_id: e.target.value } })}>
                <option value="">— Select Supplier —</option>
                {supList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <label>Payment Method
              <select value={form.data.payment_method} onChange={(e) => setForm({ ...form, data: { ...form.data, payment_method: e.target.value } })}>
                <option>Cash</option><option>Bank Transfer</option><option>Cheque</option><option>PDC Cheque</option><option>Credit Card</option><option>Other</option>
              </select>
            </label>
            <label>Bank Account
              <select value={form.data.bank_account_id} onChange={(e) => setForm({ ...form, data: { ...form.data, bank_account_id: e.target.value } })}>
                <option value="">— Select Bank Account —</option>
                {accounts.filter((a) => a.name.toLowerCase().includes('bank') && !a.is_group).map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
              </select>
            </label>
            <label>Amount ({form.data.currency}) *
              <input type="number" min="0" step="0.01" value={form.data.amount} onChange={(e) => setForm({ ...form, data: { ...form.data, amount: e.target.value } })} placeholder="0.00" className="money-input" />
            </label>
            <label>Currency
              <select value={form.data.currency} onChange={async (e) => {
                const cur = e.target.value
                let rate = 1
                if (cur !== companyProfile?.base_currency && cur !== 'AED') {
                  try {
                    const { data } = await supabase.from('exchange_rates')
                      .select('rate').eq('from_currency', cur).eq('to_currency', companyProfile?.base_currency || 'AED')
                      .eq('is_active', true).order('rate_date', { ascending: false }).limit(1)
                    if (data?.length) rate = Number(data[0].rate)
                  } catch (_) {}
                }
                setForm({ ...form, data: { ...form.data, currency: cur, exchange_rate: rate } })
              }}>
                <option>AED</option><option>USD</option><option>SAR</option><option>EUR</option><option>GBP</option><option>INR</option><option>PKR</option>
              </select>
            </label>
            {form.data.currency !== 'AED' && form.data.currency !== (companyProfile?.base_currency || 'AED') && (
              <label>Exchange Rate
                <input type="number" step="0.0001" min="0" value={form.data.exchange_rate} onChange={(e) => setForm({ ...form, data: { ...form.data, exchange_rate: Number(e.target.value) } })} />
              </label>
            )}
            {form.data.currency !== 'AED' && form.data.currency !== (companyProfile?.base_currency || 'AED') && form.data.exchange_rate > 0 && (
              <div style={{ gridColumn: '1 / -1', background: '#eff6ff', borderRadius: 6, padding: '6px 10px', fontSize: 11, color: '#1e40af' }}>
                💱 {form.data.amount || 0} {form.data.currency} = <b>{((Number(form.data.amount) || 0) * form.data.exchange_rate).toFixed(2)} {companyProfile?.base_currency || 'AED'}</b> at rate {form.data.exchange_rate}
              </div>
            )}
            <label>Reference
              <input value={form.data.reference} onChange={(e) => setForm({ ...form, data: { ...form.data, reference: e.target.value } })} placeholder="Cheque no, transfer ref..." />
            </label>
            {form.data.payment_method.includes('Cheque') && (
              <>
                <label>Cheque No *
                  <input value={form.data.cheque_no} onChange={(e) => setForm({ ...form, data: { ...form.data, cheque_no: e.target.value } })} placeholder="CHQ-0001" />
                </label>
                <label>Cheque Date *
                  <input type="date" value={form.data.cheque_date} onChange={(e) => setForm({ ...form, data: { ...form.data, cheque_date: e.target.value } })} />
                </label>
              </>
            )}
            <label>Applied To
              <select value={form.data.applied_to} onChange={(e) => setForm({ ...form, data: { ...form.data, applied_to: e.target.value } })}>
                <option>AP Invoice</option><option>Purchase Order</option><option>Advance</option><option>Other</option>
              </select>
            </label>
            <label>Notes
              <textarea value={form.data.notes} onChange={(e) => setForm({ ...form, data: { ...form.data, notes: e.target.value } })} rows="2" placeholder="Additional notes..." />
            </label>
          </div>
          <div className="inv-actions">
            <button className="btn-cancel" onClick={() => setForm(null)}>✕ Cancel</button>
            <button className="btn-primary" disabled={form.saving} onClick={() => onSave(form, setForm)}>{form.saving ? 'Saving…' : '💾 Save Payment'}</button>
          </div>
        </div>
      )}
    </div>
  )
}

const CompanyProfile = ({ profile, setProfile, onSave, taxConfig: taxCfg }) => {
  const wrapRef = useRef(null)
  const firstRef = useRef(null)
  const [countryList, setCountryList] = useState<any[]>([])
  useEffect(() => { if (firstRef.current) firstRef.current.focus() }, [])
  useEffect(() => {
    supabase.from('tax_config').select('country, tax_name, standard_rate, currency').eq('is_active', true).order('country')
      .then(({ data }) => setCountryList(data || []))
  }, [])
  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      const tag = e.target.tagName
      if (tag === 'TEXTAREA') return
      e.preventDefault()
      const inputs = Array.from(wrapRef.current.querySelectorAll('input, select, textarea'))
      const idx = inputs.indexOf(e.target)
      if (idx < inputs.length - 1) inputs[idx + 1].focus()
      else { const btn = wrapRef.current.querySelector('.btn-primary'); if (btn) btn.click() }
    }
  }
  if (!profile) return null
  const d = profile.data
  const set = (k, v) => setProfile({ ...profile, data: { ...d, [k]: v } })
  const handleCountryChange = (country: string) => {
    const tc = countryList.find((c) => c.country === country)
    if (tc) {
      set('country', country)
      set('base_currency', tc.currency)
      set('vat_rate', tc.standard_rate)
    } else {
      set('country', country)
    }
  }
  const exportAll = async () => {
    const tables = ['company_profile', 'chart_of_accounts', 'journal_entries', 'journal_lines', 'customers', 'suppliers', 'products', 'sales_invoices', 'purchase_invoices', 'fixed_assets', 'attachments', 'tax_transactions', 'corporate_tax', 'users']
    const dump: any = {}
    for (const t of tables) {
      try { const { data } = await supabase.from(t).select('*'); dump[t] = data || [] } catch { dump[t] = [] }
    }
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `erp-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(url)
  }
  return (
    <div className="admin-wrap" ref={wrapRef} onKeyDown={onKeyDown}>
      <div className="admin-head"><h3>🏢 Company Profile</h3></div>
      {profile.error && <div className="inv-error">⚠️ {profile.error}</div>}
      <div className="admin-grid">
        <div className="admin-section">
          <h4>🏢 General Information</h4>
          <div className="inv-grid coa-form-grid">
            <label>Company Name *<input ref={firstRef} value={d.company_name} onChange={(e) => set('company_name', e.target.value)} /></label>
            <label>Legal Name<input value={d.legal_name} onChange={(e) => set('legal_name', e.target.value)} placeholder="Legal entity name" /></label>
            <label>Trade Name<input value={d.trade_name} onChange={(e) => set('trade_name', e.target.value)} placeholder="DBA name" /></label>
            <label>Phone<input value={d.phone} onChange={(e) => set('phone', e.target.value)} /></label>
            <label>Email<input type="email" value={d.email} onChange={(e) => set('email', e.target.value)} /></label>
            <label>Website<input value={d.website} onChange={(e) => set('website', e.target.value)} placeholder="https://" /></label>
          </div>
        </div>
        <div className="admin-section">
          <h4>📍 Address</h4>
          <div className="inv-grid coa-form-grid">
            <label>Address Line 1<input value={d.address_line1} onChange={(e) => set('address_line1', e.target.value)} /></label>
            <label>Address Line 2<input value={d.address_line2} onChange={(e) => set('address_line2', e.target.value)} /></label>
            <label>City<input value={d.city} onChange={(e) => set('city', e.target.value)} /></label>
            <label>State / Emirate<input value={d.state} onChange={(e) => set('state', e.target.value)} /></label>
            <label>Country
              <select value={d.country} onChange={(e) => handleCountryChange(e.target.value)}>
                <option value="">Select Country</option>
                {countryList.map((c) => <option key={c.country} value={c.country}>{c.country} ({c.tax_name} {c.standard_rate}%)</option>)}
              </select>
            </label>
            <label>Postal Code<input value={d.postal_code} onChange={(e) => set('postal_code', e.target.value)} /></label>
          </div>
        </div>
        <div className="admin-section">
          <h4>🧾 Tax & Registration</h4>
          <div className="inv-grid coa-form-grid">
            <label>Tax ID / CRN<input value={d.tax_id} onChange={(e) => set('tax_id', e.target.value)} /></label>
            <label>Commercial Registration<input value={d.cr_number} onChange={(e) => set('cr_number', e.target.value)} /></label>
            <label>VAT Number<input value={d.vat_number} onChange={(e) => set('vat_number', e.target.value)} /></label>
            <label>Base Currency
              <select value={d.base_currency} onChange={(e) => set('base_currency', e.target.value)}>
                {[...new Set(countryList.map((c) => c.currency))].sort().map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label>{countryList.find((c) => c.country === d.country)?.tax_name || 'Tax'} Rate (%)<input type="number" min="0" max="100" step="0.5" value={d.vat_rate} onChange={(e) => set('vat_rate', Number(e.target.value))} /></label>
            <label>Fiscal Year Start (Month)
              <select value={d.fiscal_year_start} onChange={(e) => set('fiscal_year_start', e.target.value)}>
                {['01','02','03','04','05','06','07','08','09','10','11','12'].map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
          </div>
        </div>
        <div className="admin-section">
          <h4>🔍 Auditor Information</h4>
          <div className="inv-grid coa-form-grid">
            <label>Auditor Firm<input value={d.auditor_firm} onChange={(e) => set('auditor_firm', e.target.value)} placeholder="e.g. ABC Chartered Accountants" /></label>
            <label>Auditor Name<input value={d.auditor_name} onChange={(e) => set('auditor_name', e.target.value)} placeholder="Signing partner" /></label>
            <label>Auditor License No.<input value={d.auditor_license} onChange={(e) => set('auditor_license', e.target.value)} placeholder="License / reg. no." /></label>
            <label>Auditor Address<input value={d.auditor_address} onChange={(e) => set('auditor_address', e.target.value)} placeholder="Firm address / city" /></label>
          </div>
        </div>
        <div className="admin-section">
          <h4>🧾 ZATCA e-Invoice (Saudi Only)</h4>
          <div className="inv-grid coa-form-grid">
            <label className="toggle-label">
              <input type="checkbox" checked={d.zatca_enabled} onChange={(e) => set('zatca_enabled', e.target.checked)} />
              <span>Enable ZATCA Integration</span>
            </label>
            <label>ZATCA Endpoint<input value={d.zatca_endpoint} onChange={(e) => set('zatca_endpoint', e.target.value)} placeholder="https://..." /></label>
            <label>CSID Token<input value={d.zatca_csid} onChange={(e) => set('zatca_csid', e.target.value)} placeholder="Certificate..." /></label>
          </div>
        </div>
      </div>
        <div className="inv-actions">
          <button className="btn-primary" disabled={profile.saving} onClick={() => onSave(profile, setProfile)}>
            {profile.saving ? 'Saving…' : '💾 Save Company Profile'}
          </button>
          <button className="btn-print" onClick={exportAll}>📦 Export All Data (JSON)</button>
        </div>
    </div>
  )
}

const UsersRoles = ({ users, form, setForm, onSave, onDelete, onToggleStatus, search, setSearch }) => {
  const wrapRef = useRef(null)
  const firstRef = useRef(null)
  useEffect(() => { if (form && firstRef.current) firstRef.current.focus() }, [form])
  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      const tag = e.target.tagName
      if (tag === 'TEXTAREA') return
      e.preventDefault()
      const inputs = Array.from(wrapRef.current.querySelectorAll('input, select, textarea'))
      const idx = inputs.indexOf(e.target)
      if (idx < inputs.length - 1) inputs[idx + 1].focus()
      else { const btn = wrapRef.current.querySelector('.btn-primary'); if (btn) btn.click() }
    }
  }
  const filtered = users.filter((u) => !search || u.username.toLowerCase().includes(search.toLowerCase()) || u.full_name.toLowerCase().includes(search.toLowerCase()) || u.role.toLowerCase().includes(search.toLowerCase()))
  const ROLE_COLORS = { Admin: '#ef4444', Manager: '#8b5cf6', Accountant: '#3b82f6', 'Sales Rep': '#10b981', Warehouse: '#f59e0b', Viewer: '#6b7280' }
  return (
    <div className="admin-wrap" ref={wrapRef} onKeyDown={onKeyDown}>
      {!form ? (
        <div className="je-list-wrap">
          <div className="coa-head">
            <h3>👤 Users & Roles</h3>
            <div className="coa-head-right">
              <input className="coa-search" placeholder="🔍 Search username, name, role..." value={search} onChange={(e) => setSearch(e.target.value)} />
              <button className="btn-add" onClick={() => setForm({
                id: `usr-${Date.now()}`, recId: null,
                data: { username: '', full_name: '', email: '', password_hash: '', role: 'Viewer', status: 'Active', phone: '' },
                saving: false, error: ''
              })}>＋ New User</button>
            </div>
          </div>
          <div className="admin-role-summary">
            {Object.entries(ROLE_COLORS).map(([role, color]) => (
              <span key={role} className="admin-role-chip" style={{ borderColor: color, color }}>
                {users.filter((u) => u.role === role).length} {role}
              </span>
            ))}
          </div>
          <div className="grid-wrap">
            <table className="data-grid">
              <thead>
                <tr>
                  <th className="th-actions"></th>
                  <th>USERNAME</th>
                  <th>FULL NAME</th>
                  <th>EMAIL</th>
                  <th>ROLE</th>
                  <th>STATUS</th>
                  <th>LAST LOGIN</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan="7" className="empty">No users found</td></tr>}
                {filtered.map((u, i) => (
                  <tr key={u.id || i} className={i % 2 ? 'alt' : ''}>
                    <td className="td-actions">
                      <button className="act edit" title="Edit" onClick={() => setForm({ id: `usr-${Date.now()}`, recId: u.id, data: { ...u }, saving: false, error: '' })}>✏️</button>
                      <button className="act conv" title={u.status === 'Active' ? 'Deactivate' : 'Activate'} onClick={() => onToggleStatus(u)}>{u.status === 'Active' ? '🔒' : '🔓'}</button>
                      {u.username !== 'admin' && <button className="act del" title="Delete" onClick={() => onDelete(u)}>🗑️</button>}
                    </td>
                    <td><b>{u.username}</b></td>
                    <td>{u.full_name || '—'}</td>
                    <td>{u.email || '—'}</td>
                    <td><span className="badge" style={{ background: ROLE_COLORS[u.role] + '18', color: ROLE_COLORS[u.role] }}>{u.role}</span></td>
                    <td><span className={`badge ${u.status === 'Active' ? 'b-green' : u.status === 'Locked' ? 'b-red' : 'b-gray'}`}>{u.status}</span></td>
                    <td>{u.last_login ? new Date(u.last_login).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Never'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="banking-form">
          <div className="je-form-head">
            <h3>{form.recId ? '✏️ Edit User' : '👤 New User'}</h3>
          </div>
          {form.error && <div className="inv-error">⚠️ {form.error}</div>}
          <div className="inv-grid coa-form-grid">
            <label>Username *<input ref={firstRef} value={form.data.username} onChange={(e) => setForm({ ...form, data: { ...form.data, username: e.target.value } })} placeholder="login name" /></label>
            <label>Full Name *<input value={form.data.full_name} onChange={(e) => setForm({ ...form, data: { ...form.data, full_name: e.target.value } })} /></label>
            <label>Email<input type="email" value={form.data.email} onChange={(e) => setForm({ ...form, data: { ...form.data, email: e.target.value } })} /></label>
            <label>Phone<input value={form.data.phone} onChange={(e) => setForm({ ...form, data: { ...form.data, phone: e.target.value } })} /></label>
            <label>Role
              <select value={form.data.role} onChange={(e) => setForm({ ...form, data: { ...form.data, role: e.target.value } })}>
                {['Admin','Manager','Accountant','Sales Rep','Warehouse','Viewer'].map((r) => <option key={r}>{r}</option>)}
              </select>
            </label>
            <label>Status
              <select value={form.data.status} onChange={(e) => setForm({ ...form, data: { ...form.data, status: e.target.value } })}>
                <option>Active</option><option>Inactive</option><option>Locked</option>
              </select>
            </label>
            {!form.recId && <label>Password *<input type="password" value={form.data.password_hash} onChange={(e) => setForm({ ...form, data: { ...form.data, password_hash: e.target.value } })} placeholder="minimum 6 characters" /></label>}
          </div>
          <div className="inv-actions">
            <button className="btn-cancel" onClick={() => setForm(null)}>✕ Cancel</button>
            <button className="btn-primary" disabled={form.saving} onClick={() => onSave(form, setForm)}>{form.saving ? 'Saving…' : '💾 Save User'}</button>
          </div>
        </div>
      )}
    </div>
  )
}

const DocNumbering = ({ docs, setDocs, onSave, search, setSearch }) => {
  const wrapRef = useRef(null)
  const firstRef = useRef(null)
  const [editDoc, setEditDoc] = useState(null)
  useEffect(() => { if (editDoc && firstRef.current) firstRef.current.focus() }, [editDoc])
  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      const tag = e.target.tagName
      if (tag === 'TEXTAREA') return
      e.preventDefault()
      const inputs = Array.from(wrapRef.current.querySelectorAll('input, select'))
      const idx = inputs.indexOf(e.target)
      if (idx < inputs.length - 1) inputs[idx + 1].focus()
      else { const btn = wrapRef.current.querySelector('.btn-primary'); if (btn) btn.click() }
    }
  }
  const filtered = docs.filter((d) => !search || d.doc_type.toLowerCase().includes(search.toLowerCase()) || d.prefix.toLowerCase().includes(search.toLowerCase()))
  return (
    <div className="admin-wrap" ref={wrapRef} onKeyDown={onKeyDown}>
      {!editDoc ? (
        <div className="je-list-wrap">
          <div className="coa-head">
            <h3>🔢 Document Numbering</h3>
            <div className="coa-head-right">
              <input className="coa-search" placeholder="🔍 Search doc type, prefix..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="grid-wrap">
            <table className="data-grid">
              <thead>
                <tr>
                  <th className="th-actions"></th>
                  <th>DOCUMENT TYPE</th>
                  <th>PREFIX</th>
                  <th>FORMAT</th>
                  <th>NEXT NUMBER</th>
                  <th>PAD LENGTH</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan="7" className="empty">No document types found</td></tr>}
                {filtered.map((d, i) => (
                  <tr key={d.id || i} className={i % 2 ? 'alt' : ''}>
                    <td className="td-actions">
                      <button className="act edit" title="Edit" onClick={() => setEditDoc({ ...d })}>✏️</button>
                    </td>
                    <td><b>{d.doc_type}</b></td>
                    <td><span className="badge b-blue">{d.prefix}</span></td>
                    <td className="td-ellipsis">{d.prefix}-{String(d.next_number).padStart(d.pad_length, '0')}</td>
                    <td className="money">{d.next_number}</td>
                    <td>{d.pad_length}</td>
                    <td><span className={`badge ${d.is_active ? 'b-green' : 'b-gray'}`}>{d.is_active ? 'Active' : 'Inactive'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="banking-form">
          <div className="je-form-head">
            <h3>✏️ Edit — {editDoc.doc_type}</h3>
          </div>
          <div className="inv-grid coa-form-grid">
            <label>Document Type<input ref={firstRef} value={editDoc.doc_type} readOnly style={{ background: '#f1f5f9' }} /></label>
            <label>Prefix<input value={editDoc.prefix} onChange={(e) => setEditDoc({ ...editDoc, prefix: e.target.value })} /></label>
            <label>Next Number<input type="number" min="1" value={editDoc.next_number} onChange={(e) => setEditDoc({ ...editDoc, next_number: Number(e.target.value) })} /></label>
            <label>Pad Length<input type="number" min="1" max="10" value={editDoc.pad_length} onChange={(e) => setEditDoc({ ...editDoc, pad_length: Number(e.target.value) })} /></label>
            <label>Separator<input value={editDoc.separator} onChange={(e) => setEditDoc({ ...editDoc, separator: e.target.value })} /></label>
            <label>Suffix<input value={editDoc.suffix} onChange={(e) => setEditDoc({ ...editDoc, suffix: e.target.value })} /></label>
            <label className="toggle-label">
              <input type="checkbox" checked={editDoc.is_active} onChange={(e) => setEditDoc({ ...editDoc, is_active: e.target.checked })} />
              <span>Active</span>
            </label>
            <div className="admin-preview">
              Preview: <b>{editDoc.prefix}{editDoc.separator}{String(editDoc.next_number).padStart(editDoc.pad_length, '0')}{editDoc.suffix}</b>
            </div>
          </div>
          <div className="inv-actions">
            <button className="btn-cancel" onClick={() => setEditDoc(null)}>✕ Cancel</button>
            <button className="btn-primary" onClick={() => { onSave(editDoc); setEditDoc(null) }}>💾 Save</button>
          </div>
        </div>
      )}
    </div>
  )
}

const SalesReport = ({ fmtMoney }) => {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [fromDate, setFromDate] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split('T')[0] })
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0])
  useEffect(() => {
    setLoading(true)
    supabase.from('invoices').select('*').then(({ data }) => { setInvoices(data || []); setLoading(false) })
  }, [])
  const filtered = invoices.filter((inv) => {
    const d = inv.created_at?.split('T')[0]
    return (!fromDate || d >= fromDate) && (!toDate || d <= toDate)
  })
  const byStatus = { paid: filtered.filter((i) => i.status === 'paid'), pending: filtered.filter((i) => i.status === 'pending'), cancelled: filtered.filter((i) => i.status === 'cancelled') }
  const totalSales = filtered.reduce((s, i) => s + Number(i.grand_total || 0), 0)
  const totalPaid = filtered.reduce((s, i) => s + Number(i.amount_paid || 0), 0)
  const totalDue = filtered.reduce((s, i) => s + Number(i.balance || 0), 0)
  const totalVat = filtered.reduce((s, i) => s + Number(i.vat_amount || 0), 0)
  const custMap = {}
  filtered.forEach((inv) => { const c = inv.customer_name || 'Unknown'; custMap[c] = (custMap[c] || 0) + Number(inv.grand_total || 0) })
  const topCustomers = Object.entries(custMap).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total).slice(0, 10)

  const printReport = () => {
    const w = window.open('', '_blank')
    w.document.write('<html><head><title>Sales Report</title><style>body{font-family:Arial,sans-serif;padding:30px}h1{color:#1e1b4b;font-size:20px}h3{color:#475569;margin-top:20px}table{width:100%;border-collapse:collapse;margin-top:8px}th,td{padding:5px 10px;border:1px solid #e2e8f0;font-size:12px}th{text-align:left;background:#f1f5f9}.col-r{text-align:right}.total{font-weight:700;background:#f8fafc}.hdr{text-align:center;margin-bottom:20px}.sub{color:#64748b;font-size:12px}.stats{display:flex;gap:20px;margin:16px 0}.stat{padding:10px 16px;border:1px solid #e2e8f0;border-radius:8px;text-align:center}.stat-val{font-size:18px;font-weight:700;color:#1e1b4b}.stat-lbl{font-size:11px;color:#64748b}</style></head><body>')
    w.document.write('<div class="hdr"><h1>📈 Sales Report</h1><div class="sub">' + fromDate + ' to ' + toDate + '</div></div>')
    w.document.write('<div class="stats"><div class="stat"><div class="stat-val">' + filtered.length + '</div><div class="stat-lbl">Invoices</div></div><div class="stat"><div class="stat-val">' + fmtMoney(totalSales) + '</div><div class="stat-lbl">Total Sales</div></div><div class="stat"><div class="stat-val">' + fmtMoney(totalPaid) + '</div><div class="stat-lbl">Collected</div></div><div class="stat"><div class="stat-val">' + fmtMoney(totalDue) + '</div><div class="stat-lbl">Outstanding</div></div></div>')
    w.document.write('<h3>All Invoices</h3><table><tr><th>Date</th><th>Invoice #</th><th>Customer</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th></tr>')
    filtered.forEach((inv) => { w.document.write('<tr><td>' + (inv.created_at?.split('T')[0] || '') + '</td><td>' + (inv.invoice_no || '') + '</td><td>' + (inv.customer_name || '') + '</td><td class="col-r">' + fmtMoney(inv.grand_total) + '</td><td class="col-r">' + fmtMoney(inv.amount_paid) + '</td><td class="col-r">' + fmtMoney(inv.balance) + '</td><td>' + (inv.status || '') + '</td></tr>') })
    w.document.write('<tr class="total"><td colspan="3"><b>TOTAL</b></td><td class="col-r"><b>' + fmtMoney(totalSales) + '</b></td><td class="col-r"><b>' + fmtMoney(totalPaid) + '</b></td><td class="col-r"><b>' + fmtMoney(totalDue) + '</b></td><td></td></tr>')
    w.document.write('</table></body></html>')
    w.document.close(); w.print()
  }

  return (
    <div className="report-wrap">
       <div className="report-head">
         <h3>📈 Sales Report</h3>
         <div className="report-controls">
           <label>From <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></label>
           <label>To <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} /></label>
           <ShareBar title="Sales Report" onPrint={printReport} onPdf={printReport} text={"Sales Report generated on " + new Date().toLocaleDateString()} />
         </div>
       </div>
      <div className="report-kpi-row">
        <div className="report-kpi kpi-blue"><div className="kpi-val">{filtered.length}</div><div className="kpi-lbl">Invoices</div></div>
        <div className="report-kpi kpi-green"><div className="kpi-val">{fmtMoney(totalSales)}</div><div className="kpi-lbl">Total Sales</div></div>
        <div className="report-kpi kpi-emerald"><div className="kpi-val">{fmtMoney(totalPaid)}</div><div className="kpi-lbl">Collected</div></div>
        <div className="report-kpi kpi-amber"><div className="kpi-val">{fmtMoney(totalDue)}</div><div className="kpi-lbl">Outstanding</div></div>
        <div className="report-kpi kpi-purple"><div className="kpi-val">{fmtMoney(totalVat)}</div><div className="kpi-lbl">VAT Collected</div></div>
      </div>
      <div className="report-sections">
        <div className="report-section">
          <h4>Top Customers by Revenue</h4>
          {topCustomers.length === 0 && <p className="empty">No data for this period</p>}
          {topCustomers.map((c, i) => (
            <div key={i} className="report-bar-row">
              <span className="bar-label">{c.name}</span>
              <div className="bar-track"><div className="bar-fill" style={{ width: `${(c.total / (topCustomers[0]?.total || 1)) * 100}%` }}></div></div>
              <span className="bar-value">{fmtMoney(c.total)}</span>
            </div>
          ))}
        </div>
        <div className="report-section">
          <h4>Invoices by Status</h4>
          <div className="report-status-row">
            <div className="status-chip s-green">Paid: {byStatus.paid.length}</div>
            <div className="status-chip s-amber">Pending: {byStatus.pending.length}</div>
            <div className="status-chip s-red">Cancelled: {byStatus.cancelled.length}</div>
          </div>
        </div>
      </div>
      <div className="report-section" style={{ marginTop: 16 }}>
        <h4>All Invoices ({filtered.length})</h4>
        <div className="grid-wrap">
          <table className="data-grid report-table">
            <thead><tr><th>DATE</th><th>INVOICE #</th><th>CUSTOMER</th><th className="col-money">TOTAL</th><th className="col-money">PAID</th><th className="col-money">BALANCE</th><th>STATUS</th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan="7" className="empty">Loading...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan="7" className="empty">No invoices in this period</td></tr>}
              {!loading && filtered.map((inv, i) => (
                <tr key={inv.id || i} className={i % 2 ? 'alt' : ''}>
                  <td>{inv.created_at?.split('T')[0] || '—'}</td>
                  <td className="code-cell">{inv.invoice_no || '—'}</td>
                  <td>{inv.customer_name || '—'}</td>
                  <td className="col-money">{fmtMoney(inv.grand_total)}</td>
                  <td className="col-money cr">{fmtMoney(inv.amount_paid)}</td>
                  <td className="col-money dr">{fmtMoney(inv.balance)}</td>
                  <td><span className={`badge ${inv.status === 'paid' ? 'b-green' : inv.status === 'cancelled' ? 'b-red' : 'b-amber'}`}>{inv.status}</span></td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr className="total-row"><td colSpan="3"><b>TOTAL</b></td><td className="col-money"><b>{fmtMoney(totalSales)}</b></td><td className="col-money cr"><b>{fmtMoney(totalPaid)}</b></td><td className="col-money dr"><b>{fmtMoney(totalDue)}</b></td><td></td></tr></tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}

const PurchaseReport = ({ fmtMoney }) => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [fromDate, setFromDate] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split('T')[0] })
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0])
  useEffect(() => {
    setLoading(true)
    supabase.from('purchase_orders').select('*, suppliers(name)').then(({ data }) => { setOrders(data || []); setLoading(false) })
  }, [])
  const filtered = orders.filter((o) => {
    const d = o.created_at?.split('T')[0]
    return (!fromDate || d >= fromDate) && (!toDate || d <= toDate)
  })
  const totalOrders = filtered.length
  const totalAmount = filtered.reduce((s, o) => s + Number(o.total_amount || 0), 0)
  const avgOrder = totalOrders ? totalAmount / totalOrders : 0
  const byStatus = {}
  filtered.forEach((o) => { byStatus[o.status || 'pending'] = (byStatus[o.status || 'pending'] || 0) + 1 })

  const printReport = () => {
    const w = window.open('', '_blank')
    w.document.write('<html><head><title>Purchase Report</title><style>body{font-family:Arial,sans-serif;padding:30px}h1{color:#1e1b4b;font-size:20px}h3{color:#475569;margin-top:20px}table{width:100%;border-collapse:collapse;margin-top:8px}th,td{padding:5px 10px;border:1px solid #e2e8f0;font-size:12px}th{text-align:left;background:#f1f5f9}.col-r{text-align:right}.total{font-weight:700;background:#f8fafc}.hdr{text-align:center;margin-bottom:20px}.sub{color:#64748b;font-size:12px}.stats{display:flex;gap:20px;margin:16px 0}.stat{padding:10px 16px;border:1px solid #e2e8f0;border-radius:8px;text-align:center}.stat-val{font-size:18px;font-weight:700;color:#1e1b4b}.stat-lbl{font-size:11px;color:#64748b}</style></head><body>')
    w.document.write('<div class="hdr"><h1>📉 Purchase Report</h1><div class="sub">' + fromDate + ' to ' + toDate + '</div></div>')
    w.document.write('<div class="stats"><div class="stat"><div class="stat-val">' + totalOrders + '</div><div class="stat-lbl">Orders</div></div><div class="stat"><div class="stat-val">' + fmtMoney(totalAmount) + '</div><div class="stat-lbl">Total Value</div></div><div class="stat"><div class="stat-val">' + fmtMoney(avgOrder) + '</div><div class="stat-lbl">Avg Order</div></div></div>')
    w.document.write('<table><tr><th>Date</th><th>Product</th><th>Qty</th><th>Amount</th><th>Status</th></tr>')
    filtered.forEach((o) => { w.document.write('<tr><td>' + (o.created_at?.split('T')[0] || '') + '</td><td>' + (o.product_id || '') + '</td><td>' + o.quantity + '</td><td class="col-r">' + fmtMoney(o.total_amount) + '</td><td>' + (o.status || '') + '</td></tr>') })
    w.document.write('<tr class="total"><td colspan="3"><b>TOTAL</b></td><td class="col-r"><b>' + fmtMoney(totalAmount) + '</b></td><td></td></tr></table>')
    w.document.write('</body></html>')
    w.document.close(); w.print()
  }

  return (
    <div className="report-wrap">
       <div className="report-head">
         <h3>📉 Purchase Report</h3>
         <div className="report-controls">
           <label>From <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></label>
           <label>To <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} /></label>
           <ShareBar title="Purchase Report" onPrint={printReport} onPdf={printReport} text={"Purchase Report generated on " + new Date().toLocaleDateString()} />
         </div>
       </div>
      <div className="report-kpi-row">
        <div className="report-kpi kpi-blue"><div className="kpi-val">{totalOrders}</div><div className="kpi-lbl">Orders</div></div>
        <div className="report-kpi kpi-green"><div className="kpi-val">{fmtMoney(totalAmount)}</div><div className="kpi-lbl">Total Value</div></div>
        <div className="report-kpi kpi-purple"><div className="kpi-val">{fmtMoney(avgOrder)}</div><div className="kpi-lbl">Avg Order</div></div>
      </div>
      <div className="report-section" style={{ marginTop: 16 }}>
        <h4>Orders by Status</h4>
        <div className="report-status-row">
          {Object.entries(byStatus).map(([st, cnt]) => (
            <div key={st} className={`status-chip ${st === 'completed' || st === 'delivered' ? 's-green' : st === 'cancelled' ? 's-red' : 's-amber'}`}>{st}: {cnt}</div>
          ))}
        </div>
      </div>
      <div className="report-section" style={{ marginTop: 16 }}>
        <h4>All Orders ({filtered.length})</h4>
        <div className="grid-wrap">
          <table className="data-grid report-table">
            <thead><tr><th>DATE</th><th>PRODUCT</th><th>QTY</th><th className="col-money">AMOUNT</th><th>STATUS</th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan="5" className="empty">Loading...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan="5" className="empty">No orders in this period</td></tr>}
              {!loading && filtered.map((o, i) => (
                <tr key={o.id || i} className={i % 2 ? 'alt' : ''}>
                  <td>{o.created_at?.split('T')[0] || '—'}</td>
                  <td>{o.product_id || '—'}</td>
                  <td>{o.quantity}</td>
                  <td className="col-money">{fmtMoney(o.total_amount)}</td>
                  <td><span className={`badge ${o.status === 'delivered' || o.status === 'completed' ? 'b-green' : o.status === 'cancelled' ? 'b-red' : 'b-amber'}`}>{o.status}</span></td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr className="total-row"><td colSpan="2"><b>TOTAL</b></td><td>{filtered.reduce((s, o) => s + (o.quantity || 0), 0)}</td><td className="col-money"><b>{fmtMoney(totalAmount)}</b></td><td></td></tr></tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}

const StockReport = ({ fmtMoney }) => {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [asOfDate, setAsOfDate] = useState(() => new Date().toISOString().split('T')[0])
  useEffect(() => {
    setLoading(true)
    supabase.from('products').select('*').then(({ data }) => { setProducts(data || []); setLoading(false) })
  }, [])
  const activeProducts = products.filter((p) => p.status !== 'Discontinued')
  const filtered = filter === 'all' ? activeProducts : filter === 'low' ? activeProducts.filter((p) => Number(p.stock_quantity || 0) <= Number(p.reorder_level || 0) && Number(p.stock_quantity || 0) > 0) : filter === 'out' ? activeProducts.filter((p) => Number(p.stock_quantity || 0) === 0) : filter === 'over' ? activeProducts.filter((p) => Number(p.max_stock || 0) > 0 && Number(p.stock_quantity || 0) > Number(p.max_stock || 0)) : activeProducts
  const totalItems = activeProducts.length
  const totalQty = activeProducts.reduce((s, p) => s + Number(p.stock_quantity || 0), 0)
  const totalValue = activeProducts.reduce((s, p) => s + Number(p.cost_price || 0) * Number(p.stock_quantity || 0), 0)
  const lowStockCount = activeProducts.filter((p) => Number(p.stock_quantity || 0) <= Number(p.reorder_level || 0) && Number(p.stock_quantity || 0) > 0).length
  const outOfStock = activeProducts.filter((p) => Number(p.stock_quantity || 0) === 0).length

  const printReport = () => {
    const w = window.open('', '_blank')
    w.document.write('<html><head><title>Stock Report</title><style>body{font-family:Arial,sans-serif;padding:30px}h1{color:#1e1b4b;font-size:20px}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{padding:5px 10px;border:1px solid #e2e8f0;font-size:12px}th{text-align:left;background:#f1f5f9}.col-r{text-align:right}.total{font-weight:700;background:#f8fafc}.hdr{text-align:center;margin-bottom:20px}.sub{color:#64748b;font-size:12px}.stats{display:flex;gap:20px;margin:16px 0}.stat{padding:10px 16px;border:1px solid #e2e8f0;border-radius:8px;text-align:center}.stat-val{font-size:18px;font-weight:700}.stat-lbl{font-size:11px;color:#64748b}</style></head><body>')
    w.document.write('<div class="hdr"><h1>📦 Stock Report</h1><div class="sub">As of ' + asOfDate + ' | Generated: ' + new Date().toLocaleDateString() + '</div></div>')
    w.document.write('<div class="stats"><div class="stat"><div class="stat-val">' + totalItems + '</div><div class="stat-lbl">Items</div></div><div class="stat"><div class="stat-val">' + totalQty + '</div><div class="stat-lbl">Total Qty</div></div><div class="stat"><div class="stat-val">' + fmtMoney(totalValue) + '</div><div class="stat-lbl">Stock Value</div></div><div class="stat"><div class="stat-val" style="color:#f59e0b">' + lowStockCount + '</div><div class="stat-lbl">Low Stock</div></div><div class="stat"><div class="stat-val" style="color:#ef4444">' + outOfStock + '</div><div class="stat-lbl">Out of Stock</div></div></div>')
    w.document.write('<table><tr><th>Code</th><th>Name</th><th>Category</th><th>Qty</th><th>Reorder</th><th>Cost</th><th>Value</th><th>Status</th></tr>')
    filtered.forEach((p) => { const val = Number(p.cost_price || 0) * Number(p.stock_quantity || 0); const st = Number(p.stock_quantity || 0) === 0 ? 'Out of Stock' : Number(p.stock_quantity || 0) <= Number(p.reorder_level || 0) ? 'Low Stock' : 'OK'; w.document.write('<tr><td>' + (p.code || '') + '</td><td>' + (p.name || '') + '</td><td>' + (p.category || '') + '</td><td class="col-r">' + (p.stock_quantity || 0) + '</td><td class="col-r">' + (p.reorder_level || 0) + '</td><td class="col-r">' + fmtMoney(p.cost_price) + '</td><td class="col-r">' + fmtMoney(val) + '</td><td>' + st + '</td></tr>') })
    w.document.write('<tr class="total"><td colspan="3"><b>TOTAL</b></td><td class="col-r"><b>' + totalQty + '</b></td><td></td><td></td><td class="col-r"><b>' + fmtMoney(totalValue) + '</b></td><td></td></tr></table>')
    w.document.write('</body></html>')
    w.document.close(); w.print()
  }

  return (
    <div className="report-wrap">
       <div className="report-head">
         <h3>📦 Stock Report</h3>
         <div className="report-controls">
           <label>As of Date <input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} /></label>
           <ShareBar title="Stock Report" onPrint={printReport} onPdf={printReport} text={"Stock Report generated on " + new Date().toLocaleDateString()} />
         </div>
       </div>
      <div className="report-kpi-row">
        <div className="report-kpi kpi-blue"><div className="kpi-val">{totalItems}</div><div className="kpi-lbl">Total Items</div></div>
        <div className="report-kpi kpi-green"><div className="kpi-val">{totalQty}</div><div className="kpi-lbl">Total Qty</div></div>
        <div className="report-kpi kpi-purple"><div className="kpi-val">{fmtMoney(totalValue)}</div><div className="kpi-lbl">Stock Value</div></div>
        <div className="report-kpi kpi-amber"><div className="kpi-val">{lowStockCount}</div><div className="kpi-lbl">Low Stock</div></div>
        <div className="report-kpi kpi-red"><div className="kpi-val">{outOfStock}</div><div className="kpi-lbl">Out of Stock</div></div>
      </div>
      <div className="report-filters">
        {['all', 'low', 'out', 'over'].map((f) => (
          <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All Items' : f === 'low' ? '⚠️ Low Stock' : f === 'out' ? '🚫 Out of Stock' : '📈 Over Stocked'}
          </button>
        ))}
      </div>
      <div className="report-section" style={{ marginTop: 12 }}>
        <div className="grid-wrap">
          <table className="data-grid report-table">
            <thead><tr><th>CODE</th><th>NAME</th><th>CATEGORY</th><th className="col-money">QTY</th><th className="col-money">REORDER</th><th className="col-money">COST</th><th className="col-money">VALUE</th><th>STATUS</th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan="8" className="empty">Loading...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan="8" className="empty">No items found</td></tr>}
              {!loading && filtered.map((p, i) => {
                const val = Number(p.cost_price || 0) * Number(p.stock_quantity || 0)
                const st = Number(p.stock_quantity || 0) === 0 ? 'out' : Number(p.stock_quantity || 0) <= Number(p.reorder_level || 0) ? 'low' : 'ok'
                return (
                  <tr key={p.id || i} className={i % 2 ? 'alt' : ''}>
                    <td className="code-cell">{p.code || '—'}</td>
                    <td>{p.name || '—'}</td>
                    <td>{p.category || '—'}</td>
                    <td className="col-money">{p.stock_quantity || 0}</td>
                    <td className="col-money">{p.reorder_level || 0}</td>
                    <td className="col-money">{fmtMoney(p.cost_price)}</td>
                    <td className="col-money">{fmtMoney(val)}</td>
                    <td><span className={`badge ${st === 'ok' ? 'b-green' : st === 'low' ? 'b-amber' : 'b-red'}`}>{st === 'ok' ? 'OK' : st === 'low' ? 'Low Stock' : 'Out of Stock'}</span></td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot><tr className="total-row"><td colSpan="3"><b>TOTAL</b></td><td className="col-money"><b>{totalQty}</b></td><td></td><td></td><td className="col-money"><b>{fmtMoney(totalValue)}</b></td><td></td></tr></tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}

const CustomerLedger = ({ fmtMoney }) => {
  const [customers, setCustomers] = useState([])
  const [invoices, setInvoices] = useState([])
  const [payments, setPayments] = useState([])
  const [creditMemos, setCreditMemos] = useState([])
  const [returns, setReturns] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  useEffect(() => {
    setLoading(true)
    Promise.all([
      supabase.from('customers').select('*'),
      supabase.from('invoices').select('*'),
      supabase.from('incoming_payments').select('*'),
      supabase.from('ar_credit_memos').select('*').catch(() => ({ data: [] })),
      supabase.from('sales_returns').select('*').catch(() => ({ data: [] })),
    ]).then(([c, inv, pay, cm, ret]) => {
      setCustomers(c.data || [])
      setInvoices(inv.data || [])
      setPayments(pay.data || [])
      setCreditMemos(cm.data || [])
      setReturns(ret.data || [])
      setLoading(false)
    })
  }, [])

  const selected = customers.find((c) => c.id === selectedCustomer)
  const custName = selected ? (selected.name || `${selected.first_name || ''} ${selected.last_name || ''}`.trim()) : ''

  const transactions = []
  if (selectedCustomer && custName) {
    invoices.filter((inv) => inv.customer_name === custName || inv.customer_email === selected?.email).forEach((inv) => {
      const d = (inv.doc_date || inv.created_at || '').split('T')[0]
      transactions.push({ date: d, type: 'Invoice', ref: inv.invoice_no || inv.doc_no || '—', description: `Invoice to ${custName}`, debit: Number(inv.grand_total || inv.total_amount || 0), credit: 0, id: inv.id })
    })
    payments.filter((p) => p.customer_name === custName || p.customer_id === selectedCustomer).forEach((p) => {
      const d = (p.payment_date || p.created_at || '').split('T')[0]
      transactions.push({ date: d, type: 'Payment Received', ref: p.receipt_no || p.reference_no || '—', description: `Payment from ${custName}`, debit: 0, credit: Number(p.amount || 0), id: p.id })
    })
    creditMemos.filter((cm) => cm.customer_name === custName || cm.customer_id === selectedCustomer).forEach((cm) => {
      const d = (cm.doc_date || cm.created_at || '').split('T')[0]
      transactions.push({ date: d, type: 'Credit Memo', ref: cm.credit_memo_no || cm.doc_no || '—', description: cm.reason || 'Credit memo', debit: 0, credit: Number(cm.grand_total || cm.amount || 0), id: cm.id })
    })
    returns.filter((r) => r.customer_name === custName || r.customer_id === selectedCustomer).forEach((r) => {
      const d = (r.doc_date || r.created_at || '').split('T')[0]
      transactions.push({ date: d, type: 'Sales Return', ref: r.return_no || r.doc_no || '—', description: r.reason || 'Sales return', debit: 0, credit: Number(r.grand_total || r.amount || 0), id: r.id })
    })
    if (Number(selected?.opening_balance || 0) !== 0) {
      transactions.push({ date: '', type: 'Opening Balance', ref: '—', description: 'Opening balance', debit: Number(selected.opening_balance || 0), credit: 0, id: 'opening' })
    }
  }

  const filtered = transactions.filter((t) => {
    if (fromDate && t.date < fromDate) return false
    if (toDate && t.date > toDate) return false
    return true
  }).sort((a, b) => a.date > b.date ? 1 : a.date < b.date ? -1 : 0)

  let runningBalance = 0
  const withBalance = filtered.map((t) => {
    runningBalance += t.debit - t.credit
    return { ...t, balance: runningBalance }
  })

  const totalDebit = filtered.reduce((s, t) => s + t.debit, 0)
  const totalCredit = filtered.reduce((s, t) => s + t.credit, 0)

  const printReport = () => {
    const w = window.open('', '_blank')
    w.document.write('<html><head><title>Customer Ledger</title><style>body{font-family:Arial,sans-serif;padding:30px}h1{color:#1e1b4b;font-size:20px}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{padding:5px 10px;border:1px solid #e2e8f0;font-size:12px}th{text-align:left;background:#f1f5f9}.col-r{text-align:right}.total{font-weight:700;background:#f8fafc}</style></head><body>')
    w.document.write('<h1>📒 Customer Ledger — ' + custName + '</h1>')
    w.document.write('<table><tr><th>Date</th><th>Type</th><th>Ref</th><th>Description</th><th class="col-r">Debit</th><th class="col-r">Credit</th><th class="col-r">Balance</th></tr>')
    withBalance.forEach((t) => { w.document.write('<tr><td>' + t.date + '</td><td>' + t.type + '</td><td>' + t.ref + '</td><td>' + t.description + '</td><td class="col-r">' + (t.debit ? fmtMoney(t.debit) : '') + '</td><td class="col-r">' + (t.credit ? fmtMoney(t.credit) : '') + '</td><td class="col-r"><b>' + fmtMoney(t.balance) + '</b></td></tr>') })
    w.document.write('<tr class="total"><td colspan="4"><b>TOTAL</b></td><td class="col-r"><b>' + fmtMoney(totalDebit) + '</b></td><td class="col-r"><b>' + fmtMoney(totalCredit) + '</b></td><td class="col-r"><b>' + fmtMoney(runningBalance) + '</b></td></tr></table></body></html>')
    w.document.close(); w.print()
  }

  return (
    <div className="report-wrap">
      <div className="report-head">
        <h3>📒 Customer Ledger</h3>
        <div className="report-controls">
          <label>Customer
            <select value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)}>
              <option value="">Select Customer</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name || `${c.first_name || ''} ${c.last_name || ''}`.trim()}</option>)}
            </select>
          </label>
          <label>From <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></label>
          <label>To <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} /></label>
          <ShareBar title="Customer Ledger" onPrint={printReport} onPdf={printReport} text={`Customer Ledger — ${custName}`} />
        </div>
      </div>
      {selectedCustomer && (
        <div className="report-kpi-row">
          <div className="report-kpi kpi-blue"><div className="kpi-val">{filtered.length}</div><div className="kpi-lbl">Transactions</div></div>
          <div className="report-kpi kpi-green"><div className="kpi-val">{fmtMoney(totalDebit)}</div><div className="kpi-lbl">Total Invoiced</div></div>
          <div className="report-kpi kpi-purple"><div className="kpi-val">{fmtMoney(totalCredit)}</div><div className="kpi-lbl">Total Paid / Credited</div></div>
          <div className="report-kpi kpi-red"><div className="kpi-val">{fmtMoney(runningBalance)}</div><div className="kpi-lbl">Balance Due</div></div>
        </div>
      )}
      {selectedCustomer && (
        <div className="grid-wrap">
          <table className="data-grid report-table">
            <thead>
              <tr>
                <th>DATE</th>
                <th>TYPE</th>
                <th>REF</th>
                <th>DESCRIPTION</th>
                <th className="col-money">DEBIT</th>
                <th className="col-money">CREDIT</th>
                <th className="col-money">BALANCE</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan="7" className="empty">Loading...</td></tr>}
              {!loading && withBalance.length === 0 && <tr><td colSpan="7" className="empty">No transactions for this customer</td></tr>}
              {!loading && withBalance.map((t, i) => (
                <tr key={t.id || i} className={i % 2 ? 'alt' : ''}>
                  <td>{t.date}</td>
                  <td><span className={`badge ${t.type === 'Invoice' ? 'b-blue' : t.type === 'Payment Received' ? 'b-green' : t.type === 'Credit Memo' ? 'b-yellow' : 'b-red'}`}>{t.type}</span></td>
                  <td style={{ fontSize: 11 }}>{t.ref}</td>
                  <td>{t.description}</td>
                  <td className="col-money" style={{ color: t.debit > 0 ? '#16a34a' : '#94a3b8' }}>{t.debit > 0 ? fmtMoney(t.debit) : '—'}</td>
                  <td className="col-money" style={{ color: t.credit > 0 ? '#dc2626' : '#94a3b8' }}>{t.credit > 0 ? fmtMoney(t.credit) : '—'}</td>
                  <td className="col-money" style={{ fontWeight: 700, color: t.balance > 0 ? '#dc2626' : '#16a34a' }}>{fmtMoney(t.balance)}</td>
                </tr>
              ))}
            </tbody>
            {withBalance.length > 0 && (
              <tfoot>
                <tr className="total-row">
                  <td colSpan="4"><b>TOTAL</b></td>
                  <td className="col-money"><b style={{ color: '#16a34a' }}>{fmtMoney(totalDebit)}</b></td>
                  <td className="col-money"><b style={{ color: '#dc2626' }}>{fmtMoney(totalCredit)}</b></td>
                  <td className="col-money"><b>{fmtMoney(runningBalance)}</b></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  )
}

const SupplierLedger = ({ fmtMoney }) => {
  const [suppliers, setSuppliers] = useState([])
  const [purchaseInvoices, setPurchaseInvoices] = useState([])
  const [payments, setPayments] = useState([])
  const [creditMemos, setCreditMemos] = useState([])
  const [returns, setReturns] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedSupplier, setSelectedSupplier] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  useEffect(() => {
    setLoading(true)
    Promise.all([
      supabase.from('suppliers').select('*'),
      supabase.from('purchase_invoices').select('*'),
      supabase.from('outgoing_payments').select('*'),
      supabase.from('ap_credit_memos').select('*').catch(() => ({ data: [] })),
      supabase.from('purchase_returns').select('*').catch(() => ({ data: [] })),
    ]).then(([s, pi, pay, cm, ret]) => {
      setSuppliers(s.data || [])
      setPurchaseInvoices(pi.data || [])
      setPayments(pay.data || [])
      setCreditMemos(cm.data || [])
      setReturns(ret.data || [])
      setLoading(false)
    })
  }, [])

  const selected = suppliers.find((s) => s.id === selectedSupplier)
  const suppName = selected ? (selected.name || '') : ''

  const transactions = []
  if (selectedSupplier && suppName) {
    purchaseInvoices.filter((pi) => pi.party_name === suppName || pi.supplier_name === suppName || pi.supplier_id === selectedSupplier).forEach((pi) => {
      const d = (pi.doc_date || pi.created_at || '').split('T')[0]
      transactions.push({ date: d, type: 'Purchase Invoice', ref: pi.invoice_no || pi.doc_no || '—', description: `Invoice from ${suppName}`, debit: 0, credit: Number(pi.grand_total || pi.total_amount || 0), id: pi.id })
    })
    payments.filter((p) => p.supplier_name === suppName || p.supplier_id === selectedSupplier || p.party_name === suppName).forEach((p) => {
      const d = (p.payment_date || p.created_at || '').split('T')[0]
      transactions.push({ date: d, type: 'Payment Made', ref: p.payment_no || p.reference_no || '—', description: `Payment to ${suppName}`, debit: Number(p.amount || 0), credit: 0, id: p.id })
    })
    creditMemos.filter((cm) => cm.supplier_name === suppName || cm.supplier_id === selectedSupplier).forEach((cm) => {
      const d = (cm.doc_date || cm.created_at || '').split('T')[0]
      transactions.push({ date: d, type: 'Credit Memo', ref: cm.credit_memo_no || cm.doc_no || '—', description: cm.reason || 'Credit memo', debit: Number(cm.grand_total || cm.amount || 0), credit: 0, id: cm.id })
    })
    returns.filter((r) => r.supplier_name === suppName || r.supplier_id === selectedSupplier).forEach((r) => {
      const d = (r.doc_date || r.created_at || '').split('T')[0]
      transactions.push({ date: d, type: 'Purchase Return', ref: r.return_no || r.doc_no || '—', description: r.reason || 'Purchase return', debit: Number(r.grand_total || r.amount || 0), credit: 0, id: r.id })
    })
    if (Number(selected?.opening_balance || 0) !== 0) {
      transactions.push({ date: '', type: 'Opening Balance', ref: '—', description: 'Opening balance', debit: 0, credit: Number(selected.opening_balance || 0), id: 'opening' })
    }
  }

  const filtered = transactions.filter((t) => {
    if (fromDate && t.date < fromDate) return false
    if (toDate && t.date > toDate) return false
    return true
  }).sort((a, b) => a.date > b.date ? 1 : a.date < b.date ? -1 : 0)

  let runningBalance = 0
  const withBalance = filtered.map((t) => {
    runningBalance += t.credit - t.debit
    return { ...t, balance: runningBalance }
  })

  const totalDebit = filtered.reduce((s, t) => s + t.debit, 0)
  const totalCredit = filtered.reduce((s, t) => s + t.credit, 0)

  const printReport = () => {
    const w = window.open('', '_blank')
    w.document.write('<html><head><title>Supplier Ledger</title><style>body{font-family:Arial,sans-serif;padding:30px}h1{color:#1e1b4b;font-size:20px}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{padding:5px 10px;border:1px solid #e2e8f0;font-size:12px}th{text-align:left;background:#f1f5f9}.col-r{text-align:right}.total{font-weight:700;background:#f8fafc}</style></head><body>')
    w.document.write('<h1>📒 Supplier Ledger — ' + suppName + '</h1>')
    w.document.write('<table><tr><th>Date</th><th>Type</th><th>Ref</th><th>Description</th><th class="col-r">Debit (Paid)</th><th class="col-r">Credit (Owed)</th><th class="col-r">Balance</th></tr>')
    withBalance.forEach((t) => { w.document.write('<tr><td>' + t.date + '</td><td>' + t.type + '</td><td>' + t.ref + '</td><td>' + t.description + '</td><td class="col-r">' + (t.debit ? fmtMoney(t.debit) : '') + '</td><td class="col-r">' + (t.credit ? fmtMoney(t.credit) : '') + '</td><td class="col-r"><b>' + fmtMoney(t.balance) + '</b></td></tr>') })
    w.document.write('<tr class="total"><td colspan="4"><b>TOTAL</b></td><td class="col-r"><b>' + fmtMoney(totalDebit) + '</b></td><td class="col-r"><b>' + fmtMoney(totalCredit) + '</b></td><td class="col-r"><b>' + fmtMoney(runningBalance) + '</b></td></tr></table></body></html>')
    w.document.close(); w.print()
  }

  return (
    <div className="report-wrap">
      <div className="report-head">
        <h3>📒 Supplier Ledger</h3>
        <div className="report-controls">
          <label>Supplier
            <select value={selectedSupplier} onChange={(e) => setSelectedSupplier(e.target.value)}>
              <option value="">Select Supplier</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label>From <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></label>
          <label>To <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} /></label>
          <ShareBar title="Supplier Ledger" onPrint={printReport} onPdf={printReport} text={`Supplier Ledger — ${suppName}`} />
        </div>
      </div>
      {selectedSupplier && (
        <div className="report-kpi-row">
          <div className="report-kpi kpi-blue"><div className="kpi-val">{filtered.length}</div><div className="kpi-lbl">Transactions</div></div>
          <div className="report-kpi kpi-green"><div className="kpi-val">{fmtMoney(totalDebit)}</div><div className="kpi-lbl">Total Paid</div></div>
          <div className="report-kpi kpi-purple"><div className="kpi-val">{fmtMoney(totalCredit)}</div><div className="kpi-lbl">Total Invoiced</div></div>
          <div className="report-kpi kpi-red"><div className="kpi-val">{fmtMoney(runningBalance)}</div><div className="kpi-lbl">Balance Owed</div></div>
        </div>
      )}
      {selectedSupplier && (
        <div className="grid-wrap">
          <table className="data-grid report-table">
            <thead>
              <tr>
                <th>DATE</th>
                <th>TYPE</th>
                <th>REF</th>
                <th>DESCRIPTION</th>
                <th className="col-money">DEBIT (PAID)</th>
                <th className="col-money">CREDIT (OWED)</th>
                <th className="col-money">BALANCE</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan="7" className="empty">Loading...</td></tr>}
              {!loading && withBalance.length === 0 && <tr><td colSpan="7" className="empty">No transactions for this supplier</td></tr>}
              {!loading && withBalance.map((t, i) => (
                <tr key={t.id || i} className={i % 2 ? 'alt' : ''}>
                  <td>{t.date}</td>
                  <td><span className={`badge ${t.type === 'Purchase Invoice' ? 'b-blue' : t.type === 'Payment Made' ? 'b-green' : t.type === 'Credit Memo' ? 'b-yellow' : 'b-red'}`}>{t.type}</span></td>
                  <td style={{ fontSize: 11 }}>{t.ref}</td>
                  <td>{t.description}</td>
                  <td className="col-money" style={{ color: t.debit > 0 ? '#16a34a' : '#94a3b8' }}>{t.debit > 0 ? fmtMoney(t.debit) : '—'}</td>
                  <td className="col-money" style={{ color: t.credit > 0 ? '#dc2626' : '#94a3b8' }}>{t.credit > 0 ? fmtMoney(t.credit) : '—'}</td>
                  <td className="col-money" style={{ fontWeight: 700, color: t.balance > 0 ? '#dc2626' : '#16a34a' }}>{fmtMoney(t.balance)}</td>
                </tr>
              ))}
            </tbody>
            {withBalance.length > 0 && (
              <tfoot>
                <tr className="total-row">
                  <td colSpan="4"><b>TOTAL</b></td>
                  <td className="col-money"><b style={{ color: '#16a34a' }}>{fmtMoney(totalDebit)}</b></td>
                  <td className="col-money"><b style={{ color: '#dc2626' }}>{fmtMoney(totalCredit)}</b></td>
                  <td className="col-money"><b>{fmtMoney(runningBalance)}</b></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  )
}

const CustomerBalanceReport = ({ fmtMoney }) => {
  const [customers, setCustomers] = useState([])
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [asOfDate, setAsOfDate] = useState(() => new Date().toISOString().split('T')[0])
  useEffect(() => {
    setLoading(true)
    Promise.all([supabase.from('customers').select('*'), supabase.from('invoices').select('*')])
      .then(([c, i]) => { setCustomers(c.data || []); setInvoices(i.data || []); setLoading(false) })
  }, [])
  const custData = customers.map((c) => {
    const name = c.name || `${c.first_name || ''} ${c.last_name || ''}`.trim()
    const invs = invoices.filter((inv) => (inv.customer_name === name || inv.customer_email === c.email) && (!asOfDate || inv.created_at?.split('T')[0] <= asOfDate))
    const totalPurchases = invs.reduce((s, inv) => s + Number(inv.grand_total || 0), 0)
    const totalPaid = invs.reduce((s, inv) => s + Number(inv.amount_paid || 0), 0)
    const balance = totalPurchases - totalPaid
    const openingBal = Number(c.opening_balance || 0)
    return { ...c, displayName: name, totalPurchases, totalPaid, balance: balance + openingBal, invoiceCount: invs.length }
  }).filter((c) => c.balance !== 0 || c.totalPurchases > 0).sort((a, b) => b.balance - a.balance)
  const totalOutstanding = custData.reduce((s, c) => s + c.balance, 0)
  const totalPurchases = custData.reduce((s, c) => s + c.totalPurchases, 0)

  const printReport = () => {
    const w = window.open('', '_blank')
    w.document.write('<html><head><title>Customer Balance</title><style>body{font-family:Arial,sans-serif;padding:30px}h1{color:#1e1b4b;font-size:20px}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{padding:5px 10px;border:1px solid #e2e8f0;font-size:12px}th{text-align:left;background:#f1f5f9}.col-r{text-align:right}.total{font-weight:700;background:#f8fafc}.hdr{text-align:center;margin-bottom:20px}</style></head><body>')
    w.document.write('<div class="hdr"><h1>👥 Customer Balance Report</h1><div class="sub">As of ' + asOfDate + '</div></div>')
    w.document.write('<table><tr><th>Code</th><th>Customer</th><th>Invoices</th><th class="col-r">Total Purchases</th><th class="col-r">Paid</th><th class="col-r">Balance Due</th></tr>')
    custData.forEach((c) => { w.document.write('<tr><td>' + (c.code || '') + '</td><td>' + (c.displayName || '') + '</td><td>' + c.invoiceCount + '</td><td class="col-r">' + fmtMoney(c.totalPurchases) + '</td><td class="col-r">' + fmtMoney(c.totalPaid) + '</td><td class="col-r" style="color:' + (c.balance > 0 ? '#dc2626' : '#059669') + '">' + fmtMoney(c.balance) + '</td></tr>') })
    w.document.write('<tr class="total"><td colspan="2"><b>TOTAL</b></td><td></td><td class="col-r"><b>' + fmtMoney(totalPurchases) + '</b></td><td></td><td class="col-r"><b>' + fmtMoney(totalOutstanding) + '</b></td></tr></table>')
    w.document.write('</body></html>')
    w.document.close(); w.print()
  }

  return (
    <div className="report-wrap">
       <div className="report-head">
         <h3>👥 Customer Balance Report</h3>
         <div className="report-controls">
           <label>As of Date <input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} /></label>
           <ShareBar title="Customer Balance Report" onPrint={printReport} onPdf={printReport} text={"Customer Balance Report generated on " + new Date().toLocaleDateString()} />
         </div>
       </div>
      <div className="report-kpi-row">
        <div className="report-kpi kpi-blue"><div className="kpi-val">{custData.length}</div><div className="kpi-lbl">Customers</div></div>
        <div className="report-kpi kpi-green"><div className="kpi-val">{fmtMoney(totalPurchases)}</div><div className="kpi-lbl">Total Purchases</div></div>
        <div className="report-kpi kpi-red"><div className="kpi-val">{fmtMoney(totalOutstanding)}</div><div className="kpi-lbl">Outstanding</div></div>
      </div>
      <div className="report-section" style={{ marginTop: 12 }}>
        <div className="grid-wrap">
          <table className="data-grid report-table">
            <thead><tr><th>CODE</th><th>CUSTOMER</th><th className="col-money">INVOICES</th><th className="col-money">TOTAL PURCHASES</th><th className="col-money">PAID</th><th className="col-money">BALANCE DUE</th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan="6" className="empty">Loading...</td></tr>}
              {!loading && custData.length === 0 && <tr><td colSpan="6" className="empty">No customer balances</td></tr>}
              {!loading && custData.map((c, i) => (
                <tr key={c.id || i} className={i % 2 ? 'alt' : ''}>
                  <td className="code-cell">{c.code || '—'}</td>
                  <td>{c.displayName || '—'}</td>
                  <td className="col-money">{c.invoiceCount}</td>
                  <td className="col-money">{fmtMoney(c.totalPurchases)}</td>
                  <td className="col-money cr">{fmtMoney(c.totalPaid)}</td>
                  <td className={`col-money ${c.balance > 0 ? 'dr' : 'cr'}`}>{fmtMoney(c.balance)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr className="total-row"><td colSpan="2"><b>TOTAL</b></td><td></td><td className="col-money"><b>{fmtMoney(totalPurchases)}</b></td><td></td><td className="col-money"><b>{fmtMoney(totalOutstanding)}</b></td></tr></tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}

const SupplierBalanceReport = ({ fmtMoney }) => {
  const [suppliers, setSuppliers] = useState([])
  const [invoices, setInvoices] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [asOfDate, setAsOfDate] = useState(() => new Date().toISOString().split('T')[0])
  useEffect(() => {
    setLoading(true)
    Promise.all([
      supabase.from('suppliers').select('*'),
      supabase.from('purchase_invoices').select('*'),
      supabase.from('outgoing_payments').select('*')
    ]).then(([s, i, p]) => { setSuppliers(s.data || []); setInvoices(i.data || []); setPayments(p.data || []); setLoading(false) })
  }, [])
  const supData = suppliers.map((s) => {
    const name = s.name || `${s.first_name || ''} ${s.last_name || ''}`.trim()
    const invs = invoices.filter((inv) => (inv.supplier_name === name || inv.supplier_id === s.id) && (!asOfDate || inv.created_at?.split('T')[0] <= asOfDate))
    const pays = payments.filter((p) => (p.supplier_name === name || p.supplier_id === s.id) && (!asOfDate || p.created_at?.split('T')[0] <= asOfDate))
    const totalPurchases = invs.reduce((s, inv) => s + Number(inv.grand_total || 0), 0)
    const totalPaid = pays.reduce((s, p) => s + Number(p.amount || 0), 0)
    const balance = totalPurchases - totalPaid
    const openingBal = Number(s.opening_balance || 0)
    return { ...s, displayName: name, totalPurchases, totalPaid, balance: balance + openingBal, invoiceCount: invs.length }
  }).filter((s) => s.balance !== 0 || s.totalPurchases > 0).sort((a, b) => b.balance - a.balance)
  const totalBalance = supData.reduce((s, x) => s + x.balance, 0)
  const totalPurchases = supData.reduce((s, x) => s + x.totalPurchases, 0)
  const totalPaid = supData.reduce((s, x) => s + x.totalPaid, 0)

  const printReport = () => {
    const w = window.open('', '_blank')
    w.document.write('<html><head><title>Supplier Balance</title><style>body{font-family:Arial,sans-serif;padding:30px}h1{color:#1e1b4b;font-size:20px}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{padding:5px 10px;border:1px solid #e2e8f0;font-size:12px}th{text-align:left;background:#f1f5f9}.col-r{text-align:right}.total{font-weight:700;background:#f8fafc}.hdr{text-align:center;margin-bottom:20px}</style></head><body>')
    w.document.write('<div class="hdr"><h1>🏭 Supplier Balance Report</h1><div class="sub">As of ' + asOfDate + '</div></div>')
    w.document.write('<table><tr><th>Code</th><th>Supplier</th><th>Invoices</th><th class="col-r">Total Purchases</th><th class="col-r">Paid</th><th class="col-r">Balance Due</th></tr>')
    supData.forEach((s) => { w.document.write('<tr><td>' + (s.code || '') + '</td><td>' + (s.displayName || '') + '</td><td>' + s.invoiceCount + '</td><td class="col-r">' + fmtMoney(s.totalPurchases) + '</td><td class="col-r">' + fmtMoney(s.totalPaid) + '</td><td class="col-r" style="color:' + (s.balance > 0 ? '#dc2626' : '#059669') + '">' + fmtMoney(s.balance) + '</td></tr>') })
    w.document.write('<tr class="total"><td colspan="2"><b>TOTAL</b></td><td></td><td class="col-r"><b>' + fmtMoney(totalPurchases) + '</b></td><td class="col-r"><b>' + fmtMoney(totalPaid) + '</b></td><td class="col-r"><b>' + fmtMoney(totalBalance) + '</b></td></tr></table>')
    w.document.write('</body></html>')
    w.document.close(); w.print()
  }

  return (
    <div className="report-wrap">
       <div className="report-head">
         <h3>🏭 Supplier Balance Report</h3>
         <div className="report-controls">
           <label>As of Date <input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} /></label>
           <ShareBar title="Supplier Balance Report" onPrint={printReport} onPdf={printReport} text={"Supplier Balance Report generated on " + new Date().toLocaleDateString()} />
         </div>
       </div>
      <div className="report-kpi-row">
        <div className="report-kpi kpi-blue"><div className="kpi-val">{supData.length}</div><div className="kpi-lbl">Suppliers</div></div>
        <div className="report-kpi kpi-green"><div className="kpi-val">{fmtMoney(totalPurchases)}</div><div className="kpi-lbl">Total Purchases</div></div>
        <div className="report-kpi kpi-red"><div className="kpi-val">{fmtMoney(totalBalance)}</div><div className="kpi-lbl">Outstanding</div></div>
      </div>
      <div className="report-section" style={{ marginTop: 12 }}>
        <div className="grid-wrap">
          <table className="data-grid report-table">
            <thead><tr><th>CODE</th><th>SUPPLIER</th><th className="col-money">INVOICES</th><th className="col-money">TOTAL PURCHASES</th><th className="col-money">PAID</th><th className="col-money">BALANCE DUE</th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan="6" className="empty">Loading...</td></tr>}
              {!loading && supData.length === 0 && <tr><td colSpan="6" className="empty">No supplier balances</td></tr>}
              {!loading && supData.map((s, i) => (
                <tr key={s.id || i} className={i % 2 ? 'alt' : ''}>
                  <td className="code-cell">{s.code || '—'}</td>
                  <td>{s.displayName || '—'}</td>
                  <td className="col-money">{s.invoiceCount}</td>
                  <td className="col-money">{fmtMoney(s.totalPurchases)}</td>
                  <td className="col-money cr">{fmtMoney(s.totalPaid)}</td>
                  <td className={`col-money ${s.balance > 0 ? 'dr' : 'cr'}`}>{fmtMoney(s.balance)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr className="total-row"><td colSpan="2"><b>TOTAL</b></td><td></td><td className="col-money"><b>{fmtMoney(totalPurchases)}</b></td><td className="col-money"><b>{fmtMoney(totalPaid)}</b></td><td className="col-money"><b>{fmtMoney(totalBalance)}</b></td></tr></tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}

const TaxReport = ({ fmtMoney, taxConfig: taxCfg }) => {
  const [profile, setProfile] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [accounts, setAccounts] = useState([])
  const [purchaseInvoices, setPurchaseInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState(() => {
    const now = new Date()
    const q = Math.floor(now.getMonth() / 3) + 1
    return `Q${q} ${now.getFullYear()}`
  })
  const [fromDate, setFromDate] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0] })
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0])
  const [filingType, setFilingType] = useState('monthly')
  const [taxConfigList, setTaxConfigList] = useState<any[]>([])
  const [selectedCountry, setSelectedCountry] = useState(taxCfg?.country || 'UAE')

  useEffect(() => {
    setLoading(true)
    Promise.all([
      supabase.from('company_profile').select('*').limit(1),
      supabase.from('invoices').select('*'),
      supabase.from('accounts').select('*'),
      supabase.from('purchase_invoices').select('*').catch(() => ({ data: [] })),
      supabase.from('tax_config').select('*').eq('is_active', true).order('country'),
    ]).then(([p, inv, acc, pi, tc]) => {
      if (p.data?.length) {
        setProfile(p.data[0])
        setSelectedCountry(p.data[0].country || 'UAE')
      }
      setInvoices(inv.data || [])
      setAccounts(acc.data || [])
      setPurchaseInvoices(pi.data || [])
      setTaxConfigList(tc.data || [])
      setLoading(false)
    })
  }, [])

  const filteredInvoices = invoices.filter((inv) => {
    const d = (inv.doc_date || inv.created_at || '').split('T')[0]
    return (!fromDate || d >= fromDate) && (!toDate || d <= toDate) && inv.status !== 'cancelled' && inv.status !== 'Draft'
  })

  const filteredPurchases = purchaseInvoices.filter((pi) => {
    const d = (pi.doc_date || pi.created_at || '').split('T')[0]
    return (!fromDate || d >= fromDate) && (!toDate || d <= toDate) && pi.status !== 'cancelled' && pi.status !== 'Draft'
  })

  const activeTaxConfig = taxConfigList.find((tc) => tc.country === selectedCountry) || taxConfigList[0] || { tax_name: 'Tax', standard_rate: 0, tax_authority: 'N/A', compliance_mode: 'None', tax_id_label: 'Tax ID', invoice_label: 'Invoice' }
  const vatRate = Number(profile?.vat_rate || activeTaxConfig.standard_rate || 0)
  const taxName = activeTaxConfig.tax_name || 'Tax'
  const taxAuthority = activeTaxConfig.tax_authority || 'N/A'
  const complianceMode = activeTaxConfig.compliance_mode || 'None'

  const outputTaxItems = filteredInvoices.map((inv) => ({
    invoice_no: inv.invoice_no || inv.doc_no || '—',
    customer: inv.customer_name || '—',
    date: (inv.doc_date || inv.created_at || '').split('T')[0],
    subtotal: Number(inv.subtotal || inv.total_amount || 0),
    vat_amount: Number(inv.vat_amount || 0),
    grand_total: Number(inv.grand_total || inv.total_amount || 0),
    vat_rate: Number(inv.vat_percent || vatRate),
  }))

  const inputTaxItems = filteredPurchases.map((pi) => ({
    invoice_no: pi.invoice_no || pi.doc_no || '—',
    supplier: pi.party_name || pi.supplier_name || '—',
    date: (pi.doc_date || pi.created_at || '').split('T')[0],
    subtotal: Number(pi.subtotal || pi.total_amount || 0),
    vat_amount: Number(pi.vat_amount || 0),
    grand_total: Number(pi.grand_total || pi.total_amount || 0),
    vat_rate: Number(pi.vat_percent || vatRate),
  }))

  const totalSalesExVAT = outputTaxItems.reduce((s, i) => s + i.subtotal, 0)
  const totalOutputTax = outputTaxItems.reduce((s, i) => s + i.vat_amount, 0)
  const totalSalesIncVAT = outputTaxItems.reduce((s, i) => s + i.grand_total, 0)

  const totalPurchasesExVAT = inputTaxItems.reduce((s, i) => s + i.subtotal, 0)
  const totalInputTax = inputTaxItems.reduce((s, i) => s + i.vat_amount, 0)
  const totalPurchasesIncVAT = inputTaxItems.reduce((s, i) => s + i.grand_total, 0)

  const expenseAccounts = accounts.filter((a) => a.type === 'Expense')
  const totalExpenses = expenseAccounts.reduce((s, a) => s + Number(Math.abs(a.current_balance || 0)), 0)
  const fallbackInputTax = totalExpenses * (vatRate / (100 + vatRate))
  const effectiveInputTax = totalInputTax > 0 ? totalInputTax : fallbackInputTax
  const netVATPayable = totalOutputTax - effectiveInputTax

  const zeroRatedSales = 0
  const exemptSales = 0

  const printReport = () => {
    const w = window.open('', '_blank')
    const isZatca = regime === 'zatca'
    w.document.write('<html><head><title>Tax Report</title><style>body{font-family:Arial,sans-serif;padding:30px}h1{color:#1e1b4b;font-size:20px}h3{color:#475569;border-bottom:2px solid #e2e8f0;padding-bottom:4px;margin-top:20px}table{width:100%;border-collapse:collapse;margin-top:8px}th,td{padding:6px 12px;border:1px solid #e2e8f0;font-size:12px}th{text-align:left;background:#f1f5f9}.col-r{text-align:right}.total{font-weight:700;background:#f8fafc}.pos{color:#059669}.neg{color:#dc2626}.hdr{text-align:center;margin-bottom:20px}.sub{color:#64748b;font-size:12px}.badge{display:inline-block;padding:3px 10px;border-radius:4px;font-size:11px;font-weight:700}.badge-green{background:#ecfdf5;color:#059669}.badge-red{background:#fef2f2;color:#dc2626}.badge-blue{background:#eff6ff;color:#1d4ed8}</style></head><body>')
    w.document.write('<div class="hdr"><h1>' + taxName + ' Tax Return</h1><div class="sub">' + (profile?.company_name || 'Company') + ' | ' + activeTaxConfig.tax_id_label + ': ' + (profile?.vat_number || 'N/A') + '<br>' + fromDate + ' to ' + toDate + ' | Country: ' + selectedCountry + ' (' + taxName + ' ' + vatRate + '%)</div></div>')
    w.document.write('<h3>Box 1: Supplies — Output Tax (VAT Collected on Sales)</h3>')
    w.document.write('<table><tr><th>Invoice #</th><th>Customer</th><th>Date</th><th class="col-r">Net Amount</th><th class="col-r">VAT Rate</th><th class="col-r">VAT Amount</th><th class="col-r">Total</th></tr>')
    outputTaxItems.forEach((inv) => { w.document.write('<tr><td>' + inv.invoice_no + '</td><td>' + inv.customer + '</td><td>' + inv.date + '</td><td class="col-r">' + fmtMoney(inv.subtotal) + '</td><td class="col-r">' + inv.vat_rate + '%</td><td class="col-r">' + fmtMoney(inv.vat_amount) + '</td><td class="col-r">' + fmtMoney(inv.grand_total) + '</td></tr>') })
    w.document.write('<tr class="total"><td colspan="3"><b>Total Sales</b></td><td class="col-r"><b>' + fmtMoney(totalSalesExVAT) + '</b></td><td></td><td class="col-r pos"><b>' + fmtMoney(totalOutputTax) + '</b></td><td class="col-r"><b>' + fmtMoney(totalSalesIncVAT) + '</b></td></tr></table>')
    w.document.write('<h3>Box 2: Zero-Rated & Exempt Supplies</h3>')
    w.document.write('<table><tr><td>Zero-rated supplies</td><td class="col-r">' + fmtMoney(zeroRatedSales) + '</td></tr><tr><td>Exempt supplies</td><td class="col-r">' + fmtMoney(exemptSales) + '</td></tr></table>')
    w.document.write('<h3>Box 3: Deductions — Input Tax (VAT Paid on Purchases)</h3>')
    if (inputTaxItems.length > 0) {
      w.document.write('<table><tr><th>Invoice #</th><th>Supplier</th><th>Date</th><th class="col-r">Net Amount</th><th class="col-r">VAT Rate</th><th class="col-r">VAT Amount</th><th class="col-r">Total</th></tr>')
      inputTaxItems.forEach((pi) => { w.document.write('<tr><td>' + pi.invoice_no + '</td><td>' + pi.supplier + '</td><td>' + pi.date + '</td><td class="col-r">' + fmtMoney(pi.subtotal) + '</td><td class="col-r">' + pi.vat_rate + '%</td><td class="col-r">' + fmtMoney(pi.vat_amount) + '</td><td class="col-r">' + fmtMoney(pi.grand_total) + '</td></tr>') })
      w.document.write('<tr class="total"><td colspan="3"><b>Total Purchases</b></td><td class="col-r"><b>' + fmtMoney(totalPurchasesExVAT) + '</b></td><td></td><td class="col-r neg"><b>' + fmtMoney(totalInputTax) + '</b></td><td class="col-r"><b>' + fmtMoney(totalPurchasesIncVAT) + '</b></td></tr></table>')
    } else {
      w.document.write('<table><tr><td>Estimated Input Tax (from expense accounts)</td><td class="col-r">' + fmtMoney(fallbackInputTax) + '</td></tr></table>')
    }
    w.document.write('<h3>Box 4: VAT Settlement</h3>')
    w.document.write('<table>')
    w.document.write('<tr><td><b>Total Output Tax (VAT collected)</b></td><td class="col-r pos"><b>' + fmtMoney(totalOutputTax) + '</b></td></tr>')
    w.document.write('<tr><td><b>Total Input Tax (VAT paid)</b></td><td class="col-r neg"><b>' + fmtMoney(effectiveInputTax) + '</b></td></tr>')
    w.document.write('<tr class="total"><td><b>Net VAT Payable to Authority</b></td><td class="col-r ' + (netVATPayable >= 0 ? 'neg' : 'pos') + '"><b>' + fmtMoney(Math.abs(netVATPayable)) + '</b></td></tr>')
    w.document.write('</table>')
    w.document.write('<h3>' + taxName + ' Compliance — ' + taxAuthority + '</h3>')
    w.document.write('<table><tr><td>Tax Authority</td><td>' + taxAuthority + '</td></tr><tr><td>' + activeTaxConfig.tax_id_label + '</td><td>' + (profile?.vat_number ? '<span class="badge badge-green">Registered</span>' : '<span class="badge badge-red">Not Registered</span>') + '</td></tr><tr><td>Filing Period</td><td>' + filingType.charAt(0).toUpperCase() + filingType.slice(1) + '</td></tr></table>')
    w.document.write('</body></html>')
    w.document.close(); w.print()
  }

  return (
    <div className="report-wrap">
      <div className="report-head">
         <h3>{taxName} Tax Return — {selectedCountry}</h3>
         <div className="report-controls">
           <label>Country
             <select value={selectedCountry} onChange={(e) => setSelectedCountry(e.target.value)}>
               {taxConfigList.map((tc) => <option key={tc.country} value={tc.country}>{tc.country} ({tc.tax_name} {tc.standard_rate}%)</option>)}
             </select>
           </label>
           <label>From <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></label>
           <label>To <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} /></label>
           <label>Filing
             <select value={filingType} onChange={(e) => setFilingType(e.target.value)}>
               <option value="monthly">Monthly</option>
               <option value="quarterly">Quarterly</option>
             </select>
           </label>
           <ShareBar title="Tax Report" onPrint={printReport} onPdf={printReport} text={"Tax Report generated on " + new Date().toLocaleDateString()} />
         </div>
      </div>
      <div className={`report-balance-bar ${netVATPayable >= 0 ? 'unbalanced' : 'balanced'}`}>
        <span>Output Tax: <b>{fmtMoney(totalOutputTax)}</b></span>
        <span>Input Tax: <b>{fmtMoney(effectiveInputTax)}</b></span>
        <span>Net VAT {netVATPayable >= 0 ? 'Payable' : 'Refundable'}: <b>{fmtMoney(Math.abs(netVATPayable))}</b></span>
      </div>
      <div className="report-sections">
        <div className="report-section">
          <h4 style={{ color: '#059669' }}>📈 Box 1: Output Tax — Sales</h4>
          <div className="report-kpi-row" style={{ marginBottom: 12 }}>
            <div className="report-kpi kpi-green"><div className="kpi-val">{filteredInvoices.length}</div><div className="kpi-lbl">Invoices</div></div>
            <div className="report-kpi kpi-blue"><div className="kpi-val">{fmtMoney(totalSalesExVAT)}</div><div className="kpi-lbl">Net Sales</div></div>
            <div className="report-kpi kpi-purple"><div className="kpi-val">{fmtMoney(totalOutputTax)}</div><div className="kpi-lbl">Output VAT ({vatRate}%)</div></div>
          </div>
          <div className="grid-wrap">
            <table className="data-grid report-table">
              <thead><tr><th>INVOICE #</th><th>CUSTOMER</th><th>DATE</th><th className="col-money">NET</th><th className="col-money">VAT RATE</th><th className="col-money">VAT AMOUNT</th><th className="col-money">TOTAL</th></tr></thead>
              <tbody>
                {loading && <tr><td colSpan="7" className="empty">Loading...</td></tr>}
                {!loading && outputTaxItems.length === 0 && <tr><td colSpan="7" className="empty">No invoices in this period</td></tr>}
                {!loading && outputTaxItems.map((inv, i) => (
                  <tr key={i} className={i % 2 ? 'alt' : ''}>
                    <td className="code-cell">{inv.invoice_no}</td>
                    <td>{inv.customer || '—'}</td>
                    <td>{inv.date}</td>
                    <td className="col-money">{fmtMoney(inv.subtotal)}</td>
                    <td className="col-money">{inv.vat_rate}%</td>
                    <td className="col-money cr">{fmtMoney(inv.vat_amount)}</td>
                    <td className="col-money">{fmtMoney(inv.grand_total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr className="total-row"><td colSpan="3"><b>TOTAL</b></td><td className="col-money"><b>{fmtMoney(totalSalesExVAT)}</b></td><td></td><td className="col-money cr"><b>{fmtMoney(totalOutputTax)}</b></td><td className="col-money"><b>{fmtMoney(totalSalesIncVAT)}</b></td></tr></tfoot>
            </table>
          </div>
        </div>
        <div className="report-section">
          <h4 style={{ color: '#3b82f6' }}>📦 Box 2: Zero-Rated & Exempt Supplies</h4>
          <div className="report-kpi-row">
            <div className="report-kpi kpi-blue"><div className="kpi-val">{fmtMoney(zeroRatedSales)}</div><div className="kpi-lbl">Zero-Rated</div></div>
            <div className="report-kpi kpi-amber"><div className="kpi-val">{fmtMoney(exemptSales)}</div><div className="kpi-lbl">Exempt</div></div>
          </div>
        </div>
        <div className="report-section">
          <h4 style={{ color: '#dc2626' }}>📉 Box 3: Input Tax — Purchases</h4>
          <div className="report-kpi-row" style={{ marginBottom: 12 }}>
            <div className="report-kpi kpi-red"><div className="kpi-val">{filteredPurchases.length}</div><div className="kpi-lbl">Purchase Invoices</div></div>
            <div className="report-kpi kpi-blue"><div className="kpi-val">{fmtMoney(totalPurchasesExVAT)}</div><div className="kpi-lbl">Net Purchases</div></div>
            <div className="report-kpi kpi-purple"><div className="kpi-val">{fmtMoney(effectiveInputTax)}</div><div className="kpi-lbl">Input VAT ({vatRate}%)</div></div>
          </div>
          {inputTaxItems.length > 0 ? (
            <div className="grid-wrap">
              <table className="data-grid report-table">
                <thead><tr><th>INVOICE #</th><th>SUPPLIER</th><th>DATE</th><th className="col-money">NET</th><th className="col-money">VAT RATE</th><th className="col-money">VAT AMOUNT</th><th className="col-money">TOTAL</th></tr></thead>
                <tbody>
                  {inputTaxItems.map((pi, i) => (
                    <tr key={i} className={i % 2 ? 'alt' : ''}>
                      <td className="code-cell">{pi.invoice_no}</td>
                      <td>{pi.supplier || '—'}</td>
                      <td>{pi.date}</td>
                      <td className="col-money">{fmtMoney(pi.subtotal)}</td>
                      <td className="col-money">{pi.vat_rate}%</td>
                      <td className="col-money dr">{fmtMoney(pi.vat_amount)}</td>
                      <td className="col-money">{fmtMoney(pi.grand_total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr className="total-row"><td colSpan="3"><b>TOTAL</b></td><td className="col-money"><b>{fmtMoney(totalPurchasesExVAT)}</b></td><td></td><td className="col-money dr"><b>{fmtMoney(totalInputTax)}</b></td><td className="col-money"><b>{fmtMoney(totalPurchasesIncVAT)}</b></td></tr></tfoot>
              </table>
            </div>
          ) : (
            <p className="empty" style={{ marginTop: 8 }}>No purchase invoices found. Input VAT estimated from expense accounts: <b>{fmtMoney(fallbackInputTax)}</b></p>
          )}
        </div>
        <div className="report-section">
          <h4>💰 Box 4: VAT Settlement</h4>
          <table className="data-grid report-table">
            <tbody>
              <tr><td>Total Output Tax (VAT collected)</td><td className="col-money cr"><b>{fmtMoney(totalOutputTax)}</b></td></tr>
              <tr><td>Total Input Tax (VAT paid on purchases)</td><td className="col-money dr"><b>{fmtMoney(effectiveInputTax)}</b></td></tr>
            </tbody>
            <tfoot><tr className="total-row"><td><b>Net VAT {netVATPayable >= 0 ? 'Payable to Authority' : 'Refundable from Authority'}</b></td><td className={`col-money ${netVATPayable >= 0 ? 'dr' : 'cr'}`}><b>{fmtMoney(Math.abs(netVATPayable))}</b></td></tr></tfoot>
          </table>
        </div>
        <div className="report-section">
          <h4>{regime === 'zatca' ? '🏛️ ZATCA Compliance' : '🏛️ UAE FTA Compliance'}</h4>
          <table className="data-grid report-table">
            <tbody>
              <tr><td>Company</td><td><b>{profile?.company_name || '—'}</b></td></tr>
              <tr><td>VAT Number</td><td><b>{profile?.vat_number || 'Not registered'}</b></td></tr>
              <tr><td>Country</td><td>{profile?.country || '—'}</td></tr>
              <tr><td>Filing Period</td><td>{filingType.charAt(0).toUpperCase() + filingType.slice(1)} | {fromDate} to {toDate}</td></tr>
              {regime === 'zatca' && <>
                <tr><td>ZATCA e-Invoice</td><td><span className={`badge ${profile?.zatca_enabled ? 'b-green' : 'b-amber'}`}>{profile?.zatca_enabled ? 'Enabled' : 'Disabled'}</span></td></tr>
                <tr><td>CSID Token</td><td><span className={`badge ${profile?.zatca_csid ? 'b-green' : 'b-red'}`}>{profile?.zatca_csid ? 'Configured' : 'Not Configured'}</span></td></tr>
              </>}
              {regime === 'uae' && <>
                <tr><td>FTA Portal</td><td>https://tax.gov.ae</td></tr>
                <tr><td>EmaraTax</td><td>FTA's online filing portal</td></tr>
              </>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

const StockAgingReport = ({ fmtMoney }) => {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [asOfDate, setAsOfDate] = useState(() => new Date().toISOString().split('T')[0])
  useEffect(() => {
    setLoading(true)
    supabase.from('products').select('*').then(({ data }) => { setProducts(data || []); setLoading(false) })
  }, [])

  const ageBuckets = ['0-30 days', '31-60 days', '61-90 days', '91-180 days', '180+ days']
  const bucketColors = ['#10b981', '#3b82f6', '#f59e0b', '#f97316', '#ef4444']

  const agedProducts = products.filter((p) => p.status !== 'Discontinued' && Number(p.stock_quantity || 0) > 0).map((p) => {
    const created = new Date(p.created_at || p.updated_at || new Date())
    const now = new Date(asOfDate)
    const daysSince = Math.max(0, Math.floor((now - created) / (1000 * 60 * 60 * 24)))
    const qty = Number(p.stock_quantity || 0)
    const cost = Number(p.cost_price || 0)
    let bucket = '180+ days'
    if (daysSince <= 30) bucket = '0-30 days'
    else if (daysSince <= 60) bucket = '31-60 days'
    else if (daysSince <= 90) bucket = '61-90 days'
    else if (daysSince <= 180) bucket = '91-180 days'
    return { ...p, daysSince, qty, cost, value: qty * cost, bucket }
  }).sort((a, b) => b.daysSince - a.daysSince)

  const bucketSummary = ageBuckets.map((b, i) => {
    const items = agedProducts.filter((p) => p.bucket === b)
    return { name: b, color: bucketColors[i], count: items.length, qty: items.reduce((s, p) => s + p.qty, 0), value: items.reduce((s, p) => s + p.value, 0) }
  })
  const totalValue = agedProducts.reduce((s, p) => s + p.value, 0)
  const totalQty = agedProducts.reduce((s, p) => s + p.qty, 0)

  const printReport = () => {
    const w = window.open('', '_blank')
    w.document.write('<html><head><title>Stock Aging</title><style>body{font-family:Arial,sans-serif;padding:30px}h1{color:#1e1b4b;font-size:20px}h3{color:#475569;margin-top:16px}table{width:100%;border-collapse:collapse;margin-top:8px}th,td{padding:5px 10px;border:1px solid #e2e8f0;font-size:12px}th{text-align:left;background:#f1f5f9}.col-r{text-align:right}.total{font-weight:700;background:#f8fafc}.hdr{text-align:center;margin-bottom:20px}.sub{color:#64748b;font-size:12px}</style></head><body>')
    w.document.write('<div class="hdr"><h1>⏳ Stock Aging Report</h1><div class="sub">As of ' + asOfDate + '</div></div>')
    w.document.write('<h3>Summary by Age Bucket</h3><table><tr><th>Age Bucket</th><th>Items</th><th class="col-r">Qty</th><th class="col-r">Value</th></tr>')
    bucketSummary.forEach((b) => { w.document.write('<tr><td>' + b.name + '</td><td>' + b.count + '</td><td class="col-r">' + b.qty + '</td><td class="col-r">' + fmtMoney(b.value) + '</td></tr>') })
    w.document.write('<tr class="total"><td><b>TOTAL</b></td><td><b>' + agedProducts.length + '</b></td><td class="col-r"><b>' + totalQty + '</b></td><td class="col-r"><b>' + fmtMoney(totalValue) + '</b></td></tr></table>')
    w.document.write('<h3>Item Details</h3><table><tr><th>Code</th><th>Name</th><th>Qty</th><th>Cost</th><th class="col-r">Value</th><th class="col-r">Days</th><th>Bucket</th></tr>')
    agedProducts.forEach((p) => { w.document.write('<tr><td>' + (p.code || '') + '</td><td>' + (p.name || '') + '</td><td>' + p.qty + '</td><td class="col-r">' + fmtMoney(p.cost) + '</td><td class="col-r">' + fmtMoney(p.value) + '</td><td class="col-r">' + p.daysSince + '</td><td>' + p.bucket + '</td></tr>') })
    w.document.write('</table></body></html>')
    w.document.close(); w.print()
  }

  return (
    <div className="report-wrap">
       <div className="report-head">
         <h3>⏳ Stock Aging Report</h3>
         <div className="report-controls">
           <label>As of Date <input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} /></label>
           <ShareBar title="Stock Aging Report" onPrint={printReport} onPdf={printReport} text={"Stock Aging Report generated on " + new Date().toLocaleDateString()} />
         </div>
       </div>
      <div className="report-kpi-row">
        <div className="report-kpi kpi-blue"><div className="kpi-val">{agedProducts.length}</div><div className="kpi-lbl">Items</div></div>
        <div className="report-kpi kpi-green"><div className="kpi-val">{totalQty}</div><div className="kpi-lbl">Total Qty</div></div>
        <div className="report-kpi kpi-purple"><div className="kpi-val">{fmtMoney(totalValue)}</div><div className="kpi-lbl">Total Value</div></div>
      </div>
      <div className="report-section" style={{ marginTop: 12 }}>
        <h4>Value by Age Bucket</h4>
        {bucketSummary.map((b) => (
          <div key={b.name} className="report-bar-row">
            <span className="bar-label">{b.name}</span>
            <div className="bar-track"><div className="bar-fill" style={{ width: `${totalValue ? (b.value / totalValue) * 100 : 0}%`, background: b.color }}></div></div>
            <span className="bar-value">{fmtMoney(b.value)}</span>
          </div>
        ))}
      </div>
      <div className="report-section" style={{ marginTop: 16 }}>
        <h4>Item Details ({agedProducts.length} items)</h4>
        <div className="grid-wrap">
          <table className="data-grid report-table">
            <thead><tr><th>CODE</th><th>NAME</th><th className="col-money">QTY</th><th className="col-money">COST</th><th className="col-money">VALUE</th><th className="col-money">DAYS</th><th>AGE BUCKET</th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan="7" className="empty">Loading...</td></tr>}
              {!loading && agedProducts.length === 0 && <tr><td colSpan="7" className="empty">No items with stock</td></tr>}
              {!loading && agedProducts.map((p, i) => (
                <tr key={p.id || i} className={i % 2 ? 'alt' : ''}>
                  <td className="code-cell">{p.code || '—'}</td>
                  <td>{p.name || '—'}</td>
                  <td className="col-money">{p.qty}</td>
                  <td className="col-money">{fmtMoney(p.cost)}</td>
                  <td className="col-money">{fmtMoney(p.value)}</td>
                  <td className="col-money">{p.daysSince}</td>
                  <td><span className="badge" style={{ background: bucketColors[ageBuckets.indexOf(p.bucket)] + '18', color: bucketColors[ageBuckets.indexOf(p.bucket)] }}>{p.bucket}</span></td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr className="total-row"><td colSpan="2"><b>TOTAL</b></td><td className="col-money"><b>{totalQty}</b></td><td></td><td className="col-money"><b>{fmtMoney(totalValue)}</b></td><td></td><td></td></tr></tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}

const CashFlowReport = ({ accounts, fmtMoney }) => {
  const [fromDate, setFromDate] = useState(() => { const d = new Date(); d.setFullYear(d.getFullYear() - 1); return d.toISOString().split('T')[0] })
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0])

  const cashAccounts = accounts.filter((a) => a.type === 'Asset' && /cash|bank|petty|safe/i.test(a.name || ''))
  const accMap = Object.fromEntries(accounts.map((a) => [a.id, a]))
  const isCashAcc = (a) => a && a.type === 'Asset' && /cash|bank|petty|safe/i.test(a.name || '')
  const bucketOf = (a) => {
    if (!a) return 'operating'
    const n = (a.name || '').toLowerCase()
    if (a.type === 'Income' || a.type === 'Expense') return 'operating'
    if (a.type === 'Equity') return 'financing'
    if (a.type === 'Asset') {
      if (/receiv|debtor|\bar\b/i.test(n)) return 'operating'
      if (/fixed|fa:|plant|equipment|motor|vehicle|building|property/i.test(n)) return 'investing'
      return 'investing'
    }
    if (a.type === 'Liability') {
      if (/payab|creditor|\bap\b/i.test(n)) return 'operating'
      if (/loan|borrow|finance|lease/i.test(n)) return 'financing'
      return 'financing'
    }
    return 'operating'
  }

  const [lines, setLines] = useState([])
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    (async () => {
      const { data: jes } = await supabase.from('journal_entries').select('id, entry_date').gte('entry_date', fromDate).lte('entry_date', toDate)
      const ids = (jes || []).map((j) => j.id)
      let ld: any[] = []
      if (ids.length) { const { data } = await supabase.from('journal_lines').select('entry_id, account_id, debit, credit').in('entry_id', ids); ld = data || [] }
      setLines(ld); setLoaded(true)
    })()
  }, [fromDate, toDate])

  let opIn = 0, opOut = 0, invIn = 0, invOut = 0, finIn = 0, finOut = 0
  const entryMap: any = {}
  for (const l of lines) (entryMap[l.entry_id] = entryMap[l.entry_id] || []).push(l)
  for (const id in entryMap) {
    const ls = entryMap[id]
    const cash = ls.filter((l: any) => isCashAcc(accMap[l.account_id]))
    const noncash = ls.filter((l: any) => !isCashAcc(accMap[l.account_id]))
    const cashIn = cash.reduce((s: number, l: any) => s + Number(l.debit || 0), 0)
    const cashOut = cash.reduce((s: number, l: any) => s + Number(l.credit || 0), 0)
    const net = cashIn - cashOut
    if (noncash.length === 0 || net === 0) continue
    const totalNon = noncash.reduce((s: number, l: any) => s + Math.abs(Number(l.debit || 0) - Number(l.credit || 0)), 0) || 1
    for (const l of noncash) {
      const w = Math.abs(Number(l.debit || 0) - Number(l.credit || 0)) / totalNon
      const amt = net * w
      const b = bucketOf(accMap[l.account_id])
      if (b === 'operating') { if (amt >= 0) opIn += amt; else opOut += -amt }
      else if (b === 'investing') { if (amt >= 0) invIn += amt; else invOut += -amt }
      else { if (amt >= 0) finIn += amt; else finOut += -amt }
    }
  }
  const operating = opIn - opOut
  const investing = invIn - invOut
  const financing = finIn - finOut
  const netCash = operating + investing + financing
  const openingBalance = cashAccounts.reduce((s, a) => s + Number(a.opening_balance || 0), 0)
  const closingBalance = openingBalance + netCash

  const printReport = () => {
    const w = window.open('', '_blank')
    const row = (label: string, amt: number, cls = '') => '<tr><td>' + label + '</td><td class="col-r ' + cls + '">' + fmtMoney(amt) + '</td></tr>'
    w.document.write('<html><head><title>Cash Flow</title><style>body{font-family:Arial,sans-serif;padding:30px}h1{color:#1e1b4b;font-size:20px}h3{color:#475569;border-bottom:2px solid #e2e8f0;padding-bottom:4px;margin-top:20px}table{width:100%;border-collapse:collapse;margin-top:8px}th,td{padding:6px 12px;border:1px solid #e2e8f0;font-size:12px}th{text-align:left;background:#f1f5f9}.col-r{text-align:right}.total{font-weight:700;background:#f8fafc}.pos{color:#059669}.neg{color:#dc2626}.hdr{text-align:center;margin-bottom:20px}.sub{color:#64748b;font-size:12px}</style></head><body>')
    w.document.write('<div class="hdr"><h1>💵 Cash Flow Statement</h1><div class="sub">' + fromDate + ' to ' + toDate + '</div></div>')
    w.document.write('<h3>Operating Activities</h3><table>' + row('Cash Received from Customers / Income', opIn, 'pos') + row('Cash Paid for Expenses / Suppliers', opOut, 'neg') + '<tr class="total"><td><b>Net Operating Cash Flow</b></td><td class="col-r ' + (operating >= 0 ? 'pos' : 'neg') + '"><b>' + fmtMoney(Math.abs(operating)) + '</b></td></tr></table>')
    w.document.write('<h3>Investing Activities</h3><table>' + row('Proceeds from Sale of Assets', invIn, 'pos') + row('Purchase of Fixed Assets', invOut, 'neg') + '<tr class="total"><td><b>Net Investing Cash Flow</b></td><td class="col-r ' + (investing >= 0 ? 'pos' : 'neg') + '"><b>' + fmtMoney(Math.abs(investing)) + '</b></td></tr></table>')
    w.document.write('<h3>Financing Activities</h3><table>' + row('Capital Introduced / Loans Received', finIn, 'pos') + row('Loans Repaid / Drawings', finOut, 'neg') + '<tr class="total"><td><b>Net Financing Cash Flow</b></td><td class="col-r ' + (financing >= 0 ? 'pos' : 'neg') + '"><b>' + fmtMoney(Math.abs(financing)) + '</b></td></tr></table>')
    w.document.write('<hr><table>' + row('Net Change in Cash', Math.abs(netCash), netCash >= 0 ? 'pos' : 'neg') + row('Opening Balance', openingBalance) + '<tr class="total"><td><b>Closing Balance</b></td><td class="col-r"><b>' + fmtMoney(closingBalance) + '</b></td></tr></table>')
    w.document.write('</body></html>')
    w.document.close(); w.print()
  }

  return (
    <div className="report-wrap">
       <div className="report-head">
         <h3>💵 Cash Flow Statement</h3>
         <div className="report-controls">
           <label>From <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></label>
           <label>To <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} /></label>
           <ShareBar title="Cash Flow Statement" onPrint={printReport} onPdf={printReport} text={"Cash Flow Statement generated on " + new Date().toLocaleDateString()} />
         </div>
       </div>
      <div className={`report-balance-bar ${netCash >= 0 ? 'balanced' : 'unbalanced'}`}>
        <span>Net Cash Flow: <b>{fmtMoney(Math.abs(netCash))}</b></span>
        <span>Opening: <b>{fmtMoney(openingBalance)}</b></span>
        <span>Closing: <b>{fmtMoney(closingBalance)}</b></span>
      </div>
      <div className="report-sections">
        <div className="report-section">
          <h4 style={{ color: '#059669' }}>📈 Operating Activities</h4>
          <table className="data-grid report-table">
            <thead><tr><th>DESCRIPTION</th><th className="col-money">AMOUNT</th></tr></thead>
             <tbody>
               <tr><td>Cash Received from Customers / Income</td><td className="col-money cr">{fmtMoney(opIn)}</td></tr>
               <tr><td>Cash Paid for Expenses / Suppliers</td><td className="col-money dr">{fmtMoney(opOut)}</td></tr>
             </tbody>
            <tfoot><tr className="total-row"><td><b>Net Operating Cash Flow</b></td><td className={`col-money ${operating >= 0 ? 'cr' : 'dr'}`}><b>{fmtMoney(Math.abs(operating))}</b></td></tr></tfoot>
          </table>
        </div>
        <div className="report-section">
          <h4 style={{ color: '#3b82f6' }}>🏗️ Investing Activities</h4>
          <table className="data-grid report-table">
            <thead><tr><th>DESCRIPTION</th><th className="col-money">AMOUNT</th></tr></thead>
             <tbody>
               <tr><td>Proceeds from Sale of Assets</td><td className="col-money cr">{fmtMoney(invIn)}</td></tr>
               <tr><td>Purchase of Fixed Assets</td><td className="col-money dr">{fmtMoney(invOut)}</td></tr>
             </tbody>
             <tfoot><tr className="total-row"><td><b>Net Investing Cash Flow</b></td><td className={`col-money ${investing >= 0 ? 'cr' : 'dr'}`}><b>{fmtMoney(Math.abs(investing))}</b></td></tr></tfoot>
          </table>
        </div>
        <div className="report-section">
          <h4 style={{ color: '#8b5cf6' }}>🏦 Financing Activities</h4>
          <table className="data-grid report-table">
            <thead><tr><th>DESCRIPTION</th><th className="col-money">AMOUNT</th></tr></thead>
             <tbody>
               <tr><td>Capital Introduced / Loans Received</td><td className="col-money cr">{fmtMoney(finIn)}</td></tr>
               <tr><td>Loans Repaid / Drawings</td><td className="col-money dr">{fmtMoney(finOut)}</td></tr>
             </tbody>
            <tfoot><tr className="total-row"><td><b>Net Financing Cash Flow</b></td><td className={`col-money ${financing >= 0 ? 'cr' : 'dr'}`}><b>{fmtMoney(Math.abs(financing))}</b></td></tr></tfoot>
          </table>
        </div>
        <div className="report-section">
          <h4>💵 Summary</h4>
          <table className="data-grid report-table">
            <tbody>
              <tr><td><b>Net Change in Cash</b></td><td className={`col-money ${netCash >= 0 ? 'cr' : 'dr'}`}><b>{fmtMoney(Math.abs(netCash))}</b></td></tr>
              <tr><td>Opening Cash Balance</td><td className="col-money"><b>{fmtMoney(openingBalance)}</b></td></tr>
            </tbody>
            <tfoot><tr className="total-row"><td><b>Closing Cash Balance</b></td><td className="col-money"><b>{fmtMoney(closingBalance)}</b></td></tr></tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}

const ExchangeRates = ({ fmtMoney }) => {
  const [rates, setRates] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null)
  const [search, setSearch] = useState('')
  const wrapRef = useRef(null)
  const firstRef = useRef(null)
  useEffect(() => { if (form && firstRef.current) firstRef.current.focus() }, [form])

  const loadRates = async () => {
    setLoading(true)
    const { data } = await supabase.from('exchange_rates').select('*').order('rate_date', { ascending: false }).limit(200)
    setRates(data || [])
    setLoading(false)
  }
  useEffect(() => { loadRates() }, [])

  const filtered = !search ? rates : rates.filter((r) =>
    r.from_currency.toLowerCase().includes(search.toLowerCase()) ||
    r.to_currency.toLowerCase().includes(search.toLowerCase()) ||
    String(r.rate).includes(search)
  )

  const saveRate = async () => {
    if (!form.from_currency || !form.to_currency || !form.rate || !form.rate_date) {
      alert('From currency, to currency, rate, and date are required.')
      return
    }
    setForm({ ...form, saving: true })
    if (form.id) {
      const { error } = await supabase.from('exchange_rates').update({
        from_currency: form.from_currency, to_currency: form.to_currency, rate: form.rate,
        rate_date: form.rate_date, rate_type: form.rate_type, source: form.source, is_active: form.is_active
      }).eq('id', form.id)
      if (error) { alert('Error: ' + error.message); setForm({ ...form, saving: false }); return }
    } else {
      const { error } = await supabase.from('exchange_rates').insert({
        from_currency: form.from_currency, to_currency: form.to_currency, rate: form.rate,
        rate_date: form.rate_date, rate_type: form.rate_type || 'Spot', source: form.source, is_active: true
      })
      if (error) { alert('Error: ' + error.message); setForm({ ...form, saving: false }); return }
    }
    setForm(null)
    loadRates()
  }

  const deleteRate = async (r) => {
    if (!window.confirm(`Delete rate ${r.from_currency}→${r.to_currency} (${r.rate})?`)) return
    await supabase.from('exchange_rates').delete().eq('id', r.id)
    loadRates()
  }

  const toggleActive = async (r) => {
    await supabase.from('exchange_rates').update({ is_active: !r.is_active }).eq('id', r.id)
    loadRates()
  }

  const CURRENCIES = ['AED', 'SAR', 'USD', 'EUR', 'GBP', 'INR', 'PKR', 'KWD', 'BHD', 'OMR', 'QAR']

  if (!form) {
    return (
      <div className="report-wrap">
        <div className="coa-head">
          <h3>💱 Exchange Rates</h3>
          <div className="coa-head-right">
            <input className="coa-search" placeholder="🔍 Search currency, rate..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <button className="btn-add" onClick={() => setForm({
              id: null, from_currency: '', to_currency: 'AED', rate: '', rate_date: new Date().toISOString().split('T')[0],
              rate_type: 'Spot', source: '', is_active: true, saving: false
            })}>＋ New Rate</button>
          </div>
        </div>
        <div className="grid-wrap">
          <table className="data-grid">
            <thead>
              <tr>
                <th className="th-actions"></th>
                <th>FROM</th>
                <th>TO</th>
                <th className="col-money">RATE</th>
                <th>DATE</th>
                <th>TYPE</th>
                <th>SOURCE</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan="8" className="empty">Loading...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan="8" className="empty">No exchange rates found</td></tr>}
              {!loading && filtered.map((r, i) => (
                <tr key={r.id || i} className={i % 2 ? 'alt' : ''}>
                  <td className="td-actions">
                    <button className="act edit" title="Edit" onClick={() => setForm({ ...r, saving: false })}>✏️</button>
                    <button className="act del" title="Delete" onClick={() => deleteRate(r)}>🗑️</button>
                  </td>
                  <td><b>{r.from_currency}</b></td>
                  <td>{r.to_currency}</td>
                  <td className="col-money">{fmtMoney(r.rate, r.to_currency)}</td>
                  <td>{r.rate_date}</td>
                  <td>{r.rate_type || 'Spot'}</td>
                  <td>{r.source || '—'}</td>
                  <td><button className={`status-toggle ${r.is_active ? 'active' : ''}`} onClick={() => toggleActive(r)} title={r.is_active ? 'Deactivate' : 'Activate'}>{r.is_active ? '✓' : '○'}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="report-wrap" ref={wrapRef} onKeyDown={(e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        if (e.target.tagName === 'TEXTAREA') return
        e.preventDefault()
        const inputs = Array.from(wrapRef.current.querySelectorAll('input, select'))
        const idx = inputs.indexOf(e.target)
        if (idx < inputs.length - 1) inputs[idx + 1].focus()
        else { const btn = wrapRef.current.querySelector('.btn-primary'); if (btn) btn.click() }
      }
    }}>
      <div className="coa-head">
        <h3>✏️ {form.id ? 'Edit' : 'New'} Exchange Rate</h3>
        <button className="btn-cancel" onClick={() => setForm(null)}>✕ Cancel</button>
      </div>
      {form.error && <div className="inv-error">⚠️ {form.error}</div>}
      <div className="inv-grid coa-form-grid" style={{ marginTop: 16 }}>
        <label>From Currency *
          <select ref={firstRef} value={form.from_currency} onChange={(e) => setForm({ ...form, from_currency: e.target.value })}>
            <option value="">Select</option>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label>To Currency *
          <select value={form.to_currency} onChange={(e) => setForm({ ...form, to_currency: e.target.value })}>
            {CURRENCIES.map((c) => <option key={c} value={c} disabled={c === form.from_currency}>{c}</option>)}
          </select>
        </label>
        <label>Rate *
          <input type="number" step="0.000001" min="0" value={form.rate} onChange={(e) => setForm({ ...form, rate: Number(e.target.value) })} placeholder="e.g. 3.75" />
        </label>
        <label>Date *
          <input type="date" value={form.rate_date} onChange={(e) => setForm({ ...form, rate_date: e.target.value })} />
        </label>
        <label>Type
          <select value={form.rate_type} onChange={(e) => setForm({ ...form, rate_type: e.target.value })}>
            <option value="Spot">Spot</option>
            <option value="Forward">Forward</option>
            <option value="Monthly">Monthly Average</option>
          </select>
        </label>
        <label>Source
          <input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="e.g. FED, ECB, Manual" />
        </label>
      </div>
      <div className="inv-actions">
        <button className="btn-primary" disabled={form.saving} onClick={saveRate}>{form.saving ? 'Saving…' : '💾 Save Rate'}</button>
      </div>
    </div>
  )
}

const TrialBalanceReport = ({ accounts, fmtMoney }) => {
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear())
  const isDebitNormal = (t) => t === 'Asset' || t === 'Expense'
  const rows = accounts.map((a) => {
    const bal = Number(a.current_balance || 0)
    const dr = isDebitNormal(a.type) ? (bal > 0 ? bal : 0) : (bal < 0 ? -bal : 0)
    const cr = isDebitNormal(a.type) ? (bal < 0 ? -bal : 0) : (bal > 0 ? bal : 0)
    return { ...a, dr, cr }
  }).filter((a) => a.dr !== 0 || a.cr !== 0).sort((a, b) => a.code.localeCompare(b.code))
  const debitAccounts = rows.filter((a) => a.dr > 0)
  const creditAccounts = rows.filter((a) => a.cr > 0)
  const totalDebits = debitAccounts.reduce((s, a) => s + a.dr, 0)
  const totalCredits = creditAccounts.reduce((s, a) => s + a.cr, 0)
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01

  const printReport = () => {
    const w = window.open('', '_blank')
    w.document.write('<html><head><title>Trial Balance</title><style>body{font-family:Arial,sans-serif;padding:30px}h1{color:#1e1b4b;font-size:20px}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{padding:6px 12px;border:1px solid #e2e8f0;text-align:right;font-size:12px}th{background:#f1f5f9;text-align:left}td:first-child{text-align:left}.dr{color:#dc2626}.cr{color:#059669}.total{font-weight:700;background:#f8fafc}.bal{font-weight:700;color:#10b981}.unbal{font-weight:700;color:#ef4444}.hdr{text-align:center;margin-bottom:20px}.sub{color:#64748b;font-size:12px}</style></head><body>')
    w.document.write('<div class="hdr"><h1>📊 Trial Balance Report</h1><div class="sub">Fiscal Year: ' + fiscalYear + ' | Generated: ' + new Date().toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' }) + '</div></div>')
    w.document.write('<table><tr><th>Account</th><th>Name</th><th>Type</th><th>Debit</th><th>Credit</th></tr>')
    debitAccounts.forEach((a) => { w.document.write('<tr><td>' + a.code + '</td><td>' + a.name + '</td><td>' + a.type + '</td><td class="dr">' + fmtMoney(a.dr) + '</td><td></td></tr>') })
    creditAccounts.forEach((a) => { w.document.write('<tr><td>' + a.code + '</td><td>' + a.name + '</td><td>' + a.type + '</td><td></td><td class="cr">' + fmtMoney(a.cr) + '</td></tr>') })
    w.document.write('<tr class="total"><td colspan="3"><b>TOTAL</b></td><td class="dr"><b>' + fmtMoney(totalDebits) + '</b></td><td class="cr"><b>' + fmtMoney(totalCredits) + '</b></td></tr>')
    w.document.write('<tr class="total"><td colspan="3"><b>Difference</b></td><td colspan="2" class="' + (isBalanced ? 'bal' : 'unbal') + '"><b>' + fmtMoney(Math.abs(totalDebits - totalCredits)) + (isBalanced ? ' ✓ Balanced' : ' ✗ Unbalanced') + '</b></td></tr>')
    w.document.write('</table></body></html>')
    w.document.close()
    w.print()
  }

  return (
    <div className="report-wrap">
       <div className="report-head">
         <h3>📊 Trial Balance Report</h3>
         <div className="report-controls">
           <label>Fiscal Year
             <select value={fiscalYear} onChange={(e) => setFiscalYear(Number(e.target.value))}>
               {[0, 1, 2].map((off) => <option key={off} value={new Date().getFullYear() - off}>{new Date().getFullYear() - off}</option>)}
             </select>
           </label>
           <ShareBar title="Trial Balance Report" onPrint={printReport} onPdf={printReport} text={"Trial Balance Report generated on " + new Date().toLocaleDateString()} />
         </div>
       </div>
      <div className={`report-balance-bar ${isBalanced ? 'balanced' : 'unbalanced'}`}>
        <span>Total Debits: <b>{fmtMoney(totalDebits)}</b></span>
        <span>Total Credits: <b>{fmtMoney(totalCredits)}</b></span>
        <span>Difference: <b>{fmtMoney(Math.abs(totalDebits - totalCredits))}</b> {isBalanced ? '✓ Balanced' : '✗ Unbalanced'}</span>
      </div>
      <div className="grid-wrap">
        <table className="data-grid report-table">
          <thead>
            <tr>
              <th>ACCOUNT CODE</th>
              <th>ACCOUNT NAME</th>
              <th>TYPE</th>
              <th className="col-money">DEBIT</th>
              <th className="col-money">CREDIT</th>
            </tr>
          </thead>
          <tbody>
            {debitAccounts.length === 0 && creditAccounts.length === 0 && <tr><td colSpan="5" className="empty">No accounts with balances</td></tr>}
            {debitAccounts.map((a, i) => (
              <tr key={a.id || i} className={i % 2 ? 'alt' : ''}>
                <td className="code-cell">{a.code}</td>
                <td>{a.name}</td>
                <td><span className="badge b-blue">{a.type}</span></td>
                <td className="col-money dr">{fmtMoney(a.dr)}</td>
                <td className="col-money"></td>
              </tr>
            ))}
            {creditAccounts.map((a, i) => (
              <tr key={a.id || i} className={(debitAccounts.length + i) % 2 ? 'alt' : ''}>
                <td className="code-cell">{a.code}</td>
                <td>{a.name}</td>
                <td><span className="badge b-blue">{a.type}</span></td>
                <td className="col-money"></td>
                <td className="col-money cr">{fmtMoney(a.cr)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="total-row">
              <td colSpan="3"><b>TOTAL</b></td>
              <td className="col-money dr"><b>{fmtMoney(totalDebits)}</b></td>
              <td className="col-money cr"><b>{fmtMoney(totalCredits)}</b></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

const ProfitLossReport = ({ accounts, fmtMoney }) => {
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear())
  const [period, setPeriod] = useState('year')
  const revenueAccounts = accounts.filter((a) => a.type === 'Income' && Number(a.current_balance || 0) !== 0).sort((a, b) => a.code.localeCompare(b.code))
  const expenseAccounts = accounts.filter((a) => a.type === 'Expense' && Number(a.current_balance || 0) !== 0).sort((a, b) => a.code.localeCompare(b.code))
  const totalRevenue = revenueAccounts.reduce((s, a) => s + Math.abs(Number(a.current_balance || 0)), 0)
  const totalExpenses = expenseAccounts.reduce((s, a) => s + Math.abs(Number(a.current_balance || 0)), 0)
  const netProfit = totalRevenue - totalExpenses
  const isProfit = netProfit >= 0

  const printReport = () => {
    const w = window.open('', '_blank')
    w.document.write('<html><head><title>Profit & Loss</title><style>body{font-family:Arial,sans-serif;padding:30px}h1{color:#1e1b4b;font-size:20px}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{padding:6px 12px;border:1px solid #e2e8f0;font-size:12px}th{text-align:left;background:#f1f5f9}td:first-child{text-align:left}.col-r{text-align:right}.rev{color:#059669}.exp{color:#dc2626}.total{font-weight:700;background:#f8fafc}.profit{color:#059669;font-size:16px}.loss{color:#dc2626;font-size:16px}.hdr{text-align:center;margin-bottom:20px}.sub{color:#64748b;font-size:12px}</style></head><body>')
    w.document.write('<div class="hdr"><h1>💰 Profit & Loss Statement</h1><div class="sub">' + fiscalYear + ' | Generated: ' + new Date().toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' }) + '</div></div>')
    w.document.write('<h3>REVENUE</h3><table><tr><th>Account</th><th>Name</th><th class="col-r">Amount</th></tr>')
    revenueAccounts.forEach((a) => { w.document.write('<tr><td>' + a.code + '</td><td>' + a.name + '</td><td class="col-r rev">' + fmtMoney(Math.abs(Number(a.current_balance || 0))) + '</td></tr>') })
    w.document.write('<tr class="total"><td colspan="2"><b>Total Revenue</b></td><td class="col-r rev"><b>' + fmtMoney(totalRevenue) + '</b></td></tr></table>')
    w.document.write('<h3>EXPENSES</h3><table><tr><th>Account</th><th>Name</th><th class="col-r">Amount</th></tr>')
    expenseAccounts.forEach((a) => { w.document.write('<tr><td>' + a.code + '</td><td>' + a.name + '</td><td class="col-r exp">' + fmtMoney(Math.abs(Number(a.current_balance || 0))) + '</td></tr>') })
    w.document.write('<tr class="total"><td colspan="2"><b>Total Expenses</b></td><td class="col-r exp"><b>' + fmtMoney(totalExpenses) + '</b></td></tr></table>')
    w.document.write('<hr><table><tr class="total"><td colspan="2"><b>NET ' + (isProfit ? 'PROFIT' : 'LOSS') + '</b></td><td class="col-r ' + (isProfit ? 'profit' : 'loss') + '"><b>' + fmtMoney(Math.abs(netProfit)) + '</b></td></tr></table>')
    w.document.write('</body></html>')
    w.document.close()
    w.print()
  }

  return (
    <div className="report-wrap">
       <div className="report-head">
         <h3>💰 Profit & Loss Statement</h3>
         <div className="report-controls">
           <label>Fiscal Year
             <select value={fiscalYear} onChange={(e) => setFiscalYear(Number(e.target.value))}>
               {[0, 1, 2].map((off) => <option key={off} value={new Date().getFullYear() - off}>{new Date().getFullYear() - off}</option>)}
             </select>
           </label>
           <label>Period
             <select value={period} onChange={(e) => setPeriod(e.target.value)}>
               <option value="year">Full Year</option>
               <option value="q1">Q1</option>
               <option value="q2">Q2</option>
               <option value="q3">Q3</option>
               <option value="q4">Q4</option>
             </select>
           </label>
           <ShareBar title="Profit & Loss Statement" onPrint={printReport} onPdf={printReport} text={"Profit & Loss Statement generated on " + new Date().toLocaleDateString()} />
         </div>
       </div>
      <div className={`report-profit-bar ${isProfit ? 'profit' : 'loss'}`}>
        <span className="report-profit-label">NET {isProfit ? 'PROFIT' : 'LOSS'}</span>
        <span className="report-profit-amount">{fmtMoney(Math.abs(netProfit))}</span>
      </div>
      <div className="report-sections">
        <div className="report-section">
          <h4 className="rev-heading">📈 Revenue</h4>
          <table className="data-grid report-table">
            <thead><tr><th>CODE</th><th>ACCOUNT NAME</th><th className="col-money">AMOUNT</th></tr></thead>
            <tbody>
              {revenueAccounts.length === 0 && <tr><td colSpan="3" className="empty">No revenue accounts</td></tr>}
              {revenueAccounts.map((a, i) => (
                <tr key={a.id || i} className={i % 2 ? 'alt' : ''}>
                  <td className="code-cell">{a.code}</td>
                  <td>{a.name}</td>
                  <td className="col-money cr">{fmtMoney(Math.abs(Number(a.current_balance || 0)))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr className="total-row"><td colSpan="2"><b>Total Revenue</b></td><td className="col-money cr"><b>{fmtMoney(totalRevenue)}</b></td></tr></tfoot>
          </table>
        </div>
        <div className="report-section">
          <h4 className="exp-heading">📉 Expenses</h4>
          <table className="data-grid report-table">
            <thead><tr><th>CODE</th><th>ACCOUNT NAME</th><th className="col-money">AMOUNT</th></tr></thead>
            <tbody>
              {expenseAccounts.length === 0 && <tr><td colSpan="3" className="empty">No expense accounts</td></tr>}
              {expenseAccounts.map((a, i) => (
                <tr key={a.id || i} className={i % 2 ? 'alt' : ''}>
                  <td className="code-cell">{a.code}</td>
                  <td>{a.name}</td>
                  <td className="col-money dr">{fmtMoney(Math.abs(Number(a.current_balance || 0)))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr className="total-row"><td colSpan="2"><b>Total Expenses</b></td><td className="col-money dr"><b>{fmtMoney(totalExpenses)}</b></td></tr></tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}

const BalanceSheetReport = ({ accounts, fmtMoney }) => {
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0])
  const assetAccounts = accounts.filter((a) => a.type === 'Asset' && Number(a.current_balance || 0) !== 0).sort((a, b) => a.code.localeCompare(b.code))
  const liabilityAccounts = accounts.filter((a) => a.type === 'Liability' && Number(a.current_balance || 0) !== 0).sort((a, b) => a.code.localeCompare(b.code))
  const equityAccounts = accounts.filter((a) => a.type === 'Equity' && Number(a.current_balance || 0) !== 0).sort((a, b) => a.code.localeCompare(b.code))
  const revenueAccounts = accounts.filter((a) => a.type === 'Income')
  const expenseAccounts = accounts.filter((a) => a.type === 'Expense')
  const totalRevenue = revenueAccounts.reduce((s, a) => s + Number(a.current_balance || 0), 0)
  const totalExpenses = expenseAccounts.reduce((s, a) => s + Number(Math.abs(a.current_balance || 0)), 0)
  const netProfit = -totalRevenue - totalExpenses
  const totalAssets = assetAccounts.reduce((s, a) => s + Number(a.current_balance || 0), 0)
  const totalLiabilities = liabilityAccounts.reduce((s, a) => s + Math.abs(Number(a.current_balance || 0)), 0)
  const totalEquity = equityAccounts.reduce((s, a) => s + Math.abs(Number(a.current_balance || 0)), 0) + netProfit
  const isBalanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01

  const printReport = () => {
    const w = window.open('', '_blank')
    w.document.write('<html><head><title>Balance Sheet</title><style>body{font-family:Arial,sans-serif;padding:30px}h1{color:#1e1b4b;font-size:20px}h3{color:#475569;border-bottom:2px solid #e2e8f0;padding-bottom:4px;margin-top:20px}table{width:100%;border-collapse:collapse;margin-top:8px}th,td{padding:5px 10px;border:1px solid #e2e8f0;font-size:12px}th{text-align:left;background:#f1f5f9}td:first-child{text-align:left}.col-r{text-align:right}.total{font-weight:700;background:#f8fafc}.bal{color:#10b981;font-size:14px}.unbal{color:#ef4444;font-size:14px}.hdr{text-align:center;margin-bottom:20px}.sub{color:#64748b;font-size:12px}</style></head><body>')
    w.document.write('<div class="hdr"><h1>📋 Balance Sheet</h1><div class="sub">As of ' + asOfDate + ' | Generated: ' + new Date().toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' }) + '</div></div>')
    w.document.write('<h3>ASSETS</h3><table><tr><th>Code</th><th>Name</th><th class="col-r">Balance</th></tr>')
    assetAccounts.forEach((a) => { w.document.write('<tr><td>' + a.code + '</td><td>' + a.name + '</td><td class="col-r">' + fmtMoney(a.current_balance) + '</td></tr>') })
    w.document.write('<tr class="total"><td colspan="2"><b>Total Assets</b></td><td class="col-r"><b>' + fmtMoney(totalAssets) + '</b></td></tr></table>')
    w.document.write('<h3>LIABILITIES</h3><table><tr><th>Code</th><th>Name</th><th class="col-r">Balance</th></tr>')
    liabilityAccounts.forEach((a) => { w.document.write('<tr><td>' + a.code + '</td><td>' + a.name + '</td><td class="col-r">' + fmtMoney(Math.abs(a.current_balance)) + '</td></tr>') })
    w.document.write('<tr class="total"><td colspan="2"><b>Total Liabilities</b></td><td class="col-r"><b>' + fmtMoney(totalLiabilities) + '</b></td></tr></table>')
    w.document.write('<h3>EQUITY</h3><table><tr><th>Code</th><th>Name</th><th class="col-r">Balance</th></tr>')
    equityAccounts.forEach((a) => { w.document.write('<tr><td>' + a.code + '</td><td>' + a.name + '</td><td class="col-r">' + fmtMoney(Math.abs(a.current_balance)) + '</td></tr>') })
    if (netProfit !== 0) w.document.write('<tr><td>-</td><td>Retained Earnings (Net Profit)</td><td class="col-r">' + fmtMoney(netProfit) + '</td></tr>')
    w.document.write('<tr class="total"><td colspan="2"><b>Total Equity</b></td><td class="col-r"><b>' + fmtMoney(totalEquity) + '</b></td></tr></table>')
    w.document.write('<hr><table><tr class="total"><td><b>TOTAL LIABILITIES + EQUITY</b></td><td class="col-r ' + (isBalanced ? 'bal' : 'unbal') + '"><b>' + fmtMoney(totalLiabilities + totalEquity) + '</b></td></tr></table>')
    w.document.write('</body></html>')
    w.document.close()
    w.print()
  }

  return (
    <div className="report-wrap">
       <div className="report-head">
         <h3>📋 Balance Sheet</h3>
         <div className="report-controls">
           <label>As of Date
             <input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} />
           </label>
           <ShareBar title="Balance Sheet" onPrint={printReport} onPdf={printReport} text={"Balance Sheet generated on " + new Date().toLocaleDateString()} />
         </div>
       </div>
      <div className={`report-balance-bar ${isBalanced ? 'balanced' : 'unbalanced'}`}>
        <span>Assets: <b>{fmtMoney(totalAssets)}</b></span>
        <span>Liabilities: <b>{fmtMoney(totalLiabilities)}</b></span>
        <span>Equity: <b>{fmtMoney(totalEquity)}</b></span>
        <span>{isBalanced ? '✓ Balanced' : '✗ Difference: ' + fmtMoney(Math.abs(totalAssets - (totalLiabilities + totalEquity)))}</span>
      </div>
      <div className="report-sections">
        <div className="report-section">
          <h4>🏦 Assets ({assetAccounts.length})</h4>
          <table className="data-grid report-table">
            <thead><tr><th>CODE</th><th>ACCOUNT NAME</th><th className="col-money">BALANCE</th></tr></thead>
            <tbody>
              {assetAccounts.length === 0 && <tr><td colSpan="3" className="empty">No asset accounts</td></tr>}
              {assetAccounts.map((a, i) => (
                <tr key={a.id || i} className={i % 2 ? 'alt' : ''}>
                  <td className="code-cell">{a.code}</td>
                  <td>{a.name}</td>
                  <td className="col-money">{fmtMoney(a.current_balance)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr className="total-row"><td colSpan="2"><b>Total Assets</b></td><td className="col-money"><b>{fmtMoney(totalAssets)}</b></td></tr></tfoot>
          </table>
        </div>
        <div className="report-section">
          <h4>📑 Liabilities ({liabilityAccounts.length})</h4>
          <table className="data-grid report-table">
            <thead><tr><th>CODE</th><th>ACCOUNT NAME</th><th className="col-money">BALANCE</th></tr></thead>
            <tbody>
              {liabilityAccounts.length === 0 && <tr><td colSpan="3" className="empty">No liability accounts</td></tr>}
              {liabilityAccounts.map((a, i) => (
                <tr key={a.id || i} className={i % 2 ? 'alt' : ''}>
                  <td className="code-cell">{a.code}</td>
                  <td>{a.name}</td>
                  <td className="col-money">{fmtMoney(Math.abs(a.current_balance))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr className="total-row"><td colSpan="2"><b>Total Liabilities</b></td><td className="col-money"><b>{fmtMoney(totalLiabilities)}</b></td></tr></tfoot>
          </table>
          <h4 style={{ marginTop: 18 }}>🏛️ Equity ({equityAccounts.length})</h4>
          <table className="data-grid report-table">
            <thead><tr><th>CODE</th><th>ACCOUNT NAME</th><th className="col-money">BALANCE</th></tr></thead>
            <tbody>
              {equityAccounts.map((a, i) => (
                <tr key={a.id || i} className={i % 2 ? 'alt' : ''}>
                  <td className="code-cell">{a.code}</td>
                  <td>{a.name}</td>
                  <td className="col-money">{fmtMoney(Math.abs(a.current_balance))}</td>
                </tr>
              ))}
              {netProfit !== 0 && (
                <tr className="alt">
                  <td className="code-cell">—</td>
                  <td>Retained Earnings (Net Profit)</td>
                  <td className="col-money cr">{fmtMoney(netProfit)}</td>
                </tr>
              )}
            </tbody>
            <tfoot><tr className="total-row"><td colSpan="2"><b>Total Equity</b></td><td className="col-money"><b>{fmtMoney(totalEquity)}</b></td></tr></tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}

const BankRecon = ({ accounts, fmtMoney }) => {
  const [selectedAccount, setSelectedAccount] = useState('')
  const [statementDate, setStatementDate] = useState(() => new Date().toISOString().split('T')[0])
  const [statementBalance, setStatementBalance] = useState(0)
  const [reconItems, setReconItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [existingRecon, setExistingRecon] = useState(null)
  const [filter, setFilter] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [history, setHistory] = useState([])

  const bankAccounts = accounts.filter((a) => a.type === 'Asset' && (a.name?.toLowerCase().includes('bank') || a.name?.toLowerCase().includes('cash') || a.name?.toLowerCase().includes('safe')))
  const bookBalance = selectedAccount ? Number(bankAccounts.find((a) => a.id === selectedAccount)?.current_balance || 0) : 0
  const difference = Number(statementBalance || 0) - bookBalance

  const matchedCount = reconItems.filter((i) => i.matched).length
  const unmatchedCount = reconItems.filter((i) => !i.matched).length
  const clearedBook = reconItems.filter((i) => i.book_ind).reduce((s, i) => s + Number(i.amount || 0), 0)
  const clearedStatement = reconItems.filter((i) => i.statement_ind).reduce((s, i) => s + Number(i.amount || 0), 0)

  const loadHistory = async () => {
    if (!selectedAccount) { setHistory([]); return }
    const { data } = await supabase.from('bank_reconciliation')
      .select('*').eq('account_id', selectedAccount)
      .order('created_at', { ascending: false }).limit(10)
    setHistory(data || [])
  }

  const loadReconciliation = async () => {
    if (!selectedAccount) return
    setLoading(true)
    await loadHistory()
    const { data: recon } = await supabase.from('bank_reconciliation')
      .select('*').eq('account_id', selectedAccount)
      .order('created_at', { ascending: false }).limit(1)
    if (recon && recon.length) {
      setExistingRecon(recon[0])
      setStatementDate(recon[0].statement_date)
      setStatementBalance(recon[0].statement_balance)
      const { data: lines } = await supabase.from('bank_recon_lines')
        .select('*').eq('recon_id', recon[0].id).order('transaction_date')
      setReconItems(lines || [])
    } else {
      setExistingRecon(null)
      setReconItems([])
    }
    setLoading(false)
  }

  const loadTransactions = async () => {
    if (!selectedAccount) return
    setLoading(true)
    const allItems = []

    const { data: jeLines } = await supabase
      .from('journal_lines')
      .select('*, journal_entries!inner(*)')
      .eq('account_id', selectedAccount)
      .eq('journal_entries.status', 'Posted')
    for (const line of (jeLines || [])) {
      const je = Array.isArray(line.journal_entries) ? line.journal_entries[0] : line.journal_entries
      allItems.push({
        id: line.id, type: 'Journal Entry', date: (je?.entry_date || line.created_at || '').split('T')[0],
        description: line.description || je?.narration || je?.description || '—',
        ref: je?.reference || '', debit: Number(line.debit || 0), credit: Number(line.credit || 0),
        amount: Number(line.debit || 0) - Number(line.credit || 0),
        statement_ind: false, book_ind: true, matched: false,
      })
    }

    try {
      const { data: incPay } = await supabase.from('incoming_payments')
        .select('*').eq('bank_account', selectedAccount).neq('status', 'Cancelled')
      for (const p of (incPay || [])) {
        allItems.push({
          id: p.id, type: 'Incoming Payment', date: (p.payment_date || p.created_at || '').split('T')[0],
          description: `Receipt from ${p.customer_name || p.party_name || '—'}`, ref: p.reference_no || '',
          debit: Number(p.amount || 0), credit: 0, amount: Number(p.amount || 0),
          statement_ind: false, book_ind: true, matched: false,
        })
      }
    } catch (_) { /* table may not exist */ }

    try {
      const { data: outPay } = await supabase.from('outgoing_payments')
        .select('*').eq('bank_account', selectedAccount).neq('status', 'Cancelled')
      for (const p of (outPay || [])) {
        allItems.push({
          id: p.id, type: 'Outgoing Payment', date: (p.payment_date || p.created_at || '').split('T')[0],
          description: `Payment to ${p.supplier_name || p.party_name || '—'}`, ref: p.reference_no || '',
          debit: 0, credit: Number(p.amount || 0), amount: -Number(p.amount || 0),
          statement_ind: false, book_ind: true, matched: false,
        })
      }
    } catch (_) { /* table may not exist */ }

    try {
      const { data: deposits } = await supabase.from('bank_deposits')
        .select('*').eq('bank_account', selectedAccount).neq('status', 'Cancelled')
      for (const d of (deposits || [])) {
        allItems.push({
          id: d.id, type: 'Deposit', date: (d.deposit_date || d.created_at || '').split('T')[0],
          description: d.description || `Deposit #${d.deposit_no || ''}`, ref: d.deposit_no || '',
          debit: Number(d.amount || 0), credit: 0, amount: Number(d.amount || 0),
          statement_ind: false, book_ind: true, matched: false,
        })
      }
    } catch (_) { /* table may not exist */ }

    allItems.sort((a, b) => a.date > b.date ? -1 : 1)
    setReconItems(allItems)
    setLoading(false)
  }

  useEffect(() => {
    if (selectedAccount) { loadTransactions(); loadHistory() }
  }, [selectedAccount])

  const toggleStatement = (idx) => {
    setReconItems((prev) => prev.map((item, i) => i === idx ? { ...item, statement_ind: !item.statement_ind, matched: !item.statement_ind ? item.book_ind : false } : item))
  }

  const autoMatch = () => {
    setReconItems((prev) => {
      const updated = [...prev]
      const unmatched = updated.filter((i) => !i.matched)
      for (let i = 0; i < unmatched.length; i++) {
        for (let j = i + 1; j < unmatched.length; j++) {
          if (!unmatched[j].matched && Math.abs(unmatched[i].amount) === Math.abs(unmatched[j].amount) && unmatched[i].date === unmatched[j].date) {
            const idx1 = updated.indexOf(unmatched[i])
            const idx2 = updated.indexOf(unmatched[j])
            updated[idx1] = { ...updated[idx1], book_ind: true, statement_ind: true, matched: true }
            updated[idx2] = { ...updated[idx2], book_ind: true, statement_ind: true, matched: true }
            unmatched[j] = { ...updated[idx2] }
          }
        }
      }
      return updated
    })
  }

  const matchAll = () => {
    setReconItems((prev) => prev.map((i) => ({ ...i, book_ind: true, statement_ind: true, matched: true })))
  }

  const unmatchAll = () => {
    setReconItems((prev) => prev.map((i) => ({ ...i, book_ind: true, statement_ind: false, matched: false })))
  }

  const saveReconciliation = async () => {
    if (!selectedAccount) return
    setSaving(true)
    try {
      let reconId = existingRecon?.id
      if (existingRecon) {
        const { error } = await supabase.from('bank_reconciliation')
          .update({ statement_date: statementDate, statement_balance: statementBalance, book_balance: bookBalance, difference, status: difference === 0 ? 'Approved' : 'Pending', updated_at: new Date().toISOString() })
          .eq('id', existingRecon.id)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('bank_reconciliation').insert({ account_id: selectedAccount, statement_date: statementDate, statement_balance: statementBalance, book_balance: bookBalance, difference, status: 'Draft' }).select()
        if (error) throw error
        reconId = data[0].id
      }
      await supabase.from('bank_recon_lines').delete().eq('recon_id', reconId)
      const linesToInsert = reconItems.filter((item) => item.statement_ind || item.book_ind).map((item) => ({
        recon_id: reconId, transaction_type: item.type || 'Journal Entry', transaction_id: item.id,
        transaction_date: item.date, description: item.description, amount: item.amount,
        statement_ind: item.statement_ind, book_ind: item.book_ind, matched: item.matched || false,
      }))
      if (linesToInsert.length > 0) {
        const { error: lineError } = await supabase.from('bank_recon_lines').insert(linesToInsert)
        if (lineError) throw lineError
      }
      await loadHistory()
      setSaving(false)
      alert('Reconciliation saved successfully!')
    } catch (err) {
      setSaving(false)
      alert('Error saving: ' + (err.message || 'Unknown error'))
    }
  }

  const filtered = reconItems.filter((i) => {
    if (filter === 'matched' && !i.matched) return false
    if (filter === 'unmatched' && i.matched) return false
    if (filter === 'book' && !i.book_ind) return false
    if (filter === 'statement' && !i.statement_ind) return false
    if (fromDate && i.date < fromDate) return false
    if (toDate && i.date > toDate) return false
    return true
  })

  return (
    <div className="bank-recon-wrap">
      <div className="report-head">
        <h3>🏦 Bank Reconciliation</h3>
        <div className="report-controls">
          <label>Bank Account
            <select value={selectedAccount} onChange={(e) => { setSelectedAccount(e.target.value); loadReconciliation() }}>
              <option value="">Select Account</option>
              {bankAccounts.map((acc) => <option key={acc.id} value={acc.id}>{acc.name} ({acc.code})</option>)}
            </select>
          </label>
          <label>From
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </label>
          <label>To
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </label>
          <label>Statement Date
            <input type="date" value={statementDate} onChange={(e) => setStatementDate(e.target.value)} />
          </label>
          <label>Statement Balance
            <input type="number" step="0.01" value={statementBalance} onChange={(e) => setStatementBalance(Number(e.target.value))} style={{ width: 160 }} />
          </label>
          {selectedAccount && <button className="btn-print" onClick={saveReconciliation} disabled={saving}>{saving ? 'Saving…' : '💾 Save'}</button>}
        </div>
      </div>

      {selectedAccount && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, margin: '12px 0' }}>
          <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '12px 16px', border: '1px solid #bbf7d0' }}>
            <div style={{ fontSize: 11, color: '#166534', fontWeight: 600 }}>BOOK BALANCE</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#15803d', marginTop: 2 }}>{fmtMoney(bookBalance)}</div>
          </div>
          <div style={{ background: '#eff6ff', borderRadius: 10, padding: '12px 16px', border: '1px solid #bfdbfe' }}>
            <div style={{ fontSize: 11, color: '#1e40af', fontWeight: 600 }}>STATEMENT BALANCE</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#1d4ed8', marginTop: 2 }}>{fmtMoney(statementBalance)}</div>
          </div>
          <div style={{ background: Math.abs(difference) < 0.01 ? '#f0fdf4' : '#fef2f2', borderRadius: 10, padding: '12px 16px', border: `1px solid ${Math.abs(difference) < 0.01 ? '#bbf7d0' : '#fecaca'}` }}>
            <div style={{ fontSize: 11, color: Math.abs(difference) < 0.01 ? '#166534' : '#991b1b', fontWeight: 600 }}>DIFFERENCE</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: Math.abs(difference) < 0.01 ? '#15803d' : '#dc2626', marginTop: 2 }}>{fmtMoney(difference)}</div>
            <div style={{ fontSize: 10, color: Math.abs(difference) < 0.01 ? '#16a34a' : '#ef4444', fontWeight: 600 }}>{Math.abs(difference) < 0.01 ? '✓ RECONCILED' : '✗ NOT RECONCILED'}</div>
          </div>
          <div style={{ background: '#fefce8', borderRadius: 10, padding: '12px 16px', border: '1px solid #fde68a' }}>
            <div style={{ fontSize: 11, color: '#854d0e', fontWeight: 600 }}>CLEARED ITEMS</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#a16207', marginTop: 4 }}>Book: {fmtMoney(clearedBook)}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#a16207' }}>Stmt: {fmtMoney(clearedStatement)}</div>
          </div>
        </div>
      )}

      {selectedAccount && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {['all', 'unmatched', 'matched', 'book', 'statement'].map((f) => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: '4px 12px', borderRadius: 6, border: `1px solid ${filter === f ? '#8b5cf6' : '#e2e8f0'}`, background: filter === f ? '#8b5cf6' : '#fff', color: filter === f ? '#fff' : '#475569', fontSize: 11, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}>
              {f} {f === 'unmatched' && `(${unmatchedCount})`} {f === 'matched' && `(${matchedCount})`}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button onClick={autoMatch} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #10b981', background: '#10b981', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>🔗 Auto Match</button>
          <button onClick={matchAll} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #6366f1', background: '#6366f1', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>✓ Match All</button>
          <button onClick={unmatchAll} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #ef4444', background: '#fff', color: '#ef4444', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>✗ Unmatch All</button>
        </div>
      )}

      {selectedAccount && (
        <div className="grid-wrap">
          <table className="data-grid report-table">
            <thead>
              <tr>
                <th className="th-checkbox" title="In Book">📖</th>
                <th className="th-checkbox" title="In Statement">📄</th>
                <th>DATE</th>
                <th>DESCRIPTION</th>
                <th>REF</th>
                <th>TYPE</th>
                <th className="col-money">DEBIT</th>
                <th className="col-money">CREDIT</th>
                <th className="col-money">AMOUNT</th>
                <th className="th-checkbox">✓</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan="10" className="empty">Loading transactions...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan="10" className="empty">No transactions found</td></tr>}
              {!loading && filtered.map((item, i) => (
                <tr key={item.id || i} className={item.matched ? '' : i % 2 ? 'alt' : ''} style={item.matched ? { background: '#f0fdf4' } : {}}>
                  <td className="td-checkbox"><input type="checkbox" checked={item.book_ind} onChange={() => setReconItems((prev) => prev.map((it, j) => reconItems.indexOf(it) === reconItems.indexOf(item) ? { ...it, book_ind: !it.book_ind, matched: !it.book_ind ? it.statement_ind : false } : it))} title="In Book" /></td>
                  <td className="td-checkbox"><input type="checkbox" checked={item.statement_ind} onChange={() => { const idx = reconItems.indexOf(item); toggleStatement(idx) }} title="In Statement" /></td>
                  <td>{item.date}</td>
                  <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description || '—'}</td>
                  <td style={{ fontSize: 11, color: '#64748b' }}>{item.ref || '—'}</td>
                  <td><span className={`badge ${item.type.includes('Payment') ? 'b-green' : item.type === 'Deposit' ? 'b-blue' : 'b-purple'}`}>{item.type}</span></td>
                  <td className="col-money" style={{ color: item.debit > 0 ? '#16a34a' : '#94a3b8' }}>{item.debit > 0 ? fmtMoney(item.debit) : '—'}</td>
                  <td className="col-money" style={{ color: item.credit > 0 ? '#dc2626' : '#94a3b8' }}>{item.credit > 0 ? fmtMoney(item.credit) : '—'}</td>
                  <td className="col-money" style={{ fontWeight: 700, color: item.amount >= 0 ? '#16a34a' : '#dc2626' }}>{fmtMoney(item.amount)}</td>
                  <td className="td-checkbox">{item.matched && <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span>}</td>
                </tr>
              ))}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="total-row">
                  <td colSpan="6"><b>Totals ({filtered.length} items)</b></td>
                  <td className="col-money"><b style={{ color: '#16a34a' }}>{fmtMoney(filtered.reduce((s, i) => s + Number(i.debit || 0), 0))}</b></td>
                  <td className="col-money"><b style={{ color: '#dc2626' }}>{fmtMoney(filtered.reduce((s, i) => s + Number(i.credit || 0), 0))}</b></td>
                  <td className="col-money"><b>{fmtMoney(filtered.reduce((s, i) => s + Number(i.amount || 0), 0))}</b></td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {selectedAccount && history.length > 0 && (
        <div style={{ marginTop: 16, background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 16 }}>
          <h4 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700 }}>📋 Reconciliation History</h4>
          <table className="data-grid report-table" style={{ fontSize: 12 }}>
            <thead>
              <tr>
                <th>DATE</th>
                <th className="col-money">STATEMENT BALANCE</th>
                <th className="col-money">BOOK BALANCE</th>
                <th className="col-money">DIFFERENCE</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={h.id || i} className={i % 2 ? 'alt' : ''}>
                  <td>{(h.statement_date || '').slice(0, 10)}</td>
                  <td className="col-money">{fmtMoney(Number(h.statement_balance || 0))}</td>
                  <td className="col-money">{fmtMoney(Number(h.book_balance || 0))}</td>
                  <td className="col-money" style={{ color: Math.abs(Number(h.difference || 0)) < 0.01 ? '#16a34a' : '#dc2626', fontWeight: 700 }}>{fmtMoney(Number(h.difference || 0))}</td>
                  <td><span className={`badge ${h.status === 'Approved' ? 'b-green' : h.status === 'Pending' ? 'b-yellow' : 'b-gray'}`}>{h.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const PaymentWizard = ({ accounts, fmtMoney, custList, supList }) => {
  const [batchName, setBatchName] = useState('Payment Batch')
  const [paymentType, setPaymentType] = useState('Outgoing')
  const [bankAccount, setBankAccount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer')
  const [selectedItems, setSelectedItems] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [batches, setBatches] = useState([])
  const [showNew, setShowNew] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [currentBatch, setCurrentBatch] = useState(null)

  const bankAccounts = accounts.filter((a) => a.type === 'Asset' && (a.name?.toLowerCase().includes('bank') || a.name?.toLowerCase().includes('cash')))
  const outgoingCashAccounts = accounts.filter((a) => a.type === 'Asset' && (a.name?.toLowerCase().includes('cash') || a.name?.toLowerCase().includes('safe') || a.name?.toLowerCase().includes('petty')))

  const loadBatches = async () => {
    setLoading(true)
    const { data } = await supabase.from('payment_batches').select('*').order('created_at', { ascending: false }).limit(20)
    setBatches(data || [])
    setLoading(false)
  }
  useEffect(() => { loadBatches() }, [])

  const loadEligiblePayments = async () => {
    setLoading(true)
    const { data: incoming } = await supabase.from('incoming_payments').select('*, customers(name)').eq('status', 'Draft').order('created_at', { ascending: false })
    const { data: outgoing } = await supabase.from('outgoing_payments').select('*, suppliers(name)').eq('status', 'Draft').order('created_at', { ascending: false })
    setEligiblePayments({ incoming: incoming || [], outgoing: outgoing || [] })
    setLoading(false)
  }

  const [eligiblePayments, setEligiblePayments] = useState({ incoming: [], outgoing: [] })
  useEffect(() => { loadEligiblePayments() }, [])

  const availablePayments = paymentType === 'Outgoing' ? eligiblePayments.outgoing : eligiblePayments.incoming
  const filtered = !search || search.trim() === '' ? availablePayments : availablePayments.filter((p) => {
    const name = paymentType === 'Outgoing' ? (p.suppliers?.name || p.supplier_name || '') : (p.customers?.name || p.customer_name || '')
    return name.toLowerCase().includes(search.toLowerCase()) || (p.description || '').toLowerCase().includes(search.toLowerCase()) || String(p.amount || '').includes(search)
  })

  const selectedList = selectedItems.map((id) => availablePayments.find((p) => p.id === id)).filter(Boolean)
  const totalSelected = selectedList.reduce((s, p) => s + Number(p.amount || 0), 0)

  const toggleSelection = (id) => {
    setSelectedItems((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  const createBatch = async () => {
    if (!batchName || selectedList.length === 0) { alert('Please enter a batch name and select at least one payment.'); return }
    setProcessing(true)
    try {
      const { data: batchData, error: batchError } = await supabase.from('payment_batches').insert({
        batch_name: batchName,
        payment_type: paymentType,
        bank_account: bankAccount,
        payment_method: paymentMethod,
        total_amount: totalSelected,
        payment_count: selectedList.length,
        status: 'Draft',
      }).select()
      if (batchError) throw batchError
      const batchId = batchData[0].id
      const lines = selectedList.map((p, i) => ({
        batch_id: batchId,
        transaction_type: paymentType,
        transaction_id: p.id,
        description: paymentType === 'Outgoing' ? (p.suppliers?.name || p.supplier_name || p.description || '') : (p.customers?.name || p.customer_name || p.description || ''),
        amount: Number(p.amount || 0),
        currency: p.currency || 'AED',
        reference: paymentType === 'Outgoing' ? p.payment_no : p.receipt_no,
        sequence: i + 1,
        processed: false,
      }))
      const { error: linesError } = await supabase.from('batch_lines').insert(lines)
      if (linesError) throw linesError

      await Promise.all(selectedList.map(async (p) => {
        if (paymentType === 'Outgoing') {
          await supabase.from('outgoing_payments').update({ status: 'Approved', batch_id: batchId }).eq('id', p.id)
        } else {
          await supabase.from('incoming_payments').update({ status: 'Approved', batch_id: batchId }).eq('id', p.id)
        }
      }))

      setProcessing(false)
      setShowNew(false)
      setSelectedItems([])
      setBatchName('Payment Batch')
      loadBatches()
      alert(`Batch "${batchName}" created with ${selectedList.length} payments, total ${fmtMoney(totalSelected)}`)
    } catch (err) {
      setProcessing(false)
      alert('Error: ' + (err.message || 'Unknown error'))
    }
  }

  const approveBatch = async (batch) => {
    if (!window.confirm(`Approve batch "${batch.batch_name}"?`)) return
    await supabase.from('payment_batches').update({ status: 'Approved' }).eq('id', batch.id)
    const { data: lines } = await supabase.from('batch_lines').select('*').eq('batch_id', batch.id)
    await Promise.all(lines.map((line) => supabase.from('batch_lines').update({ processed: true, processed_at: new Date().toISOString() }).eq('id', line.id)))
    loadBatches()
  }

  const deleteBatch = async (batch) => {
    if (!window.confirm(`Delete batch "${batch.batch_name}"?`)) return
    await supabase.from('payment_batches').delete().eq('id', batch.id)
    loadBatches()
  }

  if (!showNew && batches.length === 0 && !loading) {
    return (
      <div className="bank-recon-wrap">
        <div className="report-head">
          <h3>🧙 Payment Wizard</h3>
          <button className="btn-add" onClick={() => setShowNew(true)}>＋ Create Batch</button>
        </div>
        <div className="report-section">
          <p className="empty">No payment batches found. Create one to get started.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bank-recon-wrap">
      <div className="report-head">
        <h3>🧙 Payment Wizard</h3>
        <div className="report-controls">
          {!showNew && <button className="btn-add" onClick={() => setShowNew(true)}>＋ New Batch</button>}
          {showNew && <button className="btn-cancel" onClick={() => { setShowNew(false); setSelectedItems([]); setBatchName('Payment Batch'); setBankAccount(''); setPaymentMethod('Bank Transfer'); setPaymentType('Outgoing') }}>✕ Cancel</button>}
          {showNew && <button className="btn-print" onClick={createBatch} disabled={processing}>{processing ? 'Creating…' : '✓ Create Batch'}</button>}
        </div>
      </div>

      {showNew && (
        <div className="report-section">
          <div className="bank-recon-summary" style={{ flexWrap: 'wrap' }}>
            <div className="recon-card" style={{ minWidth: 200 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Batch Name</label>
              <input style={{ width: '100%', padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }} value={batchName} onChange={(e) => setBatchName(e.target.value)} placeholder="e.g. March Payments" />
            </div>
            <div className="recon-card" style={{ minWidth: 140 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Type</label>
              <select style={{ width: '100%', padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, fontWeight: 700 }} value={paymentType} onChange={(e) => { setPaymentType(e.target.value); setSelectedItems([]) }}>
                <option value="Outgoing">Outgoing</option>
                <option value="Incoming">Incoming</option>
              </select>
            </div>
            <div className="recon-card" style={{ minWidth: 160 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Bank Account</label>
              <select style={{ width: '100%', padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }} value={bankAccount} onChange={(e) => setBankAccount(e.target.value)}>
                <option value="">Select Account</option>
                {bankAccounts.map((acc) => <option key={acc.id} value={acc.name}>{acc.name} ({acc.code})</option>)}
              </select>
            </div>
            <div className="recon-card" style={{ minWidth: 140 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Payment Method</label>
              <select style={{ width: '100%', padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Check">Check</option>
                <option value="Cash">Cash</option>
                <option value="Credit Card">Credit Card</option>
              </select>
            </div>
          </div>

          <div className="report-controls" style={{ marginBottom: 12 }}>
            <input className="coa-search" placeholder={`🔍 Search ${paymentType.toLowerCase()} payments...`} value={search} onChange={(e) => setSearch(e.target.value)} />
            <span className="total-records">Selected: <b>{selectedList.length}</b> | Total: <b>{fmtMoney(totalSelected)}</b></span>
          </div>

          <div className="grid-wrap">
            <table className="data-grid report-table">
              <thead>
                <tr>
                  <th className="th-checkbox"></th>
                  <th>Date</th>
                  <th>Payee</th>
                  <th>Description</th>
                  <th className="col-money">Amount</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan="5" className="empty">Loading...</td></tr>}
                {!loading && filtered.length === 0 && <tr><td colSpan="5" className="empty">No draft payments found</td></tr>}
                {!loading && filtered.map((p, i) => (
                  <tr key={p.id || i} className={i % 2 ? 'alt' : ''}>
                    <td className="td-checkbox">
                      <input type="checkbox" checked={selectedItems.includes(p.id)} onChange={() => toggleSelection(p.id)} />
                    </td>
                    <td>{p.created_at?.split('T')[0] || '—'}</td>
                    <td>{paymentType === 'Outgoing' ? (p.suppliers?.name || p.supplier_name || '—') : (p.customers?.name || p.customer_name || '—')}</td>
                    <td>{p.description || p.notes || '—'}</td>
                    <td className="col-money">{fmtMoney(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="report-section" style={showNew ? { display: 'none' } : {}}>
        <h4>Recent Batches</h4>
        <div className="grid-wrap">
          <table className="data-grid report-table">
            <thead>
              <tr>
                <th className="th-actions"></th>
                <th>BATCH NAME</th>
                <th>TYPE</th>
                <th className="col-money">TOTAL</th>
                <th>COUNT</th>
                <th>METHOD</th>
                <th>STATUS</th>
                <th>CREATED</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan="8" className="empty">Loading...</td></tr>}
              {!loading && batches.length === 0 && <tr><td colSpan="8" className="empty">No batches yet</td></tr>}
              {!loading && batches.map((b, i) => (
                <tr key={b.id || i} className={i % 2 ? 'alt' : ''}>
                  <td className="td-actions">
                    <button className="act edit" title="View" onClick={() => setCurrentBatch(b)}>👁️</button>
                    {b.status !== 'Approved' && <button className="act edit" title="Approve" onClick={() => approveBatch(b)}>✅</button>}
                    <button className="act del" title="Delete" onClick={() => deleteBatch(b)}>🗑️</button>
                  </td>
                  <td><b>{b.batch_name}</b></td>
                  <td><span className={`badge ${b.payment_type === 'Outgoing' ? 'b-red' : 'b-green'}`}>{b.payment_type}</span></td>
                  <td className="col-money">{fmtMoney(b.total_amount)}</td>
                  <td>{b.payment_count}</td>
                  <td>{b.payment_method}</td>
                  <td><span className={`badge ${b.status === 'Approved' ? 'b-green' : b.status === 'Cancelled' ? 'b-red' : 'b-amber'}`}>{b.status}</span></td>
                  <td>{b.created_at?.split('T')[0]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

const SalesDocs = ({ docType, fmtMoney, taxRate = 0 }) => {
  const isQuote = docType === 'quotation'
  const TABLE = isQuote ? 'sales_quotations' : 'sales_orders'
  const NO_FIELD = isQuote ? 'quote_no' : 'order_no'
  const TITLE = isQuote ? '💼 Sales Quotation' : '📋 Sales Order'
  const [docs, setDocs] = useState([])
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const wrapRef = useRef(null)
  const firstRef = useRef(null)
  useEffect(() => { if (form && firstRef.current) firstRef.current.focus() }, [!form])

  const loadDocs = async () => {
    setLoading(true)
    const { data } = await supabase.from(TABLE).select('*').order('created_at', { ascending: false }).limit(200)
    setDocs(data || [])
    setLoading(false)
  }
  useEffect(() => { loadDocs() }, [])

  useEffect(() => {
    Promise.all([supabase.from('customers').select('id, code, name').eq('status', 'Active'), supabase.from('products').select('id, code, name, price')])
      .then(([c, p]) => { setCustomers(c.data || []); setProducts(p.data || []) })
  }, [])

  const filtered = docs.filter((d) => {
    if (statusFilter !== 'All' && d.status !== statusFilter) return false
    if (!search) return true
    return (d[NO_FIELD] || '').toLowerCase().includes(search.toLowerCase()) || (d.customer_name || '').toLowerCase().includes(search.toLowerCase())
  })
  const statusCounts = { All: docs.length, Draft: 0, Approved: 0, Converted: 0, Cancelled: 0 }
  docs.forEach((d) => { if (statusCounts[d.status] !== undefined) statusCounts[d.status]++ })

  const blankDoc = () => ({
    id: `new-${Date.now()}`, recId: null,
    customer_id: '', customer_name: '',
    doc_date: new Date().toISOString().split('T')[0],
    valid_until: isQuote ? (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().split('T')[0] })() : null,
    delivery_date: !isQuote ? new Date().toISOString().split('T')[0] : null,
    currency: 'AED', payment_terms: 'Net 30',
    items: [], notes: '', status: 'Draft', saving: false, error: ''
  })

  const calcTotals = (items) => {
    const subtotal = items.reduce((s, it) => s + Number(it.qty || 0) * Number(it.price || 0), 0)
    const vat_amount = subtotal * (taxRate / 100)
    return { subtotal, vat_amount, grand_total: subtotal + vat_amount }
  }

  const setItem = (idx, key, value) => {
    const items = form.items.map((it, i) => {
      if (i !== idx) return it
      if (key === 'product_id') {
        const prod = products.find((p) => p.id === value)
        return { ...it, product_id: value, name: prod?.name || '', price: String(prod?.price ?? '') }
      }
      return { ...it, [key]: value }
    })
    setForm({ ...form, items })
  }

  const saveDoc = async (approveAfter) => {
    if (!form.customer_id) { setForm({ ...form, error: 'Please select a customer.' }); return }
    if (!form.items.length) { setForm({ ...form, error: 'Add at least one item.' }); return }
    setForm({ ...form, saving: true, error: '' })
    const cust = customers.find((c) => c.id === form.customer_id)
    const totals = calcTotals(form.items)
    const payload = {
      customer_id: form.customer_id,
      customer_name: cust?.name || '',
      doc_date: form.doc_date,
      currency: form.currency,
      payment_terms: form.payment_terms,
      items: form.items.map((it) => ({ ...it, qty: Number(it.qty) || 0, price: Number(it.price) || 0 })),
      subtotal: totals.subtotal, vat_percent: 5, vat_amount: totals.vat_amount, grand_total: totals.grand_total,
      notes: form.notes,
      status: approveAfter ? 'Approved' : 'Draft',
    }
    if (isQuote) payload.valid_until = form.valid_until
    else payload.delivery_date = form.delivery_date
    try {
      if (form.recId) {
        const { error } = await supabase.from(TABLE).update(payload).eq('id', form.recId)
        if (error) throw error
      } else {
        const { error } = await supabase.from(TABLE).insert(payload)
        if (error) throw error
        // Deduct credit for new document
        try {
          const { deductCredit } = await import('../utils/billing')
          const tenantId = authTenant?.id
          if (tenantId) await deductCredit(tenantId, TABLE, null, `${cfg.title || TABLE}: new document`)
        } catch (e) { console.error('Credit deduction failed:', e) }
      }
      setForm(null)
      loadDocs()
    } catch (err) { setForm({ ...form, saving: false, error: err.message }) }
  }

  const setStatus = async (doc, status) => {
    await supabase.from(TABLE).update({ status }).eq('id', doc.id)
    loadDocs()
  }

  const convertDoc = async (doc) => {
    if (isQuote) {
      if (!window.confirm(`Convert ${doc[NO_FIELD]} to Sales Order?`)) return
      const { error } = await supabase.from('sales_orders').insert({
        quote_id: doc.id, customer_id: doc.customer_id, customer_name: doc.customer_name,
        doc_date: new Date().toISOString().split('T')[0], delivery_date: null,
        currency: doc.currency, payment_terms: doc.payment_terms, items: doc.items,
        subtotal: doc.subtotal, vat_percent: doc.vat_percent, vat_amount: doc.vat_amount, grand_total: doc.grand_total,
        notes: `From quote ${doc.quote_no}`, status: 'Draft',
      })
      if (error) { alert(error.message); return }
      await supabase.from('sales_quotations').update({ status: 'Converted' }).eq('id', doc.id)
      alert(`Converted to Sales Order.`)
    } else {
      if (!window.confirm(`Convert ${doc.order_no} to A/R Invoice?`)) return
      const { error } = await supabase.from('invoices').insert({
        customer_name: doc.customer_name,
        items: doc.items,
        subtotal: doc.subtotal, vat_percent: doc.vat_percent, vat_amount: doc.vat_amount, grand_total: doc.grand_total,
        amount_paid: 0, balance: doc.grand_total,
        payment_method: 'Credit', status: 'pending',
        notes: `From order ${doc.order_no}`,
      })
      if (error) { alert(error.message); return }
      await supabase.from('sales_orders').update({ status: 'Converted' }).eq('id', doc.id)
      alert(`Invoice created from ${doc.order_no}.`)
    }
    loadDocs()
  }

  const deleteDoc = async (doc) => {
    if (!window.confirm(`Delete ${doc[NO_FIELD]}?`)) return
    await supabase.from(TABLE).delete().eq('id', doc.id)
    loadDocs()
  }

  const printDoc = (doc) => {
    const w = window.open('', '_blank')
    w.document.write('<html><head><title>' + doc[NO_FIELD] + '</title><style>body{font-family:Arial,sans-serif;padding:30px;max-width:800px}h1{color:#1e1b4b;font-size:22px;margin:0}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{padding:6px 10px;border:1px solid #e2e8f0;font-size:12px;text-align:left}th{background:#f1f5f9}.col-r{text-align:right}.total{font-weight:700;background:#f8fafc}.meta{margin-top:12px;font-size:13px;color:#334155}.hdr{display:flex;justify-content:space-between;border-bottom:3px solid #8b5cf6;padding-bottom:10px}</style></head><body>')
    w.document.write('<div class="hdr"><div><h1>' + TITLE + '</h1><div class="meta">' + doc[NO_FIELD] + '</div></div><div class="meta" style="text-align:right"><b>Date:</b> ' + doc.doc_date + '<br><b>Status:</b> ' + doc.status + '</div></div>')
    w.document.write('<div class="meta"><b>Customer:</b> ' + (doc.customer_name || '—') + '<br><b>Payment Terms:</b> ' + doc.payment_terms + (isQuote ? '<br><b>Valid Until:</b> ' + doc.valid_until : '<br><b>Delivery Date:</b> ' + doc.delivery_date) + '</div>')
    w.document.write('<table><tr><th>Item</th><th class="col-r">Qty</th><th class="col-r">Price</th><th class="col-r">Total</th></tr>')
    ;(doc.items || []).forEach((it) => { w.document.write('<tr><td>' + (it.name || '') + '</td><td class="col-r">' + it.qty + '</td><td class="col-r">' + fmtMoney(it.price) + '</td><td class="col-r">' + fmtMoney(Number(it.qty) * Number(it.price)) + '</td></tr>') })
    w.document.write('<tr class="total"><td colspan="3">Subtotal</td><td class="col-r">' + fmtMoney(doc.subtotal) + '</td></tr>')
    w.document.write('<tr><td colspan="3">VAT (' + doc.vat_percent + '%)</td><td class="col-r">' + fmtMoney(doc.vat_amount) + '</td></tr>')
    w.document.write('<tr class="total"><td colspan="3"><b>GRAND TOTAL</b></td><td class="col-r"><b>' + fmtMoney(doc.grand_total) + '</b></td></tr></table>')
    if (doc.notes) w.document.write('<p style="font-size:12px;color:#64748b;margin-top:16px">' + doc.notes + '</p>')
    w.document.write('</body></html>')
    w.document.close(); w.print()
  }

  if (!form) {
    return (
      <div className="report-wrap">
        <div className="coa-head">
          <h3>{TITLE}</h3>
          <div className="coa-head-right">
            <input className="coa-search" placeholder="🔍 Search number, customer..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <button className="btn-add" onClick={() => setForm(blankDoc())}>＋ New {isQuote ? 'Quotation' : 'Order'}</button>
          </div>
        </div>
        <div className="report-controls" style={{ marginBottom: 12 }}>
          {['All', 'Draft', 'Approved', 'Converted', 'Cancelled'].map((st) => (
            <button key={st} className={`filter-btn ${statusFilter === st ? 'active' : ''}`} onClick={() => setStatusFilter(st)}>{st} ({statusCounts[st]})</button>
          ))}
          <span className="total-records">Total Value: <b>{fmtMoney(filtered.reduce((s, d) => s + Number(d.grand_total || 0), 0), form?.currency)}</b></span>
        </div>
        <div className="grid-wrap">
          <table className="data-grid">
            <thead>
              <tr>
                <th className="th-actions"></th>
                <th>{isQuote ? 'QUOTE #' : 'ORDER #'}</th>
                <th>DATE</th>
                <th>CUSTOMER</th>
                <th>{isQuote ? 'VALID UNTIL' : 'DELIVERY'}</th>
                <th className="col-money">TOTAL</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan="7" className="empty">Loading...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan="7" className="empty">No documents found</td></tr>}
              {!loading && filtered.map((d, i) => (
                <tr key={d.id || i} className={i % 2 ? 'alt' : ''}>
                  <td className="td-actions">
                    <button className="act edit" title="Edit" onClick={() => setForm({ ...blankDoc(), recId: d.id, ...d, saving: false, error: '' })}>✏️</button>
                    {d.status === 'Draft' && <button className="act edit" title="Approve" onClick={() => setStatus(d, 'Approved')}>✅</button>}
                    {(d.status === 'Approved') && <button className="act conv" title={isQuote ? 'Convert to Order' : 'Convert to Invoice'} onClick={() => convertDoc(d)}>🔄</button>}
                    <button className="act edit" title="Print" onClick={() => printDoc(d)}>🖨️</button>
                    <AttachmentButton entityType={cfg.key} entityId={d.id} title={cfg.key + ' Attachments'} />
                    {d.status !== 'Converted' && <button className="act del" title="Delete" onClick={() => deleteDoc(d)}>🗑️</button>}
                  </td>
                  <td className="code-cell">{d[NO_FIELD]}</td>
                  <td>{d.doc_date}</td>
                  <td><b>{d.customer_name}</b></td>
                  <td>{isQuote ? d.valid_until : d.delivery_date}</td>
                  <td className="col-money">{fmtMoney(d.grand_total)}</td>
                  <td><span className={`badge ${d.status === 'Approved' ? 'b-green' : d.status === 'Converted' ? 'b-blue' : d.status === 'Cancelled' ? 'b-red' : 'b-amber'}`}>{d.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const totals = calcTotals(form.items)

  return (
    <div className="report-wrap" ref={wrapRef} onKeyDown={(e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') return
        e.preventDefault()
        const inputs = Array.from(wrapRef.current.querySelectorAll('input, select'))
        const idx = inputs.indexOf(e.target)
        if (idx > -1 && idx < inputs.length - 1) inputs[idx + 1].focus()
      }
    }}>
      <div className="coa-head">
        <h3>{form.recId ? `✏️ Edit — ${form[NO_FIELD] || ''}` : `＋ New ${isQuote ? 'Quotation' : 'Order'}`}</h3>
        <button className="btn-cancel" onClick={() => setForm(null)}>✕ Cancel</button>
      </div>
      {form.error && <div className="inv-error">⚠️ {form.error}</div>}
      <div className="inv-grid coa-form-grid" style={{ marginTop: 14 }}>
        <label>Customer *
          <select ref={firstRef} value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}>
            <option value="">Select Customer</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.code ? `${c.code} — ` : ''}{c.name}</option>)}
          </select>
        </label>
        <label>Date<input type="date" value={form.doc_date} onChange={(e) => setForm({ ...form, doc_date: e.target.value })} /></label>
        {isQuote ? (
          <label>Valid Until<input type="date" value={form.valid_until || ''} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} /></label>
        ) : (
          <label>Delivery Date<input type="date" value={form.delivery_date || ''} onChange={(e) => setForm({ ...form, delivery_date: e.target.value })} /></label>
        )}
        <label>Currency
          <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
            {['AED', 'SAR', 'USD', 'EUR', 'GBP', 'INR', 'PKR'].map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label>Payment Terms
          <select value={form.payment_terms} onChange={(e) => setForm({ ...form, payment_terms: e.target.value })}>
            {['Cash', 'Net 15', 'Net 30', 'Net 60', 'Net 90'].map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
      </div>

      <div className="report-section" style={{ marginTop: 14 }}>
        <h4>Items</h4>
        <table className="data-grid report-table">
          <thead><tr><th style={{ width: '40%' }}>PRODUCT</th><th className="col-money" style={{ width: '15%' }}>QTY</th><th className="col-money" style={{ width: '20%' }}>PRICE</th><th className="col-money">TOTAL</th><th className="th-actions"></th></tr></thead>
          <tbody>
            {form.items.length === 0 && <tr><td colSpan="5" className="empty">No items added yet</td></tr>}
            {form.items.map((it, idx) => (
              <tr key={idx}>
                <td>
                  <select value={it.product_id || ''} onChange={(e) => setItem(idx, 'product_id', e.target.value)}>
                    <option value="">Select Product</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.code ? `${p.code} — ` : ''}{p.name}</option>)}
                  </select>
                </td>
                <td><input type="text" inputMode="decimal" placeholder="0" value={it.qty ?? ''} onChange={(e) => setItem(idx, 'qty', e.target.value)} /></td>
                <td><input type="text" inputMode="decimal" placeholder="0.00" value={it.price ?? ''} onChange={(e) => setItem(idx, 'price', e.target.value)} /></td>
                <td className="col-money">{fmtMoney((Number(it.qty) || 0) * (Number(it.price) || 0))}</td>
                <td className="td-actions"><button className="act del" title="Remove" onClick={() => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) })}>🗑️</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="btn-add" style={{ marginTop: 8 }} onClick={() => setForm({ ...form, items: [...form.items, { product_id: '', name: '', qty: '', price: '' }] })}>＋ Add Item</button>
      </div>

      <div className="report-section" style={{ marginTop: 14 }}>
        <div className="je-totals">
          <span>Subtotal: <b>{fmtMoney(totals.subtotal)}</b></span>
          <span>{taxRate > 0 ? `Tax (${taxRate}%)` : 'Tax'}: <b>{fmtMoney(totals.vat_amount)}</b></span>
          <span className="grand">Grand Total: <b>{fmtMoney(totals.grand_total)}</b></span>
        </div>
        <label style={{ display: 'block', marginTop: 10 }}>Notes<textarea rows="2" style={{ width: '100%', padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Internal or customer-facing notes..." /></label>
      </div>

      <div className="inv-actions">
        <button className="btn-cancel" onClick={() => setForm(null)}>✕ Cancel</button>
        <button className="btn-primary" disabled={form.saving} onClick={() => saveDoc(false)}>{form.saving ? 'Saving…' : '💾 Save Draft'}</button>
        <button className="btn-primary" disabled={form.saving} style={{ background: '#10b981' }} onClick={() => saveDoc(true)}>✅ Save & Approve</button>
      </div>
    </div>
  )
}

const Authorization = ({ permissions, modules, roles, onSave, onToggle }) => {
  const [activeRole, setActiveRole] = useState('Admin')
  const ACTIONS = ['can_view', 'can_create', 'can_edit', 'can_delete', 'can_approve', 'can_print']
  const ACTION_LABELS = { can_view: '👁 View', can_create: '➕ Create', can_edit: '✏️ Edit', can_delete: '🗑️ Delete', can_approve: '✅ Approve', can_print: '🖨 Print' }
  const ROLE_COLORS = { Admin: '#ef4444', Manager: '#8b5cf6', Accountant: '#3b82f6', 'Sales Rep': '#10b981', Warehouse: '#f59e0b', Viewer: '#6b7280' }

  const getPerm = (role, module) => {
    const found = permissions.find((p) => p.role === role && p.module === module)
    return found || { role, module, can_view: false, can_create: false, can_edit: false, can_delete: false, can_approve: false, can_print: false }
  }

  const roleModules = modules.map((m) => ({ module: m, perm: getPerm(activeRole, m) }))
  const totalPerms = roleModules.reduce((s, rm) => s + ACTIONS.filter((a) => rm.perm[a]).length, 0)
  const maxPerms = modules.length * ACTIONS.length

  return (
    <div className="auth-wrap">
      <div className="coa-head">
        <h3>🔐 Authorization — Role Permissions</h3>
      </div>
      <div className="auth-role-tabs">
        {roles.map((r) => (
          <button key={r} className={`auth-role-tab ${activeRole === r ? 'active' : ''}`} style={activeRole === r ? { borderColor: ROLE_COLORS[r], color: ROLE_COLORS[r] } : {}} onClick={() => setActiveRole(r)}>
            <span className="auth-role-dot" style={{ background: ROLE_COLORS[r] }}></span>
            {r}
            <span className="auth-role-count">{permissions.filter((p) => p.role === r && ACTIONS.some((a) => p[a])).length}</span>
          </button>
        ))}
      </div>
      <div className="auth-summary">
        <span>Permissions for <b style={{ color: ROLE_COLORS[activeRole] }}>{activeRole}</b></span>
        <div className="auth-progress-bar">
          <div className="auth-progress-fill" style={{ width: `${(totalPerms / maxPerms) * 100}%`, background: ROLE_COLORS[activeRole] }}></div>
        </div>
        <span className="auth-progress-text">{totalPerms} / {maxPerms} permissions granted</span>
      </div>
      <div className="grid-wrap">
        <table className="data-grid auth-matrix">
          <thead>
            <tr>
              <th className="auth-mod-col">MODULE</th>
              {ACTIONS.map((a) => <th key={a} className="auth-act-col">{ACTION_LABELS[a]}</th>)}
              <th className="auth-pct-col">SCORE</th>
            </tr>
          </thead>
          <tbody>
            {roleModules.map((rm, i) => {
              const granted = ACTIONS.filter((a) => rm.perm[a]).length
              return (
                <tr key={rm.module} className={i % 2 ? 'alt' : ''}>
                  <td className="auth-mod-name"><b>{rm.module}</b></td>
                  {ACTIONS.map((a) => (
                    <td key={a} className="auth-cell">
                      <label className="auth-toggle" title={`${ACTION_LABELS[a]} — ${rm.module}`}>
                        <input type="checkbox" checked={rm.perm[a]} onChange={() => onToggle(activeRole, rm.module, a, !rm.perm[a])} disabled={activeRole === 'Admin'} />
                        <span className={`auth-check ${rm.perm[a] ? 'on' : ''}`}></span>
                      </label>
                    </td>
                  ))}
                  <td className="auth-pct-cell">
                    <span className="auth-pct" style={{ color: granted === ACTIONS.length ? '#10b981' : granted > 0 ? '#f59e0b' : '#94a3b8' }}>{granted}/{ACTIONS.length}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {activeRole === 'Admin' && <div className="auth-admin-note">ℹ️ Admin role has full access to all modules. Permissions are read-only.</div>}
    </div>
  )
}

const STATUS_CLASS = (s) => s === 'Posted' || s === 'Approved' || s === 'Active' || s === 'Complete' || s === 'Done' || s === 'Success' || s === 'Deposited' || s === 'Validated' || s === 'Shipped' || s === 'Picked' || s === 'Packed' || s === 'Counted' || s === 'Verified' || s === 'Cleared' ? 'b-green' : (s === 'Cancelled' || s === 'Rejected' || s === 'Failed' || s === 'Expired' || s === 'Lost' || s === 'Closed' || s === 'Revoked' || s === 'Returned' ? 'b-red' : (s === 'Draft' || s === 'Pending' || s === 'Open' || s === 'Partial' || s === 'Scheduled' || s === 'Running' || s === 'Submitted' || s === 'Qualified' ? 'b-amber' : 'b-blue'))

const ModuleWorkspace = ({ module, cfg, fmtMoney }) => {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [products, setProducts] = useState([])
  const wrapRef = useRef(null)
  const firstRef = useRef(null)
  useEffect(() => { if (form && firstRef.current) firstRef.current.focus() }, [!form])
  useEffect(() => { supabase.from('products').select('id, code, name').limit(500).then(({ data }) => setProducts(data || [])).catch(() => {}) }, [])

  const TABLE_MAP: Record<string, string> = {
    'Item Groups': 'item_groups', 'Warehouses': 'warehouses', 'Price Lists': 'price_lists',
    'Sales Person': 'sales_persons', 'Leads & Opportunities': 'leads', 'Sales Target': 'sales_targets',
    'Cost Center': 'cost_centers', 'Budget': 'budgets', 'Debit Note': 'debit_notes',
    'Credit Note': 'credit_notes', 'Batch / Serial': 'batch_serials', 'Pick & Pack': 'pick_pack',
    'Barcode Management': 'barcodes', 'Petty Cash': 'petty_cash',
    'Stock Adjustment': 'stock_adjustments', 'Stock In / Out': 'stock_movements', 'Physical Stock': 'physical_stock',
    'Deposits': 'bank_deposits', 'Stock Transfer': 'stock_transfers',
  }
  const realTable = TABLE_MAP[module]

  const load = async () => {
    setLoading(true); setRows([])
    try {
      if (realTable) {
        const { data } = await supabase.from(realTable).select('*').order('created_at', { ascending: false }).limit(200)
        setRows(data || [])
      } else {
        const { data } = await supabase.from('module_records').select('*').eq('module', module).order('created_at', { ascending: false }).limit(200)
        setRows(data || [])
      }
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [module])

  const dataOf = (r) => realTable ? r : (r && r.data && typeof r.data === 'object' ? r.data : {})
  const statOf = (r) => realTable ? (r.status || '') : ((r && r.status) || dataOf(r).status || '')
  const counts = { All: rows.length }
  rows.forEach((r) => { const s = statOf(r) || '—'; counts[s] = (counts[s] || 0) + 1 })

  const filtered = rows.filter((r) => {
    if (statusFilter !== 'All' && statOf(r) !== statusFilter) return false
    if (!search) return true
    return JSON.stringify({ ...dataOf(r), status: statOf(r) }).toLowerCase().includes(search.toLowerCase())
  })

  const blank = () => {
    const f: any = { id: `new-${Date.now()}`, recId: null, status: 'Active', data: {}, error: '', saving: false }
    cfg.fields.forEach((fld) => { if (fld.type === 'date') f.data[fld.key] = new Date().toISOString().split('T')[0] })
    return f
  }

  const adjustStock = async (mod, d) => {
    const pid = d.product_id
    if (!pid) return
    if (!['Stock In / Out', 'Stock Adjustment', 'Physical Stock'].includes(mod)) return
    const { data: prod } = await supabase.from('products').select('stock_quantity').eq('id', pid).single()
    if (!prod) return
    const cur = Number(prod.stock_quantity || 0)
    let next = cur
    if (mod === 'Stock In / Out') {
      const qty = Number(d.quantity || 0)
      next = cur + (d.movement_type === 'Out' ? -qty : qty)
    } else if (mod === 'Stock Adjustment') {
      const qty = Number(d.quantity || 0)
      next = cur + (d.adjustment_type === 'Negative' ? -qty : qty)
    } else if (mod === 'Physical Stock') {
      next = Number(d.counted_qty || 0)
    }
    await supabase.from('products').update({ stock_quantity: next }).eq('id', pid)
  }

  const save = async () => {
    const missing = cfg.fields.find((fld) => fld.required && !String(form.data[fld.key] ?? '').trim())
    if (missing) { setForm({ ...form, error: `${missing.label} is required.` }); return }
    if (!form.status) { setForm({ ...form, error: 'Status is required.' }); return }
    setForm({ ...form, saving: true, error: '' })
    try {
      const data = { ...form.data }
      if (data.product_id) { const p = products.find((x) => x.id === data.product_id); if (p) data.item_name = p.name }
      if (realTable) {
        const payload = { ...data, status: form.status }
        if (form.recId) {
          const { error } = await supabase.from(realTable).update(payload).eq('id', form.recId)
          if (error) throw error
        } else {
          const { error } = await supabase.from(realTable).insert(payload)
          if (error) throw error
          // Deduct credit for new record
          try {
            const { deductCredit } = await import('../utils/billing')
            const tenantId = authTenant?.id
            if (tenantId) await deductCredit(tenantId, realTable, null, `${module}: new record`)
          } catch (e) { console.error('Credit deduction failed:', e) }
        }
      } else {
        const payload = { module, status: form.status, data }
        if (form.recId) {
          const { error } = await supabase.from('module_records').update(payload).eq('id', form.recId)
          if (error) throw error
        } else {
          const { error } = await supabase.from('module_records').insert(payload)
          if (error) throw error
        }
      }
      await adjustStock(module, { ...data, id: form.recId }).catch((e) => console.error('Stock update failed:', e))
      setForm(null); load()
    } catch (err) { setForm({ ...form, saving: false, error: err.message }) }
  }

  const remove = async (r) => {
    const d = dataOf(r)
    const title = cfg.fields.find((f) => f.key === 'name') ? d.name : d[cfg.columns[0]?.key]
    if (!window.confirm(`Delete record${title ? ` "${title}"` : ''} from ${module}?`)) return
    if (realTable) {
      const { error } = await supabase.from(realTable).delete().eq('id', r.id)
      if (!error) load()
    } else {
      const { error } = await supabase.from('module_records').delete().eq('id', r.id)
      if (!error) load()
    }
  }

  const printRec = (r) => {
    const d = dataOf(r)
    let html = '<html><head><title>' + module + '</title><style>body{font-family:Arial,sans-serif;padding:30px;max-width:800px}h1{color:#1e1b4b;font-size:22px;margin:0}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{padding:6px 10px;border:1px solid #e2e8f0;font-size:12px;text-align:left}th{background:#f1f5f9;width:35%}.hdr{display:flex;justify-content:space-between;border-bottom:3px solid #8b5cf6;padding-bottom:10px}.meta{margin-top:12px;font-size:13px;color:#334155}</style></head><body>'
    html += '<div class="hdr"><div><h1>' + cfg.icon + ' ' + module + '</h1></div><div class="meta"><b>Status:</b> ' + statOf(r) + '</div></div><table>'
    cfg.fields.forEach((f) => {
      const v = d[f.key] ?? ''
      html += '<tr><th>' + f.label + '</th><td>' + (f.type === 'money' ? fmtMoney(v) : v) + '</td></tr>'
    })
    html += '</table></body></html>'
    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close(); w.print()
  }

  const cell = (r, c) => {
    const v = dataOf(r)[c.key]
    if (c.type === 'money') return <span className="money">{fmtMoney(v)}</span>
    if (c.type === 'date') return v ? new Date(v).toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' }) : ''
    return v ?? ''
  }

  if (!form) {
    return (
      <div className="report-wrap">
        <div className="coa-head">
          <h3>{cfg.icon} {module}</h3>
          <div className="coa-head-right">
            <input className="coa-search" placeholder="🔍 Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <button className="btn-add" onClick={() => setForm(blank())}>＋ New Record</button>
          </div>
        </div>
        <div className="report-controls" style={{ marginBottom: 12 }}>
          {Object.entries(counts).map(([st, n]) => (
            <button key={st} className={`filter-btn ${statusFilter === st ? 'active' : ''}`} onClick={() => setStatusFilter(st)}>{st} ({n})</button>
          ))}
        </div>
        <div className="grid-wrap">
          <table className="data-grid">
            <thead>
              <tr>
                <th className="th-actions"></th>
                {cfg.columns.map((c) => <th key={c.key}>{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={cfg.columns.length + 1} className="empty">Loading...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={cfg.columns.length + 1} className="empty">No records found</td></tr>}
              {!loading && filtered.map((r, i) => (
                <tr key={r.id || i} className={i % 2 ? 'alt' : ''}>
                  <td className="td-actions">
                    <button className="act edit" title="Edit" onClick={() => setForm({ recId: r.id, status: statOf(r), data: { ...dataOf(r) }, error: '', saving: false })}>✏️</button>
                    <button className="act edit" title="Print" onClick={() => printRec(r)}>🖨️</button>
                    <AttachmentButton entityType={module} entityId={r.id} title={module + ' Attachments'} />
                    <button className="act del" title="Delete" onClick={() => remove(r)}>🗑️</button>
                  </td>
                  {cfg.columns.map((c) => (
                    <td key={c.key}>
                      {c.type === 'status' ? (
                        <span className={`badge ${STATUS_CLASS(c.key === 'status' ? statOf(r) : String(dataOf(r)[c.key] ?? ''))}`}>{c.key === 'status' ? (statOf(r) || '—') : (dataOf(r)[c.key] || '—')}</span>
                      ) : cell(r, c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="report-wrap" ref={wrapRef} onKeyDown={(e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') return
        e.preventDefault()
        const inputs = Array.from(wrapRef.current.querySelectorAll('input, select'))
        const idx = inputs.indexOf(e.target)
        if (idx > -1 && idx < inputs.length - 1) inputs[idx + 1].focus()
      }
    }}>
      <div className="coa-head">
        <h3>{form.recId ? '✏️ Edit Record' : '＋ New Record'} — {cfg.icon} {module}</h3>
        <button className="btn-cancel" onClick={() => setForm(null)}>✕ Cancel</button>
      </div>
      {form.error && <div className="inv-error">⚠️ {form.error}</div>}
      <Attachments entityType={module} entityId={form.recId || null} />
      <div className="inv-grid coa-form-grid" style={{ marginTop: 14 }}>
        {cfg.fields.map((f, i) => (
          <label key={f.key}>{f.label}{f.required ? ' *' : ''}
            {f.type === 'select' ? (
              <select ref={i === 0 ? firstRef : null} value={f.key === 'status' ? form.status : (form.data[f.key] ?? '')} onChange={(e) => (f.key === 'status' ? setForm({ ...form, status: e.target.value }) : setForm({ ...form, data: { ...form.data, [f.key]: e.target.value } }))}>
                <option value="">Select…</option>
                {(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : f.type === 'textarea' ? (
              <textarea ref={i === 0 ? firstRef : null} rows={2} style={{ width: '100%', padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }} value={form.data[f.key] ?? ''} onChange={(e) => setForm({ ...form, data: { ...form.data, [f.key]: e.target.value } })}></textarea>
            ) : f.type === 'product' ? (
              <select ref={i === 0 ? firstRef : null} value={form.data[f.key] ?? ''} onChange={(e) => setForm({ ...form, data: { ...form.data, [f.key]: e.target.value } })}>
                <option value="">Select product…</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
              </select>
            ) : (
              <input ref={i === 0 ? firstRef : null} type={f.type === 'date' ? 'date' : 'text'} inputMode={(f.type === 'money' || f.type === 'number') ? 'decimal' : undefined} placeholder={f.type === 'money' ? '0.00' : ''} value={form.data[f.key] ?? ''} onChange={(e) => setForm({ ...form, data: { ...form.data, [f.key]: e.target.value } })} />
            )}
          </label>
        ))}
      </div>
      <div className="inv-actions" style={{ marginTop: 14 }}>
        <button className="btn-cancel" onClick={() => setForm(null)}>✕ Cancel</button>
        <button className="btn-primary" disabled={form.saving} onClick={() => save()}>{form.saving ? 'Saving…' : '💾 Save Record'}</button>
      </div>
    </div>
  )
}

const LandedCostWorkspace = ({ fmtMoney }) => {
  const [docs, setDocs] = useState([])
  const [grnDocs, setGrnDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const TABLE = 'landed_costs'

  const loadDocs = async () => {
    setLoading(true)
    try {
      const { data } = await supabase.from(TABLE).select('*').order('created_at', { ascending: false }).limit(200)
      setDocs(data || [])
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  useEffect(() => { loadDocs() }, [])
  useEffect(() => {
    supabase.from('goods_receipts').select('id, grn_no, party_id, party_name, items, grand_total, status').eq('status', 'Approved').then(({ data }) => setGrnDocs(data || []))
  }, [])

  const counts = { All: docs.length }
  docs.forEach((d) => { const s = d.status || '—'; counts[s] = (counts[s] || 0) + 1 })
  const filtered = docs.filter((d) => {
    if (statusFilter !== 'All' && d.status !== statusFilter) return false
    if (!search) return true
    return ((d.lc_no || '') + ' ' + (d.party_name || '') + ' ' + (d.grn_no || '')).toLowerCase().includes(search.toLowerCase())
  })

  const blankDoc = () => ({
    recId: null, lc_no: '', _grn_id: '', grn_no: '', party_id: '', party_name: '',
    doc_date: new Date().toISOString().split('T')[0], currency: 'AED',
    costLines: [{ account: 'Freight', amount: '', description: '' }],
    notes: '', status: 'Draft', saving: false, error: ''
  })

  const calcTotals = (costLines) => {
    const total = costLines.reduce((s, l) => s + (Number(l.amount) || 0), 0)
    return { total, vat: total * 0 / 100, grand_total: total }
  }

  const selectGrn = (grnId) => {
    const grn = grnDocs.find((g) => g.id === grnId)
    if (grn) {
      setForm({ ...form, _grn_id: grn.id, grn_no: grn.grn_no, party_id: grn.party_id, party_name: grn.party_name })
    }
  }

  const addCostLine = () => {
    setForm({ ...form, costLines: [...form.costLines, { account: 'Freight', amount: '', description: '' }] })
  }

  const updateCostLine = (idx, key, val) => {
    const lines = [...form.costLines]
    lines[idx] = { ...lines[idx], [key]: val }
    setForm({ ...form, costLines: lines })
  }

  const removeCostLine = (idx) => {
    if (form.costLines.length <= 1) return
    setForm({ ...form, costLines: form.costLines.filter((_, i) => i !== idx) })
  }

  const saveDoc = async (approveAfter) => {
    if (!form._grn_id) { setForm({ ...form, error: 'Please select a GRN to allocate landed cost.' }); return }
    if (!form.costLines.some((l) => Number(l.amount) > 0)) { setForm({ ...form, error: 'Enter at least one cost amount.' }); return }
    setForm({ ...form, saving: true, error: '' })

    const totals = calcTotals(form.costLines)
    const payload = {
      party_id: form.party_id, party_name: form.party_name, grn_no: form.grn_no,
      doc_date: form.doc_date, currency: form.currency,
      items: form.costLines.filter((l) => Number(l.amount) > 0),
      cost_lines: form.costLines.filter((l) => Number(l.amount) > 0),
      subtotal: totals.total, vat_percent: 0, vat_amount: 0, grand_total: totals.grand_total,
      notes: form.notes, status: approveAfter ? 'Approved' : 'Draft'
    }

    try {
      let docId = form.recId
      let docNo = form.recId ? form.lc_no : null

      if (form.recId) {
        const { error } = await supabase.from(TABLE).update(payload).eq('id', form.recId)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from(TABLE).insert(payload).select()
        if (error) throw error
        docId = data?.[0]?.id
        docNo = data?.[0]?.lc_no
      }

      if (approveAfter && form._grn_id) {
        const grnTotal = Number(calcGrnTotal(form._grn_id) || 1)
        const landedTotal = Number(totals.grand_total || 0)
        const { data: grnDoc } = await supabase.from('goods_receipts').select('items, notes').eq('id', form._grn_id).single()
        if (grnDoc && grnDoc.items) {
          const allocatedItems = grnDoc.items.map((it) => {
            const itemValue = Number(it.qty || 0) * Number(it.price || 0)
            const share = grnTotal > 0 ? (itemValue / grnTotal) : (1 / grnDoc.items.length)
            return { ...it, landed_cost: Number((landedTotal * share).toFixed(2)) }
          })
          const lcNote = `Landed Cost: ${docNo || 'LC'} — ${fmtMoney(landedTotal)}`
          await supabase.from('goods_receipts').update({
            items: allocatedItems,
            notes: (grnDoc.notes || '') ? (grnDoc.notes + '\n' + lcNote) : lcNote
          }).eq('id', form._grn_id)
        }
        try {
          const { deductCredit } = await import('../utils/billing')
          const { data: { authTenant } } = await supabase.auth.getSession()
          if (authTenant?.id) await deductCredit(authTenant.id, TABLE, docNo, `Landed Cost: ${docNo || ''}`)
        } catch (e) { console.error('Credit deduction failed:', e) }
      }

      setForm({ ...form, recId: docId, lc_no: docNo, error: '' })
      loadDocs()
    } catch (err) { setForm({ ...form, saving: false, error: err.message }) }
  }

  const calcGrnTotal = (grnId) => {
    const grn = grnDocs.find((g) => g.id === grnId)
    return grn ? Number(grn.grand_total || 0) : 0
  }

  if (!form) {
    return (
      <div className="report-wrap">
        <div className="coa-head">
          <h3>🚢 Landed Cost</h3>
          <div className="coa-head-right">
            <input className="coa-search" placeholder="🔍 Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <button className="btn-add" onClick={() => setForm(blankDoc())}>＋ New Document</button>
          </div>
        </div>
        <div className="report-controls" style={{ marginBottom: 12 }}>
          {Object.entries(counts).map(([st, n]) => (
            <button key={st} className={`status-pill ${statusFilter === st ? 'active' : ''}`} onClick={() => setStatusFilter(st)}>{st} ({n})</button>
          ))}
        </div>
        {loading ? <div className="no-data"><i className="bi bi-arrow-clockwise"></i>Loading...</div> : filtered.length === 0 ? (
          <div className="no-data"><i className="bi bi-inbox"></i>No landed cost records</div>
        ) : (
          <table className="data-grid report-table">
            <thead><tr><th>LC #</th><th>GRN</th><th>SUPPLIER</th><th>DATE</th><th>AMOUNT</th><th>STATUS</th><th style={{ width: 90 }}></th></tr></thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id}>
                  <td>{d.lc_no || '—'}</td><td>{d.grn_no || '—'}</td><td>{d.party_name || '—'}</td>
                  <td>{(d.doc_date || '').slice(0, 10)}</td>
                  <td className="col-money">{fmtMoney(d.grand_total)}</td>
                  <td className={`status-cell ${(d.status || '').toLowerCase()}`}>{d.status}</td>
                  <td className="td-actions">
                    <button className="act-btn edit" title="Edit" onClick={() => setForm({ ...d, recId: d.id, _grn_id: d._grn_id || '', grn_no: d.grn_no || '', costLines: d.cost_lines || d.items || [{ account: 'Freight', amount: '', description: '' }], saving: false, error: '' })}>✏️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    )
  }

  const totals = calcTotals(form.costLines)
  return (
    <div className="report-wrap">
      <div className="coa-head">
        <h3>{form.recId ? `✏️ Edit — ${form.lc_no || ''}` : '＋ New Landed Cost'}</h3>
        <button className="btn-cancel" onClick={() => setForm(null)}>✕ Cancel</button>
      </div>
      {form.error && <div className="inv-error">⚠️ {form.error}</div>}

      <div className="inv-grid coa-form-grid" style={{ marginTop: 14 }}>
        <label>Allocate to GRN *
          <select value={form._grn_id || ''} onChange={(e) => selectGrn(e.target.value)}>
            <option value="">Select GRN to allocate landed cost</option>
            {grnDocs.map((g) => <option key={g.id} value={g.id}>{g.grn_no} — {g.party_name} ({fmtMoney(g.grand_total)})</option>)}
          </select>
        </label>
        <label>Supplier<input value={form.party_name || ''} readOnly style={{ background: '#f1f5f9' }} /></label>
        <label>Date<input type="date" value={form.doc_date || ''} onChange={(e) => setForm({ ...form, doc_date: e.target.value })} /></label>
        <label>Currency
          <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
            {['AED', 'SAR', 'USD', 'EUR', 'GBP'].map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
      </div>

      {form._grn_no && (
        <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, marginTop: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#16a34a' }}>Allocating to: {form.grn_no} — GRN Total: {fmtMoney(calcGrnTotal(form._grn_id))}</div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>Landed cost will be proportionally distributed across GRN items based on value.</div>
        </div>
      )}

      <div style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h4 style={{ margin: 0 }}>Cost Lines</h4>
          <button className="btn-add" style={{ padding: '4px 12px', fontSize: 12 }} onClick={addCostLine}>＋ Add Line</button>
        </div>
        <table className="data-grid report-table">
          <thead><tr><th style={{ width: '25%' }}>ACCOUNT</th><th className="col-money" style={{ width: '20%' }}>AMOUNT</th><th>DESCRIPTION</th><th style={{ width: 40 }}></th></tr></thead>
          <tbody>
            {form.costLines.map((line, idx) => (
              <tr key={idx}>
                <td>
                  <select value={line.account || 'Freight'} onChange={(e) => updateCostLine(idx, 'account', e.target.value)}>
                    {['Freight', 'Customs Duty', 'Insurance', 'Handling', 'Demurrage', 'Clearance', 'Inland Transport', 'Other'].map((a) => <option key={a}>{a}</option>)}
                  </select>
                </td>
                <td><input type="number" inputMode="decimal" placeholder="0.00" value={line.amount || ''} onChange={(e) => updateCostLine(idx, 'amount', e.target.value)} /></td>
                <td><input type="text" placeholder="Description (optional)" value={line.description || ''} onChange={(e) => updateCostLine(idx, 'description', e.target.value)} /></td>
                <td><button className="act-btn del" onClick={() => removeCostLine(idx)} disabled={form.costLines.length <= 1}>🗑️</button></td>
              </tr>
            ))}
            {form.costLines.length === 0 && <tr><td colSpan="4" className="empty">No cost lines added</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="report-section" style={{ marginTop: 14 }}>
        <div className="je-totals">
          <span>Total: <b>{fmtMoney(totals.total)}</b></span>
          <span className="grand">Grand Total: <b>{fmtMoney(totals.grand_total)}</b></span>
        </div>
        <label style={{ display: 'block', marginTop: 10 }}>Notes<textarea rows="2" style={{ width: '100%', padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes..." /></label>
      </div>

      <div className="inv-actions">
        <button className="btn-cancel" onClick={() => setForm(null)}>✕ Cancel</button>
        <button className="btn-primary" disabled={form.saving} onClick={() => saveDoc(false)}>{form.saving ? 'Saving…' : '💾 Save Draft'}</button>
        <button className="btn-primary" disabled={form.saving} style={{ background: '#10b981' }} onClick={() => saveDoc(true)}>✅ Save & Approve</button>
      </div>
    </div>
  )
}

const DocWorkspace = ({ cfg, fmtMoney }) => {
  const isInv = !!cfg.inv
  const TABLE = cfg.table
  const NO_FIELD = cfg.noField
  const PARTY_KEY = cfg.partyNameKey
  const PARTY_ID_KEY = cfg.partyIdKey || 'party_id'
  const PARTY_LABEL = cfg.party === 'supplier' ? 'Supplier' : 'Customer'
  const PARTY_TABLE = cfg.party === 'supplier' ? 'suppliers' : 'customers'
  const NO_LABEL = { invoice_no: 'INVOICE #', delivery_no: 'DELIVERY #', memo_no: 'MEMO #', return_no: 'RETURN #', req_no: 'REQ #', po_no: 'PO #', grn_no: 'GRN #', pin_no: 'A/P INV #', lc_no: 'L/C #' }[NO_FIELD] || 'DOC #'
  const [docs, setDocs] = useState([])
  const [parties, setParties] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [grnDocs, setGrnDocs] = useState([])
  const [scanOpen, setScanOpen] = useState(false)
  const [payLinkDoc, setPayLinkDoc] = useState<any>(null)
  const wrapRef = useRef(null)
  const firstRef = useRef(null)
  useEffect(() => { if (form && firstRef.current) firstRef.current.focus() }, [!form])

  const isLandedCost = TABLE === 'landed_costs'

  const loadDocs = async () => {
    setLoading(true)
    setDocs([])
    try {
      const { data } = await supabase.from(TABLE).select('*').order('created_at', { ascending: false }).limit(200)
      setDocs(data || [])
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }
  useEffect(() => { loadDocs() }, [TABLE])

  useEffect(() => {
    Promise.all([supabase.from(PARTY_TABLE).select('id, code, name').eq('status', 'Active'), supabase.from('products').select('id, code, name, price')])
      .then(([p, pr]) => { setParties(p.data || []); setProducts(pr.data || []) })
      .catch((err) => console.error(err))
  }, [PARTY_TABLE])

  useEffect(() => {
    if (isLandedCost) {
      supabase.from('goods_receipts').select('id, grn_no, party_name, items, grand_total, status').eq('status', 'Approved').then(({ data }) => setGrnDocs(data || []))
    }
  }, [isLandedCost])

  const docDate = (d) => (isInv ? (d.invoice_date || d.created_at || '').slice(0, 10) : d.doc_date)
  const counts = { All: docs.length }
  docs.forEach((d) => { const s = d.status || '—'; counts[s] = (counts[s] || 0) + 1 })

  const filtered = docs.filter((d) => {
    if (statusFilter !== 'All' && d.status !== statusFilter) return false
    if (!search) return true
    return ((d[NO_FIELD] || '') + ' ' + (d[PARTY_KEY] || '')).toLowerCase().includes(search.toLowerCase())
  })

  const calcTotals = (items, otherCosts) => {
    const subtotal = items.reduce((s, it) => s + Number(it.qty || 0) * Number(it.price || 0), 0)
    const other = Number(otherCosts || 0)
    const vat_amount = (subtotal + other) * (cfg.vat || 0) / 100
    return { subtotal, otherCosts: other, vat_amount, grand_total: subtotal + other + vat_amount }
  }

  const blankDoc = () => {
    const f = { id: `new-${Date.now()}`, recId: null, _party_id: '', [PARTY_KEY]: '', items: [], notes: '', status: 'Draft', saving: false, error: '', source_doc_no: '', otherCosts: 0, otherCostDesc: '' }
    if (isLandedCost) { f._grn_id = ''; f._grn_no = ''; f._grn_total = 0; f.cost_type = 'Freight' }
    if (isInv) { f.payment_method = 'Cash' }
    else { f[PARTY_ID_KEY] = ''; f.doc_date = new Date().toISOString().split('T')[0]; f.currency = taxConfig.currency; f.payment_terms = 'Net 30' }
    return f
  }

  const setItem = (idx, key, value) => {
    const items = form.items.map((it, i) => {
      if (i !== idx) return it
      if (key === 'product_id') {
        const prod = products.find((p) => p.id === value)
        return { ...it, product_id: value, name: prod?.name || '', price: String(prod?.price ?? '') }
      }
      return { ...it, [key]: value }
    })
    setForm({ ...form, items })
  }

  const fillFromScan = (d: any) => {
    const items = (d.line_items || []).map((l: any) => ({ product_id: '', name: l.description || '', qty: String(l.quantity || 1), price: String(l.unit_price || 0) }))
    setForm((f: any) => ({
      ...f,
      [PARTY_KEY]: d.supplier_name || f[PARTY_KEY],
      [NO_FIELD]: d.invoice_no || f[NO_FIELD],
      notes: [d.notes, d.invoice_no ? 'Vendor Inv: ' + d.invoice_no : '', d.invoice_date ? 'Date: ' + d.invoice_date : ''].filter(Boolean).join(' | ') || f.notes,
      items: items.length ? items : f.items,
    }))
  }

  const postToLedger = async (doc, totals) => {
    const { data: accts } = await supabase.from('accounts').select('*')
    if (!accts || !accts.length) return
    const find = (pred) => accts.find((a) => !a.is_group && pred(a))
    const ar = find((a) => a.name.toLowerCase().includes('receivable'))
    const ap = find((a) => a.name.toLowerCase().includes('payable'))
    const sales = find((a) => a.type === 'Income') || find((a) => a.name.toLowerCase().includes('sales'))
    const salesReturn = find((a) => /sales return|return/i.test(a.name)) || sales
    const exp = find((a) => a.type === 'Expense') || find((a) => /purchase|cogs|cost/i.test(a.name))
    const vatOut = find((a) => a.name.toLowerCase().includes('output'))
    const vatIn = find((a) => a.name.toLowerCase().includes('input'))
    const ref = `${cfg.title || TABLE} ${doc[NO_FIELD] || ''}`
    const isReverse = /credit memo|return/i.test(cfg.title || '')
    const lines = []
    if (isInv) {
      if (ar) lines.push({ account_id: ar.id, debit: totals.grand_total, credit: 0, description: ref })
      if (sales) lines.push({ account_id: sales.id, debit: 0, credit: totals.subtotal, description: 'Sales revenue' })
      if (vatOut && totals.vat_amount) lines.push({ account_id: vatOut.id, debit: 0, credit: totals.vat_amount, description: 'Output VAT' })
    } else if (cfg.party === 'customer') {
      if (ar) lines.push({ account_id: ar.id, debit: 0, credit: totals.grand_total, description: ref })
      if (salesReturn) lines.push({ account_id: salesReturn.id, debit: totals.subtotal, credit: 0, description: 'Sales return' })
      if (vatOut && totals.vat_amount) lines.push({ account_id: vatOut.id, debit: totals.vat_amount, credit: 0, description: 'VAT reversal' })
    } else if (isReverse) {
      if (ap) lines.push({ account_id: ap.id, debit: totals.grand_total, credit: 0, description: ref })
      if (exp) lines.push({ account_id: exp.id, debit: 0, credit: totals.subtotal, description: 'Purchase return' })
      if (vatIn && totals.vat_amount) lines.push({ account_id: vatIn.id, debit: 0, credit: totals.vat_amount, description: 'VAT reversal' })
    } else {
      if (exp) lines.push({ account_id: exp.id, debit: totals.subtotal, credit: 0, description: 'Purchase / expense' })
      if (vatIn && totals.vat_amount) lines.push({ account_id: vatIn.id, debit: totals.vat_amount, credit: 0, description: 'Input VAT' })
      if (ap) lines.push({ account_id: ap.id, debit: 0, credit: totals.grand_total, description: ref })
    }
    if (!lines.length) return
    const totalDebit = lines.reduce((s, l) => s + Number(l.debit || 0), 0)
    const totalCredit = lines.reduce((s, l) => s + Number(l.credit || 0), 0)
    const { data: je, error: jeErr } = await supabase.from('journal_entries').insert({
      entry_date: doc.doc_date || new Date().toISOString().split('T')[0],
      reference: doc[NO_FIELD] || '',
      narration: ref,
      status: 'Posted',
      total_debit: totalDebit,
      total_credit: totalCredit,
      currency: doc.currency || 'AED',
    }).select()
    if (jeErr || !je || !je.length) return
    const jeId = je[0].id
    const jeLines = lines.map((l, i) => ({ entry_id: jeId, line_no: i + 1, account_id: l.account_id, debit: Number(l.debit || 0), credit: Number(l.credit || 0), description: l.description }))
    await supabase.from('journal_lines').insert(jeLines)
    for (const l of lines) {
      const acct = accts.find((a) => a.id === l.account_id)
      if (!acct) continue
      const newBal = Number(acct.current_balance || 0) + Number(l.debit || 0) - Number(l.credit || 0)
      await supabase.from('accounts').update({ current_balance: newBal }).eq('id', acct.id)
    }
  }

  const saveDoc = async (approveAfter) => {
    const party = parties.find((p) => p.id === form._party_id)
    if (!isInv && !party) { setForm({ ...form, error: `Please select a ${PARTY_LABEL.toLowerCase()}.` }); return }
    if (isInv && !form[PARTY_KEY]) { setForm({ ...form, error: 'Please select a customer.' }); return }
    if (!form.items.length) { setForm({ ...form, error: 'Add at least one item.' }); return }
    const totals = calcTotals(form.items, form.otherCosts)
    // Credit limit check for invoices
    if (isInv && approveAfter && form._party_id) {
      try {
        const { data: cust } = await supabase.from('customers').select('credit_limit, name').eq('id', form._party_id).single()
        if (cust && Number(cust.credit_limit) > 0) {
          const { data: outstanding } = await supabase.from(TABLE).select('grand_total, amount_paid').eq(PARTY_ID_KEY, form._party_id).in('status', ['Approved', 'Draft'])
          const totalOutstanding = (outstanding || []).reduce((s, d) => s + (Number(d.grand_total) || 0) - (Number(d.amount_paid) || 0), 0)
          if (totalOutstanding + totals.grand_total > Number(cust.credit_limit)) {
            if (!confirm(`⚠️ Credit Limit Warning\n\nCustomer: ${cust.name}\nCredit Limit: ${fmtMoney(Number(cust.credit_limit), taxConfig.currency)}\nCurrent Outstanding: ${fmtMoney(totalOutstanding, taxConfig.currency)}\nThis Invoice: ${fmtMoney(totals.grand_total, taxConfig.currency)}\nTotal After: ${fmtMoney(totalOutstanding + totals.grand_total, taxConfig.currency)}\n\nProceed anyway?`)) {
              setForm({ ...form, saving: false, error: '' }); return
            }
          }
        }
      } catch (e) { console.error('Credit limit check failed:', e) }
    }
    setForm({ ...form, saving: true, error: '' })
    const items = form.items.map((it) => ({ ...it, qty: Number(it.qty) || 0, price: Number(it.price) || 0 }))
    const payload = {
      [PARTY_KEY]: (isInv && !party) ? form[PARTY_KEY] : (party ? party.name : ''),
      items, subtotal: totals.subtotal, other_costs: totals.otherCosts, other_cost_desc: form.otherCostDesc || '', vat_percent: cfg.vat, vat_amount: totals.vat_amount, grand_total: totals.grand_total,
      notes: form.notes,
      status: approveAfter ? 'Approved' : 'Draft',
    }
    if (form.source_doc_no) payload.source_doc_no = form.source_doc_no
    if (!isInv) {
      payload[PARTY_ID_KEY] = form._party_id
      payload.doc_date = form.doc_date
      payload.currency = form.currency
      payload.payment_terms = form.payment_terms
    } else {
      payload.payment_method = form.payment_method
      payload.amount_paid = 0
      payload.balance = totals.grand_total
    }
    try {
      let docId = form.recId
      let docNo = form.recId ? form[NO_FIELD] : null
      if (form.recId) {
        const { error } = await supabase.from(TABLE).update(payload).eq('id', form.recId)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from(TABLE).insert(payload).select()
        if (error) throw error
        docId = data?.[0]?.id
        docNo = data?.[0]?.[NO_FIELD]
        // Deduct credit for new document
        try {
          const { deductCredit } = await import('../utils/billing')
          const tenantId = authTenant?.id
          if (tenantId) await deductCredit(tenantId, TABLE, docNo, `${cfg.title || TABLE}: ${docNo || ''}`)
        } catch (e) { console.error('Credit deduction failed:', e) }
      }
      if (approveAfter) {
        try { await postToLedger({ ...payload, id: docId, [NO_FIELD]: docNo }, totals) } catch (e) { console.error('Ledger post failed:', e); alert('⚠️ Ledger post failed: ' + (e.message || e) + '\nDocument saved but accounting entry was NOT posted. Please post manually.') }
        if (cfg.stockImpact) {
          for (const it of items) {
            if (it.product_id) {
              const { data: prod } = await supabase.from('products').select('stock_quantity').eq('id', it.product_id).single()
              if (prod) {
                await supabase.from('products').update({ stock_quantity: Number(prod.stock_quantity || 0) + Number(it.qty || 0) }).eq('id', it.product_id)
              }
            }
          }
        }
        if (isLandedCost && form._grn_id) {
          const grnTotal = Number(form._grn_total || 1)
          const landedTotal = Number(totals.grand_total || 0)
          const { data: grnDoc } = await supabase.from('goods_receipts').select('items, notes').eq('id', form._grn_id).single()
          if (grnDoc && grnDoc.items) {
            const allocatedItems = grnDoc.items.map((it) => {
              const itemValue = Number(it.qty || 0) * Number(it.price || 0)
              const share = grnTotal > 0 ? (itemValue / grnTotal) : (1 / grnDoc.items.length)
              return { ...it, landed_cost: Number((landedTotal * share).toFixed(2)) }
            })
            const existingNotes = grnDoc.notes || ''
            const lcNote = `${form.cost_type || 'Landed Cost'}: ${docNo || 'LC'} — ${fmtMoney(landedTotal)}`
            await supabase.from('goods_receipts').update({
              items: allocatedItems,
              notes: existingNotes ? existingNotes + '\n' + lcNote : lcNote,
            }).eq('id', form._grn_id)
          }
        }
      }
      setForm({ ...form, recId: docId, [NO_FIELD]: docNo, savedCode: docNo, error: '' })
      loadDocs()
    } catch (err) { setForm({ ...form, saving: false, error: err.message }) }
  }

  const setStatus = async (doc, status) => {
    const { error } = await supabase.from(TABLE).update({ status }).eq('id', doc.id)
    if (!error) loadDocs()
  }

  const deleteDoc = async (doc) => {
    if (!window.confirm(`Delete ${doc[NO_FIELD] || 'document'}?`)) return
    const { error } = await supabase.from(TABLE).delete().eq('id', doc.id)
    if (!error) loadDocs()
  }

  const convertDoc = async (doc) => {
    if (!cfg.convertTo) return
    const targetCfg = getDocMenus(taxConfig.standard_rate)[cfg.convertTo]
    if (!targetCfg) return
    if (!window.confirm(`Convert ${doc[NO_FIELD]} to ${cfg.convertLabel || cfg.convertTo}?`)) return
    const payload = {
      party_id: doc[PARTY_ID_KEY], party_name: doc[PARTY_KEY],
      doc_date: new Date().toISOString().split('T')[0],
      currency: doc.currency, payment_terms: doc.payment_terms,
      items: doc.items,
      subtotal: doc.subtotal, vat_percent: targetCfg.vat, vat_amount: doc.subtotal * (targetCfg.vat || 0) / 100,
      grand_total: doc.subtotal + doc.subtotal * (targetCfg.vat || 0) / 100,
      notes: `Converted from ${doc[NO_FIELD]}`,
      source_doc_id: doc.id, source_doc_no: doc[NO_FIELD],
      status: 'Draft',
    }
    try {
      const { error } = await supabase.from(targetCfg.table).insert(payload)
      if (error) throw error
      await supabase.from(TABLE).update({ status: 'Converted' }).eq('id', doc.id)
      alert(`Converted to ${cfg.convertTo}.`)
      loadDocs()
    } catch (err) { alert('Conversion failed: ' + err.message) }
  }

  const printDoc = (doc) => {
    const w = window.open('', '_blank')
    w.document.write('<html><head><title>' + (doc[NO_FIELD] || '') + '</title><style>body{font-family:Arial,sans-serif;padding:30px;max-width:800px}h1{color:#1e1b4b;font-size:22px;margin:0}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{padding:6px 10px;border:1px solid #e2e8f0;font-size:12px;text-align:left}th{background:#f1f5f9}.col-r{text-align:right}.total{font-weight:700;background:#f8fafc}.meta{margin-top:12px;font-size:13px;color:#334155}.hdr{display:flex;justify-content:space-between;border-bottom:3px solid #8b5cf6;padding-bottom:10px}</style></head><body>')
    w.document.write('<div class="hdr"><div><h1>' + cfg.title + '</h1><div class="meta">' + (doc[NO_FIELD] || '') + '</div></div><div class="meta" style="text-align:right"><b>Date:</b> ' + docDate(doc) + '<br><b>Status:</b> ' + doc.status + '</div></div>')
    w.document.write('<div class="meta"><b>' + PARTY_LABEL + ':</b> ' + (doc[PARTY_KEY] || '—') + (isInv ? '' : '<br><b>Payment Terms:</b> ' + doc.payment_terms) + (doc.source_doc_no ? '<br><b>Ref:</b> ' + doc.source_doc_no : '') + '</div>')
    w.document.write('<table><tr><th>Item</th><th class="col-r">Qty</th><th class="col-r">Price</th><th class="col-r">Total</th></tr>')
    ;(doc.items || []).forEach((it) => { w.document.write('<tr><td>' + (it.name || '') + '</td><td class="col-r">' + it.qty + '</td><td class="col-r">' + fmtMoney(it.price) + '</td><td class="col-r">' + fmtMoney(Number(it.qty) * Number(it.price)) + '</td></tr>') })
    w.document.write('<tr class="total"><td colspan="3">Subtotal</td><td class="col-r">' + fmtMoney(doc.subtotal) + '</td></tr>')
    w.document.write('<tr><td colspan="3">VAT (' + (doc.vat_percent ?? cfg.vat) + '%)</td><td class="col-r">' + fmtMoney(doc.vat_amount) + '</td></tr>')
    w.document.write('<tr class="total"><td colspan="3"><b>GRAND TOTAL</b></td><td class="col-r"><b>' + fmtMoney(doc.grand_total) + '</b></td></tr></table>')
    if (doc.notes) w.document.write('<p style="font-size:12px;color:#64748b;margin-top:16px">' + doc.notes + '</p>')
    w.document.write('</body></html>')
    w.document.close(); w.print()
  }

  const editDoc = (d) => {
    const f = { recId: d.id, _party_id: isInv ? '' : d[PARTY_ID_KEY], [PARTY_KEY]: d[PARTY_KEY] || '', items: d.items || [], notes: d.notes || '', status: d.status || 'Draft', saving: false, error: '', source_doc_no: d.source_doc_no || '', otherCosts: d.other_costs || 0, otherCostDesc: d.other_cost_desc || '' }
    if (isInv) { f.payment_method = d.payment_method || 'Cash' }
    else { f[PARTY_ID_KEY] = d[PARTY_ID_KEY] || ''; f.doc_date = d.doc_date; f.currency = d.currency || 'AED'; f.payment_terms = d.payment_terms || 'Net 30' }
    setForm(f)
  }

  if (!form) {
    const colSpan = isInv ? 8 : 7
    return (
      <div className="report-wrap">
        <div className="coa-head">
          <h3>{cfg.title}</h3>
          <div className="coa-head-right">
            <input className="coa-search" placeholder="🔍 Search number, party..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <button className="btn-add" onClick={() => setForm(blankDoc())}>＋ New Document</button>
          </div>
        </div>
        <div className="report-controls" style={{ marginBottom: 12 }}>
          {Object.entries(counts).map(([st, n]) => (
            <button key={st} className={`filter-btn ${statusFilter === st ? 'active' : ''}`} onClick={() => setStatusFilter(st)}>{st} ({n})</button>
          ))}
          <span className="total-records">Total Value: <b>{fmtMoney(filtered.reduce((s, d) => s + Number(d.grand_total || 0), 0), taxConfig.currency)}</b></span>
        </div>
        <ShareBar title={cfg.title} columns={[{ key: 'no', label: 'Doc No' }, { key: 'date', label: 'Date' }, { key: 'party', label: PARTY_LABEL }, { key: 'status', label: 'Status' }, { key: 'total', label: 'Total', numeric: true }]} rows={filtered.map((d) => ({ no: d[NO_FIELD] || '', date: docDate(d), party: d[PARTY_KEY] || '', status: d.status || '', total: fmtMoney(d.grand_total || 0) }))} />
        <div className="grid-wrap">
          <table className="data-grid">
            <thead>
              <tr>
                <th className="th-actions"></th>
                <th>{NO_LABEL}</th>
                <th>DATE</th>
                <th>{PARTY_LABEL.toUpperCase()}</th>
                {isInv && <th className="col-money">BALANCE</th>}
                <th className="col-money">TOTAL</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={colSpan} className="empty">Loading...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={colSpan} className="empty">No documents found</td></tr>}
              {!loading && filtered.map((d, i) => (
                <tr key={d.id || i} className={i % 2 ? 'alt' : ''}>
                  <td className="td-actions">
                    <button className="act edit" title="Edit" onClick={() => editDoc(d)}>✏️</button>
                    {d.status === 'Draft' && <button className="act edit" title="Approve" onClick={() => setStatus(d, 'Approved')}>✅</button>}
                    {d.status === 'Approved' && cfg.convertTo && <button className="act conv" title={cfg.convertLabel || 'Convert'} onClick={() => convertDoc(d)}>🔄</button>}
                    {d.status === 'Approved' && <button className="act edit" title="Post" onClick={() => setStatus(d, 'Posted')}>📌</button>}
                    {d.status === 'Approved' && isInv && <button className="act edit" title="Payment Link" onClick={() => setPayLinkDoc(d)} style={{ color: '#8b5cf6' }}>💳</button>}
                    <button className="act edit" title="Print" onClick={() => printDoc(d)}>🖨️</button>
                    {d.status !== 'Posted' && d.status !== 'Cancelled' && d.status !== 'Converted' && <button className="act del" title="Delete" onClick={() => deleteDoc(d)}>🗑️</button>}
                  </td>
                  <td className="code-cell">
                    {d[NO_FIELD]}
                    {d.source_doc_no && <div style={{ fontSize: 10, color: '#64748b' }}>Ref: {d.source_doc_no}</div>}
                  </td>
                  <td>{docDate(d)}</td>
                  <td><b>{d[PARTY_KEY]}</b></td>
                {isInv && <td className="col-money">{fmtMoney(d.balance, taxConfig.currency)}</td>}
                <td className="col-money">{fmtMoney(d.grand_total, taxConfig.currency)}</td>
                  <td><span className={`badge ${STATUS_CLASS(d.status)}`}>{d.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const totals = calcTotals(form.items, form.otherCosts)

  const addNewLine = () => {
    const newItems = [...form.items, { product_id: '', name: '', qty: '', price: '' }]
    setForm({ ...form, items: newItems })
    setTimeout(() => {
      const rows = wrapRef.current.querySelectorAll('tbody tr')
      if (rows.length > 0) {
        const lastRow = rows[rows.length - 1]
        const firstInput = lastRow.querySelector('select, input')
        if (firstInput) firstInput.focus()
      }
    }, 100)
  }

  const handleItemEnter = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      addNewLine()
    }
  }

  const handlePaymentTermsEnter = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      addNewLine()
    }
  }

  return (
    <div className="report-wrap" ref={wrapRef} onKeyDown={(e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') return
        if (e.target.dataset.addline) return
        e.preventDefault()
        const inputs = Array.from(wrapRef.current.querySelectorAll('input, select'))
        const idx = inputs.indexOf(e.target)
        if (idx > -1 && idx < inputs.length - 1) {
          inputs[idx + 1].focus()
        }
      }
    }}>
      <div className="coa-head">
        <h3>{form.recId ? `✏️ Edit — ${form[NO_FIELD] || ''}` : '＋ New Document'}{form.source_doc_no ? <span style={{ fontSize: 13, fontWeight: 400, color: '#64748b', marginLeft: 8 }}>Ref: {form.source_doc_no}</span> : null}</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <ScanToInvoice realId={form.recId || null} entityType={cfg.key} onFill={fillFromScan} />
          <button className="btn-cancel" onClick={() => setForm(null)}>✕ Cancel</button>
        </div>
      </div>
      {form.error && <div className="inv-error">⚠️ {form.error}</div>}
      <Attachments entityType={cfg.key} entityId={form.recId || null} />
      <div className="inv-grid coa-form-grid" style={{ marginTop: 14 }}>
        <label>{PARTY_LABEL} *
          <select ref={firstRef} value={form._party_id || ''} onChange={(e) => { const p = parties.find((x) => x.id === e.target.value); setForm({ ...form, _party_id: e.target.value, [PARTY_KEY]: p ? p.name : '' }) }}>
            <option value="">Select {PARTY_LABEL}</option>
            {parties.map((p) => <option key={p.id} value={p.id}>{p.code ? `${p.code} — ` : ''}{p.name}</option>)}
          </select>
        </label>
        {!isInv && <label>Date<input type="date" value={form.doc_date || ''} onChange={(e) => setForm({ ...form, doc_date: e.target.value })} /></label>}
        {!isInv && <label>Currency
          <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
            {['AED', 'SAR', 'USD', 'EUR', 'GBP', 'INR', 'PKR'].map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>}
        {isInv ? (
          <label>Payment Method
            <select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
              {['Cash', 'Bank Transfer', 'Cheque', 'Credit Card'].map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>
        ) : (
          <label>Payment Terms
            <select value={form.payment_terms} onChange={(e) => setForm({ ...form, payment_terms: e.target.value })} data-addline="1" onKeyDown={handlePaymentTermsEnter}>
              {['Cash', 'Net 15', 'Net 30', 'Net 60', 'Net 90'].map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>
        )}
        {isLandedCost && <label>Cost Type
          <select value={form.cost_type || 'Freight'} onChange={(e) => setForm({ ...form, cost_type: e.target.value })}>
            {['Freight', 'Customs', 'Insurance', 'Handling', 'Other'].map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>}
      </div>

      <div className="report-section" style={{ marginTop: 14 }}>
        <h4>Items</h4>
        {isLandedCost && (
          <div style={{ marginBottom: 12, padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8 }}>
            <label style={{ fontWeight: 600 }}>Allocate to GRN
              <select value={form._grn_id || ''} onChange={(e) => {
                const grn = grnDocs.find((g) => g.id === e.target.value)
                setForm({ ...form, _grn_id: e.target.value, _grn_no: grn?.grn_no || '', items: grn?.items || [], _grn_total: grn?.grand_total || 0 })
              }} style={{ width: '100%', marginTop: 4 }}>
                <option value="">Select GRN to allocate landed cost</option>
                {grnDocs.map((g) => <option key={g.id} value={g.id}>{g.grn_no} — {g.party_name} ({fmtMoney(g.grand_total)})</option>)}
              </select>
            </label>
            {form._grn_no && <div style={{ fontSize: 12, color: '#16a34a', marginTop: 4 }}>Allocating to: <b>{form._grn_no}</b> — Items auto-populated from GRN</div>}
          </div>
        )}
        <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          <label style={{ flex: '1 1 200px', fontSize: 12, fontWeight: 600 }}>Other Costs (Customs, Demurrage, Freight, etc.)
            <input type="number" inputMode="decimal" placeholder="0.00" value={form.otherCosts ?? ''} onChange={(e) => setForm({ ...form, otherCosts: e.target.value })} style={{ width: '100%', marginTop: 4, padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }} />
          </label>
          <label style={{ flex: '2 1 300px', fontSize: 12, fontWeight: 600 }}>Cost Description
            <input type="text" placeholder="e.g. Customs Duty, Demurrage Charges" value={form.otherCostDesc || ''} onChange={(e) => setForm({ ...form, otherCostDesc: e.target.value })} style={{ width: '100%', marginTop: 4, padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }} />
          </label>
        </div>
        <table className="data-grid report-table">
          <thead><tr><th style={{ width: '40%' }}>ITEM</th><th className="col-money" style={{ width: '15%' }}>QTY</th><th className="col-money" style={{ width: '20%' }}>PRICE</th><th className="col-money">TOTAL</th><th className="th-actions"></th></tr></thead>
          <tbody>
            {form.items.length === 0 && <tr><td colSpan="5" className="empty">No items added yet</td></tr>}
            {form.items.map((it, idx) => (
              <tr key={idx}>
                <td>
                  <select value={it.product_id || ''} onChange={(e) => setItem(idx, 'product_id', e.target.value)}>
                    <option value="">Select Item</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.code ? `${p.code} — ` : ''}{p.name}</option>)}
                  </select>
                </td>
                <td><input type="text" inputMode="decimal" placeholder="0" value={it.qty ?? ''} onChange={(e) => setItem(idx, 'qty', e.target.value)} /></td>
                <td><input type="text" inputMode="decimal" placeholder="0.00" value={it.price ?? ''} onChange={(e) => setItem(idx, 'price', e.target.value)} data-addline="1" onKeyDown={handleItemEnter} /></td>
                <td className="col-money">{fmtMoney((Number(it.qty) || 0) * (Number(it.price) || 0))}</td>
                <td className="td-actions"><button className="act del" title="Remove" onClick={() => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) })}>🗑️</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button className="btn-add" onClick={() => setForm({ ...form, items: [...form.items, { product_id: '', name: '', qty: '', price: '' }] })}>＋ Add Item</button>
          <button className="btn-add" onClick={() => setScanOpen(true)} style={{ background: '#f5f3ff', color: '#7c3aed', border: '1px dashed #8b5cf6' }}>📷 Scan Barcode</button>
        </div>
        {scanOpen && <BarcodeScanner onProductFound={(p) => { setForm({ ...form, items: [...form.items, { product_id: p.id, name: p.name, qty: 1, price: p.price || 0 }] }) }} onClose={() => setScanOpen(false)} fmtMoney={fmtMoney} />}
      </div>

      <div className="report-section" style={{ marginTop: 14 }}>
        <div className="je-totals">
          <span>Subtotal: <b>{fmtMoney(totals.subtotal)}</b></span>
          {totals.otherCosts > 0 && <span>Other Costs: <b>{fmtMoney(totals.otherCosts)}</b></span>}
          <span>VAT ({cfg.vat}%): <b>{fmtMoney(totals.vat_amount)}</b></span>
          <span className="grand">Grand Total: <b>{fmtMoney(totals.grand_total)}</b></span>
        </div>
        <label style={{ display: 'block', marginTop: 10 }}>Notes<textarea rows="2" style={{ width: '100%', padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Internal or customer-facing notes..." /></label>
      </div>

      <div className="inv-actions">
        <button className="btn-cancel" onClick={() => setForm(null)}>✕ Cancel</button>
        <button className="btn-primary" disabled={form.saving} onClick={() => saveDoc(false)}>{form.saving ? 'Saving…' : '💾 Save Draft'}</button>
        <button className="btn-primary" disabled={form.saving} style={{ background: '#10b981' }} onClick={() => saveDoc(true)}>✅ Save & Approve</button>
      </div>
      {payLinkDoc && <PaymentLinks invoice={payLinkDoc} fmtMoney={fmtMoney} onClose={() => setPayLinkDoc(null)} />}
    </div>
  )
}

const PaymentSchedulesList = ({ fmtMoney }) => {
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')

  useEffect(() => {
    supabase.from('payment_schedules').select('*').order('due_date').then(({ data }) => { setSchedules(data || []); setLoading(false) })
  }, [])

  const filtered = schedules.filter((s) => filter === 'All' || s.status === filter)
  const counts = { All: schedules.length, Pending: 0, Paid: 0, Overdue: 0 }
  schedules.forEach((s) => { const st = s.status || 'Pending'; counts[st] = (counts[st] || 0) + 1 })

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>📅 Payment Schedules</h2>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {Object.entries(counts).map(([k, v]) => (
          <button key={k} onClick={() => setFilter(k)} style={{ padding: '6px 14px', borderRadius: 8, border: filter === k ? '2px solid #8b5cf6' : '1px solid #e2e8f0', background: filter === k ? '#f5f3ff' : '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {k} ({v})
          </button>
        ))}
      </div>
      {loading ? <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading...</div> : (
        <table className="data-grid report-table">
          <thead><tr><th>INVOICE</th><th>CUSTOMER</th><th>DUE DATE</th><th className="col-money">AMOUNT</th><th>STATUS</th></tr></thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan="5" className="empty">No payment schedules</td></tr>}
            {filtered.map((s) => (
              <tr key={s.id}>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{s.invoice_no || '—'}</td>
                <td>{s.customer_name || '—'}</td>
                <td>{s.due_date}</td>
                <td className="col-money">{fmtMoney(Number(s.amount || 0))}</td>
                <td><span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: s.status === 'Paid' ? '#dcfce7' : s.status === 'Overdue' ? '#fef2f2' : '#fffbeb', color: s.status === 'Paid' ? '#16a34a' : s.status === 'Overdue' ? '#dc2626' : '#f59e0b' }}>{s.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

const CashBook = ({ fmtMoney }) => {
  const [entries, setEntries] = useState([])
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedAccount, setSelectedAccount] = useState('all')

  useEffect(() => {
    Promise.all([
      supabase.from('accounts').select('id, code, name, type').ilike('name', '%cash%'),
      supabase.from('journal_lines').select('*, journal_entries(entry_date, reference, narration, currency)').order('created_at', { ascending: false }).limit(500)
    ]).then(([acctRes, lineRes]) => {
      setAccounts(acctRes.data || [])
      const cashIds = (acctRes.data || []).map((a) => a.id)
      const lines = (lineRes.data || []).filter((l) => cashIds.includes(l.account_id))
      setEntries(lines)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const filtered = entries.filter((l) => {
    const je = l.journal_entries
    if (!je) return false
    if (dateFrom && je.entry_date < dateFrom) return false
    if (dateTo && je.entry_date > dateTo) return false
    if (selectedAccount !== 'all' && l.account_id !== selectedAccount) return false
    if (search) {
      const s = search.toLowerCase()
      return ((je.reference || '') + ' ' + (je.narration || '') + ' ' + (l.description || '')).toLowerCase().includes(s)
    }
    return true
  })

  const totalDebit = filtered.reduce((s, l) => s + Number(l.debit || 0), 0)
  const totalCredit = filtered.reduce((s, l) => s + Number(l.credit || 0), 0)
  const closingBalance = totalDebit - totalCredit

  return (
    <div className="report-wrap">
      <div className="coa-head">
        <h3>💵 Cash Book</h3>
        <div className="coa-head-right">
          <input className="coa-search" placeholder="🔍 Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>
      <div className="report-controls" style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <label style={{ fontSize: 12 }}>From<input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ marginLeft: 4 }} /></label>
        <label style={{ fontSize: 12 }}>To<input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ marginLeft: 4 }} /></label>
        <label style={{ fontSize: 12 }}>Account
          <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)} style={{ marginLeft: 4 }}>
            <option value="all">All Cash Accounts</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
          </select>
        </label>
        <span className="total-records" style={{ marginLeft: 'auto' }}>
          Debit: <b>{fmtMoney(totalDebit)}</b> | Credit: <b>{fmtMoney(totalCredit)}</b> | Balance: <b style={{ color: closingBalance >= 0 ? '#16a34a' : '#ef4444' }}>{fmtMoney(closingBalance)}</b>
        </span>
      </div>
      <div className="grid-wrap">
        <table className="data-grid">
          <thead>
            <tr>
              <th>DATE</th>
              <th>REFERENCE</th>
              <th>DESCRIPTION</th>
              <th className="col-money">DEBIT</th>
              <th className="col-money">CREDIT</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="5" className="empty">Loading...</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan="5" className="empty">No cash transactions found</td></tr>}
            {!loading && filtered.map((l, i) => {
              const je = l.journal_entries
              return (
                <tr key={l.id || i} className={i % 2 ? 'alt' : ''}>
                  <td>{je?.entry_date || ''}</td>
                  <td className="code-cell">{je?.reference || ''}</td>
                  <td>{l.description || je?.narration || ''}</td>
                  <td className="col-money">{Number(l.debit || 0) ? fmtMoney(l.debit) : ''}</td>
                  <td className="col-money">{Number(l.credit || 0) ? fmtMoney(l.credit) : ''}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const BankBook = ({ fmtMoney }) => {
  const [entries, setEntries] = useState([])
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedAccount, setSelectedAccount] = useState('all')

  useEffect(() => {
    Promise.all([
      supabase.from('accounts').select('id, code, name, type').ilike('name', '%bank%'),
      supabase.from('journal_lines').select('*, journal_entries(entry_date, reference, narration, currency)').order('created_at', { ascending: false }).limit(500)
    ]).then(([acctRes, lineRes]) => {
      setAccounts(acctRes.data || [])
      const bankIds = (acctRes.data || []).map((a) => a.id)
      const lines = (lineRes.data || []).filter((l) => bankIds.includes(l.account_id))
      setEntries(lines)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const filtered = entries.filter((l) => {
    const je = l.journal_entries
    if (!je) return false
    if (dateFrom && je.entry_date < dateFrom) return false
    if (dateTo && je.entry_date > dateTo) return false
    if (selectedAccount !== 'all' && l.account_id !== selectedAccount) return false
    if (search) {
      const s = search.toLowerCase()
      return ((je.reference || '') + ' ' + (je.narration || '') + ' ' + (l.description || '')).toLowerCase().includes(s)
    }
    return true
  })

  const totalDebit = filtered.reduce((s, l) => s + Number(l.debit || 0), 0)
  const totalCredit = filtered.reduce((s, l) => s + Number(l.credit || 0), 0)
  const closingBalance = totalDebit - totalCredit

  return (
    <div className="report-wrap">
      <div className="coa-head">
        <h3>🏦 Bank Book</h3>
        <div className="coa-head-right">
          <input className="coa-search" placeholder="🔍 Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>
      <div className="report-controls" style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <label style={{ fontSize: 12 }}>From<input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ marginLeft: 4 }} /></label>
        <label style={{ fontSize: 12 }}>To<input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ marginLeft: 4 }} /></label>
        <label style={{ fontSize: 12 }}>Account
          <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)} style={{ marginLeft: 4 }}>
            <option value="all">All Bank Accounts</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
          </select>
        </label>
        <span className="total-records" style={{ marginLeft: 'auto' }}>
          Debit: <b>{fmtMoney(totalDebit)}</b> | Credit: <b>{fmtMoney(totalCredit)}</b> | Balance: <b style={{ color: closingBalance >= 0 ? '#16a34a' : '#ef4444' }}>{fmtMoney(closingBalance)}</b>
        </span>
      </div>
      <div className="grid-wrap">
        <table className="data-grid">
          <thead>
            <tr>
              <th>DATE</th>
              <th>REFERENCE</th>
              <th>DESCRIPTION</th>
              <th className="col-money">DEBIT</th>
              <th className="col-money">CREDIT</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="5" className="empty">Loading...</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan="5" className="empty">No bank transactions found</td></tr>}
            {!loading && filtered.map((l, i) => {
              const je = l.journal_entries
              return (
                <tr key={l.id || i} className={i % 2 ? 'alt' : ''}>
                  <td>{je?.entry_date || ''}</td>
                  <td className="code-cell">{je?.reference || ''}</td>
                  <td>{l.description || je?.narration || ''}</td>
                  <td className="col-money">{Number(l.debit || 0) ? fmtMoney(l.debit) : ''}</td>
                  <td className="col-money">{Number(l.credit || 0) ? fmtMoney(l.credit) : ''}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const DebitCreditNotes = ({ type, fmtMoney, taxRate = 0 }) => {
  const isDebit = type === 'debit'
  const TABLE = isDebit ? 'debit_notes' : 'credit_notes'
  const TITLE = isDebit ? '📄 Debit Note' : '📄 Credit Note'
  const [docs, setDocs] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const firstRef = useRef(null)

  const loadDocs = async () => {
    setLoading(true)
    const { data } = await supabase.from(TABLE).select('*').order('created_at', { ascending: false }).limit(200)
    setDocs(data || [])
    setLoading(false)
  }
  useEffect(() => { loadDocs() }, [TABLE])

  useEffect(() => {
    supabase.from('customers').select('id, code, name').eq('status', 'Active').then(({ data }) => setCustomers(data || []))
  }, [])

  const counts = { All: docs.length }
  docs.forEach((d) => { const s = d.status || '—'; counts[s] = (counts[s] || 0) + 1 })

  const filtered = docs.filter((d) => {
    if (statusFilter !== 'All' && d.status !== statusFilter) return false
    if (search) {
      const s = search.toLowerCase()
      return ((d.note_no || '') + ' ' + (d.party_name || '') + ' ' + (d.reason || '')).toLowerCase().includes(s)
    }
    return true
  })

  const blankDoc = () => ({
    id: `new-${Date.now()}`, recId: null, customer_id: '', party_name: '',
    doc_date: new Date().toISOString().split('T')[0], amount: '', reason: '',
    status: 'Draft', saving: false, error: ''
  })

  const saveDoc = async (approveAfter) => {
    if (!form.party_name) { setForm({ ...form, error: 'Please select a party.' }); return }
    if (!form.amount || Number(form.amount) <= 0) { setForm({ ...form, error: 'Enter a valid amount.' }); return }
    setForm({ ...form, saving: true, error: '' })
    const payload = {
      party_name: form.party_name, doc_date: form.doc_date,
      amount: Number(form.amount), vat_amount: Number(form.amount) * (taxRate / 100),
      reason: form.reason, status: approveAfter ? 'Approved' : 'Draft',
    }
    try {
      let docId = form.recId
      if (form.recId) {
        const { error } = await supabase.from(TABLE).update(payload).eq('id', form.recId)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from(TABLE).insert(payload).select()
        if (error) throw error
        docId = data?.[0]?.id
      }
      if (approveAfter) {
        const { data: accts } = await supabase.from('accounts').select('*')
        if (accts) {
          const find = (pred) => accts.find((a) => !a.is_group && pred(a))
          const ar = find((a) => a.name.toLowerCase().includes('receivable'))
          const sales = find((a) => a.type === 'Income') || find((a) => a.name.toLowerCase().includes('sales'))
          const vatOut = find((a) => a.name.toLowerCase().includes('output'))
          const lines = []
          if (isDebit) {
            if (ar) lines.push({ account_id: ar.id, debit: Number(payload.amount) + Number(payload.vat_amount), credit: 0, description: `${TITLE} ${form.note_no || ''}` })
            if (sales) lines.push({ account_id: sales.id, debit: 0, credit: Number(payload.amount), description: 'Debit note revenue' })
            if (vatOut && payload.vat_amount) lines.push({ account_id: vatOut.id, debit: 0, credit: payload.vat_amount, description: 'Output VAT on debit note' })
          } else {
            if (ar) lines.push({ account_id: ar.id, debit: 0, credit: Number(payload.amount) + Number(payload.vat_amount), description: `${TITLE} ${form.note_no || ''}` })
            if (sales) lines.push({ account_id: sales.id, debit: Number(payload.amount), credit: 0, description: 'Credit note reversal' })
            if (vatOut && payload.vat_amount) lines.push({ account_id: vatOut.id, debit: payload.vat_amount, credit: 0, description: 'VAT reversal on credit note' })
          }
          if (lines.length) {
            const totalDebit = lines.reduce((s, l) => s + Number(l.debit || 0), 0)
            const totalCredit = lines.reduce((s, l) => s + Number(l.credit || 0), 0)
            const { data: je } = await supabase.from('journal_entries').insert({
              entry_date: form.doc_date, reference: form.note_no || TITLE, narration: `${TITLE} — ${form.party_name}`,
              status: 'Posted', total_debit: totalDebit, total_credit: totalCredit, currency: 'AED',
            }).select()
            if (je && je.length) {
              const jeLines = lines.map((l, i) => ({ entry_id: je[0].id, line_no: i + 1, account_id: l.account_id, debit: Number(l.debit || 0), credit: Number(l.credit || 0), description: l.description }))
              await supabase.from('journal_lines').insert(jeLines)
              for (const l of lines) {
                const acct = accts.find((a) => a.id === l.account_id)
                if (acct) {
                  const newBal = Number(acct.current_balance || 0) + Number(l.debit || 0) - Number(l.credit || 0)
                  await supabase.from('accounts').update({ current_balance: newBal }).eq('id', acct.id)
                }
              }
            }
          }
        }
      }
      setForm(null)
      loadDocs()
    } catch (err) { setForm({ ...form, saving: false, error: err.message }) }
  }

  const deleteDoc = async (doc) => {
    if (!window.confirm(`Delete ${doc.note_no || 'document'}?`)) return
    await supabase.from(TABLE).delete().eq('id', doc.id)
    loadDocs()
  }

  const printDoc = (doc) => {
    const w = window.open('', '_blank')
    w.document.write('<html><head><title>' + (doc.note_no || '') + '</title><style>body{font-family:Arial,sans-serif;padding:30px;max-width:800px}h1{color:#1e1b4b;font-size:22px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{padding:8px;border:1px solid #e2e8f0;font-size:13px}.total{font-weight:700;background:#f8fafc}</style></head><body>')
    w.document.write('<h1>' + TITLE + '</h1>')
    w.document.write('<p><b>No:</b> ' + (doc.note_no || '—') + '<br><b>Date:</b> ' + doc.doc_date + '<br><b>Party:</b> ' + doc.party_name + '<br><b>Status:</b> ' + doc.status + '</p>')
    w.document.write('<table><tr><td>Amount</td><td class="total">' + fmtMoney(doc.amount) + '</td></tr><tr><td>' + (taxRate > 0 ? 'Tax (' + taxRate + '%)' : 'Tax') + '</td><td>' + fmtMoney(doc.vat_amount) + '</td></tr><tr><td><b>Total</b></td><td class="total"><b>' + fmtMoney(Number(doc.amount) + Number(doc.vat_amount || 0)) + '</b></td></tr></table>')
    if (doc.reason) w.document.write('<p><b>Reason:</b> ' + doc.reason + '</p>')
    w.document.write('</body></html>')
    w.document.close(); w.print()
  }

  if (!form) {
    return (
      <div className="report-wrap">
        <div className="coa-head">
          <h3>{TITLE}</h3>
          <div className="coa-head-right">
            <input className="coa-search" placeholder="🔍 Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <button className="btn-add" onClick={() => setForm(blankDoc())}>＋ New {isDebit ? 'Debit Note' : 'Credit Note'}</button>
          </div>
        </div>
        <div className="report-controls" style={{ marginBottom: 12 }}>
          {Object.entries(counts).map(([st, n]) => (
            <button key={st} className={`filter-btn ${statusFilter === st ? 'active' : ''}`} onClick={() => setStatusFilter(st)}>{st} ({n})</button>
          ))}
          <span className="total-records">Total: <b>{fmtMoney(filtered.reduce((s, d) => s + Number(d.amount || 0), 0))}</b></span>
        </div>
        <div className="grid-wrap">
          <table className="data-grid">
            <thead>
              <tr>
                <th className="th-actions"></th>
                <th>NOTE NO</th>
                <th>DATE</th>
                <th>PARTY</th>
                <th className="col-money">AMOUNT</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan="6" className="empty">Loading...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan="6" className="empty">No notes found</td></tr>}
              {!loading && filtered.map((d, i) => (
                <tr key={d.id || i} className={i % 2 ? 'alt' : ''}>
                  <td className="td-actions">
                    <button className="act edit" title="Edit" onClick={() => setForm({ recId: d.id, customer_id: '', party_name: d.party_name || '', doc_date: d.doc_date, amount: String(d.amount || ''), reason: d.reason || '', status: d.status, saving: false, error: '' })}>✏️</button>
                    {d.status === 'Draft' && <button className="act edit" title="Approve" onClick={async () => { await supabase.from(TABLE).update({ status: 'Approved' }).eq('id', d.id); loadDocs() }}>✅</button>}
                    <button className="act edit" title="Print" onClick={() => printDoc(d)}>🖨️</button>
                    {d.status !== 'Posted' && <button className="act del" title="Delete" onClick={() => deleteDoc(d)}>🗑️</button>}
                  </td>
                  <td className="code-cell">{d.note_no}</td>
                  <td>{d.doc_date}</td>
                  <td><b>{d.party_name}</b></td>
                  <td className="col-money">{fmtMoney(d.amount)}</td>
                  <td><span className={`badge ${d.status === 'Approved' ? 'b-green' : d.status === 'Posted' ? 'b-blue' : 'b-amber'}`}>{d.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="report-wrap">
      <div className="coa-head">
        <h3>{form.recId ? `✏️ Edit — ${form.note_no || ''}` : `＋ New ${isDebit ? 'Debit Note' : 'Credit Note'}`}</h3>
        <button className="btn-cancel" onClick={() => setForm(null)}>✕ Cancel</button>
      </div>
      {form.error && <div className="inv-error">⚠️ {form.error}</div>}
      <div className="inv-grid coa-form-grid" style={{ marginTop: 14 }}>
        <label>Party *
          <select ref={firstRef} value={form.customer_id || ''} onChange={(e) => {
            const c = customers.find((x) => x.id === e.target.value)
            setForm({ ...form, customer_id: e.target.value, party_name: c?.name || '' })
          }}>
            <option value="">Select Customer</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.code ? `${c.code} — ` : ''}{c.name}</option>)}
          </select>
        </label>
        <label>Date<input type="date" value={form.doc_date} onChange={(e) => setForm({ ...form, doc_date: e.target.value })} /></label>
        <label>Amount<input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" /></label>
      </div>
      <div className="report-section" style={{ marginTop: 14 }}>
        <label>Reason / Description<textarea rows="3" style={{ width: '100%', padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Reason for this note..." /></label>
      </div>
      {form.amount && Number(form.amount) > 0 && (
        <div className="report-section" style={{ marginTop: 14 }}>
          <div className="je-totals">
            <span>Amount: <b>{fmtMoney(Number(form.amount))}</b></span>
            <span>{taxRate > 0 ? `Tax (${taxRate}%)` : 'Tax'}: <b>{fmtMoney(Number(form.amount) * (taxRate / 100))}</b></span>
            <span className="grand">Total: <b>{fmtMoney(Number(form.amount) * (1 + taxRate / 100))}</b></span>
          </div>
        </div>
      )}
      <div className="inv-actions">
        <button className="btn-cancel" onClick={() => setForm(null)}>✕ Cancel</button>
        <button className="btn-primary" disabled={form.saving} onClick={() => saveDoc(false)}>{form.saving ? 'Saving…' : '💾 Save Draft'}</button>
        <button className="btn-primary" disabled={form.saving} style={{ background: '#10b981' }} onClick={() => saveDoc(true)}>✅ Save & Approve</button>
      </div>
    </div>
  )
}

const CostCenterBudget = ({ fmtMoney }) => {
  const [centers, setCenters] = useState([])
  const [budgets, setBudgets] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('centers')

  const loadData = async () => {
    setLoading(true)
    const [cRes, bRes] = await Promise.all([
      supabase.from('cost_centers').select('*').order('created_at', { ascending: false }),
      supabase.from('budgets').select('*').order('created_at', { ascending: false })
    ])
    setCenters(cRes.data || [])
    setBudgets(bRes.data || [])
    setLoading(false)
  }
  useEffect(() => { loadData() }, [])

  const filteredCenters = centers.filter((c) => {
    if (!search) return true
    return ((c.code || '') + ' ' + (c.name || '') + ' ' + (c.department || '')).toLowerCase().includes(search.toLowerCase())
  })

  const filteredBudgets = budgets.filter((b) => {
    if (!search) return true
    return ((b.budget_code || '') + ' ' + (b.account_name || '')).toLowerCase().includes(search.toLowerCase())
  })

  const saveCenter = async () => {
    if (!form.name) { setForm({ ...form, error: 'Name is required.' }); return }
    setForm({ ...form, saving: true, error: '' })
    const payload = { code: form.code, name: form.name, department: form.department, manager: form.manager, annual_budget: Number(form.annual_budget || 0), status: form.status || 'Active' }
    try {
      if (form.recId) { await supabase.from('cost_centers').update(payload).eq('id', form.recId) }
      else { await supabase.from('cost_centers').insert(payload) }
      setForm(null); loadData()
    } catch (err) { setForm({ ...form, saving: false, error: err.message }) }
  }

  const saveBudget = async () => {
    if (!form.budget_code) { setForm({ ...form, error: 'Budget code is required.' }); return }
    setForm({ ...form, saving: true, error: '' })
    const payload = { budget_code: form.budget_code, fiscal_year: Number(form.fiscal_year || new Date().getFullYear()), period: form.period || 'Annual', account_name: form.account_name, amount: Number(form.amount || 0), spent: Number(form.spent || 0), status: form.status || 'Draft' }
    try {
      if (form.recId) { await supabase.from('budgets').update(payload).eq('id', form.recId) }
      else { await supabase.from('budgets').insert(payload) }
      setForm(null); loadData()
    } catch (err) { setForm({ ...form, saving: false, error: err.message }) }
  }

  const deleteRecord = async (table, id) => {
    if (!window.confirm('Delete this record?')) return
    await supabase.from(table).delete().eq('id', id)
    loadData()
  }

  return (
    <div className="report-wrap">
      <div className="coa-head">
        <h3>🎯 Cost Center & Budget</h3>
        <div className="coa-head-right">
          <input className="coa-search" placeholder="🔍 Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="btn-add" onClick={() => setForm(tab === 'centers' ? { id: `new-${Date.now()}`, recId: null, code: '', name: '', department: '', manager: '', annual_budget: '', status: 'Active', saving: false, error: '' } : { id: `new-${Date.now()}`, recId: null, budget_code: '', fiscal_year: new Date().getFullYear(), period: 'Annual', account_name: '', amount: '', spent: '0', status: 'Draft', saving: false, error: '' })}>＋ New</button>
        </div>
      </div>
      <div className="report-controls" style={{ marginBottom: 12 }}>
        <button className={`filter-btn ${tab === 'centers' ? 'active' : ''}`} onClick={() => setTab('centers')}>Cost Centers ({centers.length})</button>
        <button className={`filter-btn ${tab === 'budgets' ? 'active' : ''}`} onClick={() => setTab('budgets')}>Budgets ({budgets.length})</button>
      </div>

      {form && (
        <div className="report-section" style={{ marginBottom: 16, padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <h4>{form.recId ? 'Edit' : 'New'} {tab === 'centers' ? 'Cost Center' : 'Budget'}</h4>
          {form.error && <div className="inv-error">⚠️ {form.error}</div>}
          {tab === 'centers' ? (
            <div className="inv-grid coa-form-grid">
              <label>Code<input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></label>
              <label>Name *<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
              <label>Department<input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></label>
              <label>Manager<input value={form.manager} onChange={(e) => setForm({ ...form, manager: e.target.value })} /></label>
              <label>Annual Budget<input type="number" value={form.annual_budget} onChange={(e) => setForm({ ...form, annual_budget: e.target.value })} /></label>
              <label>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>Active</option><option>Inactive</option></select></label>
            </div>
          ) : (
            <div className="inv-grid coa-form-grid">
              <label>Budget Code *<input value={form.budget_code} onChange={(e) => setForm({ ...form, budget_code: e.target.value })} /></label>
              <label>Fiscal Year<input type="number" value={form.fiscal_year} onChange={(e) => setForm({ ...form, fiscal_year: e.target.value })} /></label>
              <label>Period<select value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })}><option>Annual</option><option>Quarterly</option><option>Monthly</option></select></label>
              <label>Account / Description<input value={form.account_name} onChange={(e) => setForm({ ...form, account_name: e.target.value })} /></label>
              <label>Budget Amount<input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label>
              <label>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>Draft</option><option>Approved</option><option>Closed</option></select></label>
            </div>
          )}
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button className="btn-cancel" onClick={() => setForm(null)}>Cancel</button>
            <button className="btn-primary" onClick={tab === 'centers' ? saveCenter : saveBudget}>{form.saving ? 'Saving...' : 'Save'}</button>
          </div>
        </div>
      )}

      <div className="grid-wrap">
        <table className="data-grid">
          <thead>
            <tr>
              <th className="th-actions"></th>
              {tab === 'centers' ? (<>
                <th>CODE</th><th>NAME</th><th>DEPARTMENT</th><th>MANAGER</th><th className="col-money">BUDGET</th><th>STATUS</th>
              </>) : (<>
                <th>CODE</th><th>YEAR</th><th>PERIOD</th><th>ACCOUNT</th><th className="col-money">BUDGET</th><th className="col-money">SPENT</th><th>STATUS</th>
              </>)}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={tab === 'centers' ? 7 : 8} className="empty">Loading...</td></tr>}
            {!loading && tab === 'centers' && filteredCenters.length === 0 && <tr><td colSpan="7" className="empty">No cost centers found</td></tr>}
            {!loading && tab === 'budgets' && filteredBudgets.length === 0 && <tr><td colSpan="8" className="empty">No budgets found</td></tr>}
            {!loading && tab === 'centers' && filteredCenters.map((c, i) => (
              <tr key={c.id || i} className={i % 2 ? 'alt' : ''}>
                <td className="td-actions">
                  <button className="act edit" title="Edit" onClick={() => setForm({ recId: c.id, code: c.code || '', name: c.name, department: c.department || '', manager: c.manager || '', annual_budget: String(c.annual_budget || ''), status: c.status || 'Active', saving: false, error: '' })}>✏️</button>
                  <button className="act del" title="Delete" onClick={() => deleteRecord('cost_centers', c.id)}>🗑️</button>
                </td>
                <td className="code-cell">{c.code}</td>
                <td><b>{c.name}</b></td>
                <td>{c.department}</td>
                <td>{c.manager}</td>
                <td className="col-money">{fmtMoney(c.annual_budget)}</td>
                <td><span className={`badge ${c.status === 'Active' ? 'b-green' : 'b-gray'}`}>{c.status}</span></td>
              </tr>
            ))}
            {!loading && tab === 'budgets' && filteredBudgets.map((b, i) => {
              const pct = b.amount > 0 ? ((b.spent / b.amount) * 100).toFixed(0) : 0
              return (
                <tr key={b.id || i} className={i % 2 ? 'alt' : ''}>
                  <td className="td-actions">
                    <button className="act edit" title="Edit" onClick={() => setForm({ recId: b.id, budget_code: b.budget_code, fiscal_year: b.fiscal_year, period: b.period, account_name: b.account_name || '', amount: String(b.amount || ''), spent: String(b.spent || '0'), status: b.status || 'Draft', saving: false, error: '' })}>✏️</button>
                    <button className="act del" title="Delete" onClick={() => deleteRecord('budgets', b.id)}>🗑️</button>
                  </td>
                  <td className="code-cell">{b.budget_code}</td>
                  <td>{b.fiscal_year}</td>
                  <td>{b.period}</td>
                  <td>{b.account_name}</td>
                  <td className="col-money">{fmtMoney(b.amount)}</td>
                  <td className="col-money">
                    {fmtMoney(b.spent)}
                    <div style={{ fontSize: 10, color: pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#16a34a' }}>{pct}% used</div>
                  </td>
                  <td><span className={`badge ${b.status === 'Approved' ? 'b-green' : b.status === 'Closed' ? 'b-gray' : 'b-amber'}`}>{b.status}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const PettyCashModule = ({ fmtMoney }) => {
  const [vouchers, setVouchers] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const firstRef = useRef(null)

  const loadVouchers = async () => {
    setLoading(true)
    const { data } = await supabase.from('petty_cash').select('*').order('created_at', { ascending: false }).limit(200)
    setVouchers(data || [])
    setLoading(false)
  }
  useEffect(() => { loadVouchers() }, [])

  const counts = { All: vouchers.length }
  vouchers.forEach((v) => { const s = v.status || '—'; counts[s] = (counts[s] || 0) + 1 })

  const filtered = vouchers.filter((v) => {
    if (statusFilter !== 'All' && v.status !== statusFilter) return false
    if (search) {
      const s = search.toLowerCase()
      return ((v.voucher_no || '') + ' ' + (v.payee || '') + ' ' + (v.description || '')).toLowerCase().includes(s)
    }
    return true
  })

  const totalExpense = filtered.filter((v) => v.type === 'Expense').reduce((s, v) => s + Number(v.amount || 0), 0)
  const totalReceived = filtered.filter((v) => v.type === 'Received').reduce((s, v) => s + Number(v.amount || 0), 0)

  const blankDoc = () => ({
    id: `new-${Date.now()}`, recId: null, payee: '', description: '', amount: '',
    type: 'Expense', category: '', account_code: '', doc_date: new Date().toISOString().split('T')[0],
    status: 'Pending', saving: false, error: ''
  })

  const saveVoucher = async (approveAfter) => {
    if (!form.payee) { setForm({ ...form, error: 'Payee is required.' }); return }
    if (!form.amount || Number(form.amount) <= 0) { setForm({ ...form, error: 'Enter a valid amount.' }); return }
    setForm({ ...form, saving: true, error: '' })
    const payload = {
      payee: form.payee, description: form.description, amount: Number(form.amount),
      type: form.type, category: form.category, account_code: form.account_code,
      doc_date: form.doc_date, status: approveAfter ? 'Approved' : 'Pending',
    }
    try {
      if (form.recId) { await supabase.from('petty_cash').update(payload).eq('id', form.recId) }
      else { await supabase.from('petty_cash').insert(payload) }
      if (approveAfter) {
        const { data: accts } = await supabase.from('accounts').select('*')
        if (accts) {
          const find = (pred) => accts.find((a) => !a.is_group && pred(a))
          const pettyCashAcct = find((a) => /petty.?cash/i.test(a.name))
          const exp = find((a) => a.type === 'Expense') || find((a) => /misc|general|office/i.test(a.name))
          if (pettyCashAcct && exp) {
            const lines = []
            if (form.type === 'Expense') {
              lines.push({ account_id: exp.id, debit: payload.amount, credit: 0, description: `Petty cash: ${form.payee} — ${form.description}` })
              lines.push({ account_id: pettyCashAcct.id, debit: 0, credit: payload.amount, description: `Petty cash disbursement` })
            } else {
              lines.push({ account_id: pettyCashAcct.id, debit: payload.amount, credit: 0, description: `Petty cash received: ${form.payee}` })
              lines.push({ account_id: exp.id, debit: 0, credit: payload.amount, description: `Petty cash receipt` })
            }
            const totalDebit = lines.reduce((s, l) => s + Number(l.debit || 0), 0)
            const { data: je } = await supabase.from('journal_entries').insert({
              entry_date: form.doc_date, reference: form.voucher_no || 'Petty Cash', narration: `Petty cash — ${form.payee}`,
              status: 'Posted', total_debit: totalDebit, total_credit: totalDebit, currency: 'AED',
            }).select()
            if (je && je.length) {
              const jeLines = lines.map((l, i) => ({ entry_id: je[0].id, line_no: i + 1, account_id: l.account_id, debit: Number(l.debit || 0), credit: Number(l.credit || 0), description: l.description }))
              await supabase.from('journal_lines').insert(jeLines)
              for (const l of lines) {
                const acct = accts.find((a) => a.id === l.account_id)
                if (acct) {
                  const newBal = Number(acct.current_balance || 0) + Number(l.debit || 0) - Number(l.credit || 0)
                  await supabase.from('accounts').update({ current_balance: newBal }).eq('id', acct.id)
                }
              }
            }
          }
        }
      }
      setForm(null); loadVouchers()
    } catch (err) { setForm({ ...form, saving: false, error: err.message }) }
  }

  const deleteVoucher = async (v) => {
    if (!window.confirm('Delete this voucher?')) return
    await supabase.from('petty_cash').delete().eq('id', v.id)
    loadVouchers()
  }

  const printVoucher = (v) => {
    const w = window.open('', '_blank')
    w.document.write('<html><head><title>' + (v.voucher_no || '') + '</title><style>body{font-family:Arial,sans-serif;padding:30px;max-width:600px}h1{color:#1e1b4b;font-size:20px}table{width:100%;border-collapse:collapse;margin:16px 0}td{padding:8px;border:1px solid #e2e8f0;font-size:13px}.total{font-weight:700;background:#f8fafc}</style></head><body>')
    w.document.write('<h1>💵 Petty Cash Voucher</h1>')
    w.document.write('<table><tr><td>Voucher No</td><td><b>' + (v.voucher_no || '—') + '</b></td></tr><tr><td>Date</td><td>' + v.doc_date + '</td></tr><tr><td>Payee</td><td>' + v.payee + '</td></tr><tr><td>Description</td><td>' + (v.description || '—') + '</td></tr><tr><td>Type</td><td>' + v.type + '</td></tr><tr><td>Category</td><td>' + (v.category || '—') + '</td></tr><tr><td class="total">Amount</td><td class="total">' + fmtMoney(v.amount) + '</td></tr><tr><td>Status</td><td>' + v.status + '</td></tr></table>')
    w.document.write('</body></html>')
    w.document.close(); w.print()
  }

  if (!form) {
    return (
      <div className="report-wrap">
        <div className="coa-head">
          <h3>💵 Petty Cash</h3>
          <div className="coa-head-right">
            <input className="coa-search" placeholder="🔍 Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <button className="btn-add" onClick={() => setForm(blankDoc())}>＋ New Voucher</button>
          </div>
        </div>
        <div className="report-controls" style={{ marginBottom: 12 }}>
          {Object.entries(counts).map(([st, n]) => (
            <button key={st} className={`filter-btn ${statusFilter === st ? 'active' : ''}`} onClick={() => setStatusFilter(st)}>{st} ({n})</button>
          ))}
          <span className="total-records">Expense: <b style={{ color: '#ef4444' }}>{fmtMoney(totalExpense)}</b> | Received: <b style={{ color: '#16a34a' }}>{fmtMoney(totalReceived)}</b> | Net: <b>{fmtMoney(totalReceived - totalExpense)}</b></span>
        </div>
        <div className="grid-wrap">
          <table className="data-grid">
            <thead>
              <tr>
                <th className="th-actions"></th>
                <th>VOUCHER</th>
                <th>DATE</th>
                <th>PAYEE</th>
                <th>DESCRIPTION</th>
                <th className="col-money">AMOUNT</th>
                <th>TYPE</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan="8" className="empty">Loading...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan="8" className="empty">No vouchers found</td></tr>}
              {!loading && filtered.map((v, i) => (
                <tr key={v.id || i} className={i % 2 ? 'alt' : ''}>
                  <td className="td-actions">
                    <button className="act edit" title="Edit" onClick={() => setForm({ recId: v.id, payee: v.payee, description: v.description || '', amount: String(v.amount || ''), type: v.type || 'Expense', category: v.category || '', account_code: v.account_code || '', doc_date: v.doc_date, status: v.status, saving: false, error: '' })}>✏️</button>
                    {v.status === 'Pending' && <button className="act edit" title="Approve" onClick={async () => { await supabase.from('petty_cash').update({ status: 'Approved' }).eq('id', v.id); loadVouchers() }}>✅</button>}
                    <button className="act edit" title="Print" onClick={() => printVoucher(v)}>🖨️</button>
                    <button className="act del" title="Delete" onClick={() => deleteVoucher(v)}>🗑️</button>
                  </td>
                  <td className="code-cell">{v.voucher_no}</td>
                  <td>{v.doc_date}</td>
                  <td><b>{v.payee}</b></td>
                  <td>{v.description}</td>
                  <td className="col-money" style={{ color: v.type === 'Expense' ? '#ef4444' : '#16a34a' }}>{fmtMoney(v.amount)}</td>
                  <td><span className={`badge ${v.type === 'Expense' ? 'b-red' : 'b-green'}`}>{v.type}</span></td>
                  <td><span className={`badge ${v.status === 'Approved' ? 'b-green' : v.status === 'Rejected' ? 'b-red' : 'b-amber'}`}>{v.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="report-wrap">
      <div className="coa-head">
        <h3>{form.recId ? `✏️ Edit Voucher` : '＋ New Petty Cash Voucher'}</h3>
        <button className="btn-cancel" onClick={() => setForm(null)}>✕ Cancel</button>
      </div>
      {form.error && <div className="inv-error">⚠️ {form.error}</div>}
      <div className="inv-grid coa-form-grid" style={{ marginTop: 14 }}>
        <label>Payee *<input ref={firstRef} value={form.payee} onChange={(e) => setForm({ ...form, payee: e.target.value })} placeholder="Who was paid/received from" /></label>
        <label>Date<input type="date" value={form.doc_date} onChange={(e) => setForm({ ...form, doc_date: e.target.value })} /></label>
        <label>Amount *<input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" /></label>
        <label>Type<select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="Expense">Expense</option><option value="Received">Received</option></select></label>
        <label>Category<input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Office, Travel, etc." /></label>
        <label>Account Code<input value={form.account_code} onChange={(e) => setForm({ ...form, account_code: e.target.value })} placeholder="COA code" /></label>
      </div>
      <div className="report-section" style={{ marginTop: 14 }}>
        <label>Description<textarea rows="2" style={{ width: '100%', padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What was this for?" /></label>
      </div>
      <div className="inv-actions">
        <button className="btn-cancel" onClick={() => setForm(null)}>✕ Cancel</button>
        <button className="btn-primary" disabled={form.saving} onClick={() => saveVoucher(false)}>{form.saving ? 'Saving…' : '💾 Save'}</button>
        <button className="btn-primary" disabled={form.saving} style={{ background: '#10b981' }} onClick={() => saveVoucher(true)}>✅ Save & Approve</button>
      </div>
    </div>
  )
}

const StockAdjustmentModule = ({ fmtMoney }) => {
  const [docs, setDocs] = useState([])
  const [products, setProducts] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const firstRef = useRef(null)

  const loadDocs = async () => {
    setLoading(true)
    const [adjRes, prodRes, whRes] = await Promise.all([
      supabase.from('stock_adjustments').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('products').select('id, code, name, stock_quantity'),
      supabase.from('warehouses').select('id, name').eq('status', 'Active')
    ])
    setDocs(adjRes.data || [])
    setProducts(prodRes.data || [])
    setWarehouses(whRes.data || [])
    setLoading(false)
  }
  useEffect(() => { loadDocs() }, [])

  const counts = { All: docs.length }
  docs.forEach((d) => { const s = d.status || '—'; counts[s] = (counts[s] || 0) + 1 })

  const filtered = docs.filter((d) => {
    if (statusFilter !== 'All' && d.status !== statusFilter) return false
    if (search) {
      const s = search.toLowerCase()
      return ((d.adjustment_no || '') + ' ' + (d.item_name || '') + ' ' + (d.reason || '')).toLowerCase().includes(s)
    }
    return true
  })

  const blankDoc = () => ({
    id: `new-${Date.now()}`, recId: null, product_id: '', item_name: '',
    adjustment_type: 'Positive', quantity: '', reason: '',
    adjustment_date: new Date().toISOString().split('T')[0], warehouse: '',
    status: 'Draft', saving: false, error: ''
  })

  const saveDoc = async (postAfter) => {
    if (!form.product_id) { setForm({ ...form, error: 'Select a product.' }); return }
    if (!form.quantity || Number(form.quantity) <= 0) { setForm({ ...form, error: 'Enter a valid quantity.' }); return }
    setForm({ ...form, saving: true, error: '' })
    const prod = products.find((p) => p.id === form.product_id)
    const payload = {
      product_id: form.product_id, item_name: prod?.name || form.item_name,
      adjustment_type: form.adjustment_type, quantity: Number(form.quantity),
      adjustment_date: form.adjustment_date, reason: form.reason, warehouse: form.warehouse,
      status: postAfter ? 'Posted' : 'Draft',
    }
    try {
      let docId = form.recId
      if (form.recId) { await supabase.from('stock_adjustments').update(payload).eq('id', form.recId) }
      else { const { data } = await supabase.from('stock_adjustments').insert(payload).select(); docId = data?.[0]?.id }
      if (postAfter && form.product_id) {
        const { data: p } = await supabase.from('products').select('stock_quantity').eq('id', form.product_id).single()
        if (p) {
          const cur = Number(p.stock_quantity || 0)
          const qty = Number(form.quantity)
          const next = form.adjustment_type === 'Negative' ? cur - qty : cur + qty
          await supabase.from('products').update({ stock_quantity: Math.max(0, next) }).eq('id', form.product_id)
        }
      }
      setForm(null); loadDocs()
    } catch (err) { setForm({ ...form, saving: false, error: err.message }) }
  }

  const deleteDoc = async (d) => {
    if (!window.confirm('Delete this adjustment?')) return
    await supabase.from('stock_adjustments').delete().eq('id', d.id)
    loadDocs()
  }

  if (!form) {
    return (
      <div className="report-wrap">
        <div className="coa-head">
          <h3>⚖️ Stock Adjustment</h3>
          <div className="coa-head-right">
            <input className="coa-search" placeholder="🔍 Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <button className="btn-add" onClick={() => setForm(blankDoc())}>＋ New Adjustment</button>
          </div>
        </div>
        <div className="report-controls" style={{ marginBottom: 12 }}>
          {Object.entries(counts).map(([st, n]) => (
            <button key={st} className={`filter-btn ${statusFilter === st ? 'active' : ''}`} onClick={() => setStatusFilter(st)}>{st} ({n})</button>
          ))}
        </div>
        <div className="grid-wrap">
          <table className="data-grid">
            <thead>
              <tr>
                <th className="th-actions"></th>
                <th>ADJ NO</th>
                <th>DATE</th>
                <th>ITEM</th>
                <th>TYPE</th>
                <th className="col-money">QTY</th>
                <th>WAREHOUSE</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan="8" className="empty">Loading...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan="8" className="empty">No adjustments found</td></tr>}
              {!loading && filtered.map((d, i) => (
                <tr key={d.id || i} className={i % 2 ? 'alt' : ''}>
                  <td className="td-actions">
                    <button className="act edit" title="Edit" onClick={() => setForm({ recId: d.id, product_id: d.product_id || '', item_name: d.item_name || '', adjustment_type: d.adjustment_type, quantity: String(d.quantity || ''), reason: d.reason || '', adjustment_date: d.adjustment_date, warehouse: d.warehouse || '', status: d.status, saving: false, error: '' })}>✏️</button>
                    {d.status === 'Draft' && <button className="act edit" title="Post" onClick={() => saveDoc(true)}>✅</button>}
                    {d.status !== 'Posted' && <button className="act del" title="Delete" onClick={() => deleteDoc(d)}>🗑️</button>}
                  </td>
                  <td className="code-cell">{d.adjustment_no}</td>
                  <td>{d.adjustment_date}</td>
                  <td><b>{d.item_name}</b></td>
                  <td><span className={`badge ${d.adjustment_type === 'Positive' ? 'b-green' : 'b-red'}`}>{d.adjustment_type}</span></td>
                  <td className="col-money">{d.quantity}</td>
                  <td>{d.warehouse || '—'}</td>
                  <td><span className={`badge ${d.status === 'Posted' ? 'b-green' : 'b-amber'}`}>{d.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="report-wrap">
      <div className="coa-head">
        <h3>{form.recId ? `✏️ Edit — ${form.adjustment_no || ''}` : '＋ New Stock Adjustment'}</h3>
        <button className="btn-cancel" onClick={() => setForm(null)}>✕ Cancel</button>
      </div>
      {form.error && <div className="inv-error">⚠️ {form.error}</div>}
      <div className="inv-grid coa-form-grid" style={{ marginTop: 14 }}>
        <label>Product *
          <select ref={firstRef} value={form.product_id} onChange={(e) => {
            const p = products.find((x) => x.id === e.target.value)
            setForm({ ...form, product_id: e.target.value, item_name: p?.name || '' })
          }}>
            <option value="">Select Product</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.code ? `${p.code} — ` : ''}{p.name} (Stock: {p.stock_quantity})</option>)}
          </select>
        </label>
        <label>Adjustment Type
          <select value={form.adjustment_type} onChange={(e) => setForm({ ...form, adjustment_type: e.target.value })}>
            <option value="Positive">Positive (Add Stock)</option>
            <option value="Negative">Negative (Reduce Stock)</option>
          </select>
        </label>
        <label>Quantity *<input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></label>
        <label>Date<input type="date" value={form.adjustment_date} onChange={(e) => setForm({ ...form, adjustment_date: e.target.value })} /></label>
        <label>Warehouse
          <select value={form.warehouse} onChange={(e) => setForm({ ...form, warehouse: e.target.value })}>
            <option value="">Select Warehouse</option>
            {warehouses.map((w) => <option key={w.id} value={w.name}>{w.name}</option>)}
          </select>
        </label>
      </div>
      <div className="report-section" style={{ marginTop: 14 }}>
        <label>Reason<textarea rows="2" style={{ width: '100%', padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Reason for adjustment..." /></label>
      </div>
      <div className="inv-actions">
        <button className="btn-cancel" onClick={() => setForm(null)}>✕ Cancel</button>
        <button className="btn-primary" disabled={form.saving} onClick={() => saveDoc(false)}>{form.saving ? 'Saving…' : '💾 Save Draft'}</button>
        <button className="btn-primary" disabled={form.saving} style={{ background: '#10b981' }} onClick={() => saveDoc(true)}>✅ Save & Post</button>
      </div>
    </div>
  )
}

const StockInOutModule = ({ fmtMoney }) => {
  const [docs, setDocs] = useState([])
  const [products, setProducts] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const firstRef = useRef(null)

  const loadDocs = async () => {
    setLoading(true)
    const [mvRes, prodRes, whRes] = await Promise.all([
      supabase.from('stock_movements').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('products').select('id, code, name, stock_quantity'),
      supabase.from('warehouses').select('id, name').eq('status', 'Active')
    ])
    setDocs(mvRes.data || [])
    setProducts(prodRes.data || [])
    setWarehouses(whRes.data || [])
    setLoading(false)
  }
  useEffect(() => { loadDocs() }, [])

  const counts = { All: docs.length }
  docs.forEach((d) => { const s = d.status || '—'; counts[s] = (counts[s] || 0) + 1 })

  const filtered = docs.filter((d) => {
    if (statusFilter !== 'All' && d.status !== statusFilter) return false
    if (search) {
      const s = search.toLowerCase()
      return ((d.movement_no || '') + ' ' + (d.item_name || '') + ' ' + (d.reference || '')).toLowerCase().includes(s)
    }
    return true
  })

  const totalIn = filtered.filter((d) => d.movement_type === 'In' && d.status === 'Posted').reduce((s, d) => s + Number(d.quantity || 0), 0)
  const totalOut = filtered.filter((d) => d.movement_type === 'Out' && d.status === 'Posted').reduce((s, d) => s + Number(d.quantity || 0), 0)

  const blankDoc = () => ({
    id: `new-${Date.now()}`, recId: null, product_id: '', item_name: '',
    movement_type: 'In', quantity: '', warehouse: '', reference: '',
    movement_date: new Date().toISOString().split('T')[0],
    status: 'Draft', saving: false, error: ''
  })

  const saveDoc = async (postAfter) => {
    if (!form.product_id) { setForm({ ...form, error: 'Select a product.' }); return }
    if (!form.quantity || Number(form.quantity) <= 0) { setForm({ ...form, error: 'Enter a valid quantity.' }); return }
    setForm({ ...form, saving: true, error: '' })
    const prod = products.find((p) => p.id === form.product_id)
    const payload = {
      product_id: form.product_id, item_name: prod?.name || form.item_name,
      movement_type: form.movement_type, quantity: Number(form.quantity),
      warehouse: form.warehouse, reference: form.reference,
      movement_date: form.movement_date, status: postAfter ? 'Posted' : 'Draft',
    }
    try {
      let docId = form.recId
      if (form.recId) { await supabase.from('stock_movements').update(payload).eq('id', form.recId) }
      else { const { data } = await supabase.from('stock_movements').insert(payload).select(); docId = data?.[0]?.id }
      if (postAfter && form.product_id) {
        const { data: p } = await supabase.from('products').select('stock_quantity').eq('id', form.product_id).single()
        if (p) {
          const cur = Number(p.stock_quantity || 0)
          const qty = Number(form.quantity)
          const next = form.movement_type === 'Out' ? cur - qty : cur + qty
          await supabase.from('products').update({ stock_quantity: Math.max(0, next) }).eq('id', form.product_id)
        }
      }
      setForm(null); loadDocs()
    } catch (err) { setForm({ ...form, saving: false, error: err.message }) }
  }

  const deleteDoc = async (d) => {
    if (!window.confirm('Delete this movement?')) return
    await supabase.from('stock_movements').delete().eq('id', d.id)
    loadDocs()
  }

  if (!form) {
    return (
      <div className="report-wrap">
        <div className="coa-head">
          <h3>📥 Stock In / Out</h3>
          <div className="coa-head-right">
            <input className="coa-search" placeholder="🔍 Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <button className="btn-add" onClick={() => setForm(blankDoc())}>＋ New Movement</button>
          </div>
        </div>
        <div className="report-controls" style={{ marginBottom: 12 }}>
          {Object.entries(counts).map(([st, n]) => (
            <button key={st} className={`filter-btn ${statusFilter === st ? 'active' : ''}`} onClick={() => setStatusFilter(st)}>{st} ({n})</button>
          ))}
          <span className="total-records">In: <b style={{ color: '#16a34a' }}>{totalIn}</b> | Out: <b style={{ color: '#ef4444' }}>{totalOut}</b></span>
        </div>
        <div className="grid-wrap">
          <table className="data-grid">
            <thead>
              <tr>
                <th className="th-actions"></th>
                <th>MOVEMENT NO</th>
                <th>DATE</th>
                <th>ITEM</th>
                <th>TYPE</th>
                <th className="col-money">QTY</th>
                <th>WAREHOUSE</th>
                <th>REFERENCE</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan="9" className="empty">Loading...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan="9" className="empty">No movements found</td></tr>}
              {!loading && filtered.map((d, i) => (
                <tr key={d.id || i} className={i % 2 ? 'alt' : ''}>
                  <td className="td-actions">
                    <button className="act edit" title="Edit" onClick={() => setForm({ recId: d.id, product_id: d.product_id || '', item_name: d.item_name || '', movement_type: d.movement_type, quantity: String(d.quantity || ''), warehouse: d.warehouse || '', reference: d.reference || '', movement_date: d.movement_date, status: d.status, saving: false, error: '' })}>✏️</button>
                    {d.status === 'Draft' && <button className="act edit" title="Post" onClick={() => saveDoc(true)}>✅</button>}
                    {d.status !== 'Posted' && <button className="act del" title="Delete" onClick={() => deleteDoc(d)}>🗑️</button>}
                  </td>
                  <td className="code-cell">{d.movement_no}</td>
                  <td>{d.movement_date}</td>
                  <td><b>{d.item_name}</b></td>
                  <td><span className={`badge ${d.movement_type === 'In' ? 'b-green' : 'b-red'}`}>{d.movement_type}</span></td>
                  <td className="col-money">{d.quantity}</td>
                  <td>{d.warehouse || '—'}</td>
                  <td>{d.reference || '—'}</td>
                  <td><span className={`badge ${d.status === 'Posted' ? 'b-green' : 'b-amber'}`}>{d.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="report-wrap">
      <div className="coa-head">
        <h3>{form.recId ? `✏️ Edit — ${form.movement_no || ''}` : '＋ New Stock Movement'}</h3>
        <button className="btn-cancel" onClick={() => setForm(null)}>✕ Cancel</button>
      </div>
      {form.error && <div className="inv-error">⚠️ {form.error}</div>}
      <div className="inv-grid coa-form-grid" style={{ marginTop: 14 }}>
        <label>Product *
          <select ref={firstRef} value={form.product_id} onChange={(e) => {
            const p = products.find((x) => x.id === e.target.value)
            setForm({ ...form, product_id: e.target.value, item_name: p?.name || '' })
          }}>
            <option value="">Select Product</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.code ? `${p.code} — ` : ''}{p.name} (Stock: {p.stock_quantity})</option>)}
          </select>
        </label>
        <label>Movement Type
          <select value={form.movement_type} onChange={(e) => setForm({ ...form, movement_type: e.target.value })}>
            <option value="In">Stock In (Receive)</option>
            <option value="Out">Stock Out (Issue)</option>
          </select>
        </label>
        <label>Quantity *<input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></label>
        <label>Date<input type="date" value={form.movement_date} onChange={(e) => setForm({ ...form, movement_date: e.target.value })} /></label>
        <label>Warehouse
          <select value={form.warehouse} onChange={(e) => setForm({ ...form, warehouse: e.target.value })}>
            <option value="">Select Warehouse</option>
            {warehouses.map((w) => <option key={w.id} value={w.name}>{w.name}</option>)}
          </select>
        </label>
        <label>Reference<input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="PO, GRN, or other ref" /></label>
      </div>
      <div className="inv-actions">
        <button className="btn-cancel" onClick={() => setForm(null)}>✕ Cancel</button>
        <button className="btn-primary" disabled={form.saving} onClick={() => saveDoc(false)}>{form.saving ? 'Saving…' : '💾 Save Draft'}</button>
        <button className="btn-primary" disabled={form.saving} style={{ background: '#10b981' }} onClick={() => saveDoc(true)}>✅ Save & Post</button>
      </div>
    </div>
  )
}

const PhysicalStockModule = ({ fmtMoney }) => {
  const [docs, setDocs] = useState([])
  const [products, setProducts] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const firstRef = useRef(null)

  const loadDocs = async () => {
    setLoading(true)
    const [psRes, prodRes, whRes] = await Promise.all([
      supabase.from('physical_stock').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('products').select('id, code, name, stock_quantity'),
      supabase.from('warehouses').select('id, name').eq('status', 'Active')
    ])
    setDocs(psRes.data || [])
    setProducts(prodRes.data || [])
    setWarehouses(whRes.data || [])
    setLoading(false)
  }
  useEffect(() => { loadDocs() }, [])

  const counts = { All: docs.length }
  docs.forEach((d) => { const s = d.status || '—'; counts[s] = (counts[s] || 0) + 1 })

  const filtered = docs.filter((d) => {
    if (statusFilter !== 'All' && d.status !== statusFilter) return false
    if (search) {
      const s = search.toLowerCase()
      return ((d.count_no || '') + ' ' + (d.item_name || '')).toLowerCase().includes(s)
    }
    return true
  })

  const blankDoc = () => ({
    id: `new-${Date.now()}`, recId: null, product_id: '', item_name: '',
    system_qty: '', counted_qty: '', variance: '0',
    count_date: new Date().toISOString().split('T')[0], warehouse: '', notes: '',
    status: 'Open', saving: false, error: ''
  })

  const saveDoc = async (verifyAfter) => {
    if (!form.product_id) { setForm({ ...form, error: 'Select a product.' }); return }
    if (!form.counted_qty && form.counted_qty !== '0') { setForm({ ...form, error: 'Enter counted quantity.' }); return }
    setForm({ ...form, saving: true, error: '' })
    const variance = Number(form.counted_qty || 0) - Number(form.system_qty || 0)
    const payload = {
      product_id: form.product_id, item_name: form.item_name,
      system_qty: Number(form.system_qty || 0), counted_qty: Number(form.counted_qty),
      variance, count_date: form.count_date, warehouse: form.warehouse,
      notes: form.notes, status: verifyAfter ? 'Verified' : 'Counted',
    }
    try {
      if (form.recId) { await supabase.from('physical_stock').update(payload).eq('id', form.recId) }
      else { await supabase.from('physical_stock').insert(payload) }
      if (verifyAfter && form.product_id) {
        await supabase.from('products').update({ stock_quantity: Number(form.counted_qty) }).eq('id', form.product_id)
      }
      setForm(null); loadDocs()
    } catch (err) { setForm({ ...form, saving: false, error: err.message }) }
  }

  const deleteDoc = async (d) => {
    if (!window.confirm('Delete this count?')) return
    await supabase.from('physical_stock').delete().eq('id', d.id)
    loadDocs()
  }

  if (!form) {
    return (
      <div className="report-wrap">
        <div className="coa-head">
          <h3>📋 Physical Stock Count</h3>
          <div className="coa-head-right">
            <input className="coa-search" placeholder="🔍 Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <button className="btn-add" onClick={() => setForm(blankDoc())}>＋ New Count</button>
          </div>
        </div>
        <div className="report-controls" style={{ marginBottom: 12 }}>
          {Object.entries(counts).map(([st, n]) => (
            <button key={st} className={`filter-btn ${statusFilter === st ? 'active' : ''}`} onClick={() => setStatusFilter(st)}>{st} ({n})</button>
          ))}
        </div>
        <div className="grid-wrap">
          <table className="data-grid">
            <thead>
              <tr>
                <th className="th-actions"></th>
                <th>COUNT NO</th>
                <th>DATE</th>
                <th>ITEM</th>
                <th className="col-money">SYSTEM</th>
                <th className="col-money">COUNTED</th>
                <th className="col-money">VARIANCE</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan="8" className="empty">Loading...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan="8" className="empty">No counts found</td></tr>}
              {!loading && filtered.map((d, i) => (
                <tr key={d.id || i} className={i % 2 ? 'alt' : ''}>
                  <td className="td-actions">
                    <button className="act edit" title="Edit" onClick={() => setForm({ recId: d.id, product_id: d.product_id || '', item_name: d.item_name || '', system_qty: String(d.system_qty || ''), counted_qty: String(d.counted_qty || ''), variance: String(d.variance || '0'), count_date: d.count_date, warehouse: d.warehouse || '', notes: d.notes || '', status: d.status, saving: false, error: '' })}>✏️</button>
                    {d.status === 'Counted' && <button className="act edit" title="Verify & Update Stock" onClick={() => saveDoc(true)}>✅</button>}
                    {d.status !== 'Verified' && <button className="act del" title="Delete" onClick={() => deleteDoc(d)}>🗑️</button>}
                  </td>
                  <td className="code-cell">{d.count_no}</td>
                  <td>{d.count_date}</td>
                  <td><b>{d.item_name}</b></td>
                  <td className="col-money">{d.system_qty}</td>
                  <td className="col-money">{d.counted_qty}</td>
                  <td className="col-money" style={{ color: Number(d.variance) > 0 ? '#16a34a' : Number(d.variance) < 0 ? '#ef4444' : '#64748b' }}>
                    {Number(d.variance) > 0 ? '+' : ''}{d.variance}
                  </td>
                  <td><span className={`badge ${d.status === 'Verified' ? 'b-green' : d.status === 'Counted' ? 'b-blue' : 'b-amber'}`}>{d.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="report-wrap">
      <div className="coa-head">
        <h3>{form.recId ? `✏️ Edit — ${form.count_no || ''}` : '＋ New Physical Count'}</h3>
        <button className="btn-cancel" onClick={() => setForm(null)}>✕ Cancel</button>
      </div>
      {form.error && <div className="inv-error">⚠️ {form.error}</div>}
      <div className="inv-grid coa-form-grid" style={{ marginTop: 14 }}>
        <label>Product *
          <select ref={firstRef} value={form.product_id} onChange={(e) => {
            const p = products.find((x) => x.id === e.target.value)
            setForm({ ...form, product_id: e.target.value, item_name: p?.name || '', system_qty: String(p?.stock_quantity || 0) })
          }}>
            <option value="">Select Product</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.code ? `${p.code} — ` : ''}{p.name} (System: {p.stock_quantity})</option>)}
          </select>
        </label>
        <label>System Qty<input type="number" value={form.system_qty} readOnly style={{ background: '#f1f5f9' }} /></label>
        <label>Counted Qty *<input type="number" min="0" value={form.counted_qty} onChange={(e) => {
          const counted = Number(e.target.value || 0)
          const system = Number(form.system_qty || 0)
          setForm({ ...form, counted_qty: e.target.value, variance: String(counted - system) })
        }} /></label>
        <label>Variance<input type="number" value={form.variance} readOnly style={{ background: Number(form.variance) > 0 ? '#f0fdf4' : Number(form.variance) < 0 ? '#fef2f2' : '#f1f5f9', color: Number(form.variance) > 0 ? '#16a34a' : Number(form.variance) < 0 ? '#ef4444' : '#64748b' }} /></label>
        <label>Date<input type="date" value={form.count_date} onChange={(e) => setForm({ ...form, count_date: e.target.value })} /></label>
        <label>Warehouse
          <select value={form.warehouse} onChange={(e) => setForm({ ...form, warehouse: e.target.value })}>
            <option value="">Select Warehouse</option>
            {warehouses.map((w) => <option key={w.id} value={w.name}>{w.name}</option>)}
          </select>
        </label>
      </div>
      <div className="report-section" style={{ marginTop: 14 }}>
        <label>Notes<textarea rows="2" style={{ width: '100%', padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Count notes..." /></label>
      </div>
      <div className="inv-actions">
        <button className="btn-cancel" onClick={() => setForm(null)}>✕ Cancel</button>
        <button className="btn-primary" disabled={form.saving} onClick={() => saveDoc(false)}>{form.saving ? 'Saving…' : '💾 Save Count'}</button>
        <button className="btn-primary" disabled={form.saving} style={{ background: '#10b981' }} onClick={() => saveDoc(true)}>✅ Verify & Update Stock</button>
      </div>
    </div>
  )
}

const DepositsModule = ({ fmtMoney }) => {
  const [deposits, setDeposits] = useState([])
  const [bankAccounts, setBankAccounts] = useState([])
  const [pdcCheques, setPdcCheques] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const firstRef = useRef(null)

  const loadData = async () => {
    setLoading(true)
    const [depRes, acctRes, pdcRes] = await Promise.all([
      supabase.from('bank_deposits').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('accounts').select('id, code, name').ilike('name', '%bank%').eq('is_group', false),
      supabase.from('pdc_cheques').select('*').eq('status', 'Pending').order('cheque_date')
    ])
    setDeposits(depRes.data || [])
    setBankAccounts(acctRes.data || [])
    setPdcCheques(pdcRes.data || [])
    setLoading(false)
  }
  useEffect(() => { loadData() }, [])

  const counts = { All: deposits.length }
  deposits.forEach((d) => { const s = d.status || '—'; counts[s] = (counts[s] || 0) + 1 })

  const filtered = deposits.filter((d) => {
    if (statusFilter !== 'All' && d.status !== statusFilter) return false
    if (search) {
      const s = search.toLowerCase()
      return ((d.deposit_no || '') + ' ' + (d.description || '') + ' ' + (d.bank_account || '') + ' ' + (d.reference || '')).toLowerCase().includes(s)
    }
    return true
  })

  const totalDeposited = filtered.filter((d) => d.status === 'Deposited' || d.status === 'Cleared').reduce((s, d) => s + Number(d.amount || 0), 0)

  const blankDoc = () => ({
    id: `new-${Date.now()}`, recId: null, deposit_date: new Date().toISOString().split('T')[0],
    description: '', amount: '', bank_account: '', bank_account_id: '', reference: '',
    deposit_type: 'Cash', cheques: [], notes: '', status: 'Pending', saving: false, error: ''
  })

  const saveDoc = async (processAfter) => {
    if (!form.description) { setForm({ ...form, error: 'Description is required.' }); return }
    if (!form.amount || Number(form.amount) <= 0) { setForm({ ...form, error: 'Enter a valid amount.' }); return }
    setForm({ ...form, saving: true, error: '' })
    const payload = {
      deposit_date: form.deposit_date, description: form.description,
      amount: Number(form.amount), bank_account: form.bank_account,
      bank_account_id: form.bank_account_id || null, reference: form.reference,
      deposit_type: form.deposit_type, cheques: form.cheques || [],
      notes: form.notes, status: processAfter ? 'Deposited' : 'Pending',
    }
    try {
      if (form.recId) { await supabase.from('bank_deposits').update(payload).eq('id', form.recId) }
      else { await supabase.from('bank_deposits').insert(payload) }
      if (processAfter && form.deposit_type === 'PDC' && form.cheques.length) {
        for (const ch of form.cheques) {
          if (ch.id) await supabase.from('pdc_cheques').update({ status: 'Cleared' }).eq('id', ch.id)
        }
      }
      if (processAfter && form.bank_account_id) {
        const { data: acct } = await supabase.from('accounts').select('current_balance').eq('id', form.bank_account_id).single()
        if (acct) {
          await supabase.from('accounts').update({ current_balance: Number(acct.current_balance || 0) + Number(form.amount) }).eq('id', form.bank_account_id)
        }
      }
      setForm(null); loadData()
    } catch (err) { setForm({ ...form, saving: false, error: err.message }) }
  }

  const deleteDoc = async (d) => {
    if (!window.confirm('Delete this deposit?')) return
    await supabase.from('bank_deposits').delete().eq('id', d.id)
    loadData()
  }

  const addCheque = (ch) => {
    const exists = (form.cheques || []).find((c) => c.id === ch.id)
    if (exists) return
    setForm({ ...form, cheques: [...(form.cheques || []), ch], amount: String(Number(form.amount || 0) + Number(ch.amount || 0)) })
  }

  const removeCheque = (idx) => {
    const ch = form.cheques[idx]
    const newCheques = form.cheques.filter((_, i) => i !== idx)
    setForm({ ...form, cheques: newCheques, amount: String(Number(form.amount || 0) - Number(ch?.amount || 0)) })
  }

  if (!form) {
    return (
      <div className="report-wrap">
        <div className="coa-head">
          <h3>🏦 Deposits</h3>
          <div className="coa-head-right">
            <input className="coa-search" placeholder="🔍 Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <button className="btn-add" onClick={() => setForm(blankDoc())}>＋ New Deposit</button>
          </div>
        </div>
        <div className="report-controls" style={{ marginBottom: 12 }}>
          {Object.entries(counts).map(([st, n]) => (
            <button key={st} className={`filter-btn ${statusFilter === st ? 'active' : ''}`} onClick={() => setStatusFilter(st)}>{st} ({n})</button>
          ))}
          <span className="total-records">Total Deposited: <b>{fmtMoney(totalDeposited)}</b></span>
        </div>
        <div className="grid-wrap">
          <table className="data-grid">
            <thead>
              <tr>
                <th className="th-actions"></th>
                <th>DEPOSIT NO</th>
                <th>DATE</th>
                <th>DESCRIPTION</th>
                <th className="col-money">AMOUNT</th>
                <th>BANK ACCOUNT</th>
                <th>TYPE</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan="8" className="empty">Loading...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan="8" className="empty">No deposits found</td></tr>}
              {!loading && filtered.map((d, i) => (
                <tr key={d.id || i} className={i % 2 ? 'alt' : ''}>
                  <td className="td-actions">
                    <button className="act edit" title="Edit" onClick={() => setForm({ recId: d.id, deposit_date: d.deposit_date, description: d.description || '', amount: String(d.amount || ''), bank_account: d.bank_account || '', bank_account_id: d.bank_account_id || '', reference: d.reference || '', deposit_type: d.deposit_type || 'Cash', cheques: d.cheques || [], notes: d.notes || '', status: d.status, saving: false, error: '' })}>✏️</button>
                    {d.status === 'Pending' && <button className="act edit" title="Mark Deposited" onClick={async () => { await supabase.from('bank_deposits').update({ status: 'Deposited' }).eq('id', d.id); loadData() }}>✅</button>}
                    <button className="act del" title="Delete" onClick={() => deleteDoc(d)}>🗑️</button>
                  </td>
                  <td className="code-cell">{d.deposit_no}</td>
                  <td>{d.deposit_date}</td>
                  <td><b>{d.description}</b></td>
                  <td className="col-money">{fmtMoney(d.amount)}</td>
                  <td>{d.bank_account || '—'}</td>
                  <td><span className={`badge ${d.deposit_type === 'PDC' ? 'b-blue' : d.deposit_type === 'Cheque' ? 'b-purple' : 'b-gray'}`}>{d.deposit_type}</span></td>
                  <td><span className={`badge ${d.status === 'Deposited' ? 'b-green' : d.status === 'Cleared' ? 'b-blue' : d.status === 'Cancelled' ? 'b-red' : 'b-amber'}`}>{d.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="report-wrap">
      <div className="coa-head">
        <h3>{form.recId ? `✏️ Edit — ${form.deposit_no || ''}` : '＋ New Deposit'}</h3>
        <button className="btn-cancel" onClick={() => setForm(null)}>✕ Cancel</button>
      </div>
      {form.error && <div className="inv-error">⚠️ {form.error}</div>}
      <div className="inv-grid coa-form-grid" style={{ marginTop: 14 }}>
        <label>Description *<input ref={firstRef} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Deposit description" /></label>
        <label>Amount *<input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label>
        <label>Date<input type="date" value={form.deposit_date} onChange={(e) => setForm({ ...form, deposit_date: e.target.value })} /></label>
        <label>Bank Account
          <select value={form.bank_account_id} onChange={(e) => {
            const acct = bankAccounts.find((a) => a.id === e.target.value)
            setForm({ ...form, bank_account_id: e.target.value, bank_account: acct?.name || '' })
          }}>
            <option value="">Select Bank Account</option>
            {bankAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
          </select>
        </label>
        <label>Deposit Type
          <select value={form.deposit_type} onChange={(e) => setForm({ ...form, deposit_type: e.target.value })}>
            <option value="Cash">Cash</option>
            <option value="Cheque">Cheque</option>
            <option value="Transfer">Bank Transfer</option>
            <option value="PDC">PDC Cheque</option>
          </select>
        </label>
        <label>Reference<input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Ref number" /></label>
      </div>

      {form.deposit_type === 'PDC' && pdcCheques.length > 0 && (
        <div className="report-section" style={{ marginTop: 14, padding: 12, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8 }}>
          <h4 style={{ margin: '0 0 8px' }}>Available PDC Cheques to Deposit</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {pdcCheques.map((ch) => {
              const added = (form.cheques || []).find((c) => c.id === ch.id)
              return (
                <button key={ch.id} className={`filter-btn ${added ? 'active' : ''}`} onClick={() => added ? removeCheque(form.cheques.indexOf(added)) : addCheque(ch)} style={{ fontSize: 11 }}>
                  {ch.cheque_no} — {ch.party_name} ({fmtMoney(ch.amount)})
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="report-section" style={{ marginTop: 14 }}>
        <label>Notes<textarea rows="2" style={{ width: '100%', padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes..." /></label>
      </div>
      <div className="inv-actions">
        <button className="btn-cancel" onClick={() => setForm(null)}>✕ Cancel</button>
        <button className="btn-primary" disabled={form.saving} onClick={() => saveDoc(false)}>{form.saving ? 'Saving…' : '💾 Save'}</button>
        <button className="btn-primary" disabled={form.saving} style={{ background: '#10b981' }} onClick={() => saveDoc(true)}>✅ Save & Deposit</button>
      </div>
    </div>
  )
}

const CheckManagementModule = ({ fmtMoney }) => {
  const [cheques, setCheques] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [dirFilter, setDirFilter] = useState('all')
  const firstRef = useRef(null)

  const loadCheques = async () => {
    setLoading(true)
    const { data } = await supabase.from('pdc_cheques').select('*').order('cheque_date', { ascending: false }).limit(300)
    setCheques(data || [])
    setLoading(false)
  }
  useEffect(() => { loadCheques() }, [])

  const counts = { All: cheques.length }
  cheques.forEach((c) => { const s = c.status || '—'; counts[s] = (counts[s] || 0) + 1 })

  const filtered = cheques.filter((c) => {
    if (statusFilter !== 'All' && c.status !== statusFilter) return false
    if (dirFilter !== 'all' && c.direction !== dirFilter) return false
    if (search) {
      const s = search.toLowerCase()
      return ((c.cheque_no || '') + ' ' + (c.party_name || '') + ' ' + (c.bank || '')).toLowerCase().includes(s)
    }
    return true
  })

  const totalPending = filtered.filter((c) => c.status === 'Pending').reduce((s, c) => s + Number(c.amount || 0), 0)
  const totalCleared = filtered.filter((c) => c.status === 'Cleared').reduce((s, c) => s + Number(c.amount || 0), 0)

  const blankDoc = () => ({
    id: `new-${Date.now()}`, recId: null, direction: 'Received', cheque_no: '',
    cheque_date: new Date().toISOString().split('T')[0], amount: '',
    party_name: '', party_id: '', bank: '', status: 'Pending', saving: false, error: ''
  })

  const saveDoc = async () => {
    if (!form.cheque_no) { setForm({ ...form, error: 'Cheque number is required.' }); return }
    if (!form.amount || Number(form.amount) <= 0) { setForm({ ...form, error: 'Enter a valid amount.' }); return }
    setForm({ ...form, saving: true, error: '' })
    const payload = {
      direction: form.direction, cheque_no: form.cheque_no,
      cheque_date: form.cheque_date, amount: Number(form.amount),
      party_name: form.party_name, party_id: form.party_id || null,
      bank: form.bank, status: form.status,
    }
    try {
      if (form.recId) { await supabase.from('pdc_cheques').update(payload).eq('id', form.recId) }
      else { await supabase.from('pdc_cheques').insert(payload) }
      setForm(null); loadCheques()
    } catch (err) { setForm({ ...form, saving: false, error: err.message }) }
  }

  const updateStatus = async (id, status) => {
    await supabase.from('pdc_cheques').update({ status }).eq('id', id)
    loadCheques()
  }

  const deleteDoc = async (c) => {
    if (!window.confirm('Delete this cheque?')) return
    await supabase.from('pdc_cheques').delete().eq('id', c.id)
    loadCheques()
  }

  if (!form) {
    return (
      <div className="report-wrap">
        <div className="coa-head">
          <h3>📋 Check Management</h3>
          <div className="coa-head-right">
            <input className="coa-search" placeholder="🔍 Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <button className="btn-add" onClick={() => setForm(blankDoc())}>＋ New Cheque</button>
          </div>
        </div>
        <div className="report-controls" style={{ marginBottom: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button className={`filter-btn ${dirFilter === 'all' ? 'active' : ''}`} onClick={() => setDirFilter('all')}>All Dir</button>
          <button className={`filter-btn ${dirFilter === 'Received' ? 'active' : ''}`} onClick={() => setDirFilter('Received')}>Received</button>
          <button className={`filter-btn ${dirFilter === 'Issued' ? 'active' : ''}`} onClick={() => setDirFilter('Issued')}>Issued</button>
          <span style={{ width: 1, background: '#e2e8f0' }}></span>
          {Object.entries(counts).map(([st, n]) => (
            <button key={st} className={`filter-btn ${statusFilter === st ? 'active' : ''}`} onClick={() => setStatusFilter(st)}>{st} ({n})</button>
          ))}
          <span className="total-records" style={{ marginLeft: 'auto' }}>
            Pending: <b style={{ color: '#f59e0b' }}>{fmtMoney(totalPending)}</b> | Cleared: <b style={{ color: '#16a34a' }}>{fmtMoney(totalCleared)}</b>
          </span>
        </div>
        <div className="grid-wrap">
          <table className="data-grid">
            <thead>
              <tr>
                <th className="th-actions"></th>
                <th>CHEQUE NO</th>
                <th>DATE</th>
                <th>DIRECTION</th>
                <th>PARTY</th>
                <th>BANK</th>
                <th className="col-money">AMOUNT</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan="8" className="empty">Loading...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan="8" className="empty">No cheques found</td></tr>}
              {!loading && filtered.map((c, i) => (
                <tr key={c.id || i} className={i % 2 ? 'alt' : ''}>
                  <td className="td-actions">
                    <button className="act edit" title="Edit" onClick={() => setForm({ recId: c.id, direction: c.direction, cheque_no: c.cheque_no, cheque_date: c.cheque_date, amount: String(c.amount || ''), party_name: c.party_name || '', party_id: c.party_id || '', bank: c.bank || '', status: c.status, saving: false, error: '' })}>✏️</button>
                    {c.status === 'Pending' && <>
                      <button className="act edit" title="Mark Cleared" onClick={() => updateStatus(c.id, 'Cleared')}>✅</button>
                      <button className="act edit" title="Mark Bounced" onClick={() => updateStatus(c.id, 'Bounced')}>❌</button>
                    </>}
                    <button className="act del" title="Delete" onClick={() => deleteDoc(c)}>🗑️</button>
                  </td>
                  <td className="code-cell">{c.cheque_no}</td>
                  <td>{c.cheque_date}</td>
                  <td><span className={`badge ${c.direction === 'Received' ? 'b-green' : 'b-red'}`}>{c.direction}</span></td>
                  <td><b>{c.party_name || '—'}</b></td>
                  <td>{c.bank || '—'}</td>
                  <td className="col-money">{fmtMoney(c.amount)}</td>
                  <td><span className={`badge ${c.status === 'Cleared' ? 'b-green' : c.status === 'Bounced' || c.status === 'Cancelled' ? 'b-red' : c.status === 'Issued' ? 'b-blue' : 'b-amber'}`}>{c.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="report-wrap">
      <div className="coa-head">
        <h3>{form.recId ? `✏️ Edit Cheque` : '＋ New Cheque'}</h3>
        <button className="btn-cancel" onClick={() => setForm(null)}>✕ Cancel</button>
      </div>
      {form.error && <div className="inv-error">⚠️ {form.error}</div>}
      <div className="inv-grid coa-form-grid" style={{ marginTop: 14 }}>
        <label>Direction
          <select ref={firstRef} value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })}>
            <option value="Received">Received (Incoming)</option>
            <option value="Issued">Issued (Outgoing)</option>
          </select>
        </label>
        <label>Cheque No *<input value={form.cheque_no} onChange={(e) => setForm({ ...form, cheque_no: e.target.value })} placeholder="Cheque number" /></label>
        <label>Amount *<input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label>
        <label>Party / Payee<input value={form.party_name} onChange={(e) => setForm({ ...form, party_name: e.target.value })} placeholder="Who gave/received" /></label>
        <label>Bank<input value={form.bank} onChange={(e) => setForm({ ...form, bank: e.target.value })} placeholder="Bank name" /></label>
        <label>Cheque Date<input type="date" value={form.cheque_date} onChange={(e) => setForm({ ...form, cheque_date: e.target.value })} /></label>
        <label>Status
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option>Pending</option><option>In Hand</option><option>Issued</option><option>Deposited</option><option>Cleared</option><option>Bounced</option><option>Returned</option><option>Cancelled</option>
          </select>
        </label>
      </div>
      <div className="inv-actions">
        <button className="btn-cancel" onClick={() => setForm(null)}>✕ Cancel</button>
        <button className="btn-primary" disabled={form.saving} onClick={saveDoc}>{form.saving ? 'Saving…' : '💾 Save'}</button>
      </div>
    </div>
  )
}

const App = () => {
  const [authUser, setAuthUser] = useState(() => { try { const s = JSON.parse(localStorage.getItem('erp-auth') || 'null'); return s?.user || null } catch { return null } })
  const [authTenant, setAuthTenant] = useState(() => { try { const s = JSON.parse(localStorage.getItem('erp-auth') || 'null'); return s?.tenant || null } catch { return null } })
  const [menuOpen, setMenuOpen] = useState(true)
  const [activePage, setActivePage] = useState(null)
  const [history, setHistory] = useState([null])
  const [hIndex, setHIndex] = useState(0)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({ products: 0, customers: 0, orders: 0, inventory: 0, stockValue: 0, orderValue: 0, lowStock: 0, pending: 0 })
  const [chartData, setChartData] = useState({ months: [], sales: [], categories: [] })
  const [dark, setDark] = useState(() => localStorage.getItem('erp-dark') === '1')
  const [compact, setCompact] = useState(false)
  const [region, setRegion] = useState(() => localStorage.getItem('erp-region') || 'GCC — MENA')
  const [favorites, setFavorites] = useState(() => { try { return JSON.parse(localStorage.getItem('erp-favs') || '[]') } catch { return [] } })
  const [invoices, setInvoices] = useState([])
  const [activeInv, setActiveInv] = useState(null)
  const [products, setProducts] = useState([])
  const [custForms, setCustForms] = useState([])
  const [activeCust, setActiveCust] = useState(null)
  const [stockForms, setStockForms] = useState([])
  const [activeStock, setActiveStock] = useState(null)
  const [coaAccounts, setCoaAccounts] = useState([])
  const [coaExpanded, setCoaExpanded] = useState(() => { const s = new Set(); return s })
  const [coaSearch, setCoaSearch] = useState('')
  const [coaTypeFilter, setCoaTypeFilter] = useState('All')
  const [coaForm, setCoaForm] = useState(null)
  const [jeEntries, setJeEntries] = useState([])
  const [jeForm, setJeForm] = useState(null)
  const [jeSearch, setJeSearch] = useState('')
  const [jeStatusFilter, setJeStatusFilter] = useState('All')
  const [recurringTemplates, setRecurringTemplates] = useState([])
  const [incomingPayments, setIncomingPayments] = useState([])
  const [incomingForm, setIncomingForm] = useState(null)
  const [incomingSearch, setIncomingSearch] = useState('')
  const [incomingStatusFilter, setIncomingStatusFilter] = useState('All')
  const [outgoingPayments, setOutgoingPayments] = useState([])
  const [outgoingForm, setOutgoingForm] = useState(null)
  const [outgoingSearch, setOutgoingSearch] = useState('')
  const [outgoingStatusFilter, setOutgoingStatusFilter] = useState('All')
  const [custList, setCustList] = useState([])
  const [supList, setSupList] = useState([])
  const [companyProfile, setCompanyProfile] = useState(null)
  const [taxConfig, setTaxConfig] = useState<TaxConfig>({ country: 'Global', tax_name: 'Tax', standard_rate: 0, reduced_rate: 0, currency: 'USD', tax_authority: 'N/A', compliance_mode: 'None', tax_id_label: 'Tax ID', invoice_label: 'Invoice' })
  const [erpUsers, setErpUsers] = useState([])
  const [userForm, setUserForm] = useState(null)
  const [userSearch, setUserSearch] = useState('')
  const [docNumbers, setDocNumbers] = useState([])
  const [docSearch, setDocSearch] = useState('')
  const [rolePerms, setRolePerms] = useState([])
  const [pageTabs, setPageTabs] = useState([])
  const [activePageTab, setActivePageTab] = useState(null)
  const [searchQ, setSearchQ] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [listSearch, setListSearch] = useState('')
  const [sortCol, setSortCol] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const searchWrapRef = useRef(null)
  const searchRef = useRef(null)
  const [now, setNow] = useState(new Date())

  useEffect(() => { localStorage.setItem('erp-dark', dark ? '1' : '0') }, [dark])
  useEffect(() => { localStorage.setItem('erp-region', region) }, [region])

  // Auth: check session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setAuthUser(session.user)
        supabase.from('tenant_users').select('*, tenant:tenants(*)').eq('user_id', session.user.id).eq('status', 'Active').single().then(({ data: tu }) => {
          if (tu?.tenant) { setAuthTenant(tu.tenant); localStorage.setItem('erp-auth', JSON.stringify({ user: session.user, tenant: tu.tenant })) }
        })
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session?.user) { setAuthUser(null); setAuthTenant(null); localStorage.removeItem('erp-auth') }
    })
    return () => subscription?.unsubscribe()
  }, [])

  const handleLogin = (user: any, tenant: any) => {
    setAuthUser(user); setAuthTenant(tenant)
    localStorage.setItem('erp-auth', JSON.stringify({ user, tenant }))
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setAuthUser(null); setAuthTenant(null)
    const keysToKeep: string[] = []
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && !keysToKeep.includes(key)) keysToRemove.push(key)
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k))
  }

  const toggleFav = (label) => {
    setFavorites((prev) => {
      const next = prev.includes(label) ? prev.filter((f) => f !== label) : [...prev, label]
      localStorage.setItem('erp-favs', JSON.stringify(next))
      return next
    })
  }

  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(timer) }, [])

  useEffect(() => {
    if (!activePage && !activeCust && !activeStock && !activeInv) return
    const timer = setTimeout(() => {
      const root = document.querySelector('.erp-app')
      if (root) {
        const first = root.querySelector('.content input:not([type=hidden]):not([readonly]), .content select')
        if (first && document.activeElement !== first) first.focus()
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [activePage, activeCust, activeStock, activeInv])

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); searchRef.current?.focus() }
      if (e.key === 'Escape' && activePage) { navigate(null) }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [activePage])

  const dateStr = now.toLocaleDateString('en', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
  const timeStr = now.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  useEffect(() => {
    const load = async () => {
      const cfg = activePage ? LISTINGS[activePage] : null
      if (!cfg) {
        setRows([])
        try {
          const p = await supabase.from('products').select('*')
          const c = await supabase.from('customers').select('*')
          const o = await supabase.from('orders').select('*')
          const i = await supabase.from('inventory').select('*')
          const productsData = p.data || []
          const orders = o.data || []
          const inventory = i.data || []
          setProducts(productsData)
          const salesByMonth = {}
          orders.forEach((ord) => { const d = new Date(ord.created_at); const key = `${d.getFullYear()}-${d.getMonth()}`; salesByMonth[key] = (salesByMonth[key] || 0) + Number(ord.total_amount || 0) })
          const monthLabels = [], salesArr = []
          const today = new Date()
          for (let k = 5; k >= 0; k--) { const d = new Date(today.getFullYear(), today.getMonth() - k, 1); monthLabels.push(d.toLocaleString('en', { month: 'short' })); salesArr.push(salesByMonth[`${d.getFullYear()}-${d.getMonth()}`] || 0) }
          const catMap = {}
          productsData.forEach((pr) => { const cat = pr.category || 'Uncategorized'; catMap[cat] = (catMap[cat] || 0) + 1 })
          const categories = Object.entries(catMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6)
          setChartData({ months: monthLabels, sales: salesArr, categories })
          setStats({ products: productsData.length, customers: (c.data || []).length, orders: orders.length, inventory: inventory.length, stockValue: productsData.reduce((s, x) => s + Number(x.price || 0) * Number(x.stock_quantity || 0), 0), orderValue: orders.reduce((s, x) => s + Number(x.total_amount || 0), 0), lowStock: inventory.filter((x) => Number(x.quantity || 0) <= Number(x.reorder_level || 0)).length, pending: orders.filter((x) => x.status === 'pending').length })
        } catch (err) { console.error(err) }
        return
      }
      setLoading(true)
      try {
        const { data } = await supabase.from(cfg.table).select('*').limit(200)
        setRows(data || [])
      } catch (err) { console.error(err); setRows([]) } finally { setLoading(false) }
    }
    load()
  }, [activePage])

  const columns = (activePage && LISTINGS[activePage] && LISTINGS[activePage].columns) || DEFAULT_COLUMNS
  const colSpan = columns.length + 1

  const displayRows = (() => {
    let filtered = rows
    const q = listSearch.toLowerCase().trim()
    if (q) { filtered = rows.filter((r) => columns.some((c) => String(r[c.key] || '').toLowerCase().includes(q))) }
    if (sortCol) {
      filtered = [...filtered].sort((a, b) => {
        let av = a[sortCol], bv = b[sortCol]
        if (av == null) av = ''; if (bv == null) bv = ''
        if (!isNaN(av) && !isNaN(bv)) { av = Number(av); bv = Number(bv) }
        if (av < bv) return sortDir === 'asc' ? -1 : 1
        if (av > bv) return sortDir === 'asc' ? 1 : -1
        return 0
      })
    }
    return filtered
  })()

  const fmt = (v, t) => {
    if (t === 'money') return `SAR ${Number(v || 0).toFixed(2)}`
    if (t === 'date') return v ? new Date(v).toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' }) : ''
    return v || ''
  }

  const navigate = (page) => {
    if (page === 'Dashboard') page = null
    setActiveInv(null)
    setActiveCust(null)
    setActiveStock(null)
    setCoaForm(null)
    setJeForm(null)
    setListSearch('')
    setSortCol(null)
    setSortDir('asc')
    const newStack = history.slice(0, hIndex + 1)
    newStack.push(page)
    setHistory(newStack)
    setHIndex(newStack.length - 1)
    if (!page) { setActivePage(null); setActivePageTab(null); return }
    if (page === 'Chart of Accounts') loadCoa()
    if (page === 'Journal Entry') loadJeEntries()
    if (page === 'Incoming Payments') { loadIncoming(); loadPartners() }
    if (page === 'Outgoing Payments') { loadOutgoing(); loadPartners() }
    if (page === 'Company Profile') loadProfile()
    if (page === 'Users & Roles') loadUsers()
    if (page === 'Document Numbering') loadDocNumbers()
    if (page === 'Authorization') loadPermissions()
    setPageTabs((prev) => (prev.some((t) => t.key === page) ? prev : [...prev, { key: page, label: page }]))
    setActivePageTab(page)
    setActivePage(page)
  }

  const activatePageTab = (key) => {
    setActivePageTab(key)
    setActivePage(key)
    setActiveInv(null)
    setActiveCust(null)
    setActiveStock(null)
  }

  const closePageTab = (key) => {
    setPageTabs((prev) => {
      const next = prev.filter((t) => t.key !== key)
      if (activePageTab === key) { if (next.length) { const fb = next[next.length - 1]; setActivePageTab(fb.key); setActivePage(fb.key) } else { setActivePageTab(null); setActivePage(null) } }
      return next
    })
  }

  const canBack = hIndex > 0
  const canForward = hIndex < history.length - 1
  const goBack = () => { if (!canBack) return; const ni = hIndex - 1; setHIndex(ni); const pg = history[ni]; setActivePage(pg); setActivePageTab(pg); setActiveInv(null); setActiveCust(null); setActiveStock(null) }
  const goForward = () => { if (!canForward) return; const ni = hIndex + 1; setHIndex(ni); const pg = history[ni]; setActivePage(pg); setActivePageTab(pg); setActiveInv(null); setActiveCust(null); setActiveStock(null) }

  const searchResults = (() => {
    const q = searchQ.toLowerCase().trim()
    if (!q) return []
    const exact = [], partial = []
    for (const menu of MENUS) {
      for (const item of menu.items) {
        const label = item.label.toLowerCase()
        const isCategory = label === 'category'
        if (label === q) exact.push({ menu: menu.label, ...item })
        else if (!isCategory && label.includes(q)) partial.push({ menu: menu.label, ...item })
      }
    }
    return [...exact, ...partial].slice(0, 8)
  })()

  const goToResult = (label) => { navigate(label); setSearchQ(''); setShowResults(false); if (searchRef.current) searchRef.current.blur() }

  const onSearchKey = (e) => {
    if (e.key === 'Enter') { if (searchResults.length) goToResult(searchResults[0].label) }
    else if (e.key === 'Escape') { setSearchQ(''); setShowResults(false); if (searchRef.current) searchRef.current.blur() }
  }

  useEffect(() => {
    const onDocClick = (e) => { if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) setShowResults(false) }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.altKey) {
        const map = { a: 'Company Profile', f: 'Journal Entry', s: 'A/R Invoice', p: 'Purchase Order', i: 'Stock Master', b: 'Incoming Payments', r: 'Sales Report' }
        if (map[e.key.toLowerCase()]) { e.preventDefault(); navigate(map[e.key.toLowerCase()]) }
      }
      if (e.ctrlKey && e.key === 'b') { e.preventDefault(); setMenuOpen((v) => !v) }
      if (e.altKey && e.key.toLowerCase() === 'd') { e.preventDefault(); setDark((v) => !v) }
      if (e.altKey && e.key.toLowerCase() === 'c') { e.preventDefault(); setCompact((v) => !v) }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const lookupProduct = (id, idx, code) => {
    if (!code) return
    const found = products.find((p) => p.code === code || p.sku === code || p.barcode === code)
    if (found) {
      updItem(id, idx, { code: found.code, description: found.name, price: found.price })
    }
  }

  const emptyInvoice = () => ({ id: `inv-${Date.now()}`, title: 'New Invoice', step: 1, customer: { name: '', email: '', phone: '', address: '', city: '', country: '', vat: '' }, items: [], vat: taxConfig.standard_rate, payment: { method: 'Cash', paid: 0, notes: '' }, saving: false, savedNo: null, error: '' })

  const openInvoice = () => { const inv = emptyInvoice(); setInvoices((prev) => [...prev, inv]); setActiveInv(inv.id); setActiveCust(null); setActiveStock(null) }

  const patchInv = (id, patch) => { setInvoices((prev) => prev.map((inv) => (inv.id === id ? { ...inv, ...patch } : inv))) }

  const closeInvoice = (id) => { setInvoices((prev) => { const next = prev.filter((i) => i.id !== id); if (activeInv === id) setActiveInv(next.length ? next[next.length - 1].id : null); return next }) }

  const addItem = (id) => { patchInv(id, { items: [...invoices.find((i) => i.id === id).items, { code: '', description: '', price: 0, qty: 1, discount: 0 }] }) }

  const updItem = (id, idx, p) => { patchInv(id, { items: invoices.find((i) => i.id === id).items.map((it, i) => (i === idx ? { ...it, ...p, qty: Number(p.qty || it.qty), price: Number(p.price || it.price), discount: Number(p.discount || it.discount) } : it)) }) }

  const rmItem = (id, idx) => { patchInv(id, { items: invoices.find((i) => i.id === id).items.filter((_, i) => i !== idx) }) }

  const postArInvoiceToLedger = async (inv, subtotal, vatAmount, grandTotal, invoiceNo) => {
    try {
      const { data: accts } = await supabase.from('accounts').select('*')
      if (!accts || !accts.length) return
      const find = (pred) => accts.find((a) => !a.is_group && pred(a))
      const ar = find((a) => a.name.toLowerCase().includes('receivable'))
      const sales = find((a) => a.type === 'Income') || find((a) => a.name.toLowerCase().includes('sales'))
      const vatOut = find((a) => a.name.toLowerCase().includes('output'))
      const lines = []
      if (ar) lines.push({ account_id: ar.id, debit: grandTotal, credit: 0, description: `A/R Invoice ${invoiceNo}` })
      if (sales) lines.push({ account_id: sales.id, debit: 0, credit: subtotal, description: 'Sales revenue' })
      if (vatOut && vatAmount) lines.push({ account_id: vatOut.id, debit: 0, credit: vatAmount, description: 'Output VAT' })
      if (!lines.length) return
      const { data: je, error: jeErr } = await supabase.from('journal_entries').insert({
        entry_date: new Date().toISOString().split('T')[0],
        reference: invoiceNo,
        narration: `A/R Invoice ${invoiceNo}`,
        status: 'Posted',
        total_debit: grandTotal,
        total_credit: subtotal + (vatAmount || 0),
        currency: taxConfig.currency,
      }).select()
      if (jeErr || !je || !je.length) return
      const jeId = je[0].id
      const jeLines = lines.map((l, i) => ({ entry_id: jeId, line_no: i + 1, account_id: l.account_id, debit: Number(l.debit || 0), credit: Number(l.credit || 0), description: l.description }))
    await supabase.from('journal_lines').insert(jeLines)
    logActivity('POST', cfg.title || 'Document', ref + ' | debit ' + totalDebit.toFixed(2) + ' credit ' + totalCredit.toFixed(2), jeId)
      for (const l of lines) {
        const acct = accts.find((a) => a.id === l.account_id)
        if (!acct) continue
        const newBal = Number(acct.current_balance || 0) + Number(l.debit || 0) - Number(l.credit || 0)
        await supabase.from('accounts').update({ current_balance: newBal }).eq('id', acct.id)
      }
    } catch (e) { console.error('Invoice ledger post failed:', e); alert('⚠️ Ledger post failed: ' + (e.message || e) + '\nAccounting entry was NOT posted.') }
  }

  const loadSampleData = async () => {
    if (!window.confirm('Load sample data? Adds a Chart of Accounts, one customer, one product, and a posted A/R invoice (safe to run more than once).')) return
    try {
      const coa = [
        { code: '1000', name: 'Cash in Hand', type: 'Asset', opening_balance: 0, current_balance: 0 },
        { code: '1010', name: 'Bank Account', type: 'Asset', opening_balance: 0, current_balance: 0 },
        { code: '1200', name: 'Accounts Receivable', type: 'Asset', opening_balance: 0, current_balance: 0 },
        { code: '1300', name: 'Inventory', type: 'Asset', opening_balance: 0, current_balance: 0 },
        { code: '1400', name: 'VAT Recoverable', type: 'Asset', opening_balance: 0, current_balance: 0 },
        { code: '2000', name: 'Accounts Payable', type: 'Liability', opening_balance: 0, current_balance: 0 },
        { code: '2100', name: 'VAT Payable', type: 'Liability', opening_balance: 0, current_balance: 0 },
        { code: '2200', name: 'Accrued Liabilities', type: 'Liability', opening_balance: 0, current_balance: 0 },
        { code: '3000', name: 'Owner Capital', type: 'Equity', opening_balance: 50000, current_balance: -50000 },
        { code: '3100', name: 'Retained Earnings', type: 'Equity', opening_balance: 0, current_balance: 0 },
        { code: '4000', name: 'Sales Revenue', type: 'Income', opening_balance: 0, current_balance: 0 },
        { code: '4100', name: 'Other Income', type: 'Income', opening_balance: 0, current_balance: 0 },
        { code: '5000', name: 'Cost of Goods Sold', type: 'Expense', opening_balance: 0, current_balance: 0 },
        { code: '5100', name: 'Salaries & Wages', type: 'Expense', opening_balance: 0, current_balance: 0 },
        { code: '5200', name: 'Rent Expense', type: 'Expense', opening_balance: 0, current_balance: 0 },
        { code: '5300', name: 'Utilities Expense', type: 'Expense', opening_balance: 0, current_balance: 0 },
        { code: '5400', name: 'General & Administrative', type: 'Expense', opening_balance: 0, current_balance: 0 },
      ]
      const { count } = await supabase.from('accounts').select('*', { count: 'exact', head: true })
      if (!count) await supabase.from('accounts').insert(coa)
      const { data: cust } = await supabase.from('customers').insert({ code: 'CUST-0001', name: 'Sample Customer LLC', cust_type: 'Company', city: 'Dubai', country: 'UAE', currency: 'AED', payment_terms: 'Net 30', credit_limit: 10000, opening_balance: 0, vat_no: '100000000000003', status: 'Active', account_code: 'AR-CUST-0001' }).select()
      const { data: prod } = await supabase.from('products').insert({ code: 'ITM-0001', name: 'Sample Widget', sku: 'WID-001', category: 'Goods', unit: 'Pcs', price: 120, cost_price: 80, stock_quantity: 50, reorder_level: 10, location: 'Main', status: 'Active' }).select()
      const subtotal = 120 * 5
      const vat = subtotal * (taxConfig.standard_rate / 100)
      const grand = subtotal + vat
      const { data: inv } = await supabase.from('invoices').insert({ customer_name: 'Sample Customer LLC', items: [{ product_id: prod?.[0]?.id, name: 'Sample Widget', qty: 5, price: 120 }], subtotal, vat_percent: taxConfig.standard_rate, vat_amount: vat, grand_total: grand, payment_method: 'Cash', amount_paid: 0, balance: grand, status: 'pending' }).select()
      await postArInvoiceToLedger({ customer: { name: 'Sample Customer LLC' } }, subtotal, vat, grand, inv?.[0]?.invoice_no).catch((e) => console.error('Sample post failed:', e))
      loadCoa()
      window.alert('Sample data loaded. Open Chart of Accounts / Trial Balance to see it.')
    } catch (e) { window.alert('Error loading sample data: ' + (e?.message || e)) }
  }

  const saveInvoice = async (inv) => {
    if (!inv.customer.name.trim()) { patchInv(inv.id, { error: 'Customer name is required.', step: 1 }); return }
    patchInv(inv.id, { saving: true, error: '' })
    const subtotal = inv.items.reduce((s, it) => s + it.price * it.qty * (1 - (it.discount || 0) / 100), 0)
    const vatAmount = subtotal * inv.vat / 100
    const grandTotal = subtotal + vatAmount
    const { data, error } = await supabase.from('invoices').insert({ customer_name: inv.customer.name, customer_email: inv.customer.email, customer_phone: inv.customer.phone, customer_address: inv.customer.address, customer_vat: inv.customer.vat, items: inv.items, subtotal, vat_percent: inv.vat, vat_amount: vatAmount, grand_total: grandTotal, payment_method: inv.payment.method, amount_paid: inv.payment.paid, balance: grandTotal - inv.payment.paid, notes: inv.payment.notes, status: inv.payment.paid >= grandTotal ? 'paid' : 'pending' }).select()
    if (error) { patchInv(inv.id, { saving: false, error: error.message }); return }
    patchInv(inv.id, { saving: false, step: 4, savedNo: data[0]?.invoice_no || 'INV-NEW', dbId: data[0]?.id })
    await postArInvoiceToLedger(inv, subtotal, vatAmount, grandTotal, data[0]?.invoice_no || 'INV-NEW')
  }

  const partnerTable = (kind) => (kind === 'supplier' ? 'suppliers' : 'customers')

  const blankPartner = (kind) => ({
    id: null, code: '', name: '', cust_type: 'Company', category: '', email: '', phone: '', mobile: '', website: '', address: '', city: '', region: '', postal_code: '', country: 'Saudi Arabia', currency: 'SAR', payment_terms: 'Net 30', credit_limit: 0, opening_balance: 0, price_list: '', vat_no: '', account_code: '', credit_days: 30, sales_person: '', notes: '', status: 'Active', attachments: [], ship_address: '', sup_type: 'Distributor', contact_person: '', lead_time_days: 7, min_order_qty: 1, bank_name: '', bank_iban: '', pref_payment: 'Bank Transfer',
  })

  const openPartnerForm = (kind, row) => {
    const base = blankPartner(kind)
    const data = row ? { ...base, ...Object.fromEntries(Object.entries(base).map(([k]) => [k, row[k] !== null && row[k] !== undefined ? row[k] : base[k]])), name: row.name || [row.first_name, row.last_name].filter(Boolean).join(' ') || '', id: row.id } : base
    const form = { id: `prt-${Date.now()}`, kind, recId: row ? row.id : null, data, saving: false, savedCode: null, error: '', uploading: false }
    setCustForms((prev) => [...prev, form])
    setActiveCust(form.id)
    setActiveInv(null)
    setActiveStock(null)
    setActivePage(null)
    setActivePageTab(null)
  }

  const patchCust = (id, patch) => { setCustForms((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f))) }

  const closeCust = (id) => { setCustForms((prev) => { const next = prev.filter((f) => f.id !== id); if (activeCust === id) setActiveCust(next.length ? next[next.length - 1].id : null); return next }) }

  const savePartner = async (form) => {
    if (!form.data.name.trim()) { patchCust(form.id, { error: 'Name is required.' }); return }
    patchCust(form.id, { saving: true, error: '' })
    try {
      const table = partnerTable(form.kind)
      const prefix = form.kind === 'supplier' ? 'SUP' : 'CUST'
      let code = form.data.code
      if (!code) { const { count } = await supabase.from(table).select('*', { count: 'exact', head: true }); code = `${prefix}-${String((count || 0) + 1).padStart(4, '0')}` }
      const payload = { ...form.data, code, name: form.data.name.trim(), account_code: form.data.account_code || `${form.kind === 'supplier' ? 'AP' : 'AR'}-${code}`, credit_limit: Number(form.data.credit_limit) || 0, opening_balance: Number(form.data.opening_balance) || 0, credit_days: Number(form.data.credit_days) || 30 }
      delete payload.id
      let error
      let newId
      if (form.recId) { ({ error } = await supabase.from(table).update(payload).eq('id', form.recId)) } else { const { data: ins, error: insErr } = await supabase.from(table).insert(payload).select(); error = insErr; newId = ins?.[0]?.id
        // Deduct credit for new partner
        try {
          const { deductCredit } = await import('../utils/billing')
          const tenantId = authTenant?.id
          if (tenantId) await deductCredit(tenantId, table, code, `${form.kind}: ${form.data.name} (${code})`)
        } catch (e) { console.error('Credit deduction failed:', e) }
      }
      if (error) throw error
      patchCust(form.id, { saving: false, savedCode: code, recId: form.recId || newId, data: { ...form.data, code } })
      logActivity(form.recId ? 'UPDATE' : 'CREATE', 'Partner', `${form.kind} ${form.data.name} (${code})`, form.recId || newId)
    } catch (err) { patchCust(form.id, { saving: false, error: err.message }) }
  }

  const convertProspect = async (row) => {
    const table = activePage === 'Supplier' ? 'suppliers' : 'customers'
    const { error } = await supabase.from(table).update({ status: 'Active' }).eq('id', row.id)
    if (!error) setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: 'Active' } : r)))
  }

  const deleteRow = async (row) => {
    if (activePage === 'Stock Master') {
      if (!window.confirm(`Delete "${row.name || row.code}"?`)) return
      const { error } = await supabase.from('products').delete().eq('id', row.id)
      if (!error) setRows((prev) => prev.filter((r) => r.id !== row.id))
      return
    }
    if (activePage !== 'Customer' && activePage !== 'Supplier') return
    if (!window.confirm(`Delete "${row.name || row.code}"?`)) return
    const table = partnerTable(activePage === 'Supplier' ? 'supplier' : 'customer')
    const { error } = await supabase.from(table).delete().eq('id', row.id)
    if (!error) setRows((prev) => prev.filter((r) => r.id !== row.id))
  }

  const blankProduct = () => ({ id: null, code: '', sku: '', name: '', description: '', category: '', barcode: '', unit: 'Pcs', alt_units: [], price: 0, cost_price: 0, stock_quantity: 0, min_stock: 0, max_stock: 0, reorder_level: 10, location: '', supplier_id: '', hsn_code: '', vat_rate: 15, status: 'Active', notes: '', attachments: [] })

  const openStockForm = (row) => {
    const base = blankProduct()
    const data = row ? { ...base, ...Object.fromEntries(Object.entries(base).map(([k]) => [k, row[k] !== null && row[k] !== undefined ? row[k] : base[k]])), id: row.id } : base
    const form = { id: `stk-${Date.now()}`, recId: row ? row.id : null, data, saving: false, savedCode: null, error: '', uploading: false }
    setStockForms((prev) => [...prev, form])
    setActiveStock(form.id)
    setActiveCust(null)
    setActiveInv(null)
    setActivePage(null)
    setActivePageTab(null)
  }

  const patchStock = (id, patch) => { setStockForms((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f))) }

  const closeStock = (id) => {
    setStockForms((prev) => {
      const next = prev.filter((f) => f.id !== id)
      if (activeStock === id) { const nextTab = next.length ? next[next.length - 1] : null; setActiveStock(nextTab ? nextTab.id : null); if (!nextTab) setActivePage(null) }
      return next
    })
  }

  const saveStock = async (form) => {
    if (!form.data.name.trim()) { patchStock(form.id, { error: 'Product name is required.' }); return }
    patchStock(form.id, { saving: true, error: '' })
    try {
      let code = form.data.code
      if (!code) { const { count } = await supabase.from('products').select('*', { count: 'exact', head: true }); code = `ITM-${String((count || 0) + 1).padStart(4, '0')}` }
      const { data: existing } = await supabase.from('products').select('id, name, code').ilike('name', form.data.name.trim()).limit(5)
      const dupByName = existing?.find((x) => x.id !== form.recId)
      if (dupByName) { patchStock(form.id, { saving: false, error: `Duplicate name — "${dupByName.name}" (${dupByName.code}) already exists.` }); return }
      if (form.data.code) {
        const { data: existingCode } = await supabase.from('products').select('id, code').eq('code', form.data.code).limit(5)
        const dupByCode = existingCode?.find((x) => x.id !== form.recId)
        if (dupByCode) { patchStock(form.id, { saving: false, error: `Duplicate code — "${form.data.code}" already exists.` }); return }
      }
      const payload = { name: form.data.name.trim(), sku: form.data.sku, code, description: form.data.description, category: form.data.category, barcode: form.data.barcode, unit: form.data.unit, alt_units: form.data.alt_units || [], price: Number(form.data.price) || 0, cost_price: Number(form.data.cost_price) || 0, stock_quantity: Number(form.data.stock_quantity) || 0, min_stock: Number(form.data.min_stock) || 0, max_stock: Number(form.data.max_stock) || 0, reorder_level: Number(form.data.reorder_level) || 10, location: form.data.location, supplier_id: form.data.supplier_id || null, hsn_code: form.data.hsn_code, vat_rate: Number(form.data.vat_rate) || 15, status: form.data.status, notes: form.data.notes }
      let error
      let newId
      if (form.recId) { ({ error } = await supabase.from('products').update(payload).eq('id', form.recId)) } else { const { data: ins, error: insErr } = await supabase.from('products').insert(payload).select(); error = insErr; newId = ins?.[0]?.id
        // Deduct credit for new product
        try {
          const { deductCredit } = await import('../utils/billing')
          const tenantId = authTenant?.id
          if (tenantId) await deductCredit(tenantId, 'products', code, `Product: ${form.data.name} (${code})`)
        } catch (e) { console.error('Credit deduction failed:', e) }
      }
      if (error) throw error
      patchStock(form.id, { saving: false, savedCode: code, recId: form.recId || newId, data: { ...form.data, code } })
    } catch (err) { patchStock(form.id, { saving: false, error: err.message }) }
  }

  const loadCoa = async () => {
    try {
      const { data } = await supabase.from('accounts').select('*').order('code')
      setCoaAccounts(data || [])
      const tops = (data || []).filter((a) => !a.parent_id)
      setCoaExpanded(new Set(tops.map((a) => a.id)))
    } catch (err) { console.error('COA load error:', err) }
  }

  const toggleCoaExpand = (id) => { setCoaExpanded((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next }) }

  const openCoaEdit = (account) => {
    setCoaForm({ id: `coa-${Date.now()}`, recId: account.id, parentId: account.parent_id, parentName: account.parent_id ? (coaAccounts.find((a) => a.id === account.parent_id)?.name || '') : '', data: { code: account.code, name: account.name, type: account.type, parent_id: account.parent_id || '', opening_balance: account.opening_balance || 0, currency: account.currency || 'AED', status: account.status || 'Inactive', notes: account.notes || '' }, saving: false, error: '' })
    setActiveCust(null)
    setActiveInv(null)
    setActiveStock(null)
  }

  const openCoaAddChild = (parent) => {
    const parentType = parent ? parent.type : 'Asset'
    const parentName = parent ? parent.name : ''
    setCoaForm({ id: `coa-${Date.now()}`, recId: null, parentId: parent?.id || null, parentName, data: { code: '', name: '', type: parentType, parent_id: parent?.id || '', opening_balance: 0, currency: 'AED', status: 'Inactive', notes: '' }, saving: false, error: '' })
    setActiveCust(null)
    setActiveInv(null)
    setActiveStock(null)
  }

  const saveCoa = async (form) => {
    if (!form.data.code.trim() || !form.data.name.trim()) { setCoaForm({ ...form, error: 'Code and Name are required.' }); return }
    setCoaForm({ ...form, saving: true, error: '' })
    try {
      const { data: existing } = await supabase.from('accounts').select('id, code').eq('code', form.data.code.trim()).limit(5)
      const dup = existing?.find((x) => x.id !== form.recId)
      if (dup) { setCoaForm({ ...form, saving: false, error: `Code "${form.data.code}" already exists.` }); return }
      const opening = Number(form.data.opening_balance) || 0
      const signedOpening = (form.data.type === 'Liability' || form.data.type === 'Equity' || form.data.type === 'Income') ? -opening : opening
      const payload = { code: form.data.code.trim(), name: form.data.name.trim(), type: form.data.type, parent_id: form.data.parent_id || null, opening_balance: opening, currency: form.data.currency, status: form.data.status || 'Inactive', notes: form.data.notes, is_group: false }
      if (!form.recId) payload.current_balance = signedOpening
      let error
      if (form.recId) { ({ error } = await supabase.from('accounts').update(payload).eq('id', form.recId)) } else { ({ error } = await supabase.from('accounts').insert(payload)) }
      if (error) throw error
      await loadCoa()
      setCoaForm(null)
    } catch (err) { setCoaForm({ ...form, saving: false, error: err.message }) }
  }

  const deleteCoa = async (account) => {
    if (!window.confirm(`Delete account "${account.code} — ${account.name}"?`)) return
    const { error } = await supabase.from('accounts').delete().eq('id', account.id)
    if (!error) { setCoaAccounts((prev) => prev.filter((a) => a.id !== account.id)); setCoaExpanded((prev) => { const next = new Set(prev); next.delete(account.id); return next }) }
  }

  const loadJeEntries = async () => {
    try {
      const { data: entries } = await supabase.from('journal_entries').select('*').order('created_at', { ascending: false }).limit(200)
      const entryIds = (entries || []).map((e) => e.id)
      if (entryIds.length) {
        const { data: lines } = await supabase.from('journal_lines').select('*').in('entry_id', entryIds)
        const linesByEntry = {}
        ;(lines || []).forEach((l) => { if (!linesByEntry[l.entry_id]) linesByEntry[l.entry_id] = []; linesByEntry[l.entry_id].push(l) })
        setJeEntries((entries || []).map((e) => ({ ...e, lines: linesByEntry[e.id] || [] })))
      } else {
        setJeEntries([])
      }
    } catch (err) { console.error('JE load error:', err) }
  }

  const saveJe = async (form) => {
    const lines = form.data.lines.filter((l) => l.account_id && (Number(l.debit) > 0 || Number(l.credit) > 0))
    if (lines.length < 2) { setJeForm({ ...form, error: 'At least 2 lines required (one debit, one credit).' }); return }
    const totalDr = lines.reduce((s, l) => s + Number(l.debit || 0), 0)
    const totalCr = lines.reduce((s, l) => s + Number(l.credit || 0), 0)
    if (Math.abs(totalDr - totalCr) > 0.001) { setJeForm({ ...form, error: 'Debit and Credit must be equal.' }); return }

    setJeForm({ ...form, saving: true, error: '' })
    try {
      const entryPayload = { entry_date: form.data.entry_date, reference: form.data.reference, narration: form.data.narration, status: 'Draft', total_debit: totalDr, total_credit: totalCr, currency: form.data.currency }
      let entryId = form.recId
      if (form.recId) {
        const { error } = await supabase.from('journal_entries').update(entryPayload).eq('id', form.recId)
        if (error) throw error
        await supabase.from('journal_lines').delete().eq('entry_id', form.recId)
      } else {
        const { data, error } = await supabase.from('journal_entries').insert(entryPayload).select()
        if (error) throw error
        entryId = data[0].id
        // Deduct credit for new journal entry
        try {
          const { deductCredit } = await import('../utils/billing')
          const tenantId = authTenant?.id
          if (tenantId) await deductCredit(tenantId, 'journal_entries', data[0].entry_no, `Journal Entry: ${data[0].entry_no || ''}`)
        } catch (e) { console.error('Credit deduction failed:', e) }
      }
      const linePayloads = lines.map((l, i) => ({ entry_id: entryId, line_no: i + 1, account_id: l.account_id, debit: Number(l.debit) || 0, credit: Number(l.credit) || 0, description: l.description }))
      const { error: lineErr } = await supabase.from('journal_lines').insert(linePayloads)
      if (lineErr) throw lineErr
      await loadJeEntries()
      setJeForm({ ...form, saving: false, recId: entryId, error: '' })
    } catch (err) { setJeForm({ ...form, saving: false, error: err.message }) }
  }

  const postJe = async (entry) => {
    if (!window.confirm(`Post journal entry ${entry.entry_no}?`)) return
    const { error } = await supabase.from('journal_entries').update({ status: 'Posted' }).eq('id', entry.id)
    if (!error) {
      for (const line of (entry.lines || [])) {
        const acct = coaAccounts.find((a) => a.id === line.account_id)
        if (!acct) continue
        const newBal = Number(acct.current_balance || 0) + Number(line.debit || 0) - Number(line.credit || 0)
        await supabase.from('accounts').update({ current_balance: newBal }).eq('id', line.account_id)
      }
      await loadJeEntries()
      await loadCoa()
    }
  }

  const voidJe = async (entry) => {
    if (!window.confirm(`Void journal entry ${entry.entry_no}? This reverses the account balances.`)) return
    const { error } = await supabase.from('journal_entries').update({ status: 'Void' }).eq('id', entry.id)
    if (!error) {
      for (const line of (entry.lines || [])) {
        const acct = coaAccounts.find((a) => a.id === line.account_id)
        if (!acct) continue
        const newBal = Number(acct.current_balance || 0) - Number(line.debit || 0) + Number(line.credit || 0)
        await supabase.from('accounts').update({ current_balance: newBal }).eq('id', line.account_id)
      }
      await loadJeEntries()
      await loadCoa()
    }
  }

  const deleteJe = async (entry) => {
    if (!window.confirm(`Delete journal entry ${entry.entry_no}?`)) return
    const { error } = await supabase.from('journal_entries').delete().eq('id', entry.id)
    if (!error) await loadJeEntries()
  }

  const copyJe = (entry) => {
    if (entry._fromRecurring) {
      setJeForm({
        id: `je-${Date.now()}`, recId: null,
        data: { entry_no: '', entry_date: new Date().toISOString().slice(0, 10), reference: entry.reference || '', narration: entry.narration || '', currency: entry.currency || 'AED', status: 'Draft', lines: (entry.lines || []).map((l) => ({ account_id: l.account_id, description: l.description || '', debit: l.debit, credit: l.credit })) },
        saving: false, error: ''
      })
    } else {
      setJeForm({
        id: `je-${Date.now()}`, recId: null,
        data: { entry_no: '', entry_date: new Date().toISOString().slice(0, 10), reference: (entry.reference ? entry.reference + ' (copy)' : ''), narration: entry.narration || '', currency: entry.currency || 'AED', status: 'Draft', lines: (entry.lines || []).map((l) => ({ account_id: l.account_id, description: l.description || '', debit: l.debit, credit: l.credit })) },
        saving: false, error: ''
      })
    }
    setActivePage('Journal Entry')
    setActivePageTab('Journal Entry')
  }

  const printJe = (entry) => {
    const acctMap = {}
    coaAccounts.forEach((a) => { acctMap[a.id] = a })
    const linesHtml = (entry.lines || []).map((l) => {
      const acct = acctMap[l.account_id]
      return `<tr><td>${l.line_no || ''}</td><td>${acct ? acct.code + ' — ' + acct.name : 'Unknown'}</td><td>${l.description || ''}</td><td style="text-align:right">${Number(l.debit || 0) > 0 ? Number(l.debit).toLocaleString('en', { minimumFractionDigits: 2 }) : ''}</td><td style="text-align:right">${Number(l.credit || 0) > 0 ? Number(l.credit).toLocaleString('en', { minimumFractionDigits: 2 }) : ''}</td></tr>`
    }).join('')
    const w = window.open('', '_blank')
    w.document.write(`<html><head><title>${entry.entry_no}</title><style>body{font-family:'Segoe UI',sans-serif;padding:40px;color:#1e293b}h2{margin:0 0 4px}h3{margin:0 0 20px;color:#64748b;font-weight:normal;font-size:14px}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{padding:8px 12px;border:1px solid #e2e8f0;font-size:13px}th{background:#f8fafc;text-align:left;font-weight:700;color:#475569}.meta{display:flex;gap:30px;margin-bottom:16px;font-size:13px}.meta span{display:block}.meta b{color:#475569}.totals{text-align:right;margin-top:16px;font-size:14px}.totals b{margin-left:20px}.footer{margin-top:40px;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:8px}</style></head><body>`)
    w.document.write(`<div style="display:flex;justify-content:space-between;align-items:flex-start"><div><h2>Journal Entry</h2><h3>${entry.entry_no}</h3></div><div style="text-align:right;font-size:12px;color:#64748b">${entry.status}</div></div>`)
    w.document.write(`<div class="meta"><div><b>Date:</b> ${entry.entry_date ? new Date(entry.entry_date).toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}</div><div><b>Reference:</b> ${entry.reference || '—'}</div><div><b>Currency:</b> ${entry.currency || 'AED'}</div></div>`)
    if (entry.narration) w.document.write(`<p style="background:#f8fafc;padding:10px 14px;border-radius:8px;font-size:13px;border-left:3px solid #8b5cf6"><b>Narration:</b> ${entry.narration}</p>`)
    w.document.write(`<table><thead><tr><th>#</th><th>Account</th><th>Description</th><th style="text-align:right">Debit</th><th style="text-align:right">Credit</th></tr></thead><tbody>${linesHtml}</tbody></table>`)
    w.document.write(`<div class="totals"><b>Total Debit: ${(entry.total_debit || 0).toLocaleString('en', { minimumFractionDigits: 2 })}</b><b>Total Credit: ${(entry.total_credit || 0).toLocaleString('en', { minimumFractionDigits: 2 })}</b></div>`)
    w.document.write(`<div class="footer">Advanced ERP Pro — ${region} | Printed: ${new Date().toLocaleString()}</div>`)
    w.document.write('</body></html>')
    w.document.close()
    w.print()
  }

  const loadRecurring = async () => {
    try {
      const { data: templates } = await supabase.from('recurring_journal').select('*').order('created_at', { ascending: false })
      const ids = (templates || []).map((t) => t.id)
      if (ids.length) {
        const { data: lines } = await supabase.from('recurring_journal_lines').select('*').in('recurring_id', ids)
        const linesByTmpl = {}
        ;(lines || []).forEach((l) => { if (!linesByTmpl[l.recurring_id]) linesByTmpl[l.recurring_id] = []; linesByTmpl[l.recurring_id].push(l) })
        setRecurringTemplates((templates || []).map((t) => ({ ...t, lines: linesByTmpl[t.id] || [] })))
      } else {
        setRecurringTemplates([])
      }
    } catch (err) { console.error('Recurring load error:', err) }
  }

  const saveRecurring = async (form, setFormFn) => {
    const lines = form.data.lines.filter((l) => l.account_id && (Number(l.debit) > 0 || Number(l.credit) > 0))
    if (!form.data.template_name.trim()) { setFormFn({ ...form, error: 'Template name is required.' }); return }
    if (lines.length < 2) { setFormFn({ ...form, error: 'At least 2 lines required.' }); return }
    setFormFn({ ...form, saving: true, error: '' })
    try {
      const payload = { template_name: form.data.template_name.trim(), reference: form.data.reference, narration: form.data.narration, frequency: form.data.frequency, start_date: form.data.start_date, end_date: form.data.end_date || null, next_run_date: form.data.start_date, currency: form.data.currency, status: 'Active' }
      let tmplId = form.recId
      if (form.recId) {
        const { error } = await supabase.from('recurring_journal').update(payload).eq('id', form.recId)
        if (error) throw error
        await supabase.from('recurring_journal_lines').delete().eq('recurring_id', form.recId)
      } else {
        const { data, error } = await supabase.from('recurring_journal').insert(payload).select()
        if (error) throw error
        tmplId = data[0].id
      }
      const linePayloads = lines.map((l, i) => ({ recurring_id: tmplId, line_no: i + 1, account_id: l.account_id, debit: Number(l.debit) || 0, credit: Number(l.credit) || 0, description: l.description }))
      const { error: lineErr } = await supabase.from('recurring_journal_lines').insert(linePayloads)
      if (lineErr) throw lineErr
      await loadRecurring()
      setFormFn(null)
    } catch (err) { setFormFn({ ...form, saving: false, error: err.message }) }
  }

  const deleteRecurring = async (tmpl) => {
    if (!window.confirm(`Delete recurring template "${tmpl.template_name}"?`)) return
    const { error } = await supabase.from('recurring_journal').delete().eq('id', tmpl.id)
    if (!error) await loadRecurring()
  }

  const pauseRecurring = async (tmpl) => {
    const newStatus = tmpl.status === 'Paused' ? 'Active' : 'Paused'
    const { error } = await supabase.from('recurring_journal').update({ status: newStatus }).eq('id', tmpl.id)
    if (!error) await loadRecurring()
  }

  /* ================= BANKING: INCOMING PAYMENTS ================= */
  const loadIncoming = async () => {
    try {
      const { data } = await supabase.from('incoming_payments').select('*, customers(name)').order('created_at', { ascending: false })
      setIncomingPayments((data || []).map((p) => ({ ...p, customer_name: p.customers?.name || '' })))
    } catch (err) { console.error('Incoming load error:', err) }
  }

  const loadOutgoing = async () => {
    try {
      const { data } = await supabase.from('outgoing_payments').select('*, suppliers(name)').order('created_at', { ascending: false })
      setOutgoingPayments((data || []).map((p) => ({ ...p, supplier_name: p.suppliers?.name || '' })))
    } catch (err) { console.error('Outgoing load error:', err) }
  }

  const loadPartners = async () => {
    const { data: cs } = await supabase.from('customers').select('id, name').order('name')
    const { data: ss } = await supabase.from('suppliers').select('id, name').order('name')
    setCustList(cs || [])
    setSupList(ss || [])
  }

  const saveIncoming = async (form, setFormFn) => {
    if (!form.data.amount || Number(form.data.amount) <= 0) { setFormFn({ ...form, error: 'Amount must be greater than zero.' }); return }
    setFormFn({ ...form, saving: true, error: '' })
    try {
      const payload = { payment_date: form.data.payment_date, customer_id: form.data.customer_id || null, customer_name: form.data.customer_id ? (custList.find((c) => c.id === form.data.customer_id)?.name || '') : '', payment_method: form.data.payment_method, bank_account_id: form.data.bank_account_id || null, reference: form.data.reference, cheque_no: form.data.cheque_no, cheque_date: form.data.cheque_date, amount: Number(form.data.amount), currency: form.data.currency, exchange_rate: Number(form.data.exchange_rate), notes: form.data.notes, applied_to: form.data.applied_to }
      let newId
      if (form.recId) {
        const { error } = await supabase.from('incoming_payments').update(payload).eq('id', form.recId)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('incoming_payments').insert(payload).select()
        if (error) throw error
        newId = data?.[0]?.id
        // Deduct credit for new payment
        try {
          const { deductCredit } = await import('../utils/billing')
          const tenantId = authTenant?.id
          if (tenantId) await deductCredit(tenantId, 'incoming_payments', data?.[0]?.payment_no, `Incoming Payment: ${data?.[0]?.payment_no || ''}`)
        } catch (e) { console.error('Credit deduction failed:', e) }
      }
      await loadIncoming()
      setFormFn({ ...form, saving: false, recId: form.recId || newId, error: '' })
    } catch (err) { setFormFn({ ...form, saving: false, error: err.message }) }
  }

  const ensureAcct = async (name: string, type: string, prefix: string) => {
    const ex = (coaAccounts || []).find((a) => a.name === name && a.type === type)
    if (ex) return ex.id
    const code = prefix + Date.now().toString().slice(-6)
    const { data } = await supabase.from('accounts').insert({ code, name, type, is_group: false, status: 'Active' }).select()
    if (data && data.length) { setCoaAccounts((p) => [...p, data[0]]); return data[0].id }
    return null
  }

  const approveIncoming = async (p) => {
    if (!window.confirm(`Approve incoming payment ${p.payment_no}? This will create a journal entry.`)) return
    try {
      const isCheque = (p.payment_method || '').toLowerCase().includes('cheque')
      const isPdc = (p.payment_method || '') === 'PDC Cheque'
      const bankAcct = coaAccounts.find((a) => a.name.toLowerCase().includes('bank') && !a.is_group)
      const arAcct = coaAccounts.find((a) => a.name.toLowerCase().includes('receivable') && !a.is_group)
      let debitAcct = bankAcct
      if (isPdc) { const cid = await ensureAcct('PDC Receipts Clearing', 'Asset', 'PDCRC'); if (cid) debitAcct = { id: cid } }
      const jePayload = { entry_date: p.payment_date, reference: p.payment_no, narration: `Incoming payment from ${p.customer_name || 'customer'} — ${p.payment_method}`, status: 'Posted', total_debit: Number(p.amount), total_credit: Number(p.amount) }
      const { data: jeData, error: jeErr } = await supabase.from('journal_entries').insert(jePayload).select()
      if (jeErr) throw jeErr
      const jeId = jeData[0].id
      const lines = [
        { entry_id: jeId, line_no: 1, account_id: debitAcct?.id || coaAccounts[0]?.id, debit: Number(p.amount), credit: 0, description: isCheque ? (isPdc ? `PDC received ${p.cheque_no || p.payment_no}` : `Cheque received ${p.cheque_no || p.payment_no}`) : `Received — ${p.payment_no}` },
        { entry_id: jeId, line_no: 2, account_id: arAcct?.id || coaAccounts[1]?.id, debit: 0, credit: Number(p.amount), description: `AR — ${p.customer_name || ''}` }
      ]
      await supabase.from('journal_lines').insert(lines)
      await supabase.from('incoming_payments').update({ status: 'Approved', ar_entry_id: jeId }).eq('id', p.id)
      if (isCheque) {
        await supabase.from('pdc_cheques').insert({ direction: 'Received', cheque_no: p.cheque_no || p.payment_no, cheque_date: p.cheque_date || p.payment_date, amount: Number(p.amount), party_name: p.customer_name || '', party_id: p.customer_id || null, bank: '', status: isPdc ? 'Pending' : 'Cleared' })
        logActivity('CREATE', 'PDC', `${isPdc ? 'Post-dated' : 'Same-day'} received cheque ${p.cheque_no || p.payment_no} ${money(Number(p.amount))}`)
      }
      await Promise.all([loadIncoming(), loadJeEntries()])
    } catch (err) { alert('Error: ' + err.message) }
  }

  const cancelIncoming = async (p) => {
    if (!window.confirm(`Cancel incoming payment ${p.payment_no}?`)) return
    const { error } = await supabase.from('incoming_payments').update({ status: 'Cancelled' }).eq('id', p.id)
    if (!error) await loadIncoming()
  }

  const deleteIncoming = async (p) => {
    if (!window.confirm(`Delete incoming payment ${p.payment_no}?`)) return
    const { error } = await supabase.from('incoming_payments').delete().eq('id', p.id)
    if (!error) await loadIncoming()
  }

  const printIncoming = (p) => {
    const w = window.open('', '_blank')
    w.document.write(`<html><head><title>${p.payment_no}</title><style>body{font-family:'Segoe UI',sans-serif;padding:40px;color:#1e293b}h2{margin:0 0 4px}h3{margin:0 0 20px;color:#64748b;font-weight:normal;font-size:14px}.meta{display:flex;gap:30px;margin-bottom:16px;font-size:13px}.meta span{display:block}.meta b{color:#475569}.detail{margin:16px 0;font-size:14px;line-height:2}.footer{margin-top:40px;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:8px}</style></head><body>`)
    w.document.write(`<div style="display:flex;justify-content:space-between;align-items:flex-start"><div><h2>Incoming Payment</h2><h3>${p.payment_no}</h3></div><div style="text-align:right;font-size:12px;color:#64748b">${p.status}</div></div>`)
    w.document.write(`<div class="meta"><div><b>Date:</b> ${p.payment_date ? new Date(p.payment_date).toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}</div><div><b>Customer:</b> ${p.customer_name || '—'}</div><div><b>Method:</b> ${p.payment_method}</div><div><b>Reference:</b> ${p.reference || '—'}</div></div>`)
    w.document.write(`<div class="detail"><b>Amount: ${Number(p.amount).toLocaleString('en', { minimumFractionDigits: 2 })} ${p.currency}</b></div>`)
    if (p.notes) w.document.write(`<p style="background:#f0fdf4;padding:10px 14px;border-radius:8px;font-size:13px;border-left:3px solid #22c55e"><b>Notes:</b> ${p.notes}</p>`)
    w.document.write(`<div class="footer">Advanced ERP Pro — ${region} | Printed: ${new Date().toLocaleString()}</div>`)
    w.document.write('</body></html>')
    w.document.close()
    w.print()
  }

  /* ================= BANKING: OUTGOING PAYMENTS ================= */
  const saveOutgoing = async (form, setFormFn) => {
    if (!form.data.amount || Number(form.data.amount) <= 0) { setFormFn({ ...form, error: 'Amount must be greater than zero.' }); return }
    setFormFn({ ...form, saving: true, error: '' })
    try {
      const payload = { payment_date: form.data.payment_date, supplier_id: form.data.supplier_id || null, supplier_name: form.data.supplier_id ? (supList.find((s) => s.id === form.data.supplier_id)?.name || '') : '', payment_method: form.data.payment_method, bank_account_id: form.data.bank_account_id || null, reference: form.data.reference, cheque_no: form.data.cheque_no, cheque_date: form.data.cheque_date, amount: Number(form.data.amount), currency: form.data.currency, exchange_rate: Number(form.data.exchange_rate), notes: form.data.notes, applied_to: form.data.applied_to }
      let newId
      if (form.recId) {
        const { error } = await supabase.from('outgoing_payments').update(payload).eq('id', form.recId)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('outgoing_payments').insert(payload).select()
        if (error) throw error
        newId = data?.[0]?.id
        // Deduct credit for new payment
        try {
          const { deductCredit } = await import('../utils/billing')
          const tenantId = authTenant?.id
          if (tenantId) await deductCredit(tenantId, 'outgoing_payments', data?.[0]?.payment_no, `Outgoing Payment: ${data?.[0]?.payment_no || ''}`)
        } catch (e) { console.error('Credit deduction failed:', e) }
      }
      await loadOutgoing()
      setFormFn({ ...form, saving: false, recId: form.recId || newId, error: '' })
    } catch (err) { setFormFn({ ...form, saving: false, error: err.message }) }
  }

  const approveOutgoing = async (p) => {
    if (!window.confirm(`Approve outgoing payment ${p.payment_no}? This will create a journal entry.`)) return
    try {
      const isCheque = (p.payment_method || '').toLowerCase().includes('cheque')
      const isPdc = (p.payment_method || '') === 'PDC Cheque'
      const bankAcct = coaAccounts.find((a) => a.name.toLowerCase().includes('bank') && !a.is_group)
      const apAcct = coaAccounts.find((a) => a.name.toLowerCase().includes('payable') && !a.is_group)
      let creditAcct = bankAcct
      if (isPdc) { const cid = await ensureAcct('PDC Payments Clearing', 'Liability', 'PDCPY'); if (cid) creditAcct = { id: cid } }
      const jePayload = { entry_date: p.payment_date, reference: p.payment_no, narration: `Outgoing payment to ${p.supplier_name || 'supplier'} — ${p.payment_method}`, status: 'Posted', total_debit: Number(p.amount), total_credit: Number(p.amount) }
      const { data: jeData, error: jeErr } = await supabase.from('journal_entries').insert(jePayload).select()
      if (jeErr) throw jeErr
      const jeId = jeData[0].id
      const lines = [
        { entry_id: jeId, line_no: 1, account_id: apAcct?.id || coaAccounts[2]?.id, debit: Number(p.amount), credit: 0, description: `AP — ${p.supplier_name || ''}` },
        { entry_id: jeId, line_no: 2, account_id: creditAcct?.id || coaAccounts[0]?.id, debit: 0, credit: Number(p.amount), description: isCheque ? (isPdc ? `PDC issued ${p.cheque_no || p.payment_no}` : `Cheque paid ${p.cheque_no || p.payment_no}`) : `Paid — ${p.payment_no}` }
      ]
      await supabase.from('journal_lines').insert(lines)
      await supabase.from('outgoing_payments').update({ status: 'Approved', ap_entry_id: jeId }).eq('id', p.id)
      if (isCheque) {
        await supabase.from('pdc_cheques').insert({ direction: 'Issued', cheque_no: p.cheque_no || p.payment_no, cheque_date: p.cheque_date || p.payment_date, amount: Number(p.amount), party_name: p.supplier_name || '', party_id: p.supplier_id || null, bank: '', status: isPdc ? 'Pending' : 'Cleared' })
        logActivity('CREATE', 'PDC', `${isPdc ? 'Post-dated' : 'Same-day'} issued cheque ${p.cheque_no || p.payment_no} ${money(Number(p.amount))}`)
      }
      await Promise.all([loadOutgoing(), loadJeEntries()])
    } catch (err) { alert('Error: ' + err.message) }
  }

  const cancelOutgoing = async (p) => {
    if (!window.confirm(`Cancel outgoing payment ${p.payment_no}?`)) return
    const { error } = await supabase.from('outgoing_payments').update({ status: 'Cancelled' }).eq('id', p.id)
    if (!error) await loadOutgoing()
  }

  const deleteOutgoing = async (p) => {
    if (!window.confirm(`Delete outgoing payment ${p.payment_no}?`)) return
    const { error } = await supabase.from('outgoing_payments').delete().eq('id', p.id)
    if (!error) await loadOutgoing()
  }

  const printOutgoing = (p) => {
    const w = window.open('', '_blank')
    w.document.write(`<html><head><title>${p.payment_no}</title><style>body{font-family:'Segoe UI',sans-serif;padding:40px;color:#1e293b}h2{margin:0 0 4px}h3{margin:0 0 20px;color:#64748b;font-weight:normal;font-size:14px}.meta{display:flex;gap:30px;margin-bottom:16px;font-size:13px}.meta span{display:block}.meta b{color:#475569}.detail{margin:16px 0;font-size:14px;line-height:2}.footer{margin-top:40px;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:8px}</style></head><body>`)
    w.document.write(`<div style="display:flex;justify-content:space-between;align-items:flex-start"><div><h2>Outgoing Payment</h2><h3>${p.payment_no}</h3></div><div style="text-align:right;font-size:12px;color:#64748b">${p.status}</div></div>`)
    w.document.write(`<div class="meta"><div><b>Date:</b> ${p.payment_date ? new Date(p.payment_date).toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}</div><div><b>Supplier:</b> ${p.supplier_name || '—'}</div><div><b>Method:</b> ${p.payment_method}</div><div><b>Reference:</b> ${p.reference || '—'}</div></div>`)
    w.document.write(`<div class="detail"><b>Amount: ${Number(p.amount).toLocaleString('en', { minimumFractionDigits: 2 })} ${p.currency}</b></div>`)
    if (p.notes) w.document.write(`<p style="background:#fef2f2;padding:10px 14px;border-radius:8px;font-size:13px;border-left:3px solid #ef4444"><b>Notes:</b> ${p.notes}</p>`)
    w.document.write(`<div class="footer">Advanced ERP Pro — ${region} | Printed: ${new Date().toLocaleString()}</div>`)
    w.document.write('</body></html>')
    w.document.close()
    w.print()
  }

  /* ================= ADMIN: COMPANY PROFILE ================= */
  const loadProfile = async () => {
    try {
      const { data } = await supabase.from('company_profile').select('*').limit(1)
      if (data && data.length) {
        setCompanyProfile({ id: data[0].id, data: data[0], saving: false, error: '' })
        const tc = await fetchTaxConfig(data[0].country)
        setTaxConfig(tc)
      }
    } catch (err) { console.error('Profile load error:', err) }
  }

  const saveProfile = async (form, setFormFn) => {
    if (!form.data.company_name?.trim()) { setFormFn({ ...form, error: 'Company name is required.' }); return }
    setFormFn({ ...form, saving: true, error: '' })
    try {
      const payload = { ...form.data }
      const { error } = await supabase.from('company_profile').update(payload).eq('id', form.id)
      if (error) throw error
      logActivity('UPDATE', 'Company Profile', 'Saved profile')
      setFormFn({ ...form, saving: false })
      // Reload tax config after profile save
      const tc = await fetchTaxConfig(form.data.country)
      setTaxConfig(tc)
    } catch (err) { setFormFn({ ...form, saving: false, error: err.message }) }
  }

  /* ================= ADMIN: USERS & ROLES ================= */
  const loadUsers = async () => {
    try {
      const { data } = await supabase.from('erp_users').select('*').order('created_at', { ascending: false })
      setErpUsers(data || [])
    } catch (err) { console.error('Users load error:', err) }
  }

  const saveUser = async (form, setFormFn) => {
    if (!form.data.username?.trim()) { setFormFn({ ...form, error: 'Username is required.' }); return }
    if (!form.data.full_name?.trim()) { setFormFn({ ...form, error: 'Full name is required.' }); return }
    if (!form.recId && (!form.data.password_hash || form.data.password_hash.length < 6)) { setFormFn({ ...form, error: 'Password must be at least 6 characters.' }); return }
    setFormFn({ ...form, saving: true, error: '' })
    try {
      const payload = { username: form.data.username.trim(), full_name: form.data.full_name.trim(), email: form.data.email, role: form.data.role, status: form.data.status, phone: form.data.phone }
      if (form.recId) {
        const { error } = await supabase.from('erp_users').update(payload).eq('id', form.recId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('erp_users').insert({ ...payload, password_hash: form.data.password_hash })
        if (error) throw error
      }
      await loadUsers()
      setFormFn(null)
    } catch (err) { setFormFn({ ...form, saving: false, error: err.message }) }
  }

  const deleteUser = async (user) => {
    if (!window.confirm(`Delete user "${user.username}"?`)) return
    const { error } = await supabase.from('erp_users').delete().eq('id', user.id)
    if (!error) await loadUsers()
  }

  const toggleUserStatus = async (user) => {
    const newStatus = user.status === 'Active' ? 'Inactive' : 'Active'
    const { error } = await supabase.from('erp_users').update({ status: newStatus }).eq('id', user.id)
    if (!error) await loadUsers()
  }

  /* ================= ADMIN: DOCUMENT NUMBERING ================= */
  const loadDocNumbers = async () => {
    try {
      const { data } = await supabase.from('doc_numbering').select('*').order('doc_type')
      setDocNumbers(data || [])
    } catch (err) { console.error('Doc numbering load error:', err) }
  }

  const saveDocNumber = async (doc) => {
    const { error } = await supabase.from('doc_numbering').update({ prefix: doc.prefix, next_number: doc.next_number, pad_length: doc.pad_length, separator: doc.separator, suffix: doc.suffix, is_active: doc.is_active }).eq('id', doc.id)
    if (!error) await loadDocNumbers()
  }

  /* ================= ADMIN: AUTHORIZATION ================= */
  const AUTH_MODULES = [
    'Company Profile', 'Users & Roles', 'Document Numbering',
    'Chart of Accounts', 'Journal Entry',
    'A/R Invoice', 'Purchase Order',
    'Stock Master', 'Customer', 'Supplier',
    'Incoming Payments', 'Outgoing Payments',
  ]
  const AUTH_ROLES = ['Admin', 'Manager', 'Accountant', 'Sales Rep', 'Warehouse', 'Viewer']

  const loadPermissions = async () => {
    try {
      const { data } = await supabase.from('role_permissions').select('*')
      setRolePerms(data || [])
    } catch (err) { console.error('Permissions load error:', err) }
  }

  const togglePerm = async (role, module, action, value) => {
    if (role === 'Admin') return
    const existing = rolePerms.find((p) => p.role === role && p.module === module)
    if (existing) {
      const updated = rolePerms.map((p) => p.id === existing.id ? { ...p, [action]: value } : p)
      setRolePerms(updated)
      await supabase.from('role_permissions').update({ [action]: value }).eq('id', existing.id)
    } else {
      const newPerm = { role, module, can_view: false, can_create: false, can_edit: false, can_delete: false, can_approve: false, can_print: false, [action]: value }
      setRolePerms([...rolePerms, newPerm])
      await supabase.from('role_permissions').insert(newPerm)
    }
  }

  return (
    <div className={`erp-app ${dark ? 'dark' : ''}`}>
      {!authUser && <Login onLogin={handleLogin} />}
      {authUser && (<>
      {!isSupabaseConfigured && (
        <div className="config-banner">
          ⚠️ Supabase not configured — set <code>VITE_SUPABASE_ANON_KEY</code> (and <code>VITE_SUPABASE_URL</code>) in <code>.env</code>, then restart the dev server. The app loads but data calls will fail until then.
        </div>
      )}
      <header className="erp-header">
        <div className="header-left">
          <div className="logo-badge" style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}>ERP</div>
          <div className="brand-text">
            <h1>Advanced ERP Pro</h1>
            {authTenant && <span style={{ fontSize: 11, color: '#6b7280' }}>{authTenant.name} — {authTenant.plan_name}</span>}
            <select className="region-select" value={region} onChange={(e) => setRegion(e.target.value)} title="Select Region">
              <option>GCC — MENA</option>
              <option>Saudi Arabia</option>
              <option>UAE</option>
              <option>Kuwait</option>
              <option>Bahrain</option>
              <option>Oman</option>
              <option>Qatar</option>
              <option>Egypt</option>
              <option>India</option>
              <option>Pakistan</option>
              <option>Turkey</option>
              <option>Africa</option>
              <option>Europe</option>
              <option>Asia Pacific</option>
              <option>Americas</option>
              <option>Global</option>
            </select>
          </div>
        </div>
        <div className="header-center">
          <button className="header-btn" title="Home (Esc)" onClick={() => navigate(null)}>🏠</button>
          <div className="search-wrap" ref={searchWrapRef}>
            <input ref={searchRef} className="header-search" placeholder="🔍  Search menu...  (Ctrl+K)" value={searchQ} onChange={(e) => { setSearchQ(e.target.value); setShowResults(true) }} onKeyDown={onSearchKey} onFocus={() => setShowResults(true)} />
            {showResults && searchQ.trim() && (
              <div className="search-results">
                {searchResults.length === 0 && <div className="sr-empty">No matching screens</div>}
                {searchResults.map((r) => (
                  <button key={r.menu + r.label} className="sr-btn" onMouseDown={() => goToResult(r.label)}>
                    <span className="sr-ico">{r.icon}</span>
                    <span className="sr-label">{r.label}</span>
                    <span className="sr-menu">{r.menu}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="header-right">
          <div className="admin-badge">
            <span className="admin-avatar">👤</span>
            <div className="admin-info"><strong>ADMIN</strong><span>{dateStr} {timeStr}</span></div>
          </div>
          <button className={`header-btn ${compact ? 'on' : ''}`} title="Compact menu (Alt+C)" onClick={() => setCompact(!compact)}>{compact ? '⊞' : '⊟'}</button>
          <button className="header-btn" title="Dark mode (Alt+D)" onClick={() => setDark(!dark)}>{dark ? '☀️' : '🌙'}</button>
          <button className="header-btn" title="Show/hide menu (Ctrl+B)" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? '◀' : '▶'}</button>
          <button className="header-btn sample-btn" title="Load sample data (COA, customer, product, invoice)" onClick={loadSampleData}>📊 Sample</button>
          <button className="header-btn" title="Refresh" onClick={() => { if (activePage) { setActivePage(null); setTimeout(() => setActivePage(activePage), 10) } }}>🔄</button>
        </div>
      </header>

      {favorites.length > 0 && (
        <div className="fav-bar">
          <span className="fav-label">★</span>
          {favorites.map((fav) => (
            <button key={fav} className="fav-chip" onClick={() => navigate(fav)}>{fav}</button>
          ))}
        </div>
      )}

      <div className="erp-body">
        {menuOpen && (
          <nav className="mega-menu-wrap">
          <div className="mega-menu">
            {MENUS.map((menu) => (
              <div key={menu.key} className="menu-panel" style={{ '--c1': menu.color, '--c2': menu.color2 }}>
                <div className="menu-panel-head"><span>{menu.icon}</span> <span className="mpl">{menu.label}</span></div>
                <ul>
                  {menu.items.map((item) => (
                    <li key={item.label}>
                      <button className={activePage === item.label ? 'active' : ''} onClick={() => navigate(item.label)}>
                        <span className="dd-ico">{item.icon}</span>
                        <span className="mpl">{item.label}</span>
                        <span className={`pin ${favorites.includes(item.label) ? 'pinned' : ''}`} title={favorites.includes(item.label) ? 'Unpin' : 'Pin'} onClick={(e) => { e.stopPropagation(); toggleFav(item.label) }}>★</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </nav>
      )}

      <main className={`erp-content ${menuOpen ? 'menu-open' : ''}`}>
        <div className="tab-bar">
          {pageTabs.map((t) => (
            <button key={t.key} className={`tab page-tab ${!activeInv && !activeCust && !activeStock && activePageTab === t.key ? 'active' : ''}`} onClick={() => activatePageTab(t.key)}>
              📍 {t.label}
              <span className="tab-x" onClick={(e) => { e.stopPropagation(); closePageTab(t.key) }}>×</span>
            </button>
          ))}
          {pageTabs.length === 0 && !activeInv && !activeCust && !activeStock && <span className="tab-empty-hint">🏠 Home — open any screen to see its tab here</span>}
          {custForms.map((f) => (
            <button key={f.id} className={`tab ${f.kind === 'supplier' ? 'sup-tab' : 'cust-tab'} ${activeCust === f.id ? 'active' : ''}`} onClick={() => { setActiveCust(f.id); setActiveInv(null); setActiveStock(null); setActivePage(null) }}>
              {f.kind === 'supplier' ? '🏭' : '👤'} {f.savedCode || f.data.code || (f.kind === 'supplier' ? 'New Supplier' : 'New Customer')}
              <span className="tab-x" onClick={(e) => { e.stopPropagation(); closeCust(f.id) }}>×</span>
            </button>
          ))}
          {invoices.map((inv) => (
            <button key={inv.id} className={`tab inv-tab ${activeInv === inv.id ? 'active' : ''}`} onClick={() => { setActiveInv(inv.id); setActiveCust(null); setActiveStock(null); setActivePage(null) }}>
              🧾 {inv.savedNo ? `INV ${inv.savedNo}` : inv.title}
              <span className="tab-x" onClick={(e) => { e.stopPropagation(); closeInvoice(inv.id) }}>×</span>
            </button>
          ))}
          {stockForms.map((f) => (
            <button key={f.id} className={`tab stk-tab ${activeStock === f.id ? 'active' : ''}`} onClick={() => { setActiveStock(f.id); setActiveCust(null); setActiveInv(null); setActivePage(null) }}>
              📦 {f.savedCode || f.data.code || (f.recId ? f.data.name || 'Edit Item' : 'New Item')}
              <span className="tab-x" onClick={(e) => { e.stopPropagation(); closeStock(f.id) }}>×</span>
            </button>
          ))}
        </div>

        {activeCust && custForms.find((f) => f.id === activeCust) && (
          <PartnerForm form={custForms.find((f) => f.id === activeCust)} patch={(p) => patchCust(activeCust, p)} save={() => savePartner(custForms.find((f) => f.id === activeCust))} close={() => closeCust(activeCust)} />
        )}

        {!activeCust && activeInv && invoices.find((i) => i.id === activeInv) && (
          <InvoiceWorkspace inv={invoices.find((i) => i.id === activeInv)} products={products} patch={(p) => patchInv(activeInv, p)} addItem={() => addItem(activeInv)} updItem={(idx, p) => updItem(activeInv, idx, p)} rmItem={(idx) => rmItem(activeInv, idx)} lookup={(idx, code) => lookupProduct(activeInv, idx, code)} save={() => saveInvoice(invoices.find((i) => i.id === activeInv))} openNew={() => { setActiveCust(null); openInvoice() }} close={() => closeInvoice(activeInv)} />
        )}

        {!activeCust && !activeInv && activeStock && stockForms.find((f) => f.id === activeStock) && (
          <StockForm form={stockForms.find((f) => f.id === activeStock)} patch={(p) => patchStock(activeStock, p)} save={saveStock} close={closeStock} />
        )}

        {!activeCust && !activeInv && !activeStock && (!activePage || activePage === 'Dashboard') && (
            <div className="home">
              {authTenant && <CreditDashboard tenant={authTenant} />}
              <Dashboard fmtMoney={fmtMoney} onNavigate={navigate} />
            </div>
        )}

        {!activeCust && !activeInv && !activeStock && activePage && activePage === 'Chart of Accounts' && (
          <ChartOfAccounts accounts={coaAccounts} expanded={coaExpanded} toggleExpand={toggleCoaExpand} onEdit={openCoaEdit} onAddChild={openCoaAddChild} onDelete={deleteCoa} search={coaSearch} setSearch={setCoaSearch} typeFilter={coaTypeFilter} setTypeFilter={setCoaTypeFilter} onSave={saveCoa} form={coaForm} setForm={setCoaForm} closeForm={() => setCoaForm(null)} />
        )}

        {!activeCust && !activeInv && !activeStock && activePage && activePage === 'Journal Entry' && (
          <JournalEntry entries={jeEntries} accounts={coaAccounts} form={jeForm} setForm={setJeForm} onSave={saveJe} onPost={postJe} onDelete={deleteJe} onVoid={voidJe} onCopy={copyJe} onPrint={printJe} search={jeSearch} setSearch={setJeSearch} statusFilter={jeStatusFilter} setStatusFilter={setJeStatusFilter} loadEntries={loadJeEntries} recurringTemplates={recurringTemplates} onLoadRecurring={loadRecurring} onSaveRecurring={saveRecurring} onDeleteRecurring={deleteRecurring} onPauseRecurring={pauseRecurring} />
        )}

        {!activeCust && !activeInv && !activeStock && activePage && activePage === 'Incoming Payments' && (
          <IncomingPayments payments={incomingPayments} accounts={coaAccounts} custList={custList} form={incomingForm} setForm={setIncomingForm} onSave={saveIncoming} onApprove={approveIncoming} onCancel={cancelIncoming} onDelete={deleteIncoming} onPrint={printIncoming} search={incomingSearch} setSearch={setIncomingSearch} statusFilter={incomingStatusFilter} setStatusFilter={setIncomingStatusFilter} />
        )}

        {!activeCust && !activeInv && !activeStock && activePage && activePage === 'Outgoing Payments' && (
          <OutgoingPayments payments={outgoingPayments} accounts={coaAccounts} supList={supList} form={outgoingForm} setForm={setOutgoingForm} onSave={saveOutgoing} onApprove={approveOutgoing} onCancel={cancelOutgoing} onDelete={deleteOutgoing} onPrint={printOutgoing} search={outgoingSearch} setSearch={setOutgoingSearch} statusFilter={outgoingStatusFilter} setStatusFilter={setOutgoingStatusFilter} />
        )}

        {!activeCust && !activeInv && !activeStock && activePage && activePage === 'Reconciliation' && (
          <BankRecon accounts={coaAccounts} fmtMoney={fmtMoney} />
        )}

        {!activeCust && !activeInv && !activeStock && activePage && activePage === 'Payment Wizard' && (
          <PaymentWizard accounts={coaAccounts} fmtMoney={fmtMoney} custList={custList} supList={supList} />
        )}

        {!activeCust && !activeInv && !activeStock && activePage && activePage === 'Company Profile' && (
          <CompanyProfile profile={companyProfile} setProfile={setCompanyProfile} onSave={saveProfile} taxConfig={taxConfig} />
        )}

        {!activeCust && !activeInv && !activeStock && activePage && activePage === 'Users & Roles' && (
          <UsersRoles users={erpUsers} form={userForm} setForm={setUserForm} onSave={saveUser} onDelete={deleteUser} onToggleStatus={toggleUserStatus} search={userSearch} setSearch={setUserSearch} />
        )}

        {!activeCust && !activeInv && !activeStock && activePage && activePage === 'Document Numbering' && (
          <DocNumbering docs={docNumbers} setDocs={setDocNumbers} onSave={saveDocNumber} search={docSearch} setSearch={setDocSearch} />
        )}

        {!activeCust && !activeInv && !activeStock && activePage && activePage === 'Authorization' && (
          <Authorization permissions={rolePerms} modules={AUTH_MODULES} roles={AUTH_ROLES} onSave={togglePerm} onToggle={togglePerm} />
        )}

        {!activeCust && !activeInv && !activeStock && activePage && activePage === 'Screen Designer' && (
          <ScreenDesigner />
        )}

        {!activeCust && !activeInv && !activeStock && activePage && activePage === 'Exchange Rates' && (
          <ExchangeRates fmtMoney={fmtMoney} />
        )}

        {!activeCust && !activeInv && !activeStock && activePage && activePage === 'Sales Quotation' && (
          <SalesDocs docType="quotation" fmtMoney={fmtMoney} taxRate={taxConfig.standard_rate} />
        )}

        {!activeCust && !activeInv && !activeStock && activePage && activePage === 'Sales Order' && (
          <SalesDocs docType="order" fmtMoney={fmtMoney} taxRate={taxConfig.standard_rate} />
        )}

        {!activeCust && !activeInv && !activeStock && activePage && (activePage === 'Trial Balance Report' || activePage === 'Trial Balance') && (
          <TrialBalanceReport accounts={coaAccounts} fmtMoney={fmtMoney} />
        )}

        {!activeCust && !activeInv && !activeStock && activePage && (activePage === 'Balance Sheet Report' || activePage === 'Balance Sheet') && (
          <BalanceSheetReport accounts={coaAccounts} fmtMoney={fmtMoney} />
        )}

        {!activeCust && !activeInv && !activeStock && activePage && (activePage === 'Profit & Loss Statement' || activePage === 'P&L Statement') && (
          <ProfitLossReport accounts={coaAccounts} fmtMoney={fmtMoney} />
        )}

        {!activeCust && !activeInv && !activeStock && activePage && activePage === 'Corporate Tax' && (
          <CorporateTax />
        )}

        {!activeCust && !activeInv && !activeStock && activePage && activePage === 'Sales Report' && (
          <SalesReport fmtMoney={fmtMoney} />
        )}

        {!activeCust && !activeInv && !activeStock && activePage && activePage === 'Purchase Report' && (
          <PurchaseReport fmtMoney={fmtMoney} />
        )}

        {!activeCust && !activeInv && !activeStock && activePage && activePage === 'Stock Report' && (
          <StockReport fmtMoney={fmtMoney} />
        )}

        {!activeCust && !activeInv && !activeStock && activePage && activePage === 'Customer Balance' && (
          <CustomerBalanceReport fmtMoney={fmtMoney} />
        )}

        {!activeCust && !activeInv && !activeStock && activePage && activePage === 'Supplier Balance' && (
          <SupplierBalanceReport fmtMoney={fmtMoney} />
        )}

        {!activeCust && !activeInv && !activeStock && activePage && activePage === 'Stock Aging Report' && (
          <StockAgingReport fmtMoney={fmtMoney} />
        )}

        {!activeCust && !activeInv && !activeStock && activePage && activePage === 'Cash Flow Statement' && (
          <CashFlowReport accounts={coaAccounts} fmtMoney={fmtMoney} />
        )}

        {!activeCust && !activeInv && !activeStock && activePage && activePage === 'Tax Report' && (
          <TaxReport fmtMoney={fmtMoney} taxConfig={taxConfig} />
        )}

        {!activeCust && !activeInv && !activeStock && activePage && activePage === 'Audit Report' && (
          <AuditReport />
        )}

        {!activeCust && !activeInv && !activeStock && activePage && activePage === 'Fixed Assets' && (
          <FixedAssets />
        )}

        {!activeCust && !activeInv && !activeStock && activePage && activePage === 'Fx Revaluation' && (
          <FxRevaluation accounts={coaAccounts} baseCurrency={companyProfile?.base_currency || 'AED'} />
        )}

      {!activeCust && !activeInv && !activeStock && activePage && activePage === 'Inventory Valuation' && (
        <InventoryValuation />
      )}
      {!activeCust && !activeInv && !activeStock && activePage === 'Stock Transfer' && (
        <StockTransfer />
      )}

      {!activeCust && !activeInv && !activeStock && activePage === 'Stock Alerts' && (
        <StockAlerts />
      )}

      {!activeCust && !activeInv && !activeStock && activePage === 'Recurring Invoices' && (
        <RecurringInvoices fmtMoney={fmtMoney} />
      )}

      {!activeCust && !activeInv && !activeStock && activePage === 'Inventory Movement Report' && (
        <InventoryMovementReport fmtMoney={fmtMoney} />
      )}

      {!activeCust && !activeInv && !activeStock && activePage === 'Aged Receivables' && (
        <AgedReceivables fmtMoney={fmtMoney} />
      )}

      {!activeCust && !activeInv && !activeStock && activePage === 'Print Barcode Labels' && (
        <BarcodeLabelPrint fmtMoney={fmtMoney} />
      )}

      {!activeCust && !activeInv && !activeStock && activePage === 'Bank CSV Import' && (
        <BankCsvImport fmtMoney={fmtMoney} onClose={() => setActivePage(null)} />
      )}

      {!activeCust && !activeInv && !activeStock && activePage === 'Payment Schedules' && (
        <PaymentSchedulesList fmtMoney={fmtMoney} />
      )}

      {!activeCust && !activeInv && !activeStock && activePage === 'Dunning Letters' && (
        <DunningLetters fmtMoney={fmtMoney} />
      )}

      {!activeCust && !activeInv && !activeStock && activePage === 'Transaction Reversal' && (
        <TransactionReversal fmtMoney={fmtMoney} />
      )}

        {!activeCust && !activeInv && !activeStock && activePage && activePage === 'Audit Log' && (
          <AuditLog />
        )}
        {!activeCust && !activeInv && !activeStock && activePage && activePage === 'License' && (
          <LicensePage tenant={authTenant} onTenantUpdate={(t) => { setAuthTenant(t); localStorage.setItem('erp-auth', JSON.stringify({ user: authUser, tenant: t })) }} />
        )}
        {!activeCust && !activeInv && !activeStock && activePage && activePage === 'Statements & Aging' && (
          <Statements />
        )}

      {!activeCust && !activeInv && !activeStock && activePage && activePage === 'PDC Report' && (
        <PdcReport accounts={coaAccounts} />
      )}
      {!activeCust && !activeInv && !activeStock && activePage === 'Cheque Templates' && (
        <ChequeTemplates />
      )}
      {!activeCust && !activeInv && !activeStock && activePage === 'Production / BOM' && (
        <Production />
      )}
      {!activeCust && !activeInv && !activeStock && activePage === 'Import / Export' && (
        <DataImport />
      )}

        {!activeCust && !activeInv && !activeStock && activePage && activePage === 'Bank Reconciliation' && (
          <BankRecon accounts={coaAccounts} fmtMoney={fmtMoney} />
        )}

        {!activeCust && !activeInv && !activeStock && activePage && activePage === 'Customer Ledger' && (
          <CustomerLedger fmtMoney={fmtMoney} />
        )}

        {!activeCust && !activeInv && !activeStock && activePage && activePage === 'Supplier Ledger' && (
          <SupplierLedger fmtMoney={fmtMoney} />
        )}

        {!activeCust && !activeInv && !activeStock && activePage && activePage === 'Stock Aging' && (
          <StockAgingReport fmtMoney={fmtMoney} />
        )}

        {!activeCust && !activeInv && !activeStock && activePage && activePage === 'Cash Book' && (
          <CashBook fmtMoney={fmtMoney} />
        )}

        {!activeCust && !activeInv && !activeStock && activePage && activePage === 'Bank Book' && (
          <BankBook fmtMoney={fmtMoney} />
        )}

        {!activeCust && !activeInv && !activeStock && activePage && activePage === 'Debit Note' && (
          <DebitCreditNotes type="debit" fmtMoney={fmtMoney} taxRate={taxConfig.standard_rate} />
        )}

        {!activeCust && !activeInv && !activeStock && activePage && activePage === 'Credit Note' && (
          <DebitCreditNotes type="credit" fmtMoney={fmtMoney} taxRate={taxConfig.standard_rate} />
        )}

        {!activeCust && !activeInv && !activeStock && activePage && (activePage === 'Cost Center' || activePage === 'Budget') && (
          <CostCenterBudget fmtMoney={fmtMoney} />
        )}

        {!activeCust && !activeInv && !activeStock && activePage && activePage === 'Petty Cash' && (
          <PettyCashModule fmtMoney={fmtMoney} />
        )}

        {!activeCust && !activeInv && !activeStock && activePage && activePage === 'Stock Adjustment' && (
          <StockAdjustmentModule fmtMoney={fmtMoney} />
        )}

        {!activeCust && !activeInv && !activeStock && activePage && activePage === 'Stock In / Out' && (
          <StockInOutModule fmtMoney={fmtMoney} />
        )}

        {!activeCust && !activeInv && !activeStock && activePage && activePage === 'Physical Stock' && (
          <PhysicalStockModule fmtMoney={fmtMoney} />
        )}

        {!activeCust && !activeInv && !activeStock && activePage && activePage === 'Deposits' && (
          <DepositsModule fmtMoney={fmtMoney} />
        )}

        {!activeCust && !activeInv && !activeStock && activePage && activePage === 'Check Management' && (
          <CheckManagementModule fmtMoney={fmtMoney} />
        )}

        {!activeCust && !activeInv && !activeStock && activePage && activePage === 'Landed Cost' && (
          <LandedCostWorkspace fmtMoney={fmtMoney} />
        )}

        {!activeCust && !activeInv && !activeStock && activePage && getDocMenus(taxConfig.standard_rate)[activePage] && activePage !== 'Landed Cost' && (
          <DocWorkspace key={activePage} cfg={getDocMenus(taxConfig.standard_rate)[activePage]} fmtMoney={fmtMoney} />
        )}

        {!activeCust && !activeInv && !activeStock && activePage && MODULES[activePage] && (
          <ModuleWorkspace key={activePage} module={activePage} cfg={MODULES[activePage]} fmtMoney={fmtMoney} />
        )}

        {!activeCust && !activeInv && !activeStock && activePage && activePage !== 'Chart of Accounts' && activePage !== 'Journal Entry' && activePage !== 'Incoming Payments' && activePage !== 'Outgoing Payments' && activePage !== 'Reconciliation' && activePage !== 'Payment Wizard' && activePage !== 'Company Profile' && activePage !== 'Users & Roles' && activePage !== 'Document Numbering' && activePage !== 'Authorization' && activePage !== 'Trial Balance Report' && activePage !== 'Trial Balance' && activePage !== 'Balance Sheet Report' && activePage !== 'Balance Sheet' && activePage !== 'Profit & Loss Statement' && activePage !== 'P&L Statement' && activePage !== 'Sales Report' && activePage !== 'Purchase Report' && activePage !== 'Stock Report' && activePage !== 'Customer Balance' && activePage !== 'Supplier Balance' && activePage !== 'Stock Aging Report' && activePage !== 'Cash Flow Statement' && activePage !== 'Tax Report' && activePage !== 'Corporate Tax' && activePage !== 'Audit Report' && activePage !== 'Fixed Assets' && activePage !== 'Exchange Rates' && activePage !== 'Sales Quotation' && activePage !== 'Sales Order' && activePage !== 'Bank Reconciliation' && activePage !== 'Customer Ledger' && activePage !== 'Supplier Ledger' && activePage !== 'Stock Aging' && activePage !== 'Dashboard' && activePage !== 'Screen Designer' && activePage !== 'Fx Revaluation' && activePage !== 'Inventory Valuation' && activePage !== 'Audit Log' && activePage !== 'Statements & Aging' && activePage !== 'PDC Report' && activePage !== 'Cheque Templates' && activePage !== 'Stock Transfer' && activePage !== 'Stock Alerts' && activePage !== 'Recurring Invoices' && activePage !== 'Inventory Movement Report' && activePage !== 'Aged Receivables' && activePage !== 'Print Barcode Labels' && activePage !== 'Bank CSV Import' && activePage !== 'Payment Schedules' && activePage !== 'Dunning Letters' && activePage !== 'Transaction Reversal' && activePage !== 'Production / BOM' && activePage !== 'Import / Export' && activePage !== 'Cash Book' && activePage !== 'Bank Book' && activePage !== 'Debit Note' && activePage !== 'Credit Note' && activePage !== 'Cost Center' && activePage !== 'Budget' && activePage !== 'Petty Cash' && activePage !== 'Stock Adjustment' && activePage !== 'Stock In / Out' && activePage !== 'Physical Stock' && activePage !== 'Deposits' && activePage !== 'Check Management' && 
!getDocMenus(taxConfig.standard_rate)[activePage] && !MODULES[activePage] && (
          <>
            <div className="list-toolbar">
              <span className="page-name">📍 {activePage}</span>
              <input className="list-search" placeholder="🔍 Search anything..." value={listSearch} onChange={(e) => setListSearch(e.target.value)} />
              <span className="total-records">Total: <b>{displayRows.length}</b> records</span>
              <button className="btn-add" onClick={() => {
                if (activePage === 'Customer') openPartnerForm('customer', null)
                else if (activePage === 'Supplier') openPartnerForm('supplier', null)
                else if (activePage === 'Stock Master') openStockForm(null)
                else openInvoice()
              }}>＋ Add New</button>
              <button className="btn-reload" onClick={() => { const cfg = LISTINGS[activePage]; if (cfg) { setLoading(true); supabase.from(cfg.table).select('*').limit(200).then(({ data }) => { setRows(data || []); setLoading(false) }) } }}>🔄 Refresh</button>
            </div>
            <div className="grid-wrap">
              <table className="data-grid">
                <thead>
                  <tr>
                    <th className="th-actions"></th>
                    {columns.map((c) => (
                      <th key={c.key} className={sortCol === c.key ? 'sort-active' : ''} onClick={() => { if (sortCol === c.key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); else { setSortCol(c.key); setSortDir('asc') } }}>
                        {c.label}{sortCol === c.key && (sortDir === 'asc' ? ' ▲' : ' ▼')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading && <tr><td colSpan={colSpan} className="empty">Loading records...</td></tr>}
                  {!loading && displayRows.length === 0 && <tr><td colSpan={colSpan} className="empty">No records found</td></tr>}
                  {!loading && displayRows.map((r, i) => (
                    <tr key={r.id || i} className={i % 2 ? 'alt' : ''}>
                      <td className="td-actions">
                        {activePage === 'Stock Master' && (<>
                          <button className="act edit" title="Edit" onClick={() => openStockForm(r)}>✏️</button>
                          <button className="act del" title="Delete" onClick={() => deleteRow(r)}>🗑️</button>
                        </>)}
                         {(activePage === 'Customer' || activePage === 'Supplier') && (<>
                           <button className="act edit" title="Edit" onClick={() => { if (activePage === 'Customer') openPartnerForm('customer', r); else openPartnerForm('supplier', r) }}>✏️</button>
                           {r.status === 'Prospect' && <button className="act conv" title="Convert" onClick={() => convertProspect(r)}>🔄</button>}
                           <button className="act del" title="Delete" onClick={() => deleteRow(r)}>🗑️</button>
                         </>)}
                        {(activePage === 'Stock Master' || activePage === 'Customer' || activePage === 'Supplier') && (
                          <AttachmentButton entityType={activePage === 'Stock Master' ? 'product' : activePage === 'Supplier' ? 'supplier' : 'customer'} entityId={r.id} title={activePage + ' Attachments'} />
                        )}
                      </td>
                      {columns.map((c) => (
                        <td key={c.key}>
                          {c.key === 'status' ? (
                            <span className={`badge ${r.status === 'Prospect' ? 'b-amber' : r.status === 'Active' ? 'b-green' : r.status === 'Discontinued' ? 'b-red' : 'b-gray'}`}>{r.status || ''}</span>
                          ) : c.type === 'money' ? (
                            <span className="money">{fmt(r[c.key], c.type)}</span>
                          ) : (
                            fmt(r[c.key], c.type)
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid-footer">
              <div className="nav-group">
                <button onClick={goBack} disabled={!canBack}>← Back</button>
                <button onClick={goForward} disabled={!canForward}>Forward →</button>
              </div>
            </div>
          </>
        )}
      </main>
      </div>

      <footer className="erp-footer">
        <span><span className="footer-brand">Advanced ERP Pro</span> <span className="footer-sep">|</span> v1.0</span>
        <span><span className="footer-region" onClick={() => setRegion(region === 'Global' ? 'GCC — MENA' : 'Global')} title="Click to toggle region">{region}</span></span>
        <span>© 2026 <b>{region}</b> — All Rights Reserved</span>
        {authTenant && <span>Credit: <b style={{ color: Number(authTenant.credit_balance) > 20 ? '#22c55e' : '#ef4444' }}>AED {Number(authTenant.credit_balance || 0).toFixed(2)}</b></span>}
        {authTenant && <span>Plan: <b>{authTenant.plan_name}</b></span>}
        {authUser && <span style={{ cursor: 'pointer', color: '#ef4444' }} onClick={handleLogout} title="Sign out">🚪 Logout</span>}
      </footer>
      </>)}
    </div>
  )
}

export default App
