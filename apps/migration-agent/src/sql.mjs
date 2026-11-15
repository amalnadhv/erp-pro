import mssql from 'mssql'

export const LEGACY_TABLES = ['asmast', 'asicm', 'asinv', 'aspinv', 'astran', 'asict', 'ASADR', 'ASVOUCHMAST']

export function connectionOptions(config, database) {
  return {
    server: config.server,
    ...(config.instanceName ? {} : { port: config.port }),
    database: database || config.database,
    user: config.user,
    password: config.password,
    options: {
      encrypt: config.encrypt,
      trustServerCertificate: config.trustServerCertificate,
      enableArithAbort: true,
      ...(config.instanceName ? { instanceName: config.instanceName } : {}),
    },
    connectionTimeout: 20000,
    requestTimeout: 120000,
    pool: { max: 4, min: 0, idleTimeoutMillis: 5000 },
  }
}

export async function connect(config, database) {
  const pool = new mssql.ConnectionPool(connectionOptions(config, database))
  await pool.connect()
  return pool
}

export async function close(pool) {
  try {
    await pool.close()
  } catch {
    /* already closed */
  }
}

const safeIdent = (name) => {
  if (!/^[A-Za-z_][A-Za-z0-9_$#]*$/.test(String(name || ''))) throw new Error(`Unsafe SQL identifier: ${name}`)
  return `[${name.replace(/]/g, ']]')}]`
}

export async function listDatabases(config) {
  const pool = await connect(config, 'master')
  try {
    const result = await pool.request().query('SELECT name FROM sys.databases ORDER BY name')
    return result.recordset.map((row) => row.name)
  } finally {
    await close(pool)
  }
}

export async function tableStats(pool) {
  const result = await pool.request().query(`
    SELECT t.name AS table_name, SUM(p.rows) AS row_count
    FROM sys.tables t
    LEFT JOIN sys.partitions p ON p.object_id = t.object_id AND p.index_id IN (0, 1)
    GROUP BY t.name
    ORDER BY t.name`)
  const stats = {}
  for (const row of result.recordset) stats[row.table_name] = Number(row.row_count || 0)
  return stats
}

export async function tableColumns(pool, table) {
  const result = await pool.request()
    .input('table', mssql.NVarChar(200), table)
    .query(`
      SELECT c.name AS column_name, ty.name AS data_type, c.max_length, c.is_nullable, c.is_identity
      FROM sys.columns c
      JOIN sys.types ty ON ty.user_type_id = c.user_type_id
      JOIN sys.tables t ON t.object_id = c.object_id
      WHERE t.name = @table
      ORDER BY c.column_id`)
  return result.recordset.map((row) => ({
    name: row.column_name,
    type: row.data_type,
    nullable: Boolean(row.is_nullable),
    identity: Boolean(row.is_identity),
  }))
}

export async function primaryKey(pool, table) {
  const result = await pool.request()
    .input('table', mssql.NVarChar(200), table)
    .query(`
      SELECT c.name AS column_name
      FROM sys.indexes i
      JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
      JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
      JOIN sys.tables t ON t.object_id = i.object_id
      WHERE t.name = @table AND i.is_primary_key = 1
      ORDER BY ic.key_ordinal`)
  return result.recordset.map((row) => row.column_name)
}

export async function discover(config) {
  const pool = await connect(config)
  try {
    const current = await pool.request().query('SELECT DB_NAME() AS database_name')
    const stats = await tableStats(pool)
    const legacy = Object.keys(stats).filter((name) =>
      LEGACY_TABLES.some((known) => known.toLowerCase() === name.toLowerCase())
    )
    const tables = []
    for (const name of legacy) {
      const rows = stats[name]
      const columns = rows >= 0 ? await tableColumns(pool, name) : []
      const key = await primaryKey(pool, name)
      tables.push({ name, rows, key, columns })
    }
    return {
      database: current.recordset[0]?.database_name || config.database,
      server: config.server,
      tableCount: Object.keys(stats).length,
      legacyTables: tables,
    }
  } finally {
    await close(pool)
  }
}

/**
 * Reads a source table in keyset pages and hands each page to `onBatch`.
 * No OFFSET/FETCH, so it also works on older SQL Server versions.
 */
export async function dumpTable(pool, table, { key, pageSize = 5000, limit = 0, onBatch }) {
  const keyName = key || (await primaryKey(pool, table))[0]
  if (!keyName) throw new Error(`No primary key on ${table}; pass --key <unique column>`)

  let after = null
  let total = 0
  for (;;) {
    const take = limit > 0 ? Math.min(pageSize, limit - total) : pageSize
    if (take <= 0) break

    const request = pool.request()
    let where = ''
    if (after !== null && after !== undefined) {
      request.input('after', after)
      where = `WHERE ${safeIdent(keyName)} > @after`
    }
    const result = await request.query(
      `SELECT TOP (${take}) * FROM [dbo].${safeIdent(table)} ${where} ORDER BY ${safeIdent(keyName)}`
    )
    const rows = result.recordset
    if (!rows.length) break

    await onBatch(rows)
    total += rows.length

    const last = rows[rows.length - 1]
    const actualKey = Object.keys(last).find((name) => name.toLowerCase() === keyName.toLowerCase())
    after = actualKey ? last[actualKey] : null
    if (after === null || after === undefined) throw new Error(`Cannot page ${table}: key ${keyName} is null on the last row`)
    if (rows.length < take) break
  }
  return { table, key: keyName, rows: total }
}

export function toNdjson(rows) {
  const replacer = (key, value) => {
    if (typeof value === 'bigint') return value.toString()
    if (value && typeof value === 'object' && value.type === 'Buffer' && Array.isArray(value.data)) return undefined
    return value
  }
  return rows.map((row) => JSON.stringify(row, replacer)).join('\n') + '\n'
}
