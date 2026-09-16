import { supabase } from '../supabaseClient.js'

const TRACKED_DISTANCES = [60, 150]

function unwrap(rel) {
  return Array.isArray(rel) ? rel[0] : rel
}

export async function getSprintRecords() {
  const results = {}
  for (const distance of TRACKED_DISTANCES) {
    results[distance] = await getRecordForDistance(distance)
  }
  return results
}

async function getRecordForDistance(distanceM) {
  const { data, error } = await supabase
    .from('run_entries')
    .select(
      `
      distance_m,
      run_times ( seconds ),
      session_exercise:session_exercises!inner (
        session:sessions!inner ( date )
      )
    `
    )
    .eq('distance_m', distanceM)

  if (error) throw error

  const entries = []
  for (const row of data) {
    const se = unwrap(row.session_exercise)
    const session = unwrap(se.session)
    const date = session.date
    for (const t of row.run_times || []) {
      entries.push({ seconds: Number(t.seconds), date })
    }
  }

  if (!entries.length) return null

  entries.sort((a, b) => a.seconds - b.seconds)
  const best = entries[0]
  const earlier = entries.filter((e) => e.date < best.date)
  const previousBest = earlier.length
    ? earlier.reduce((min, e) => (e.seconds < min.seconds ? e : min))
    : null

  return {
    seconds: best.seconds,
    date: best.date,
    previousSeconds: previousBest ? previousBest.seconds : null,
  }
}

export async function getStrengthProgression(exerciseId) {
  const { data, error } = await supabase
    .from('session_exercises')
    .select(
      `
      exercise_id,
      session:sessions!inner ( date ),
      strength_entries ( strength_sets ( weight_kg ) )
    `
    )
    .eq('exercise_id', exerciseId)

  if (error) throw error

  const byDate = new Map()
  for (const row of data) {
    const strengthEntry = unwrap(row.strength_entries)
    if (!strengthEntry) continue
    const sets = strengthEntry.strength_sets || []
    if (!sets.length) continue
    const session = unwrap(row.session)
    const date = session.date
    const heaviest = Math.max(...sets.map((s) => Number(s.weight_kg)))
    const current = byDate.get(date) || 0
    byDate.set(date, Math.max(current, heaviest))
  }

  return Array.from(byDate.entries())
    .map(([date, weightKg]) => ({ date, weightKg }))
    .sort((a, b) => (a.date < b.date ? -1 : 1))
}

export async function getDistanceHistory(distanceM) {
  const { data, error } = await supabase
    .from('run_entries')
    .select(
      `
      distance_m,
      run_times ( seconds ),
      session_exercise:session_exercises!inner (
        session:sessions!inner ( id, date )
      )
    `
    )
    .eq('distance_m', distanceM)

  if (error) throw error

  const bySession = new Map()
  for (const row of data) {
    const se = unwrap(row.session_exercise)
    const session = unwrap(se.session)
    const times = (row.run_times || []).map((t) => Number(t.seconds))
    if (!times.length) continue
    const existing = bySession.get(session.id) || {
      sessionId: session.id,
      date: session.date,
      times: [],
    }
    existing.times.push(...times)
    bySession.set(session.id, existing)
  }

  const rows = Array.from(bySession.values())
    .map((s) => ({
      sessionId: s.sessionId,
      date: s.date,
      fastest: Math.min(...s.times),
      average: s.times.reduce((a, b) => a + b, 0) / s.times.length,
    }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

  let bestIndex = -1
  let bestValue = Infinity
  rows.forEach((r, i) => {
    if (r.fastest < bestValue) {
      bestValue = r.fastest
      bestIndex = i
    }
  })

  return { rows, bestIndex }
}
