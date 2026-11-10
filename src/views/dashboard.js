import { listSessions, createSession, deleteSession } from '../api/sessions.js'
import { getSprintRecords } from '../api/records.js'
import { getProfileMap } from '../api/profiles.js'
import { confirmDialog, notify } from '../ui/feedback.js'
import {
  addDays,
  formatDateFull,
  isoWeekNumber,
  parseIsoDate,
  todayIso,
} from '../utils/format.js'
import { groupByDate, renderMonth, renderWeek } from './calendar.js'
import { isPlanned, renderEmpty, renderLoading, renderPageHead, renderSessionCard } from './shared.js'

const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1)

export async function renderDashboard(container, user) {
  const athlete = user.role === 'utøver'
  const today = todayIso()

  container.innerHTML = `
    ${renderPageHead('Oversikt', { meta: `${capitalize(formatDateFull(today))} · uke ${isoWeekNumber(today)}` })}
    <div class="overview">
      <section class="overview__calendar" data-mount="calendar" aria-label="Månedskalender">${renderLoading()}</section>
      <section class="overview__week" data-mount="week" aria-label="Ukeplan"></section>
    </div>
    <section class="overview__latest" data-mount="latest" aria-label="Siste økt"></section>
  `

  const mounts = {
    calendar: container.querySelector('[data-mount="calendar"]'),
    week: container.querySelector('[data-mount="week"]'),
    latest: container.querySelector('[data-mount="latest"]'),
  }

  const [sessions, records, profileMap] = await Promise.all([
    listSessions(),
    getSprintRecords(),
    getProfileMap(),
  ])

  const state = {
    sessions,
    sessionsByDate: groupByDate(sessions),
    selected: today,
    viewYear: parseIsoDate(today).getFullYear(),
    viewMonth: parseIsoDate(today).getMonth(),
    addingDate: null,
  }

  function select(dateStr) {
    const d = parseIsoDate(dateStr)
    state.selected = dateStr
    state.viewYear = d.getFullYear()
    state.viewMonth = d.getMonth()
    state.addingDate = null
  }

  function shiftMonth(delta) {
    const d = new Date(state.viewYear, state.viewMonth + delta, 1)
    state.viewYear = d.getFullYear()
    state.viewMonth = d.getMonth()
  }

  function renderPlanner() {
    // Re-rendering replaces the buttons, so put keyboard focus back where it was.
    const focusKey = document.activeElement?.dataset?.fk

    mounts.calendar.innerHTML = renderMonth({
      year: state.viewYear,
      month: state.viewMonth,
      selected: state.selected,
      today,
      sessionsByDate: state.sessionsByDate,
    })
    mounts.week.innerHTML = renderWeek({
      selected: state.selected,
      today,
      sessionsByDate: state.sessionsByDate,
      athlete,
      addingDate: state.addingDate,
    })

    const planInput = mounts.week.querySelector('#plan-title')
    if (planInput) planInput.focus()
    else if (focusKey) container.querySelector(`[data-fk="${focusKey}"]`)?.focus()
  }

  function renderLatest() {
    const latest = state.sessions.find((s) => !isPlanned(s) && s.date <= today)

    if (!latest) {
      mounts.latest.innerHTML = `
        <h2 class="section-title">Siste økt</h2>
        ${renderEmpty(
          'Ingen økter ennå',
          athlete ? 'Logg den første treningsøkta for å komme i gang.' : 'Utøveren har ikke logget noen økt ennå.',
          athlete ? '<a class="btn btn--primary" href="#/okt/ny">Logg økt</a>' : ''
        )}
      `
      return
    }

    const prSet = new Set()
    for (const distance of [60, 150]) {
      const record = records[distance]
      if (record && record.date === latest.date) prSet.add(String(distance))
    }

    mounts.latest.innerHTML = `
      <h2 class="section-title">Siste økt</h2>
      ${renderSessionCard(latest, {
        author: profileMap[latest.created_by],
        prSet,
        latest: true,
        heading: 'h3',
        actions: `
          <a href="#/okt/${latest.id}" class="btn">Åpne økta</a>
          ${athlete ? `<a href="#/okt/${latest.id}/rediger" class="btn btn--quiet">Rediger</a>` : ''}
        `,
      })}
    `
  }

  async function reloadSessions() {
    state.sessions = await listSessions()
    state.sessionsByDate = groupByDate(state.sessions)
    renderPlanner()
    renderLatest()
  }

  container.addEventListener('click', async (event) => {
    const target = event.target.closest('[data-action]')
    if (!target || !container.contains(target)) return
    const { action, date } = target.dataset

    if (action === 'select-day') select(date)
    else if (action === 'prev-month') shiftMonth(-1)
    else if (action === 'next-month') shiftMonth(1)
    else if (action === 'today') select(today)
    else if (action === 'prev-week') select(addDays(state.selected, -7))
    else if (action === 'next-week') select(addDays(state.selected, 7))
    else if (action === 'plan') {
      select(date)
      state.addingDate = date
    } else if (action === 'cancel-plan') state.addingDate = null
    else if (action === 'remove-planned') {
      const confirmed = await confirmDialog({
        title: 'Fjerne planlagt økt?',
        message: `«${target.dataset.title}» fjernes fra planen.`,
        confirmLabel: 'Fjern',
      })
      if (!confirmed) return
      try {
        await deleteSession(target.dataset.id)
        await reloadSessions()
        notify('Planlagt økt fjernet')
      } catch (error) {
        console.error(error)
        notify('Kunne ikke fjerne økta. Prøv igjen.')
      }
      return
    } else return

    renderPlanner()
  })

  container.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.addingDate) {
      state.addingDate = null
      renderPlanner()
    }
  })

  container.addEventListener('submit', async (event) => {
    const form = event.target.closest('[data-form="plan"]')
    if (!form) return
    event.preventDefault()

    const input = form.querySelector('[name="title"]')
    const title = input.value.trim()
    if (!title) {
      input.focus()
      return
    }

    const submitBtn = form.querySelector('button[type="submit"]')
    submitBtn.disabled = true

    try {
      await createSession(
        { date: form.dataset.date, title, rpe: null, note: '', injuryNote: '', exercises: [] },
        user.id
      )
      state.addingDate = null
      await reloadSessions()
      notify('Økta er lagt i planen')
    } catch (error) {
      console.error(error)
      submitBtn.disabled = false
      notify('Kunne ikke lagre. Prøv igjen.')
    }
  })

  renderPlanner()
  renderLatest()
}
