// Local SQLite mode.
//
// The app used to talk to Supabase. It now talks to the built-in Node API
// (server/api.mjs) which stores everything in data/erp.db.
//
// This module is the single seam: every component imports `supabase` from here,
// and `localClient` implements the subset of the Supabase API the app uses.
export { supabase, isSupabaseConfigured, default } from './localClient'
