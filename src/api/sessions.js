import { supabase } from '../supabaseClient.js'

const SESSION_SELECT = `
  id, date, title, rpe, note, injury_note, created_by, created_at, updated_at,
  session_exercises (
    id, position, note,
    exercise:exercises ( id, name, type ),
    strength_entries ( reps_scheme, strength_sets ( id, weight_kg, position ) ),
    run_entries ( distance_m, run_times ( id, seconds, position ) )
  )
`

function one(rel) {
  if (!rel) return null
  return Array.isArray(rel) ? rel[0] || null : rel
}

function normalizeSession(row) {
  const exercises = (row.session_exercises || [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((se) => {
      const strengthEntry = one(se.strength_entries)
      const run = one(se.run_entries)
      const times = run
        ? (Array.isArray(run.run_times) ? run.run_times : [])
            .slice()
            .sort((a, b) => a.position - b.position)
        : []
      const sets = strengthEntry
        ? (Array.isArray(strengthEntry.strength_sets) ? strengthEntry.strength_sets : [])
            .slice()
            .sort((a, b) => a.position - b.position)
        : []
      return {
        id: se.id,
        note: se.note,
        exercise: se.exercise,
        strength: strengthEntry ? { repsScheme: strengthEntry.reps_scheme, sets } : null,
        run: run ? { distanceM: run.distance_m, times } : null,
      }
    })
  return { ...row, exercises }
}

export async function listSessions() {
  const { data, error } = await supabase
    .from('sessions')
    .select(SESSION_SELECT)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(normalizeSession)
}

export async function getSession(id) {
  const { data, error } = await supabase
    .from('sessions')
    .select(SESSION_SELECT)
    .eq('id', id)
    .single()
  if (error) throw error
  return normalizeSession(data)
}

export async function getLatestSession() {
  const { data, error } = await supabase
    .from('sessions')
    .select(SESSION_SELECT)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
  if (error) throw error
  return data.length ? normalizeSession(data[0]) : null
}

async function saveSessionExercises(sessionId, exercises) {
  if (!exercises.length) return

  const seRows = exercises.map((ex, index) => ({
    session_id: sessionId,
    exercise_id: ex.exerciseId,
    position: index,
    note: ex.note || null,
  }))

  const { data: insertedSe, error: seError } = await supabase
    .from('session_exercises')
    .insert(seRows)
    .select()
  if (seError) throw seError

  const strengthRows = []
  const strengthWeightsBySeId = {}
  const runEntryRows = []
  const runTimesBySeId = {}

  insertedSe.forEach((se, index) => {
    const ex = exercises[index]
    if (ex.type === 'styrke' && ex.strength) {
      strengthRows.push({
        session_exercise_id: se.id,
        reps_scheme: ex.strength.repsScheme,
      })
      strengthWeightsBySeId[se.id] = ex.strength.weights
    }
    if (ex.type === 'løp' && ex.run) {
      runEntryRows.push({
        session_exercise_id: se.id,
        distance_m: ex.run.distanceM,
      })
      runTimesBySeId[se.id] = ex.run.times
    }
  })

  if (strengthRows.length) {
    const { error } = await supabase.from('strength_entries').insert(strengthRows)
    if (error) throw error

    const setRows = []
    Object.entries(strengthWeightsBySeId).forEach(([seId, weights]) => {
      weights.forEach((weightKg, i) => {
        setRows.push({ strength_entry_id: seId, weight_kg: weightKg, position: i })
      })
    })
    if (setRows.length) {
      const { error: setsError } = await supabase.from('strength_sets').insert(setRows)
      if (setsError) throw setsError
    }
  }

  if (runEntryRows.length) {
    const { error } = await supabase.from('run_entries').insert(runEntryRows)
    if (error) throw error

    const timeRows = []
    Object.entries(runTimesBySeId).forEach(([seId, times]) => {
      times.forEach((seconds, i) => {
        timeRows.push({ run_entry_id: seId, seconds, position: i })
      })
    })
    if (timeRows.length) {
      const { error: timesError } = await supabase.from('run_times').insert(timeRows)
      if (timesError) throw timesError
    }
  }
}

export async function createSession(payload, userId) {
  const { data: session, error } = await supabase
    .from('sessions')
    .insert({
      date: payload.date,
      title: payload.title,
      rpe: payload.rpe,
      note: payload.note || null,
      injury_note: payload.injuryNote || null,
      created_by: userId,
    })
    .select()
    .single()
  if (error) throw error

  await saveSessionExercises(session.id, payload.exercises)
  return session.id
}

export async function updateSession(id, payload) {
  const { error } = await supabase
    .from('sessions')
    .update({
      date: payload.date,
      title: payload.title,
      rpe: payload.rpe,
      note: payload.note || null,
      injury_note: payload.injuryNote || null,
    })
    .eq('id', id)
  if (error) throw error

  const { error: delError } = await supabase
    .from('session_exercises')
    .delete()
    .eq('session_id', id)
  if (delError) throw delError

  await saveSessionExercises(id, payload.exercises)
}

export async function deleteSession(id) {
  const { error } = await supabase.from('sessions').delete().eq('id', id)
  if (error) throw error
}

export async function listInjuries() {
  const { data, error } = await supabase
    .from('sessions')
    .select('id, date, title, injury_note, created_by')
    .not('injury_note', 'is', null)
    .order('date', { ascending: false })
  if (error) throw error
  return data
}
