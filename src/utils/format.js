export const MONTHS_SHORT = [
  'jan',
  'feb',
  'mar',
  'apr',
  'mai',
  'jun',
  'jul',
  'aug',
  'sep',
  'okt',
  'nov',
  'des',
]

export const MONTHS_LONG = [
  'januar',
  'februar',
  'mars',
  'april',
  'mai',
  'juni',
  'juli',
  'august',
  'september',
  'oktober',
  'november',
  'desember',
]

export const WEEKDAYS_SHORT = ['man', 'tir', 'ons', 'tor', 'fre', 'lør', 'søn']

export const WEEKDAYS_LONG = [
  'mandag',
  'tirsdag',
  'onsdag',
  'torsdag',
  'fredag',
  'lørdag',
  'søndag',
]

const pad = (n) => String(n).padStart(2, '0')

// Dates are handled as local calendar days ("YYYY-MM-DD"), never via UTC,
// so a session logged late in the evening does not land on the wrong day.
export function parseIsoDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function toIsoDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function todayIso() {
  return toIsoDate(new Date())
}

export function addDays(dateStr, days) {
  const d = parseIsoDate(dateStr)
  d.setDate(d.getDate() + days)
  return toIsoDate(d)
}

// 0 = Monday … 6 = Sunday
export function weekdayIndex(dateStr) {
  return (parseIsoDate(dateStr).getDay() + 6) % 7
}

export function startOfWeek(dateStr) {
  return addDays(dateStr, -weekdayIndex(dateStr))
}

export function isoWeekNumber(dateStr) {
  const d = parseIsoDate(dateStr)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const firstThursday = new Date(d.getFullYear(), 0, 4)
  firstThursday.setDate(firstThursday.getDate() + 3 - ((firstThursday.getDay() + 6) % 7))
  return 1 + Math.round((d - firstThursday) / (7 * 24 * 3600 * 1000))
}

export function formatDateShort(dateStr) {
  const d = parseIsoDate(dateStr)
  return `${d.getDate()}. ${MONTHS_SHORT[d.getMonth()]}`
}

export function formatDateLong(dateStr) {
  const d = parseIsoDate(dateStr)
  return `${d.getDate()}. ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`
}

export function formatDateFull(dateStr) {
  const d = parseIsoDate(dateStr)
  return `${WEEKDAYS_LONG[weekdayIndex(dateStr)]} ${d.getDate()}. ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`
}

export function formatDateTime(isoString) {
  const d = new Date(isoString)
  return `${d.getDate()}. ${MONTHS_SHORT[d.getMonth()]} · ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function formatSeconds(seconds) {
  return Number(seconds).toFixed(2).replace('.', ',')
}

// Norwegian decimal comma, no trailing zeros: 80 → "80", 62.5 → "62,5"
export function formatNumber(value) {
  return String(Number(value)).replace('.', ',')
}

export function escapeHtml(str) {
  if (str == null) return ''
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
