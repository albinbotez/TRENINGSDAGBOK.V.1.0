import { getDistanceHistory } from '../api/records.js'
import { formatDateLong, formatDateShort, formatSeconds } from '../utils/format.js'
import { renderEmpty, renderLoading, renderPageHead } from './shared.js'

const POINT_SPACING = 64
const CHART_HEIGHT = 280
const MARGIN = { top: 28, right: 36, bottom: 40, left: 56 }

export async function renderProgressionDetail(container, { distance }) {
  container.innerHTML = renderLoading()

  const distanceM = Number(distance)
  const { rows, bestIndex } = await getDistanceHistory(distanceM)
  const head = renderPageHead(`${distanceM} m`, {
    back: { href: '#/progresjon', label: 'Progresjon' },
    meta: rows.length ? `${rows.length} ${rows.length === 1 ? 'økt' : 'økter'} med løp på distansen` : '',
  })

  if (!rows.length) {
    container.innerHTML = `
      ${head}
      ${renderEmpty('Ingen løp registrert', `Når du logger en løpsøvelse på ${distanceM} meter, dukker den opp her.`)}
    `
    return
  }

  const best = rows[bestIndex]

  container.innerHTML = `
    ${head}
    <dl class="stat-row">
      <div class="stat-row__record"><dt>Personlig rekord</dt><dd>${formatSeconds(best.fastest)} s</dd></div>
      <div><dt>Satt</dt><dd>${formatDateLong(best.date)}</dd></div>
      <div><dt>Siste økt</dt><dd>${formatSeconds(rows[rows.length - 1].fastest)} s</dd></div>
    </dl>
    <figure class="chart">
      <figcaption class="chart__caption">Raskeste løp per økt. Høyere i grafen er raskere.</figcaption>
      <div class="chart-scroll chart__plot" data-mount="chart"></div>
    </figure>
    ${renderTable(rows, bestIndex)}
  `

  const mount = container.querySelector('[data-mount="chart"]')
  const draw = () => {
    mount.innerHTML = renderChart(rows, bestIndex, mount.clientWidth)
    wireTooltip(mount)
  }
  draw()

  // Redraw on resize/rotation for as long as this page is the one on screen.
  const onResize = () => {
    if (!document.contains(mount)) {
      window.removeEventListener('resize', onResize)
      return
    }
    draw()
  }
  window.addEventListener('resize', onResize)
}

