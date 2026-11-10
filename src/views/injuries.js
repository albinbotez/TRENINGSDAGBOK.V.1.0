import { listInjuries } from '../api/sessions.js'
import { getProfileMap } from '../api/profiles.js'
import { escapeHtml, formatDateLong } from '../utils/format.js'
import { renderEmpty, renderLoading, renderPageHead } from './shared.js'

export async function renderInjuries(container) {
  container.innerHTML = renderLoading()

  const [injuries, profileMap] = await Promise.all([listInjuries(), getProfileMap()])
  const head = renderPageHead('Skader', {
    meta: injuries.length ? `${injuries.length} ${injuries.length === 1 ? 'notat' : 'notater'} om skade eller vondt` : '',
  })

  if (!injuries.length) {
    container.innerHTML = `
      ${head}
      ${renderEmpty(
        'Ingen skader registrert',
        'Når du fyller ut «Skade/vondt» på en økt, samles notatene her, nyeste først.'
      )}
    `
    return
  }

  container.innerHTML = `
    ${head}
    <ul class="log-list">
      ${injuries
        .map((session) => {
          const author = profileMap[session.created_by]
          return `
            <li class="log-item">
              <div class="log-item__head">
                <span class="log-item__date">${formatDateLong(session.date)}</span>
                ${author ? `<span class="tag">${escapeHtml(author.display_name)}</span>` : ''}
              </div>
              <p class="log-item__text">${escapeHtml(session.injury_note)}</p>
              <a href="#/okt/${session.id}" class="link-action">Fra økta «${escapeHtml(session.title)}»</a>
            </li>
          `
        })
        .join('')}
    </ul>
  `
}
