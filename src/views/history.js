import { listSessions, deleteSession } from '../api/sessions.js'
import { getProfileMap } from '../api/profiles.js'
import { renderExerciseList, renderRpeSegments, renderInjuryNote } from './shared.js'
import { formatDateShort, escapeHtml } from '../utils/format.js'

export async function renderHistory(container, params, user) {
  container.innerHTML = `<p class="loading">Laster …</p>`

  const isAthlete = user.role === 'utøver'

  const [sessions, profileMap] = await Promise.all([listSessions(), getProfileMap()])

  if (!sessions.length) {
    container.innerHTML = `
      <div class="empty-state">
        <h1 class="page-title">Historikk</h1>
        <p>Ingen økter logget ennå.</p>
      </div>
    `
    return
  }

  container.innerHTML = `
    <div class="history-page">
      <h1 class="page-title">Historikk</h1>
      <ul class="history-list">
        ${sessions.map((s) => renderHistoryRow(s, profileMap, isAthlete)).join('')}
      </ul>
    </div>
  `

  container.querySelectorAll('[data-action="toggle-row"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.closest('.history-row').classList.toggle('history-row--open')
    })
  })

  if (isAthlete) {
    container.querySelectorAll('[data-action="delete-row"]').forEach((btn) => {
      btn.addEventListener('click', async (event) => {
        event.stopPropagation()
        if (!window.confirm('Slette denne økta? Dette kan ikke angres.')) return
        await deleteSession(btn.dataset.id)
        renderHistory(container, params, user)
      })
    })
  }
}

function renderHistoryRow(session, profileMap, isAthlete) {
  const loggedBy = profileMap[session.created_by]
  return `
    <li class="history-row" data-id="${session.id}">
      <button type="button" class="history-row__summary" data-action="toggle-row">
        <span class="history-row__date">${formatDateShort(session.date)}</span>
        <span class="history-row__title">${escapeHtml(session.title)}</span>
        ${loggedBy ? `<span class="badge">${escapeHtml(loggedBy.display_name)}</span>` : ''}
      </button>
      <div class="history-row__detail">
        ${renderExerciseList(session.exercises)}
        <div class="session-meta">
          <div class="rpe-display">
            <span class="rpe-display__label">RPE</span>
            ${renderRpeSegments(session.rpe)}
          </div>
          ${session.note ? `<p class="session-note">${escapeHtml(session.note)}</p>` : ''}
          ${renderInjuryNote(session.injury_note)}
        </div>
        ${
          isAthlete
            ? `
          <div class="session-page__actions">
            <a href="#/okt/${session.id}/rediger" class="text-link">Rediger</a>
            <a href="#/okt/${session.id}/dupliser" class="text-link">Kjør denne på nytt</a>
            <button type="button" class="text-link text-link--danger" data-action="delete-row" data-id="${session.id}">Slett</button>
          </div>
        `
            : ''
        }
      </div>
    </li>
  `
}
