import { formatSeconds, escapeHtml } from '../utils/format.js'

export function renderExerciseList(exercises, prSet = new Set()) {
  if (!exercises.length) {
    return '<p class="empty-hint">Ingen øvelser registrert.</p>'
  }
  return `
    <ul class="exercise-list">
      ${exercises.map((ex) => renderExerciseItem(ex, prSet)).join('')}
    </ul>
  `
}

function renderExerciseItem(ex, prSet) {
  const isPr =
    !!ex.run &&
    ((ex.run.distanceM === 60 && prSet.has('60')) ||
      (ex.run.distanceM === 150 && prSet.has('150')))

  return `
    <li class="exercise-item ${isPr ? 'exercise-item--pr' : ''}">
      <div class="exercise-item__head">
        <span class="exercise-item__name">${escapeHtml(ex.exercise.name)}</span>
        <span class="exercise-item__type">${escapeHtml(ex.exercise.type)}</span>
      </div>
      ${renderExerciseDetail(ex)}
      ${ex.note ? `<p class="exercise-item__note">${escapeHtml(ex.note)}</p>` : ''}
      ${isPr ? '<span class="pr-flag">Personlig rekord</span>' : ''}
    </li>
  `
}

function renderExerciseDetail(ex) {
  if (ex.strength) {
    const weights = ex.strength.sets.map((s) => Number(s.weight_kg))
    const heaviest = weights.length ? Math.max(...weights) : 0
    const weightList = weights.map((w) => `${w} kg`).join(', ')
    return `
      <div class="exercise-item__values">
        <span class="value-big">${heaviest} kg</span>
        <span class="value-sub">${weightList}${weightList ? ' · ' : ''}${escapeHtml(ex.strength.repsScheme)}</span>
      </div>
    `
  }
  if (ex.run) {
    const times = ex.run.times.map((t) => `${formatSeconds(t.seconds)} s`).join(', ')
    return `
      <div class="exercise-item__values">
        <span class="value-big">${ex.run.distanceM} m</span>
        <span class="value-sub">${times || '—'}</span>
      </div>
    `
  }
  return ''
}

export function renderInjuryNote(injuryNote) {
  if (!injuryNote) return ''
  return `
    <p class="injury-note">
      <span class="injury-note__label">Skade/vondt</span>
      ${escapeHtml(injuryNote)}
    </p>
  `
}

export function renderRpeSegments(rpe) {
  let segments = ''
  for (let i = 1; i <= 10; i++) {
    segments += `<span class="rpe-segment ${i <= rpe ? 'rpe-segment--filled' : ''}"></span>`
  }
  return `<div class="rpe-segments" role="img" aria-label="RPE ${rpe} av 10">${segments}</div>`
}
