import {
  MONTHS_SHORT,
  WEEKDAYS_LONG,
  escapeHtml,
  formatNumber,
  formatSeconds,
  parseIsoDate,
  weekdayIndex,
} from '../utils/format.js'

export const isPlanned = (session) => session.exercises.length === 0

export function renderLoading() {
  return '<p class="state state--loading" role="status">Laster …</p>'
}

export function renderEmpty(title, text, actionHtml = '') {
  return `
    <div class="state state--empty">
      <h2 class="state__title">${escapeHtml(title)}</h2>
      <p class="state__text">${escapeHtml(text)}</p>
      ${actionHtml}
    </div>
  `
}

export function renderPageHead(title, { meta = '', actions = '', back = null } = {}) {
  return `
    ${back ? `<a href="${back.href}" class="backlink">&larr; ${escapeHtml(back.label)}</a>` : ''}
    <header class="page-head">
      <div class="page-head__titles">
        <h1 class="page-title">${escapeHtml(title)}</h1>
        ${meta ? `<p class="page-head__meta">${meta}</p>` : ''}
      </div>
      ${actions ? `<div class="page-head__actions">${actions}</div>` : ''}
    </header>
  `
}

export function renderExerciseList(exercises, prSet = new Set()) {
  if (!exercises.length) {
    return '<p class="muted">Ingen øvelser registrert.</p>'
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
    ((Number(ex.run.distanceM) === 60 && prSet.has('60')) ||
      (Number(ex.run.distanceM) === 150 && prSet.has('150')))

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
    const heaviest = weights.length ? Math.max(...weights) : null
    const parts = []
    if (weights.length > 1) parts.push(weights.map((w) => `${formatNumber(w)} kg`).join(' · '))
    if (ex.strength.repsScheme) parts.push(escapeHtml(ex.strength.repsScheme))
    return `
      <div class="exercise-item__values">
        <span class="value-big">${heaviest != null ? `${formatNumber(heaviest)} kg` : '—'}</span>
        ${parts.length ? `<span class="value-sub">${parts.join(' — ')}</span>` : ''}
      </div>
    `
  }
  if (ex.run) {
    const times = ex.run.times.map((t) => `${formatSeconds(t.seconds)} s`).join(' · ')
    return `
      <div class="exercise-item__values">
        <span class="value-big">${formatNumber(ex.run.distanceM)} m</span>
        <span class="value-sub">${times || 'Ingen tider registrert'}</span>
      </div>
    `
  }
  return ''
}

export function renderInjuryNote(injuryNote) {
  if (!injuryNote) return ''
  return `
    <div class="note note--injury">
      <span class="note__label">Skade/vondt</span>
      <p class="note__text">${escapeHtml(injuryNote)}</p>
    </div>
  `
}

export function renderSessionNote(note) {
  if (!note) return ''
  return `
    <div class="note">
      <span class="note__label">Notat</span>
      <p class="note__text">${escapeHtml(note)}</p>
    </div>
  `
}

export function renderRpe(rpe) {
  if (rpe == null) return ''
  let segments = ''
  for (let i = 1; i <= 10; i++) {
    segments += `<span class="rpe-segment ${i <= rpe ? 'rpe-segment--filled' : ''}"></span>`
  }
  return `
    <div class="rpe-display">
      <span class="rpe-display__label">RPE</span>
      <div class="rpe-segments" role="img" aria-label="RPE ${rpe} av 10">${segments}</div>
      <span class="rpe-display__value">${rpe}/10</span>
    </div>
  `
}

// The asymmetric session block: narrow date column, wide content column.
// `latest` paints the date column in the hazard accent (marks "newest").
export function renderSessionCard(session, { author, prSet, latest = false, heading = 'h2', actions = '' } = {}) {
  const d = parseIsoDate(session.date)
  const planned = isPlanned(session)

  return `
    <article class="session-card ${latest ? 'session-card--latest' : ''}">
      <div class="session-card__date">
        <span class="session-card__weekday">${WEEKDAYS_LONG[weekdayIndex(session.date)]}</span>
        <span class="session-card__day">${d.getDate()}</span>
        <span class="session-card__month">${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}</span>
      </div>
      <div class="session-card__content">
        <div class="session-card__head">
          <${heading} class="session-card__title">${escapeHtml(session.title)}</${heading}>
          <div class="session-card__tags">
            ${planned ? '<span class="tag">Planlagt</span>' : ''}
            ${author ? `<span class="tag tag--solid">${escapeHtml(author.display_name)}</span>` : ''}
          </div>
        </div>
        ${
          planned
            ? '<p class="muted">Økta er satt opp i planen, men ikke loggført ennå.</p>'
            : renderSessionBody(session, prSet)
        }
        ${actions ? `<div class="session-card__actions">${actions}</div>` : ''}
      </div>
    </article>
  `
}

// Shared body for a logged session: exercises, RPE, notes.
export function renderSessionBody(session, prSet) {
  return `
    ${renderExerciseList(session.exercises, prSet)}
    <div class="session-meta">
      ${renderRpe(session.rpe)}
      ${renderSessionNote(session.note)}
      ${renderInjuryNote(session.injury_note)}
    </div>
  `
}
