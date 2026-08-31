const CACHE_PREFIX = 'erp-cache-'
const QUEUE_KEY = 'erp-offline-queue'

export const cacheData = (key: string, data: any) => {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, ts: Date.now() }))
  } catch { /* quota exceeded */ }
}

export const getCachedData = (key: string, maxAgeMs = 3600000) => {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > maxAgeMs) return null
    return data
  } catch { return null }
}

export const clearCache = (key?: string) => {
  if (key) {
    localStorage.removeItem(CACHE_PREFIX + key)
  } else {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(CACHE_PREFIX))
    keys.forEach((k) => localStorage.removeItem(k))
  }
}

export const queueOfflineAction = (action: { table: string; operation: string; data: any; id?: string }) => {
  try {
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
    queue.push({ ...action, queued_at: Date.now() })
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  } catch { /* quota exceeded */ }
}

export const getOfflineQueue = () => {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
  } catch { return [] }
}

export const clearOfflineQueue = () => {
  localStorage.removeItem(QUEUE_KEY)
}

export const removeOfflineQueueItem = (index: number) => {
  try {
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
    queue.splice(index, 1)
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  } catch { /* ignore */ }
}

export const getCacheStats = () => {
  const keys = Object.keys(localStorage).filter((k) => k.startsWith(CACHE_PREFIX))
  let totalSize = 0
  const entries = keys.map((k) => {
    const raw = localStorage.getItem(k) || ''
    totalSize += raw.length
    const shortKey = k.replace(CACHE_PREFIX, '')
    try {
      const { ts } = JSON.parse(raw)
      return { key: shortKey, size: raw.length, age: Date.now() - ts }
    } catch { return { key: shortKey, size: raw.length, age: 0 } }
  })
  return { entries, totalSize, queueLength: getOfflineQueue().length }
}
