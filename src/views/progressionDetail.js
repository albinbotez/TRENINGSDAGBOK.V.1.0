import { getDistanceHistory } from '../api/records.js'
import { formatSeconds, formatDateShort } from '../utils/format.js'

export async function renderProgressionDetail(container, { distance }) {
  container.innerHTML = `<p class="loading">Laster …</p>`

  const distanceM = Number(distance)
  const { rows, bestIndex } = await getDistanceHistory(distanceM)

  container.innerHTML = `
    <div class="progression-detail-page">
      <a href="#/progresjon" class="text-link">&larr; Tilbake til progresjon</a>
      <h1 class="page-title">${distanceM} m</h1>
      ${
        rows.length
          ? `${renderChart(rows, bestIndex)}${renderTable(rows, bestIndex)}`
          : '<p class="empty-hint">Ingen registrerte løp på denne distansen ennå.</p>'
      }
    </div>
  `

  if (rows.length) {
    wireTooltips(container)
  }
}

function renderChart(rows, bestIndex) {
  const width = Math.max(rows.length * 70, 320)
  const height = 260
  const paddingX = 32
  const paddingY = 30

  const times = rows.map((r) => r.fastest)
  const min = Math.min(...times)
  const max = Math.max(...times)
  const span = max - min || 1

  const points = rows.map((r, i) => {
    const x =
      rows.length > 1
        ? paddingX + (i * (width - paddingX * 2)) / (rows.length - 1)
        : width / 2
    const y = paddingY + ((r.fastest - min) / span) * (height - paddingY * 2)
    return { x, y, row: r, isBest: i === bestIndex }
  })

  const linePoints = points.map((p) => `${p.x},${p.y}`).join(' ')

  const circles = points
    .map(
      (p, i) => `
      <circle
        cx="${p.x}" cy="${p.y}" r="${p.isBest ? 8 : 5}"
        class="progression-point ${p.isBest ? 'progression-point--best' : ''}"
        data-index="${i}"
        data-time="${formatSeconds(p.row.fastest)} s"
        data-date="${formatDateShort(p.row.date)}"
      ></circle>
    `
    )
    .join('')

  return `
    <div class="progression-chart-wrap">
      <svg class="progression-chart" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMinYMid meet">
        <polyline points="${linePoints}" fill="none" stroke="var(--ink)" stroke-width="2" />
        ${circles}
      </svg>
      <div class="progression-tooltip" id="progression-tooltip" hidden></div>
    </div>
  `
}

function renderTable(rows, bestIndex) {
  return `
    <table class="progression-table">
      <thead>
        <tr>
          <th>Dato</th>
          <th>Raskeste</th>
          <th>Snitt</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (r, i) => `
          <tr class="${i === bestIndex ? 'progression-table__row--best' : ''}">
            <td>${formatDateShort(r.date)}</td>
            <td>${formatSeconds(r.fastest)} s</td>
            <td>${formatSeconds(r.average)} s</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  `
}

function wireTooltips(container) {
  const tooltip = container.querySelector('#progression-tooltip')
  const wrap = container.querySelector('.progression-chart-wrap')
  if (!tooltip || !wrap) return

  container.querySelectorAll('.progression-point').forEach((circle) => {
    circle.addEventListener('mouseenter', () => {
      tooltip.textContent = `${circle.dataset.date} · ${circle.dataset.time}`
      tooltip.hidden = false
    })
    circle.addEventListener('mousemove', (event) => {
      const rect = wrap.getBoundingClientRect()
      tooltip.style.left = `${event.clientX - rect.left + 12}px`
      tooltip.style.top = `${event.clientY - rect.top - 12}px`
    })
    circle.addEventListener('mouseleave', () => {
      tooltip.hidden = true
    })
  })
}
