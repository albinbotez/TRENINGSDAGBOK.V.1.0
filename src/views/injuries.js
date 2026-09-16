import { listInjuries } from '../api/sessions.js'
import { getProfileMap } from '../api/profiles.js'
import { formatDateShort, escapeHtml } from '../utils/format.js'

export async function renderInjuries(container) {
  container.innerHTML = `<p class="loading">Laster …</p>`

  const [injuries, profileMap] = await Promise.all([listInjuries(), getProfileMap()])

  if (!injuries.length) {
    container.innerHTML = `
      <div class="empty-state">
        <h1 class="page-title">Skader</h1>
        <p>Ingen skader eller vondter registrert.</p>
      </div>
    `
    return
  }

  container.innerHTML = `
    <div class="injuries-page">
      <h1 class="page-title">Skader</h1>
      <ul class="injury-list">
        ${injuries.map((session) => renderInjuryItem(session, profileMap)).join('')}
      </ul>
    </div>
  `
}

function renderInjuryItem(session, profileMap) {
  const loggedBy = profileMap[session.created_by]
  return `
    <li class="injury-item">
      <div class="injury-item__head">
        <span class="injury-item__date">${formatDateShort(session.date)}</span>
        <a href="#/okt/${session.id}" class="text-link">${escapeHtml(session.title)}</a>
        ${loggedBy ? `<span class="badge">${escapeHtml(loggedBy.display_name)}</span>` : ''}
      </div>
      <p class="injury-item__text">${escapeHtml(session.injury_note)}</p>
    </li>
  `
}
