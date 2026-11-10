import { listSessions } from '../api/sessions.js'
import { getProfileMap } from '../api/profiles.js'
import { notify } from '../ui/feedback.js'
import { buildExport } from '../utils/exportData.js'
import { addDays, todayIso } from '../utils/format.js'
import { renderLoading, renderPageHead } from './shared.js'

const PERIODS = [
  { value: 'all', label: 'Alle økter' },
  { value: '28', label: 'Siste 4 uker' },
  { value: '84', label: 'Siste 12 uker' },
  { value: 'year', label: 'I år' },
  { value: 'custom', label: 'Egendefinert' },
]

const FORMATS = {
  markdown: { label: 'Tekst (Markdown) – best for AI', extension: 'md', mime: 'text/markdown' },
  json: { label: 'JSON – strukturert data', extension: 'json', mime: 'application/json' },
}

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text)
    return
  }
  // Fallback for browsers without the async clipboard API.
  const helper = document.createElement('textarea')
  helper.value = text
  helper.setAttribute('readonly', '')
  helper.style.position = 'fixed'
  helper.style.opacity = '0'
  document.body.appendChild(helper)
  helper.select()
  const ok = document.execCommand('copy')
  helper.remove()
  if (!ok) throw new Error('copy failed')
}

function downloadText(text, filename, mime) {
  const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function renderExport(container) {
  container.innerHTML = renderLoading()

  const [sessions, profileMap] = await Promise.all([listSessions(), getProfileMap()])
  const today = todayIso()

  const state = { period: 'all', from: '', to: today, format: 'markdown', includePlanned: false }

  container.innerHTML = `
    ${renderPageHead('Eksport', {
      back: { href: '#/historikk', label: 'Historikk' },
      meta: 'Hent ut alle øktene som én tekst du kan gi til en AI-assistent',
    })}
    <div class="export">
      <form class="form export__options" novalidate>
        <div class="field">
          <label class="field__label" for="export-period">Periode</label>
          <select id="export-period" data-field="period">
            ${PERIODS.map((p) => `<option value="${p.value}">${p.label}</option>`).join('')}
          </select>
        </div>
        <div class="field-row" data-custom-range hidden>
          <div class="field">
            <label class="field__label" for="export-from">Fra</label>
            <input id="export-from" type="date" data-field="from" />
          </div>
          <div class="field">
            <label class="field__label" for="export-to">Til</label>
            <input id="export-to" type="date" data-field="to" value="${today}" />
          </div>
        </div>
        <div class="field">
          <label class="field__label" for="export-format">Format</label>
          <select id="export-format" data-field="format">
            ${Object.entries(FORMATS)
              .map(([value, f]) => `<option value="${value}">${f.label}</option>`)
              .join('')}
          </select>
        </div>
        <label class="checkbox">
          <input type="checkbox" data-field="includePlanned" />
          <span>Ta med planlagte økter som ikke er gjennomført</span>
        </label>

        <div class="export__actions">
          <button type="button" class="btn btn--primary btn--large" data-action="copy">Kopier til utklippstavlen</button>
          <button type="button" class="btn btn--large" data-action="download">Last ned fil</button>
        </div>
        <p class="export__hint">
          Lim teksten inn i en AI-assistent og be for eksempel om «en rapport over utviklingen min de siste månedene,
          med styrker, svakheter og forslag til justeringer».
        </p>
      </form>

      <section class="export__preview" aria-label="Forhåndsvisning">
        <div class="export__preview-head">
          <h2 class="section-title">Forhåndsvisning</h2>
          <p class="export__summary" data-mount="summary" aria-live="polite"></p>
        </div>
        <pre class="export__output" data-mount="output" tabindex="0"></pre>
      </section>
    </div>
  `

  const output = container.querySelector('[data-mount="output"]')
  const summary = container.querySelector('[data-mount="summary"]')
  const customRange = container.querySelector('[data-custom-range]')
  let current = null

  function range() {
    if (state.period === 'all') return { from: null, to: null }
    if (state.period === 'year') return { from: `${today.slice(0, 4)}-01-01`, to: null }
    if (state.period === 'custom') return { from: state.from || null, to: state.to || null }
    return { from: addDays(today, -Number(state.period) + 1), to: null }
  }

  function refresh() {
    customRange.hidden = state.period !== 'custom'
    current = buildExport({ sessions, profileMap, ...range(), includePlanned: state.includePlanned })
    const text = current[state.format]
    output.textContent = text
    const size = Math.max(1, Math.round(new Blob([text]).size / 1024))
    summary.textContent = `${current.sessionCount} ${current.sessionCount === 1 ? 'økt' : 'økter'} · ca. ${size} kB`
  }

  container.querySelector('.export__options').addEventListener('change', (event) => {
    const { field } = event.target.dataset
    if (!field) return
    state[field] = event.target.type === 'checkbox' ? event.target.checked : event.target.value
    refresh()
  })

  container.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]')
    if (!button) return
    const text = current[state.format]

    if (button.dataset.action === 'copy') {
      try {
        await copyText(text)
        notify('Kopiert til utklippstavlen')
      } catch (error) {
        console.error(error)
        notify('Kunne ikke kopiere. Bruk «Last ned fil» i stedet.')
      }
    } else if (button.dataset.action === 'download') {
      const format = FORMATS[state.format]
      downloadText(text, `lopedagboken-${today}.${format.extension}`, format.mime)
      notify('Fila er lastet ned')
    }
  })

  refresh()
}
