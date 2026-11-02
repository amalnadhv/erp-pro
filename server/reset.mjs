// Deletes the local database and storage so the next start re-seeds demo data.
// Usage: npm run db:reset

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.resolve(here, '..', 'data')

for (const file of ['erp.db', 'erp.db-wal', 'erp.db-shm']) {
  const full = path.join(dataDir, file)
  if (fs.existsSync(full)) { fs.unlinkSync(full); console.log(`removed ${file}`) }
}
const storage = path.join(dataDir, 'storage')
if (fs.existsSync(storage)) { fs.rmSync(storage, { recursive: true, force: true }); console.log('removed storage/') }
console.log('Local database reset. Restart the dev server to re-seed.')
