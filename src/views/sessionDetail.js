import { getSession, deleteSession } from '../api/sessions.js'
import { getProfileMap } from '../api/profiles.js'
import { renderExerciseList, renderRpeSegments } from './shared.js'
import { formatDateLong, escapeHtml } from '../utils/format.js'
import { navigate } from '../router.js'

export async function renderSessionDetail(container, id) {
  container.innerHTML = `<p class="loading">Laster …</p>`

  const [session, profileMap] = await Promise.all([getSession(id), getProfileMap()])
  const loggedBy = profileMap[session.created_by]

  container.innerHTML = `
    <div class="session-page">
      <div class="session-page__date">
        <span class="session-page__date-label">Dato</span>
        <span class="session-page__date-value">${formatDateLong(session.date)}</span>
        ${loggedBy ? `<span class="badge">${escapeHtml(loggedBy.display_name)}</span>` : ''}
      </div>
      <div class="session-page__content">
        <h1 class="page-title">${escapeHtml(session.title)}</h1>
        ${renderExerciseList(session.exercises)}
        <div class="session-meta">
          <div class="rpe-display">
            <span class="rpe-display__label">RPE</span>
            ${renderRpeSegments(session.rpe)}
          </div>
          ${session.note ? `<p class="session-note">${escapeHtml(session.note)}</p>` : ''}
        </div>
        <div class="session-page__actions">
          <a href="#/okt/${session.id}/rediger" class="text-link">Rediger</a>
          <a href="#/okt/${session.id}/dupliser" class="text-link">Kjør denne på nytt</a>
          <button type="button" class="text-link text-link--danger" id="delete-btn">Slett</button>
        </div>
      </div>
    </div>
  `

  document.getElementById('delete-btn').addEventListener('click', async () => {
    if (!window.confirm('Slette denne økta? Dette kan ikke angres.')) return
    await deleteSession(session.id)
    navigate('/historikk')
  })
}
