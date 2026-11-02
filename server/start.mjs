// Production server: serves the built UI from dist/ and the local API at /api.
// Used by `npm start` and by hosts such as Render, Railway, Fly.io, Docker or a VPS.
//
// Dev still uses Vite (`npm run dev`), which mounts the same API via
// server/vite-plugin.mjs.

import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createApiHandler } from './api.mjs'
import { root } from './db.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.join(root, 'dist')
const apiHandler = createApiHandler()

const PORT = Number(process.env.PORT || 4173)
const HOST = process.env.HOST || '0.0.0.0'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf',
}

function send(res, status, body, headers = {}) {
  res.statusCode = status
  res.setHeader('X-Content-Type-Options', 'nosniff')
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v)
  res.end(body)
}

function serveStatic(req, res, pathname) {
  let decoded
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    return send(res, 400, 'Bad request')
  }

  const relative = decoded.replace(/^\/+/, '')
  const full = path.resolve(distDir, relative)
  if (full !== distDir && !full.startsWith(distDir + path.sep)) {
    return send(res, 403, 'Forbidden')
  }

  let file = full
  let stat = null
  try {
    stat = fs.statSync(file)
    if (stat.isDirectory()) {
      file = path.join(file, 'index.html')
      stat = fs.statSync(file)
    }
  } catch {
    stat = null
  }

  // SPA fallback: unknown non-asset paths render the app shell.
  if (!stat) {
    if (path.extname(decoded)) return send(res, 404, 'Not found')
    file = path.join(distDir, 'index.html')
    try {
      stat = fs.statSync(file)
    } catch {
      return send(res, 500, 'UI not built. Run `npm run build` first.')
    }
  }

  const ext = path.extname(file).toLowerCase()
  const immutable = decoded.startsWith('/assets/')
  const etag = `W/"${stat.size}-${Math.floor(stat.mtimeMs)}"`
  if (req.headers['if-none-match'] === etag) {
    return send(res, 304, '')
  }

  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Content-Length': stat.size,
    'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    ETag: etag,
    'X-Content-Type-Options': 'nosniff',
  })
  fs.createReadStream(file).pipe(res)
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://localhost')

  if (url.pathname === '/health') {
    return send(res, 200, JSON.stringify({ ok: true, mode: 'sqlite' }), {
      'Content-Type': 'application/json; charset=utf-8',
    })
  }

  if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
    const original = req.url
    req.url = original.replace(/^\/api/, '') || '/'
    return apiHandler(req, res, () => {
      req.url = original
      if (req.method === 'GET' || req.method === 'HEAD') {
        return serveStatic(req, res, url.pathname)
      }
      return send(res, 404, 'Not found')
    })
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return send(res, 405, 'Method not allowed')
  }
  return serveStatic(req, res, url.pathname)
})

server.listen(PORT, HOST, () => {
  console.log(`[erp] serving ${distDir}`)
  console.log(`[erp] listening on http://${HOST}:${PORT} (API at /api)`)
})

function shutdown() {
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(0), 5000).unref()
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
