import { listSessions, createSession } from '../api/sessions.js'
import { escapeHtml } from '../utils/format.js'

const MONTH_NAMES = [
  'Januar',
  'Februar',
  'Mars',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Desember',
]

const WEEKDAY_LABELS = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn']

export async function renderCalendarSection(container, user) {
  const isAthlete = user.role === 'utøver'
  const today = new Date()

  let viewYear = today.getFullYear()
  let viewMonth = today.getMonth()
  let addingDate = null
  let sessions = await listSessions()

  function render() {
    container.innerHTML = buildCalendarHtml(viewYear, viewMonth, sessions, isAthlete, addingDate)
    wireEvents()
    const quickAddInput = container.querySelector('#calendar-quick-add input')
    if (quickAddInput) quickAddInput.focus()
  }

  function wireEvents() {
    container.querySelector('[data-action="prev-month"]').addEventListener('click', () => {
      viewMonth -= 1
      if (viewMonth < 0) {
        viewMonth = 11
        viewYear -= 1
      }
      addingDate = null
      render()
    })

    container.querySelector('[data-action="next-month"]').addEventListener('click', () => {
      viewMonth += 1
      if (viewMonth > 11) {
        viewMonth = 0
        viewYear += 1
      }
      addingDate = null
      render()
    })

    if (!isAthlete) return

    container.querySelectorAll('[data-action="open-add"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        addingDate = btn.dataset.date
        render()
      })
    })

    const cancelBtn = container.querySelector('[data-action="cancel-add"]')
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        addingDate = null
        render()
      })
    }

    const form = container.querySelector('#calendar-quick-add')
    if (form) {
      form.addEventListener('submit', async (event) => {
        event.preventDefault()
        const input = form.querySelector('input[name="title"]')
        const title = input.value.trim()
        if (!title) return

        const submitBtn = form.querySelector('button[type="submit"]')
        submitBtn.disabled = true

        await createSession(
          { date: addingDate, title, rpe: null, note: '', injuryNote: '', exercises: [] },
          user.id
        )
        addingDate = null
        sessions = await listSessions()
        render()
      })
    }
  }

  render()
}

function buildCalendarHtml(year, month, sessions, isAthlete, addingDate) {
  const firstOfMonth = new Date(year, month, 1)
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const todayStr = new Date().toISOString().slice(0, 10)

  const dayCells = cells
    .map((day) => {
      if (day == null) return '<div class="calendar-cell calendar-cell--empty"></div>'

      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const daySessions = sessions.filter((s) => s.date === dateStr)
      const isToday = dateStr === todayStr

      const markers = daySessions
        .map((s) => {
          const isPlanned = s.exercises.length === 0
          const href = isPlanned && isAthlete ? `#/okt/${s.id}/rediger` : `#/okt/${s.id}`
          return `<a href="${href}" class="calendar-marker ${isPlanned ? 'calendar-marker--planned' : 'calendar-marker--logged'}">${escapeHtml(s.title)}</a>`
        })
        .join('')

      const showAddButton = isAthlete && daySessions.length === 0 && addingDate !== dateStr

      const addUi =
        addingDate === dateStr
          ? `
        <form id="calendar-quick-add" class="calendar-quick-add">
          <input type="text" name="title" placeholder="Tittel …" required />
          <div class="calendar-quick-add__actions">
            <button type="submit">Lagre</button>
            <button type="button" data-action="cancel-add">Avbryt</button>
          </div>
        </form>
      `
          : showAddButton
            ? `<button type="button" class="calendar-add-btn" data-action="open-add" data-date="${dateStr}" aria-label="Legg til planlagt økt ${day}.">+</button>`
            : ''

      return `
        <div class="calendar-cell ${isToday ? 'calendar-cell--today' : ''}">
          <span class="calendar-cell__day">${day}</span>
          ${markers}
          ${addUi}
        </div>
      `
    })
    .join('')

  return `
    <div class="calendar">
      <div class="calendar__header">
        <button type="button" class="calendar-nav-btn" data-action="prev-month" aria-label="Forrige måned">&larr;</button>
        <h2 class="calendar__title">${MONTH_NAMES[month]} ${year}</h2>
        <button type="button" class="calendar-nav-btn" data-action="next-month" aria-label="Neste måned">&rarr;</button>
      </div>
      <div class="calendar-grid calendar-grid--labels">
        ${WEEKDAY_LABELS.map((l) => `<div class="calendar-weekday">${l}</div>`).join('')}
      </div>
      <div class="calendar-grid">
        ${dayCells}
      </div>
    </div>
  `
}
