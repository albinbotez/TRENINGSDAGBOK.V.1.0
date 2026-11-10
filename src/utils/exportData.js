import { todayIso } from './format.js'

const round2 = (n) => Math.round(n * 100) / 100

function describeExercise(ex) {
  const base = { navn: ex.exercise.name, type: ex.exercise.type }

  if (ex.run) {
    const times = ex.run.times.map((t) => Number(t.seconds))
    return {
      ...base,
      distanse_m: Number(ex.run.distanceM),
      tider_s: times,
      raskeste_s: times.length ? Math.min(...times) : null,
      snitt_s: times.length ? round2(times.reduce((a, b) => a + b, 0) / times.length) : null,
    }
  }

  if (ex.strength) {
    const weights = ex.strength.sets.map((s) => Number(s.weight_kg))
    return {
      ...base,
      vekt_per_sett_kg: weights,
      tyngste_sett_kg: weights.length ? Math.max(...weights) : null,
      sett_reps: ex.strength.repsScheme || null,
      notat: ex.note || null,
    }
  }

  return { ...base, notat: ex.note || null }
}

function describeSession(session, profileMap) {
  const author = profileMap[session.created_by]
  return {
    dato: session.date,
    tittel: session.title,
    rpe: session.rpe,
    notat: session.note || null,
    skade_vondt: session.injury_note || null,
    logget_av: author ? author.display_name : null,
    ovelser: session.exercises.map(describeExercise),
  }
}

function buildSummary(logged) {
  const rpes = logged.map((s) => s.rpe).filter((r) => r != null)
  const bestRuns = new Map()
  const bestLifts = new Map()

  for (const session of logged) {
    for (const ex of session.ovelser) {
      if (ex.distanse_m != null && ex.raskeste_s != null) {
        const current = bestRuns.get(ex.distanse_m)
        if (!current || ex.raskeste_s < current.tid_s) {
          bestRuns.set(ex.distanse_m, { distanse_m: ex.distanse_m, tid_s: ex.raskeste_s, dato: session.dato })
        }
      }
      if (ex.tyngste_sett_kg != null) {
        const current = bestLifts.get(ex.navn)
        if (!current || ex.tyngste_sett_kg > current.vekt_kg) {
          bestLifts.set(ex.navn, { ovelse: ex.navn, vekt_kg: ex.tyngste_sett_kg, dato: session.dato })
        }
      }
    }
  }

  return {
    antall_gjennomforte_okter: logged.length,
    forste_okt: logged.length ? logged[0].dato : null,
    siste_okt: logged.length ? logged[logged.length - 1].dato : null,
    snitt_rpe: rpes.length ? round2(rpes.reduce((a, b) => a + b, 0) / rpes.length) : null,
    okter_med_skade_vondt: logged.filter((s) => s.skade_vondt).length,
    raskeste_tid_per_distanse: [...bestRuns.values()].sort((a, b) => a.distanse_m - b.distanse_m),
    tyngste_sett_per_ovelse: [...bestLifts.values()].sort((a, b) => a.ovelse.localeCompare(b.ovelse, 'nb')),
  }
}

function exerciseToMarkdown(ex, index) {
  const head = `${index + 1}. **${ex.navn}** (${ex.type})`

  if (ex.distanse_m != null) {
    if (!ex.tider_s.length) return `${head}: ${ex.distanse_m} m – ingen tider registrert`
    const times = ex.tider_s.map((t) => t.toFixed(2)).join(', ')
    return `${head}: ${ex.distanse_m} m – tider (s): ${times} – raskeste ${ex.raskeste_s.toFixed(2)} s, snitt ${ex.snitt_s.toFixed(2)} s`
  }

  if (ex.vekt_per_sett_kg) {
    const parts = [`vekt per sett (kg): ${ex.vekt_per_sett_kg.join(', ')}`, `tyngste sett ${ex.tyngste_sett_kg} kg`]
    if (ex.sett_reps) parts.push(`sett/reps: ${ex.sett_reps}`)
    if (ex.notat) parts.push(`notat: ${ex.notat}`)
    return `${head}: ${parts.join(' – ')}`
  }

  return ex.notat ? `${head}: ${ex.notat}` : head
}

