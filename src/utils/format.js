const MONTHS_SHORT = [
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

export function formatDateShort(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`)
  return `${d.getDate()}. ${MONTHS_SHORT[d.getMonth()]}`
}

export function formatDateLong(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`)
  return `${d.getDate()}. ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`
}

export function formatSeconds(seconds) {
  return Number(seconds).toFixed(2).replace('.', ',')
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
