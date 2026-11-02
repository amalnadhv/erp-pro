import { createApiHandler } from './api.mjs'

const handler = createApiHandler()

// Vercel routes /api/* here. The local router expects paths without /api.
export default function vercelHandler(req, res) {
  let path = req.url || '/'
  if (path === '/api' || path.startsWith('/api/')) path = path.slice(4) || '/'
  req.url = path
  return handler(req, res)
}
