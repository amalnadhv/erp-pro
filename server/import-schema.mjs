// Converts the Postgres schema files into one SQLite schema.
// Best-effort structural conversion: functions, triggers, RLS policies,
// storage and other Postgres-only objects are intentionally dropped.
//
// Usage: node server/import-schema.mjs

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')

const FILES = [
  'supabase/schema.sql',
  'supabase/tenants.sql',
  'supabase/roles_permissions.sql',
  'supabase/features.sql',
  'supabase/tax_config.sql',
  'supabase/attachments.sql',
  'supabase/modules.sql',
  'supabase/stock_transfer.sql',
  'supabase/stock_transfer_items.sql',
  'supabase/production.sql',
  'supabase/production_bom.sql',
  'supabase/pdc.sql',
  'supabase/fixed_assets.sql',
  'supabase/payment_schedules.sql',
  'supabase/recurring_invoices.sql',
  'supabase/cheque_templates.sql',
  'supabase/document_templates.sql',
  'supabase/bank_deposits.sql',
  'supabase/batch_serial_approval_custom.sql',
  'supabase/stock_movements.sql',
  'supabase/stock_alerts.sql',
  'supabase/doc_numbering_unified.sql',
  'supabase/company_profile_auditor.sql',
  'supabase/ap_invoice_other_costs.sql',
  'supabase/cutover_enhancements.sql',
  'supabase/statements.sql',
]

const source = FILES
  .map((file) => {
    const full = path.join(root, file)
    if (!fs.existsSync(full)) return ''
    return fs
      .readFileSync(full, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/--[^\n]*/g, '')
  })
  .join('\n\n')

/** Split a SQL body on top-level commas. */
function splitTopLevel(body) {
  const parts = []
  let depth = 0
  let quote = null
  let current = ''
  for (let i = 0; i < body.length; i++) {
    const ch = body[i]
    if (quote) {
      current += ch
      if (ch === quote && body[i - 1] !== '\\') quote = null
      continue
    }
    if (ch === "'" || ch === '"') { quote = ch; current += ch; continue }
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ',' && depth === 0) { parts.push(current.trim()); current = ''; continue }
    current += ch
  }
  if (current.trim()) parts.push(current.trim())
  return parts
}

function translateType(type) {
  const t = type.trim().toUpperCase()
  if (/^UUID\b/.test(t)) return 'TEXT'
  if (/^(TIMESTAMP|TIMESTAMPTZ|DATE|TIME)\b/.test(t)) return 'TEXT'
  if (/^(DECIMAL|NUMERIC|REAL|DOUBLE PRECISION|FLOAT)\b/.test(t)) return 'REAL'
  if (/^(VARCHAR|CHARACTER VARYING|CHAR|TEXT|CITEXT)\b/.test(t)) return 'TEXT'
  if (/^(INTEGER|INT|BIGINT|SMALLINT|SERIAL|BIGSERIAL)\b/.test(t)) return 'INTEGER'
  if (/^BOOLEAN\b/.test(t)) return 'INTEGER'
  if (/^(JSONB|JSON)\b/.test(t)) return 'TEXT'
  return 'TEXT'
}

function cleanTail(tail) {
  let s = tail
    .replace(/DEFAULT\s+gen_random_uuid\(\)/gi, '')
    .replace(/DEFAULT\s+now\(\)/gi, 'DEFAULT CURRENT_TIMESTAMP')
    .replace(/DEFAULT\s+EXTRACT\s*\(\s*YEAR\s+FROM\s+NOW\(\)\s*\)/gi, "DEFAULT (CAST(strftime('%Y','now') AS INTEGER))")
    .replace(/DEFAULT\s+\(\s*CURRENT_DATE\s*\+\s*INTERVAL\s+'(\d+)\s+days?'\s*\)/gi, "DEFAULT (date('now','+$1 days'))")
    .replace(/DEFAULT\s+true/gi, 'DEFAULT 1')
    .replace(/DEFAULT\s+false/gi, 'DEFAULT 0')
    .replace(/'(\[[^\]]*\]|\{[^}]*\})'::jsonb/gi, "'$1'")
    .replace(/::[A-Za-z_][A-Za-z0-9_ ]*/g, '')
    .replace(/REFERENCES\s+auth\.[A-Za-z_][A-Za-z0-9_]*\s*\([^)]*\)(\s+ON DELETE\s+(CASCADE|SET NULL|RESTRICT|NO ACTION))?/gi, '')
    .replace(/GENERATED\s+ALWAYS\s+AS\s+IDENTITY/gi, '')
    .replace(/\bDEFERRABLE\b/gi, '')
    .replace(/\bINITIALLY\s+DEFERRED\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
  // A dangling REFERENCES to a schema-local table is fine; keep it.
  return s
}

function translateColumn(line) {
  let s = line.trim()
  if (!s) return null
  if (/^(CONSTRAINT|PRIMARY KEY\s*\(|UNIQUE\s*\(|FOREIGN KEY\s*\(|CHECK\s*\()/i.test(s)) {
    return null
  }

  const nameMatch = s.match(/^("?)([A-Za-z_][A-Za-z0-9_]*)\1\s+/)
  if (!nameMatch) return null
  const name = nameMatch[2]
  const rest = s.slice(nameMatch[0].length)

  const typeMatch = rest.match(/^([A-Za-z]+(?:\s+(?:WITH|WITHOUT)\s+TIME\s+ZONE)?(?:\s+VARYING)?(?:\s+PRECISION)?(?:\s*\([^)]*\))?)/i)
  if (!typeMatch) return null
  const type = translateType(typeMatch[1])
  const tail = cleanTail(rest.slice(typeMatch[1].length))

  return { name, sql: `${name} ${type}${tail ? ' ' + tail : ''}` }
}

const tables = new Map() // name -> Map(column -> sql)

function addColumn(table, col) {
  if (!col || !col.name || !col.sql) return
  if (!tables.has(table)) tables.set(table, new Map())
  const cols = tables.get(table)
  if (!cols.has(col.name)) cols.set(col.name, col.sql)
}

const createRe = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*\(([\s\S]*?)\n\s*\);/gi
let m
while ((m = createRe.exec(source))) {
  const [, table, body] = m
  for (const part of splitTopLevel(body)) {
    const col = translateColumn(part)
    if (col) addColumn(table, col)
  }
}

const alterRe = /ALTER\s+TABLE\s+([A-Za-z_][A-Za-z0-9_]*)\s+ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?([A-Za-z_][A-Za-z0-9_]*)\s+([^;]+);/gi
while ((m = alterRe.exec(source))) {
  const [, table, column, rest] = m
  const col = translateColumn(`${column} ${rest}`)
  if (col) addColumn(table, col)
}

const out = []
out.push('-- Generated from the supabase/*.sql files by server/import-schema.mjs.')
out.push('-- Do not hand-edit: rerun the converter instead.')
out.push('PRAGMA foreign_keys = OFF;')
out.push('')
for (const [table, columns] of tables) {
  out.push(`CREATE TABLE IF NOT EXISTS ${table} (`)
  out.push([...columns.values()].map((c) => '  ' + c).join(',\n'))
  out.push(');')
  out.push('')
}

const result = out.join('\n')
const outPath = path.join(here, 'schema.sqlite.sql')
fs.writeFileSync(outPath, result)
console.log(`Wrote ${outPath} (${result.split('\n').length} lines, ${tables.size} tables)`)
