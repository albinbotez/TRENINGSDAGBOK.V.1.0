import { listSessions, deleteSession } from '../api/sessions.js'
import { getProfileMap } from '../api/profiles.js'
import { confirmDialog, notify } from '../ui/feedback.js'
import {
  MONTHS_LONG,
  WEEKDAYS_SHORT,
  escapeHtml,
  parseIsoDate,
  weekdayIndex,
} from '../utils/format.js'
import { isPlanned, renderEmpty, renderLoading, renderPageHead, renderSessionBody } from './shared.js'

export async function renderHistory(container, user) {
  const athlete = user.role === 'utøver'

  container.addEventListener('click', async (event) => {
    const toggle = event.target.closest('[data-action="toggle-row"]')
    if (toggle) {
      const row = toggle.closest('.history-row')
      const open = row.classList.toggle('is-open')
      toggle.setAttribute('aria-expanded', String(open))
      return
    }

    const deleteBtn = event.target.closest('[data-action="delete-row"]')
    if (!deleteBtn) return

    const confirmed = await confirmDialog({
      title: 'Slette økta?',
      message: `«${deleteBtn.dataset.title}» slettes for godt. Dette kan ikke angres.`,
    })
    if (!confirmed) return

    try {
      await deleteSession(deleteBtn.dataset.id)
      notify('Økta er slettet')
      await paint(container, athlete)
    } catch (error) {
      console.error(error)
      notify('Kunne ikke slette økta. Prøv igjen.')
    }
  })

  await paint(container, athlete)
}

async function paint(container, athlete) {
  container.innerHTML = renderLoading()

  const [allSessions, profileMap] = await Promise.all([listSessions(), getProfileMap()])
  // Planned sessions (no exercises yet) belong in the calendar, not in the
  // history of sessions that were actually carried out.
  const sessions = allSessions.filter((s) => !isPlanned(s))

  const head = renderPageHead('Historikk', {
    meta: sessions.length ? `${sessions.length} ${sessions.length === 1 ? 'økt' : 'økter'} gjennomført` : '',
    actions: sessions.length ? '<a href="#/eksport" class="btn">Eksporter data</a>' : '',
  })

  if (!sessions.length) {
    container.innerHTML = `
      ${head}
      ${renderEmpty(
        'Ingen økter logget ennå',
        'Gjennomførte økter vises her, nyeste først.',
        athlete ? '<a class="btn btn--primary" href="#/okt/ny">Logg økt</a>' : ''
      )}
    `
    return
  }

  const groups = []
  for (const session of sessions) {
    const key = session.date.slice(0, 7)
    const last = groups[groups.length - 1]
    if (last && last.key === key) last.sessions.push(session)
    else groups.push({ key, sessions: [session] })
  }

  container.innerHTML = `
    ${head}
    ${groups
      .map((group) => {
        const [year, month] = group.key.split('-').map(Number)
        return `
          <section class="history-group">
            <h2 class="history-group__title">
              <span>${MONTHS_LONG[month - 1]} ${year}</span>
              <span class="history-group__count">${group.sessions.length}</span>
            </h2>
            <ul class="history-list">
              ${group.sessions.map((s) => renderHistoryRow(s, profileMap, athlete)).join('')}
            </ul>
          </section>
        `
      })
      .join('')}
  `

}

function renderHistoryRow(session, profileMap, athlete) {
  const author = profileMap[session.created_by]
  const d = parseIsoDate(session.date)
  const count = session.exercises.length
  const meta = [`${count} ${count === 1 ? 'øvelse' : 'øvelser'}`]
  if (session.rpe != null) meta.push(`RPE ${session.rpe}`)
  if (session.injury_note) meta.push('Skade/vondt')
  const title = escapeHtml(session.title)

  return `
    <li class="history-row">
      <button type="button" class="history-row__summary" data-action="toggle-row" aria-expanded="false">
        <span class="history-row__date">
          <span class="history-row__day">${d.getDate()}</span>
          <span class="history-row__wd">${WEEKDAYS_SHORT[weekdayIndex(session.date)]}</span>
        </span>
        <span class="history-row__main">
          <span class="history-row__title">${title}</span>
          <span class="history-row__meta">${meta.join(' · ')}</span>
        </span>
        ${author ? `<span class="tag history-row__author">${escapeHtml(author.display_name)}</span>` : ''}
        <span class="history-row__chevron" aria-hidden="true"></span>
      </button>
      <div class="history-row__detail">
        ${renderSessionBody(session)}
        <div class="history-row__actions">
          <a href="#/okt/${session.id}" class="btn">Åpne økta</a>
          ${
            athlete
              ? `
            <a href="#/okt/${session.id}/rediger" class="btn btn--quiet">Rediger</a>
            <a href="#/okt/${session.id}/dupliser" class="btn btn--quiet">Kjør på nytt</a>
            <button type="button" class="btn btn--quiet" data-action="delete-row" data-id="${session.id}" data-title="${title}">Slett</button>
          `
              : ''
          }
        </div>
      </div>
    </li>
  `
}