function renderChart(rows, bestIndex, availableWidth) {
  const width = Math.max(availableWidth, MARGIN.left + MARGIN.right + (rows.length - 1) * POINT_SPACING + 40)
  const plotWidth = width - MARGIN.left - MARGIN.right
  const plotHeight = CHART_HEIGHT - MARGIN.top - MARGIN.bottom

  const times = rows.map((r) => r.fastest)
  const min = Math.min(...times)
  const max = Math.max(...times)
  const pad = (max - min) * 0.15 || 0.1
  const lo = min - pad
  const hi = max + pad

  const x = (i) => MARGIN.left + (rows.length > 1 ? (i * plotWidth) / (rows.length - 1) : plotWidth / 2)
  // Faster (lower) times are drawn higher up.
  const y = (seconds) => MARGIN.top + ((seconds - lo) / (hi - lo)) * plotHeight

  const ticks = [min, (min + max) / 2, max].filter((v, i, all) => all.findIndex((o) => Math.abs(o - v) < 0.005) === i)
  const grid = ticks
    .map(
      (t) => `
      <line class="chart-grid" x1="${MARGIN.left}" x2="${width - MARGIN.right}" y1="${y(t)}" y2="${y(t)}" />
      <text class="chart-axis" x="${MARGIN.left - 10}" y="${y(t)}" text-anchor="end" dominant-baseline="middle">${formatSeconds(t)}</text>
    `
    )
    .join('')

  const labelEvery = Math.ceil(56 / (rows.length > 1 ? plotWidth / (rows.length - 1) : 56))
  const xLabels = rows
    .map((r, i) =>
      i % labelEvery === 0 || i === rows.length - 1
        ? `<text class="chart-axis" x="${x(i)}" y="${CHART_HEIGHT - 14}" text-anchor="middle">${formatDateShort(r.date)}</text>`
        : ''
    )
    .join('')

  const line = rows.map((r, i) => `${x(i)},${y(r.fastest)}`).join(' ')

  const points = rows
    .map((r, i) => {
      const isBest = i === bestIndex
      const label = `${formatDateLong(r.date)}: ${formatSeconds(r.fastest)} sekunder${isBest ? ', personlig rekord' : ''}`
      return `
        <g class="chart-point ${isBest ? 'chart-point--best' : ''}" tabindex="0" role="img" aria-label="${label}"
          data-tip="${formatDateShort(r.date)} · ${formatSeconds(r.fastest)} s${isBest ? ' · PR' : ''}" data-x="${x(i)}" data-y="${y(r.fastest)}">
          <circle class="chart-point__hit" cx="${x(i)}" cy="${y(r.fastest)}" r="22" />
          <circle class="chart-point__dot" cx="${x(i)}" cy="${y(r.fastest)}" r="${isBest ? 8 : 5}" />
          ${isBest ? `<text class="chart-point__flag" x="${x(i)}" y="${y(r.fastest) - 16}" text-anchor="middle">PR</text>` : ''}
        </g>
      `
    })
    .join('')

  return `
    <svg class="chart__svg" width="${width}" height="${CHART_HEIGHT}" viewBox="0 0 ${width} ${CHART_HEIGHT}" role="group"
      aria-label="Linjediagram over raskeste tid per økt">
      ${grid}
      <text class="chart-axis" x="${MARGIN.left - 10}" y="12" text-anchor="end">sek</text>
      <polyline class="chart-line" points="${line}" />
      ${points}
      ${xLabels}
    </svg>
    <div class="chart-tooltip" hidden></div>
  `
}

function wireTooltip(mount) {
  const tooltip = mount.querySelector('.chart-tooltip')

  const show = (point) => {
    tooltip.textContent = point.dataset.tip
    tooltip.hidden = false
    // Keep the label inside the plot: clamp sideways, flip below near the top.
    const x = Number(point.dataset.x)
    const y = Number(point.dataset.y)
    const half = tooltip.offsetWidth / 2 + 4
    tooltip.style.left = `${Math.min(Math.max(x, half), mount.scrollWidth - half)}px`
    tooltip.style.top = `${y}px`
    tooltip.classList.toggle('is-below', y < 64)
  }
  const hide = () => {
    tooltip.hidden = true
  }

  mount.querySelectorAll('.chart-point').forEach((point) => {
    point.addEventListener('mouseenter', () => show(point))
    point.addEventListener('mouseleave', hide)
    point.addEventListener('focus', () => show(point))
    point.addEventListener('blur', hide)
    point.addEventListener('click', () => show(point))
  })
}

function renderTable(rows, bestIndex) {
  const body = rows
    .map((r, i) => ({ r, i }))
    .reverse()
    .map(
      ({ r, i }) => `
      <tr class="${i === bestIndex ? 'is-record' : ''}">
        <td>${formatDateLong(r.date)}</td>
        <td class="num">${formatSeconds(r.fastest)} s${i === bestIndex ? ' <span class="pr-flag">PR</span>' : ''}</td>
        <td class="num">${formatSeconds(r.average)} s</td>
        <td class="table__action"><a href="#/okt/${r.sessionId}" class="link-action">Åpne økta</a></td>
      </tr>
    `
    )
    .join('')

  return `
    <div class="table-scroll">
      <table class="table">
        <thead>
          <tr>
            <th scope="col">Dato</th>
            <th scope="col" class="num">Raskeste</th>
            <th scope="col" class="num">Snitt</th>
            <th scope="col"><span class="visually-hidden">Lenke</span></th>
          </tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  `
}
