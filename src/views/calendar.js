import {
  MONTHS_LONG,
  MONTHS_SHORT,
  WEEKDAYS_SHORT,
  WEEKDAYS_LONG,
  addDays,
  escapeHtml,
  isoWeekNumber,
  parseIsoDate,
  startOfWeek,
  toIsoDate,
  weekdayIndex,
} from '../utils/format.js'
import { isPlanned } from './shared.js'

const MAX_MARKS = 3

export function groupByDate(sessions) {
  const map = new Map()
  for (const session of sessions) {
    if (!map.has(session.date)) map.set(session.date, [])
    map.get(session.date).push(session)
  }
  return map
}

function dayLabel(dateStr, daySessions) {
  const d = parseIsoDate(dateStr)
  const logged = daySessions.filter((s) => !isPlanned(s)).length
  const planned = daySessions.length - logged
  const parts = [`${WEEKDAYS_LONG[weekdayIndex(dateStr)]} ${d.getDate()}. ${MONTHS_LONG[d.getMonth()]}`]
  if (logged) parts.push(`${logged} gjennomført`)
  if (planned) parts.push(`${planned} planlagt`)
  return parts.join(', ')
}

function renderMarks(daySessions) {
  if (!daySessions.length) return ''
  const shown = daySessions.slice(0, MAX_MARKS)
  const rest = daySessions.length - shown.length
  return `
    <span class="cal-day__marks" aria-hidden="true">
      ${shown
        .map(
          (s) =>
            `<span class="cal-mark ${isPlanned(s) ? 'cal-mark--planned' : 'cal-mark--logged'}"><span class="cal-mark__label">${escapeHtml(s.title)}</span></span>`
        )
        .join('')}
      ${rest > 0 ? `<span class="cal-mark cal-mark--more">+${rest}</span>` : ''}
    </span>
  `
}

export function renderMonth({ year, month, selected, today, sessionsByDate }) {
  const firstOfMonth = toIsoDate(new Date(year, month, 1))
  const lastOfMonth = toIsoDate(new Date(year, month + 1, 0))
  const selectedWeekStart = startOfWeek(selected)

  const weeks = []
  for (let weekStart = startOfWeek(firstOfMonth); weekStart <= lastOfMonth; weekStart = addDays(weekStart, 7)) {
    weeks.push(weekStart)
  }

  const rows = weeks
    .map((weekStart) => {
      const inSelectedWeek = weekStart === selectedWeekStart
      const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
        .map((dateStr) => {
          const daySessions = sessionsByDate.get(dateStr) || []
          const classes = [
            'cal-day',
            dateStr < firstOfMonth || dateStr > lastOfMonth ? 'is-outside' : '',
            dateStr === today ? 'is-today' : '',
            dateStr === selected ? 'is-selected' : '',
          ]
            .filter(Boolean)
            .join(' ')
          return `
            <button type="button" class="${classes}" data-action="select-day" data-date="${dateStr}" data-fk="day-${dateStr}"
              aria-label="${escapeHtml(dayLabel(dateStr, daySessions))}" ${dateStr === selected ? 'aria-pressed="true"' : ''}>
              <span class="cal-day__num">${parseIsoDate(dateStr).getDate()}</span>
              ${renderMarks(daySessions)}
            </button>
          `
        })
        .join('')

      return `
        <div class="cal-week ${inSelectedWeek ? 'is-selected-week' : ''}">
          <span class="cal-week__num" aria-hidden="true">${isoWeekNumber(weekStart)}</span>
          ${days}
        </div>
      `
    })
    .join('')

  return `
    <div class="calendar">
      <div class="calendar__head">
        <h2 class="calendar__title">${MONTHS_LONG[month]} ${year}</h2>
        <div class="calendar__nav">
          <button type="button" class="btn btn--icon" data-action="prev-month" data-fk="prev-month" aria-label="Forrige måned">&larr;</button>
          <button type="button" class="btn" data-action="today" data-fk="today">I dag</button>
          <button type="button" class="btn btn--icon" data-action="next-month" data-fk="next-month" aria-label="Neste måned">&rarr;</button>
        </div>
      </div>
      <div class="cal-weekdays" aria-hidden="true">
        <span class="cal-weekdays__week">Uke</span>
        ${WEEKDAYS_SHORT.map((label) => `<span>${label}</span>`).join('')}
      </div>
      <div class="cal-grid">
        ${rows}
      </div>
      <ul class="calendar__legend" aria-hidden="true">
        <li><span class="cal-mark cal-mark--logged cal-mark--swatch"></span>Gjennomført</li>
        <li><span class="cal-mark cal-mark--planned cal-mark--swatch"></span>Planlagt</li>
      </ul>
    </div>
  `
}

