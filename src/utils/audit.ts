import { supabase } from './supabaseClient'

export const logActivity = async (action: string, entity: string, detail: string, entityId = '') => {
  try {
    let email = ''
    try { const { data: { session } } = await supabase.auth.getSession(); email = session?.user?.email || '' } catch {}
    await supabase.from('activity_log').insert({ action, entity, entity_id: entityId, detail: detail || '', user_email: email })
  } catch { /* best-effort */ }
}
