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
