import { listExercises, findOrCreateExercise } from '../api/exercises.js'
import { getSession, createSession, updateSession } from '../api/sessions.js'
import { notify } from '../ui/feedback.js'
import { navigate } from '../router.js'
import { escapeHtml, todayIso } from '../utils/format.js'
import { renderLoading, renderPageHead } from './shared.js'

const NEW_EXERCISE = '__new__'
const TYPE_LABELS = { styrke: 'Styrke', løp: 'Løp', annet: 'Annet' }
const RPE_HINTS = {
  1: 'Svært lett',
  2: 'Lett',
  3: 'Lett',
  4: 'Moderat',
  5: 'Moderat',
  6: 'Litt hardt',
  7: 'Hardt',
  8: 'Hardt',
  9: 'Svært hardt',
  10: 'Maksimalt',
}

let lineCounter = 0

function emptyLine() {
  lineCounter += 1
  return {
    lineId: lineCounter,
    exerciseId: '',
    type: '',
    note: '',
    weights: [],
    repsScheme: '',
    distanceM: '',
    times: [],
    newExerciseName: '',
    newExerciseType: 'styrke',
  }
}

function exerciseToLine(ex) {
  return {
    ...emptyLine(),
    exerciseId: ex.exercise.id,
    type: ex.exercise.type,
    note: ex.note || '',
    weights: ex.strength ? ex.strength.sets.map((s) => toInputValue(s.weight_kg)) : [],
    repsScheme: ex.strength ? ex.strength.repsScheme : '',
    distanceM: ex.run ? ex.run.distanceM : '',
    times: ex.run ? ex.run.times.map((t) => toInputValue(t.seconds)) : [],
  }
}

const lineType = (line) => (line.exerciseId === NEW_EXERCISE ? line.newExerciseType : line.type)

// A strength line always shows at least one set row, a run line one time row.
function ensureFirstRow(line) {
  const type = lineType(line)
  if (type === 'styrke' && !line.weights.length) line.weights.push('')
  if (type === 'løp' && !line.times.length) line.times.push('')
}

