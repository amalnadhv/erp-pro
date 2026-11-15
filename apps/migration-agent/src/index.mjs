#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { loadConfig, requireSource } from './config.mjs'
import { connect, close, discover, dumpTable, listDatabases, primaryKey, toNdjson } from './sql.mjs'

const USAGE = `Usage: erp-migrate <command> [options]

Commands:
  databases              List databases on the server
  discover               Show the legacy tables, row counts, columns and keys
  dump                   Export one table to NDJSON, keyset-paged

Options:
  --database <name>      Override MSSQL_DATABASE
  --table <name>         Table to dump (required for dump)
  --key <column>         Unique column to page by (default: primary key)
  --limit <n>            Stop after n rows (0 = all)
  --page-size <n>        Rows per round trip (default 5000)
  --out <file>           Output file (default: stdout)

Environment:
  MSSQL_HOST, MSSQL_PORT, MSSQL_DATABASE, MSSQL_USER, MSSQL_PASSWORD,
  MSSQL_INSTANCE, MSSQL_ENCRYPT, MSSQL_TRUST_CERT
`

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    database: { type: 'string' },
    table: { type: 'string' },
    key: { type: 'string' },
    limit: { type: 'string', default: '0' },
    'page-size': { type: 'string', default: '5000' },
    out: { type: 'string' },
    help: { type: 'boolean', short: 'h' },
  },
})

const command = positionals[0]

async function main() {
  if (!command || values.help) {
    process.stdout.write(USAGE)
    return
  }

  const config = loadConfig()
  if (values.database) config.mssql.database = values.database
  const source = requireSource(config)

  if (command === 'databases') {
    const names = await listDatabases(source)
    process.stdout.write(names.join('\n') + '\n')
    return
  }

  if (command === 'discover') {
    const result = await discover(source)
    process.stdout.write(JSON.stringify(result, null, 2) + '\n')
    return
  }

  if (command === 'dump') {
    if (!values.table) throw new Error('dump requires --table <name>')
    const limit = Math.max(0, Number(values.limit) || 0)
    const pageSize = Math.max(1, Number(values['page-size']) || 5000)
    const pool = await connect(source)
    try {
      let key = values.key
      if (!key) {
        const pk = await primaryKey(pool, values.table)
        key = pk[0]
      }
      if (!key) throw new Error(`No primary key on ${values.table}; pass --key <unique column>`)

      let stream = null
      if (values.out) {
        fs.mkdirSync(path.dirname(path.resolve(values.out)), { recursive: true })
        stream = fs.createWriteStream(values.out, { flags: 'w' })
      }
      let written = 0
      try {
        const result = await dumpTable(pool, values.table, {
          key,
          pageSize,
          limit,
          onBatch: async (rows) => {
            const text = toNdjson(rows)
            if (stream) {
              if (!stream.write(text)) await new Promise((resolve) => stream.once('drain', resolve))
            } else {
              process.stdout.write(text)
            }
            written += rows.length
            process.stderr.write(`\r${values.table}: ${written.toLocaleString()} rows`)
          },
        })
        process.stderr.write(`\n${values.out ? values.out : 'stdout'}: ${result.rows.toLocaleString()} rows (key=${result.key})\n`)
      } finally {
        if (stream) await new Promise((resolve) => stream.end(resolve))
      }
      return
    } finally {
      await close(pool)
    }
  }

  throw new Error(`Unknown command: ${command}`)
}

main().catch((error) => {
  process.stderr.write(`error: ${error?.message || error}\n`)
  process.exit(1)
})
