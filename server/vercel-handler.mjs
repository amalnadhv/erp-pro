import { createApiHandler } from './api.mjs'

const handler = createApiHandler()

// Vercel routes all /api/* requests to api/index.mjs through a rewrite.
// The rewrite passes the original sub-path as ?__path=..., because a plain
// serverless function only receives the rewritten URL.
export default function vercelHandler(req, res) {
  let path = req.url || '/'

  if (path === '/api' || path.startsWith('/api/')) {
    const url = new URL(path, 'http://local')
    const captured = url.searchParams.get('__path')

    if (captured !== null) {
      url.searchParams.delete('__path')
      const query = url.searchParams.toString()
      path = '/' + captured.replace(/^\/+/, '')
      if (query) path += '?' + query
    } else {
      path = path.slice(4) || '/'
    }
  }

  req.url = path
  return handler(req, res)
}
