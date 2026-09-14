import { getLatestSession } from '../api/sessions.js'
import { getSprintRecords } from '../api/records.js'
import { getProfileMap } from '../api/profiles.js'
import { renderExerciseList, renderRpeSegments } from './shared.js'
import { formatDateLong, escapeHtml } from '../utils/format.js'

export async function renderDashboard(container) {
  container.innerHTML = `<p class="loading">Laster …</p>`

  const [session, records, profileMap] = await Promise.all([
    getLatestSession(),
    getSprintRecords(),
    getProfileMap(),
  ])

  if (!session) {
    container.innerHTML = `
      <div class="empty-state">
        <h1 class="page-title">Ingen økter ennå</h1>
        <p>Logg din første treningsnøkt for å komme i gang.</p>
        <a class="auth-submit link-button" href="#/okt/ny">Logg ny økt</a>
      </div>
    `
    return
  }

  const prSet = new Set()
  for (const distance of [60, 150]) {
    const record = records[distance]
    if (record && record.date === session.date) {
      prSet.add(String(distance))
    }
  }

  const loggedBy = profileMap[session.created_by]

  container.innerHTML = `
    <div class="session-page">
      <div class="session-page__date">
        <span class="session-page__date-label">Siste økt</span>
        <span class="session-page__date-value">${formatDateLong(session.date)}</span>
        ${loggedBy ? `<span class="badge">${escapeHtml(loggedBy.display_name)}</span>` : ''}
      </div>
      <div class="session-page__content">
        <h1 class="page-title">${escapeHtml(session.title)}</h1>
        ${renderExerciseList(session.exercises, prSet)}
        <div class="session-meta">
          <div class="rpe-display">
            <span class="rpe-display__label">RPE</span>
            ${renderRpeSegments(session.rpe)}
          </div>
          ${session.note ? `<p class="session-note">${escapeHtml(session.note)}</p>` : ''}
        </div>
        <div class="session-page__actions">
          <a href="#/okt/${session.id}" class="text-link">Se full detalj</a>
          <a href="#/okt/${session.id}/rediger" class="text-link">Rediger</a>
        </div>
      </div>
    </div>
  `
}