export async function renderSessionForm(container, { mode, id, date }, user) {
  container.innerHTML = renderLoading()

  const library = await listExercises()
  const state = {
    date: date || todayIso(),
    title: '',
    rpe: 5,
    note: '',
    injuryNote: '',
    lines: [],
  }
  let editingId = null
  let completingPlan = false

  if (mode === 'edit' || mode === 'duplicate') {
    const session = await getSession(id)
    state.title = session.title
    state.lines = session.exercises.map(exerciseToLine)
    state.lines.forEach(ensureFirstRow)
    if (mode === 'edit') {
      editingId = session.id
      completingPlan = session.exercises.length === 0
      state.date = session.date
      state.rpe = session.rpe ?? 5
      state.note = session.note || ''
      state.injuryNote = session.injury_note || ''
    }
  }

  const heading = completingPlan ? 'Loggfør økt' : mode === 'edit' ? 'Rediger økt' : 'Ny økt'
  const cancelHref = editingId ? `#/okt/${editingId}` : '#/'
  const findLine = (lineId) => state.lines.find((l) => String(l.lineId) === String(lineId))

  function exerciseOptions(selectedId) {
    return Object.keys(TYPE_LABELS)
      .map((type) => {
        const options = library
          .filter((ex) => ex.type === type)
          .map(
            (ex) =>
              `<option value="${ex.id}" ${ex.id === selectedId ? 'selected' : ''}>${escapeHtml(ex.name)}</option>`
          )
          .join('')
        return options ? `<optgroup label="${TYPE_LABELS[type]}">${options}</optgroup>` : ''
      })
      .join('')
  }

  function renderRows(line, kind) {
    const isWeight = kind === 'weight'
    const values = isWeight ? line.weights : line.times
    return `
      <div class="row-list">
        ${values
          .map(
            (value, i) => `
          <div class="row-list__row">
            <span class="row-list__index">${i + 1}</span>
            <input type="text" inputmode="decimal" autocomplete="off" maxlength="8"
              data-field="${kind}" data-line-id="${line.lineId}" data-index="${i}" value="${value}"
              aria-label="${isWeight ? `Vekt i kilo, sett ${i + 1}` : `Tid i sekunder, rep ${i + 1}`}" />
            <span class="row-list__unit">${isWeight ? 'kg' : 's'}</span>
            <button type="button" class="btn btn--icon" data-action="remove-${kind}" data-line-id="${line.lineId}" data-index="${i}"
              aria-label="${isWeight ? `Fjern sett ${i + 1}` : `Fjern tid ${i + 1}`}">&times;</button>
          </div>
        `
          )
          .join('')}
      </div>
      <button type="button" class="btn btn--dashed" data-action="add-${kind}" data-line-id="${line.lineId}">
        ${isWeight ? '+ Sett' : '+ Tid'}
      </button>
    `
  }

  function renderTypeFields(line) {
    const type = lineType(line)
    const uid = `line-${line.lineId}`

    if (type === 'styrke') {
      return `
        <fieldset class="field">
          <legend class="field__label">Vekt per sett</legend>
          ${renderRows(line, 'weight')}
        </fieldset>
        <div class="field">
          <label class="field__label" for="${uid}-reps">Sett/reps</label>
          <input id="${uid}-reps" type="text" placeholder="f.eks. 5×3" data-field="repsScheme" data-line-id="${line.lineId}" value="${escapeHtml(line.repsScheme || '')}" />
        </div>
      `
    }
    if (type === 'løp') {
      return `
        <div class="field field--narrow">
          <label class="field__label" for="${uid}-distance">Distanse (meter)</label>
          <input id="${uid}-distance" type="number" inputmode="numeric" min="0" step="1" data-field="distanceM" data-line-id="${line.lineId}" value="${line.distanceM ?? ''}" />
        </div>
        <fieldset class="field">
          <legend class="field__label">Tid per rep</legend>
          ${renderRows(line, 'time')}
        </fieldset>
      `
    }
    return ''
  }

  function renderLine(line, index) {
    const isNew = line.exerciseId === NEW_EXERCISE
    const type = lineType(line)
    const uid = `line-${line.lineId}`

    return `
      <li class="exercise-line" data-line="${line.lineId}">
        <div class="exercise-line__head">
          <span class="exercise-line__number">${String(index + 1).padStart(2, '0')}</span>
          <button type="button" class="btn btn--quiet" data-action="remove-line" data-line-id="${line.lineId}">Fjern øvelse</button>
        </div>

        <div class="field">
          <label class="field__label" for="${uid}-exercise">Øvelse</label>
          <select id="${uid}-exercise" data-field="exerciseId" data-line-id="${line.lineId}">
            <option value="">Velg øvelse …</option>
            ${exerciseOptions(line.exerciseId)}
            <option value="${NEW_EXERCISE}" ${isNew ? 'selected' : ''}>+ Ny øvelse</option>
          </select>
        </div>

        ${
          isNew
            ? `
          <div class="field-row">
            <div class="field field--grow">
              <label class="field__label" for="${uid}-new-name">Navn på ny øvelse</label>
              <input id="${uid}-new-name" type="text" maxlength="80" data-field="newExerciseName" data-line-id="${line.lineId}" value="${escapeHtml(line.newExerciseName || '')}" />
            </div>
            <div class="field">
              <label class="field__label" for="${uid}-new-type">Type</label>
              <select id="${uid}-new-type" data-field="newExerciseType" data-line-id="${line.lineId}">
                ${Object.entries(TYPE_LABELS)
                  .map(
                    ([value, label]) =>
                      `<option value="${value}" ${line.newExerciseType === value ? 'selected' : ''}>${label}</option>`
                  )
                  .join('')}
              </select>
            </div>
          </div>
        `
            : ''
        }

        ${renderTypeFields(line)}

        ${
          type && type !== 'løp'
            ? `
          <div class="field">
            <label class="field__label" for="${uid}-note">Notat <span class="field__optional">valgfritt</span></label>
            <input id="${uid}-note" type="text" data-field="note" data-line-id="${line.lineId}" value="${escapeHtml(line.note || '')}" />
          </div>
        `
            : ''
        }
      </li>
    `
  }

  function render(focusSelector) {
    container.innerHTML = `
      ${renderPageHead(heading, { back: { href: cancelHref, label: 'Avbryt' } })}
      <form class="form session-form" novalidate>
        <div class="field-row">
          <div class="field">
            <label class="field__label" for="field-date">Dato</label>
            <input id="field-date" type="date" data-field="date" value="${state.date}" required />
          </div>
          <div class="field field--grow">
            <label class="field__label" for="field-title">Tittel</label>
            <input id="field-title" type="text" maxlength="80" data-field="title" value="${escapeHtml(state.title)}" placeholder="f.eks. Sprintdag" required />
          </div>
        </div>

        <section class="form__section">
          <h2 class="section-title">Øvelser</h2>
          ${
            state.lines.length
              ? `<ol class="exercise-lines">${state.lines.map(renderLine).join('')}</ol>`
              : '<p class="muted">Ingen øvelser lagt til ennå.</p>'
          }
          <button type="button" class="btn btn--dashed btn--block" data-action="add-line">+ Legg til øvelse</button>
        </section>

        <section class="form__section">
          <h2 class="section-title">Etter økta</h2>
          <div class="field">
            <label class="field__label" for="field-rpe">RPE – opplevd anstrengelse</label>
            <div class="rpe-input">
              <input id="field-rpe" type="range" min="1" max="10" step="1" data-field="rpe" value="${state.rpe}" />
              <output class="rpe-input__value" for="field-rpe"><strong>${state.rpe}</strong><span>${RPE_HINTS[state.rpe]}</span></output>
            </div>
          </div>
          <div class="field">
            <label class="field__label" for="field-note">Notat <span class="field__optional">valgfritt</span></label>
            <textarea id="field-note" data-field="note" rows="3" placeholder="Følelse, søvn, energi …">${escapeHtml(state.note)}</textarea>
          </div>
          <div class="field">
            <label class="field__label" for="field-injury">Skade/vondt <span class="field__optional">valgfritt</span></label>
            <textarea id="field-injury" data-field="injuryNote" rows="2" placeholder="f.eks. Litt sårt i hamstringen …">${escapeHtml(state.injuryNote)}</textarea>
          </div>
        </section>

        <p class="form__error" role="alert" hidden></p>

        <div class="form__actions">
          <button type="submit" class="btn btn--primary btn--large">${mode === 'edit' ? 'Lagre endringer' : 'Lagre økt'}</button>
          <a href="${cancelHref}" class="btn btn--large">Avbryt</a>
        </div>
      </form>
    `
    if (focusSelector) container.querySelector(focusSelector)?.focus()
  }

  function addRow(line, kind) {
    const values = kind === 'weight' ? line.weights : line.times
    values.push('')
    render(`[data-field="${kind}"][data-line-id="${line.lineId}"][data-index="${values.length - 1}"]`)
  }

  container.addEventListener('click', (event) => {
    const target = event.target.closest('[data-action]')
    if (!target) return
    const { action, lineId, index } = target.dataset

    if (action === 'add-line') {
      const line = emptyLine()
      state.lines.push(line)
      render(`#line-${line.lineId}-exercise`)
    } else if (action === 'remove-line') {
      state.lines = state.lines.filter((l) => String(l.lineId) !== String(lineId))
      render('[data-action="add-line"]')
    } else if (action === 'add-weight' || action === 'add-time') {
      addRow(findLine(lineId), action === 'add-weight' ? 'weight' : 'time')
    } else if (action === 'remove-weight' || action === 'remove-time') {
      const line = findLine(lineId)
      const kind = action === 'remove-weight' ? 'weight' : 'time'
      ;(kind === 'weight' ? line.weights : line.times).splice(Number(index), 1)
      render(`[data-action="add-${kind}"][data-line-id="${lineId}"]`)
    }
  })

  container.addEventListener('input', (event) => {
    const { field, lineId, index } = event.target.dataset
    if (!field) return
    const value = event.target.value

    if (!lineId) {
      if (field === 'rpe') {
        state.rpe = Number(value)
        const output = container.querySelector('.rpe-input__value')
        output.innerHTML = `<strong>${state.rpe}</strong><span>${RPE_HINTS[state.rpe]}</span>`
      } else {
        state[field] = value
      }
      return
    }

    const line = findLine(lineId)
    if (field === 'weight') line.weights[Number(index)] = value
    else if (field === 'time') line.times[Number(index)] = value
    else if (field !== 'exerciseId' && field !== 'newExerciseType') line[field] = value
  })

  container.addEventListener('change', (event) => {
    const { field, lineId } = event.target.dataset
    if (field !== 'exerciseId' && field !== 'newExerciseType') return
    const line = findLine(lineId)

    if (field === 'exerciseId') {
      line.exerciseId = event.target.value
      const exercise = library.find((ex) => ex.id === line.exerciseId)
      line.type = exercise ? exercise.type : ''
    } else {
      line.newExerciseType = event.target.value
    }

    ensureFirstRow(line)
    const uid = `#line-${line.lineId}`
    if (line.exerciseId === NEW_EXERCISE && field === 'exerciseId') render(`${uid}-new-name`)
    else if (lineType(line) === 'løp') render(`${uid}-distance`)
    else if (lineType(line) === 'styrke') render(`[data-field="weight"][data-line-id="${line.lineId}"]`)
    else render(`${uid}-note`)
  })

  // Enter in a set/time row adds the next row instead of submitting the whole
  // form, so a series can be typed in without touching the mouse.
  container.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || event.target.tagName !== 'INPUT') return
    event.preventDefault()
    const { field, lineId } = event.target.dataset
    if (field === 'weight' || field === 'time') addRow(findLine(lineId), field)
  })

  container.addEventListener('submit', async (event) => {
    event.preventDefault()
    const errorEl = container.querySelector('.form__error')
    const submitBtn = container.querySelector('button[type="submit"]')
    errorEl.hidden = true
    submitBtn.disabled = true

    try {
      const payload = await buildPayload(state, library)
      let sessionId = editingId
      if (editingId) await updateSession(editingId, payload)
      else sessionId = await createSession(payload, user.id)
      notify('Økta er lagret')
      navigate(`/okt/${sessionId}`)
    } catch (error) {
      if (!error.isValidation) console.error(error)
      errorEl.textContent = error.isValidation
        ? error.message
        : 'Kunne ikke lagre økta. Sjekk nettforbindelsen og prøv igjen.'
      errorEl.hidden = false
      errorEl.scrollIntoView({ block: 'center', behavior: 'smooth' })
      submitBtn.disabled = false
    }
  })

  render()
}