function toMarkdown(data) {
  const { sammendrag: s } = data
  const lines = [
    '# Treningsdata – Løpedagboken',
    '',
    `Eksportert: ${data.eksportert}`,
    `Periode: ${data.periode.fra || 'første økt'} til ${data.periode.til || 'siste økt'}`,
    '',
    '## Om dataene',
    '',
    '- Treningsdagbok for en sprinter. Øktene er logget av utøveren selv.',
    '- RPE er opplevd anstrengelse for hele økta på en skala fra 1 (svært lett) til 10 (maksimalt).',
    '- Løpsøvelser har distanse i meter og én tid i sekunder per repetisjon. Lavere tid er bedre.',
    '- Styrkeøvelser har vekt i kilo per sett. Progresjon måles på tyngste sett i økta.',
    '- Datoer er skrevet som ÅÅÅÅ-MM-DD. Desimaltall bruker punktum.',
    '',
    '## Sammendrag',
    '',
    `- Gjennomførte økter: ${s.antall_gjennomforte_okter}`,
  ]

  if (s.forste_okt) lines.push(`- Første og siste økt i utvalget: ${s.forste_okt} og ${s.siste_okt}`)
  if (s.snitt_rpe != null) lines.push(`- Snitt-RPE: ${s.snitt_rpe}`)
  lines.push(`- Økter med notat om skade/vondt: ${s.okter_med_skade_vondt}`)

  if (s.raskeste_tid_per_distanse.length) {
    lines.push('', '### Raskeste tid per distanse', '')
    for (const r of s.raskeste_tid_per_distanse) {
      lines.push(`- ${r.distanse_m} m: ${r.tid_s.toFixed(2)} s (${r.dato})`)
    }
  }

  if (s.tyngste_sett_per_ovelse.length) {
    lines.push('', '### Tyngste sett per styrkeøvelse', '')
    for (const l of s.tyngste_sett_per_ovelse) {
      lines.push(`- ${l.ovelse}: ${l.vekt_kg} kg (${l.dato})`)
    }
  }

  lines.push('', '## Økter (eldste først)', '')

  if (!data.okter.length) lines.push('Ingen gjennomførte økter i perioden.', '')

  for (const session of data.okter) {
    lines.push(`### ${session.dato} – ${session.tittel}`, '')
    lines.push(`- RPE: ${session.rpe != null ? `${session.rpe}/10` : 'ikke oppgitt'}`)
    if (session.logget_av) lines.push(`- Logget av: ${session.logget_av}`)
    if (session.notat) lines.push(`- Notat: ${session.notat}`)
    if (session.skade_vondt) lines.push(`- Skade/vondt: ${session.skade_vondt}`)
    lines.push('- Øvelser:')
    session.ovelser.forEach((ex, i) => lines.push(`  ${exerciseToMarkdown(ex, i)}`))
    lines.push('')
  }

  if (data.planlagte_okter) {
    lines.push('## Planlagte økter (ikke gjennomført)', '')
    if (!data.planlagte_okter.length) lines.push('Ingen planlagte økter i perioden.')
    for (const p of data.planlagte_okter) lines.push(`- ${p.dato} – ${p.tittel}`)
    lines.push('')
  }

  return lines.join('\n')
}

// sessions: normalized sessions from the API. from/to: inclusive "YYYY-MM-DD" or null.
export function buildExport({ sessions, profileMap, from = null, to = null, includePlanned = false }) {
  const inRange = sessions
    .filter((s) => (!from || s.date >= from) && (!to || s.date <= to))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

  const logged = inRange.filter((s) => s.exercises.length > 0).map((s) => describeSession(s, profileMap))
  const planned = inRange
    .filter((s) => s.exercises.length === 0)
    .map((s) => ({ dato: s.date, tittel: s.title }))

  const data = {
    eksportert: todayIso(),
    periode: { fra: from, til: to },
    sammendrag: buildSummary(logged),
    okter: logged,
  }
  if (includePlanned) data.planlagte_okter = planned

  return {
    data,
    markdown: toMarkdown(data),
    json: JSON.stringify(data, null, 2),
    sessionCount: logged.length,
  }
}
