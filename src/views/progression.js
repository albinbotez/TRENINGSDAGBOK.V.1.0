import { getSprintRecords, getStrengthProgression } from '../api/records.js'
import { listExercises } from '../api/exercises.js'
import { formatSeconds, formatDateShort, escapeHtml } from '../utils/format.js'

export async function renderProgression(container) {
  container.innerHTML = `<p class="loading">Laster …</p>`

  const [records, exercises] = await Promise.all([getSprintRecords(), listExercises()])

  const strengthExercises = exercises.filter((e) => e.type === 'styrke')

  container.innerHTML = `
    <div class="progression-page">
      <h1 class="page-title">Progresjon</h1>
      <div class="record-tiles">
        ${renderRecordTile(60, records[60])}
        ${renderRecordTile(150, records[150])}
      </div>
      <hr class="hard-rule" />
      <h2 class="section-title">Styrkeprogresjon</h2>
      ${
        strengthExercises.length
          ? `
            <label for="strength-select">Velg øvelse</label>
            <select id="strength-select">
              <option value="">Velg …</option>
              ${strengthExercises
                .map((e) => `<option value="${e.id}">${escapeHtml(e.name)}</option>`)
                .join('')}
            </select>
            <div id="strength-chart"></div>
          `
          : '<p class="empty-hint">Ingen styrkeøvelser i biblioteket ennå.</p>'
      }
    </div>
  `

  const select = document.getElementById('strength-select')
  if (select) {
    select.addEventListener('change', async () => {
      const chartEl = document.getElementById('strength-chart')
      if (!select.value) {
        chartEl.innerHTML = ''
        return
      }
      chartEl.innerHTML = '<p class="loading">Laster …</p>'
      const data = await getStrengthProgression(select.value)
      chartEl.innerHTML = renderBarChart(data)
    })
  }
}

function renderRecordTile(distance, record) {
  if (!record) {
    return `
      <a href="#/progresjon/${distance}" class="record-tile">
        <span class="record-tile__label">${distance} m</span>
        <span class="record-tile__value record-tile__value--empty">—</span>
      </a>
    `
  }

  const trend =
    record.previousSeconds != null ? record.previousSeconds - record.seconds : null

  return `
    <a href="#/progresjon/${distance}" class="record-tile">
      <span class="record-tile__label">${distance} m</span>
      <span class="record-tile__value">${formatSeconds(record.seconds)} s</span>
      <span class="record-tile__date">${formatDateShort(record.date)}</span>
      ${
        trend != null && trend > 0
          ? `<span class="record-tile__trend">−${formatSeconds(trend)} s</span>`
          : ''
      }
    </a>
  `
}

function renderBarChart(data) {
  if (!data.length) {
    return '<p class="empty-hint">Ingen registreringer for denne øvelsen ennå.</p>'
  }

  const max = Math.max(...data.map((d) => d.weightKg))
  const bars = data
    .map((d) => {
      const heightPct = max > 0 ? (d.weightKg / max) * 100 : 0
      return `
        <div class="bar-chart__bar-wrap">
          <span class="bar-chart__value">${d.weightKg} kg</span>
          <div class="bar-chart__bar" style="height: ${heightPct}%"></div>
          <span class="bar-chart__date">${formatDateShort(d.date)}</span>
        </div>
      `
    })
    .join('')

  return `<div class="bar-chart">${bars}</div>`
}