function renderWeekItem(session, athlete) {
  const planned = isPlanned(session)
  const title = escapeHtml(session.title)
  return `
    <li class="week-item ${planned ? 'week-item--planned' : 'week-item--logged'}">
      <a href="#/okt/${session.id}" class="week-item__title">${title}</a>
      <span class="tag ${planned ? '' : 'tag--solid'}">${planned ? 'Planlagt' : 'Gjennomført'}</span>
      ${
        planned && athlete
          ? `
        <span class="week-item__actions">
          <a href="#/okt/${session.id}/rediger" class="link-action">Loggfør</a>
          <button type="button" class="link-action" data-action="remove-planned" data-id="${session.id}" data-title="${title}">Fjern</button>
        </span>
      `
          : ''
      }
    </li>
  `
}

function renderPlanForm(dateStr) {
  return `
    <form class="plan-form" data-form="plan" data-date="${dateStr}" novalidate>
      <label class="visually-hidden" for="plan-title">Tittel på planlagt økt</label>
      <input id="plan-title" name="title" type="text" placeholder="Tittel, f.eks. Styrke" maxlength="80" autocomplete="off" required />
      <div class="plan-form__actions">
        <button type="submit" class="btn btn--primary">Planlegg</button>
        <button type="button" class="btn" data-action="cancel-plan">Avbryt</button>
        <a href="#/okt/ny/${dateStr}" class="link-action">Logg full økt</a>
      </div>
    </form>
  `
}

export function renderWeek({ selected, today, sessionsByDate, athlete, addingDate }) {
  const weekStart = startOfWeek(selected)
  const weekEnd = addDays(weekStart, 6)
  const start = parseIsoDate(weekStart)
  const end = parseIsoDate(weekEnd)
  const range =
    start.getMonth() === end.getMonth()
      ? `${start.getDate()}.–${end.getDate()}. ${MONTHS_SHORT[end.getMonth()]}`
      : `${start.getDate()}. ${MONTHS_SHORT[start.getMonth()]} – ${end.getDate()}. ${MONTHS_SHORT[end.getMonth()]}`

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
    .map((dateStr, i) => {
      const daySessions = sessionsByDate.get(dateStr) || []
      const adding = addingDate === dateStr
      const classes = [
        'week-day',
        dateStr === today ? 'is-today' : '',
        dateStr === selected ? 'is-selected' : '',
      ]
        .filter(Boolean)
        .join(' ')

      return `
        <li class="${classes}">
          <div class="week-day__date">
            <span class="week-day__wd">${WEEKDAYS_SHORT[i]}</span>
            <span class="week-day__num">${parseIsoDate(dateStr).getDate()}</span>
          </div>
          <div class="week-day__body">
            ${
              daySessions.length
                ? `<ul class="week-day__items">${daySessions.map((s) => renderWeekItem(s, athlete)).join('')}</ul>`
                : adding
                  ? ''
                  : '<span class="week-day__empty">Ingen økt</span>'
            }
            ${adding ? renderPlanForm(dateStr) : ''}
          </div>
          ${
            athlete && !adding
              ? `<button type="button" class="week-day__add" data-action="plan" data-date="${dateStr}" data-fk="plan-${dateStr}"
                  aria-label="Planlegg økt ${WEEKDAYS_LONG[i]} ${parseIsoDate(dateStr).getDate()}.">+</button>`
              : ''
          }
        </li>
      `
    })
    .join('')

  return `
    <div class="weekplan">
      <div class="weekplan__head">
        <div>
          <h2 class="weekplan__title">Uke ${isoWeekNumber(weekStart)}</h2>
          <p class="weekplan__range">${range}</p>
        </div>
        <div class="calendar__nav">
          <button type="button" class="btn btn--icon" data-action="prev-week" data-fk="prev-week" aria-label="Forrige uke">&larr;</button>
          <button type="button" class="btn btn--icon" data-action="next-week" data-fk="next-week" aria-label="Neste uke">&rarr;</button>
        </div>
      </div>
      <ul class="weekplan__days">
        ${days}
      </ul>
      ${athlete ? '<p class="weekplan__hint">Trykk + for å sette opp en økt. Øvelsene fyller du inn når økta er gjennomført.</p>' : ''}
    </div>
  `
}
