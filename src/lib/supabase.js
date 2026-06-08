import { createClient } from '@supabase/supabase-js'

function cleanEnvValue(value) {
  return String(value || '').trim().replace(/^['"]|['"]$/g, '')
}

const supabaseUrl = cleanEnvValue(import.meta.env.VITE_SUPABASE_URL)
const supabaseAnonKey = cleanEnvValue(import.meta.env.VITE_SUPABASE_ANON_KEY)

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = supabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null
