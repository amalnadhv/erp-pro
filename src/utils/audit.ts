import { supabase } from './supabaseClient'

export const logActivity = async (action: string, entity: string, detail: string, entityId = '') => {
  try { await supabase.from('activity_log').insert({ action, entity, entity_id: entityId, detail: detail || '', user_email: '' }) } catch { /* best-effort */ }
}
