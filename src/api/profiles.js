import { supabase } from '../supabaseClient.js'

let cache = null

export async function listProfiles() {
  if (cache) return cache
  const { data, error } = await supabase.from('profiles').select('*')
  if (error) throw error
  cache = data
  return data
}

export async function getProfileMap() {
  const profiles = await listProfiles()
  return Object.fromEntries(profiles.map((p) => [p.id, p]))
}
