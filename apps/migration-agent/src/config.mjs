const env = process.env

const flag = (value, fallback) => {
  if (value === undefined || value === null || String(value).trim() === '') return fallback
  return /^(1|true|yes|on)$/i.test(String(value).trim())
}

export function loadConfig() {
  return {
    mssql: {
      server: String(env.MSSQL_HOST || env.MSSQL_SERVER || '').trim(),
      port: Number(env.MSSQL_PORT) || 1433,
      instanceName: String(env.MSSQL_INSTANCE || '').trim(),
      database: String(env.MSSQL_DATABASE || '').trim(),
      user: String(env.MSSQL_USER || '').trim(),
      password: String(env.MSSQL_PASSWORD || ''),
      encrypt: flag(env.MSSQL_ENCRYPT, false),
      trustServerCertificate: flag(env.MSSQL_TRUST_CERT, true),
    },
    saas: {
      url: String(env.SAAS_URL || '').trim().replace(/\/+$/, ''),
      token: String(env.MIGRATION_TOKEN || '').trim(),
      tenantId: String(env.TENANT_ID || '').trim(),
    },
  }
}

export function requireSource(config) {
  const { server, user, password, database } = config.mssql
  const missing = []
  if (!server) missing.push('MSSQL_HOST')
  if (!user) missing.push('MSSQL_USER')
  if (!password) missing.push('MSSQL_PASSWORD')
  if (!database) missing.push('MSSQL_DATABASE')
  if (missing.length) throw new Error(`Missing ${missing.join(', ')}. Set them as environment variables.`)
  return config.mssql
}
