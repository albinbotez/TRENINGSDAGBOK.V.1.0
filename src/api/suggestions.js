import { supabase } from '../supabaseClient.js'

export async function listSuggestions() {
  const { data, error } = await supabase
    .from('suggestions')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createSuggestion(text, userId) {
  const { error } = await supabase.from('suggestions').insert({ text, created_by: userId })
  if (error) throw error
}

export async function deleteSuggestion(id) {
  const { error } = await supabase.from('suggestions').delete().eq('id', id)
  if (error) throw error
}
