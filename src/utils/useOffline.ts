import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabaseClient'
import { cacheData, getCachedData, queueOfflineAction, getOfflineQueue, clearOfflineQueue, removeOfflineQueueItem } from './offlineCache'

const CRITICAL_TABLES = ['products', 'customers', 'suppliers', 'accounts', 'company_profile', 'invoices', 'journal_entries']

export function useOffline() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [queueCount, setQueueCount] = useState(0)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    setQueueCount(getOfflineQueue().length)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Sync queue when coming online
  useEffect(() => {
    if (!isOnline || syncing) return
    const queue = getOfflineQueue()
    if (!queue.length) return
    setSyncing(true)
    ;(async () => {
      for (let i = 0; i < queue.length; i++) {
        const item = queue[i]
        try {
          if (item.operation === 'insert') {
            await supabase.from(item.table).insert(item.data)
          } else if (item.operation === 'update' && item.id) {
            await supabase.from(item.table).update(item.data).eq('id', item.id)
          } else if (item.operation === 'delete' && item.id) {
            await supabase.from(item.table).delete().eq('id', item.id)
          }
          removeOfflineQueueItem(i)
          i--
        } catch { /* will retry next time */ }
      }
      setQueueCount(getOfflineQueue().length)
      setSyncing(false)
    })()
  }, [isOnline, syncing])

  const cacheTable = useCallback(async (table: string) => {
    try {
      const { data } = await supabase.from(table).select('*').limit(500)
      if (data) cacheData(table, data)
    } catch { /* use cache if available */ }
  }, [])

  const cacheAllCritical = useCallback(async () => {
    if (!isOnline) return
    for (const table of CRITICAL_TABLES) {
      await cacheTable(table)
    }
  }, [isOnline, cacheTable])

  const getCached = useCallback((table: string) => {
    return getCachedData(table) || []
  }, [])

  const queueAction = useCallback((table: string, operation: string, data: any, id?: string) => {
    if (isOnline) return false // not queued, will execute directly
    queueOfflineAction({ table, operation, data, id })
    setQueueCount(getOfflineQueue().length)
    return true // was queued
  }, [isOnline])

  return { isOnline, queueCount, syncing, cacheAllCritical, cacheTable, getCached, queueAction }
}
