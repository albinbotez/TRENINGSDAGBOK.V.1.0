import { supabase } from '../supabaseClient.js'

export async function listExercises() {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .order('name', { ascending: true })
  if (error) throw error
  return data
}

export async function createExercise({ name, type }) {
  const { data, error } = await supabase
    .from('exercises')
    .insert({ name, type })
    .select()
    .single()
  if (error) throw error
  return data
}

// Gjenbruker en eksisterende øvelse med samme navn (uavhengig av store/små
// bokstaver) i stedet for å opprette en duplikat i biblioteket.
export async function findOrCreateExercise({ name, type }) {
  const trimmed = name.trim()
  const { data: existing, error: findError } = await supabase
    .from('exercises')
    .select('*')
    .ilike('name', trimmed)
    .limit(1)
  if (findError) throw findError
  if (existing.length) return existing[0]

  return createExercise({ name: trimmed, type })
}
