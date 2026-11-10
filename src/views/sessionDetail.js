import { getSession, deleteSession } from '../api/sessions.js'
import { getSprintRecords } from '../api/records.js'
import { getProfileMap } from '../api/profiles.js'
import { confirmDialog, notify } from '../ui/feedback.js'
import { navigate } from '../router.js'
import { isPlanned, renderLoading, renderSessionCard } from './shared.js'

export async function renderSessionDetail(container, id, user) {
  const athlete = user.role === 'utøver'
  container.innerHTML = renderLoading()

  const [session, records, profileMap] = await Promise.all([
    getSession(id),
    getSprintRecords(),
    getProfileMap(),
  ])
  const planned = isPlanned(session)

  // A 60 m / 150 m record set in this session is highlighted here as well.
  const prSet = new Set()
  for (const distance of [60, 150]) {
    const record = records[distance]
    if (record && record.date === session.date) prSet.add(String(distance))
  }

  const actions = athlete
    ? `
      <a href="#/okt/${session.id}/rediger" class="btn btn--primary">${planned ? 'Loggfør økta' : 'Rediger'}</a>
      ${planned ? '' : `<a href="#/okt/${session.id}/dupliser" class="btn">Kjør på nytt</a>`}
      <button type="button" class="btn btn--quiet" data-action="delete">${planned ? 'Fjern fra planen' : 'Slett'}</button>
    `
    : ''

  container.innerHTML = `
    <a href="${planned ? '#/' : '#/historikk'}" class="backlink">&larr; ${planned ? 'Oversikt' : 'Historikk'}</a>
    ${renderSessionCard(session, {
      author: profileMap[session.created_by],
      prSet,
      heading: 'h1',
      actions,
    })}
  `

  container.querySelector('[data-action="delete"]')?.addEventListener('click', async () => {
    const confirmed = await confirmDialog({
      title: planned ? 'Fjerne planlagt økt?' : 'Slette økta?',
      message: planned
        ? `«${session.title}» fjernes fra planen.`
        : `«${session.title}» slettes for godt. Dette kan ikke angres.`,
      confirmLabel: planned ? 'Fjern' : 'Slett',
    })
    if (!confirmed) return

    try {
      await deleteSession(session.id)
      notify(planned ? 'Planlagt økt fjernet' : 'Økta er slettet')
      navigate(planned ? '/' : '/historikk')
    } catch (error) {
      console.error(error)
      notify('Kunne ikke slette økta. Prøv igjen.')
    }
  })
}
