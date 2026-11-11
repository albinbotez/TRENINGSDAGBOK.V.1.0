import { getSprintRecords, getStrengthProgression } from '../api/records.js'
import { listExercises } from '../api/exercises.js'
import { groupStrengthExercises } from '../utils/exerciseGroups.js'
import { escapeHtml, formatDateLong, formatDateShort, formatNumber, formatSeconds } from '../utils/format.js'
import { renderLoading, renderPageHead } from './shared.js'

export async function renderProgression(container) {
  container.innerHTML = renderLoading()

  const [records, exercises] = await Promise.all([getSprintRecords(), listExercises()])
  const groups = groupStrengthExercises(exercises.filter((e) => e.type === 'styrke'))

  container.innerHTML = `
    ${renderPageHead('Progresjon', { actions: '<a href="#/eksport" class="btn">Eksporter data</a>' })}

    <section aria-label="Personlige rekorder">
      <h2 class="section-title">Personlige rekorder</h2>
      <div class="record-tiles">
        ${renderRecordTile(60, records[60])}
        ${renderRecordTile(150, records[150])}
      </div>
    </section>

    <section class="section" aria-label="Styrke">
      <h2 class="section-title">Styrke – tyngste sett per økt</h2>
      ${
        groups.length
          ? `
        <div class="field field--narrow">
          <label class="field__label" for="strength-select">Øvelse</label>
          <select id="strength-select">
            ${groups
              .map((g) => `<option value="${escapeHtml(g.key)}">${escapeHtml(g.label)}</option>`)
              .join('')}
          </select>
        </div>
        <div data-mount="strength-chart" aria-live="polite"></div>
      `
          : '<p class="muted">Ingen styrkeøvelser er logget ennå.</p>'
      }
    </section>
  `

  const select = container.querySelector('#strength-select')
  if (!select) return

  const chartMount = container.querySelector('[data-mount="strength-chart"]')
  let requestId = 0

  async function loadChart() {
    const current = ++requestId
    chartMount.innerHTML = renderLoading()
    try {
      const group = groups.find((g) => g.key === select.value)
      const data = await getStrengthProgression(group.ids)
      if (current === requestId) chartMount.innerHTML = renderBarChart(data, group)
    } catch (error) {
      console.error(error)
      if (current === requestId) {
        chartMount.innerHTML = '<p class="muted">Kunne ikke hente data for øvelsen. Prøv igjen.</p>'
      }
    }
  }

  select.addEventListener('change', loadChart)
  await loadChart()
}

function renderRecordTile(distance, record) {
  if (!record) {
    return `
      <a href="#/progresjon/${distance}" class="record-tile record-tile--empty">
        <span class="record-tile__label">${distance} m</span>
        <span class="record-tile__value">–</span>
        <span class="record-tile__meta">Ingen løp registrert</span>
      </a>
    `
  }

  const improvement = record.previousSeconds != null ? record.previousSeconds - record.seconds : null

  return `
    <a href="#/progresjon/${distance}" class="record-tile">
      <span class="record-tile__label">${distance} m</span>
      <span class="record-tile__value">${formatSeconds(record.seconds)}<span class="record-tile__unit">s</span></span>
      <span class="record-tile__meta">Satt ${formatDateLong(record.date)}</span>
      ${
        improvement != null && improvement > 0
          ? `<span class="record-tile__trend">−${formatSeconds(improvement)} s fra forrige rekord</span>`
          : ''
      }
      <span class="record-tile__more">Se alle løp &rarr;</span>
    </a>
  `
}

function variantLabel(group, exerciseId) {
  // Only shown when the lift exists in several variants.
  const variant = group.ids.length > 1 ? group.variants.get(exerciseId) : null
  return variant ? `(${escapeHtml(variant)})` : ''
}

function renderBarChart(data, group) {
  if (!data.length) {
    return '<p class="muted">Ingen registreringer for denne øvelsen ennå.</p>'
  }

  const max = Math.max(...data.map((d) => d.weightKg))
  const heaviest = data.find((d) => d.weightKg === max)
  const first = data[0]
  const last = data[data.length - 1]
  const change = last.weightKg - first.weightKg

  const bars = data
    .map((d, i) => {
      const heightPct = max > 0 ? (d.weightKg / max) * 100 : 0
      return `
        <li class="bar-chart__item ${i === data.length - 1 ? 'is-latest' : ''}">
          <span class="bar-chart__value">${formatNumber(d.weightKg)}</span>
          <span class="bar-chart__track"><span class="bar-chart__bar" style="height: ${heightPct}%"></span></span>
          <span class="bar-chart__date">${formatDateShort(d.date)}</span>
          <span class="bar-chart__variant">${variantLabel(group, d.exerciseId)}</span>
        </li>
      `
    })
    .join('')

  return `
    <dl class="stat-row">
      <div><dt>Tyngste sett</dt><dd>${formatNumber(max)} kg <span class="stat-row__variant">${variantLabel(group, heaviest.exerciseId)}</span></dd></div>
      <div><dt>Siste økt</dt><dd>${formatNumber(last.weightKg)} kg <span class="stat-row__variant">${variantLabel(group, last.exerciseId)}</span></dd></div>
      <div><dt>Endring siden første</dt><dd>${change > 0 ? '+' : change < 0 ? '−' : ''}${formatNumber(Math.abs(change))} kg</dd></div>
    </dl>
    <div class="chart-scroll">
      <ol class="bar-chart" aria-label="Tyngste sett i kilo per økt, eldste først">${bars}</ol>
    </div>
  `
}