// Weights and times are typed as text so both "7,14" and "7.14" work,
// whatever language the phone keyboard is set to.
function parseDecimal(value) {
  const text = String(value).trim().replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(text)) return NaN
  return Number(text)
}

function toInputValue(number) {
  return String(number).replace('.', ',')
}

function invalid(message) {
  const error = new Error(message)
  error.isValidation = true
  return error
}

async function buildPayload(state, library) {
  if (!state.title.trim()) throw invalid('Gi økta en tittel.')
  if (!state.date) throw invalid('Velg en dato.')

  // Validate every line before anything is written, so a typo further down
  // never leaves a half-created exercise behind.
  for (const [i, line] of state.lines.entries()) {
    const label = `Øvelse ${i + 1}`
    if (!line.exerciseId) throw invalid(`${label}: velg en øvelse, eller fjern linja.`)
    if (line.exerciseId === NEW_EXERCISE && !line.newExerciseName.trim()) {
      throw invalid(`${label}: skriv inn navnet på den nye øvelsen.`)
    }
    const type = lineType(line)
    if (type === 'styrke' && !line.weights.some((w) => String(w).trim() !== '')) {
      throw invalid(`${label}: fyll inn vekt for minst ett sett.`)
    }
    if (type === 'løp' && !line.distanceM) throw invalid(`${label}: fyll inn distanse.`)
    const typed = type === 'styrke' ? line.weights : type === 'løp' ? line.times : []
    const bad = typed.find((v) => String(v).trim() !== '' && Number.isNaN(parseDecimal(v)))
    if (bad !== undefined) {
      throw invalid(`${label}: «${bad}» er ikke et gyldig tall. Skriv for eksempel ${type === 'løp' ? '7,14' : '82,5'}.`)
    }
  }

  const exercises = []
  for (const line of state.lines) {
    let exerciseId = line.exerciseId
    let type = line.type

    if (line.exerciseId === NEW_EXERCISE) {
      const exercise = await findOrCreateExercise({
        name: line.newExerciseName.trim(),
        type: line.newExerciseType,
      })
      if (!library.some((ex) => ex.id === exercise.id)) library.push(exercise)
      if (exercise.type !== line.newExerciseType) {
        throw invalid(
          `«${exercise.name}» finnes allerede som ${TYPE_LABELS[exercise.type].toLowerCase()}-øvelse. Velg den fra lista i stedet.`
        )
      }
      exerciseId = exercise.id
      type = exercise.type
    }

    const entry = { exerciseId, type, note: type !== 'løp' ? line.note.trim() : '' }

    if (type === 'styrke') {
      entry.strength = {
        weights: line.weights.filter((w) => String(w).trim() !== '').map(parseDecimal),
        repsScheme: (line.repsScheme || '').trim(),
      }
    }
    if (type === 'løp') {
      entry.run = {
        distanceM: Number(line.distanceM),
        times: line.times.filter((t) => String(t).trim() !== '').map(parseDecimal),
      }
    }

    exercises.push(entry)
  }

  return {
    date: state.date,
    title: state.title.trim(),
    rpe: state.rpe,
    note: state.note.trim(),
    injuryNote: state.injuryNote.trim(),
    exercises,
  }
}
