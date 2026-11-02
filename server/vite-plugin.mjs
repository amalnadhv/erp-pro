// Mounts the local SQLite API at /api inside the Vite dev and preview servers.
// That keeps `npm run dev` as the only command needed.

import { createApiHandler } from './api.mjs'

export function localApiPlugin() {
  const install = (server) => {
    const handler = createApiHandler()
    server.middlewares.use('/api', (req, res, next) => handler(req, res, next))
  }
  return {
    name: 'local-sqlite-api',
    configureServer(server) { install(server) },
    configurePreviewServer(server) { install(server) },
  }
}
