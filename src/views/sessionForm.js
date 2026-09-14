import { listExercises, createExercise } from '../api/exercises.js'
import { getSession, createSession, updateSession } from '../api/sessions.js'
import { navigate } from '../router.js'
import { escapeHtml } from '../utils/format.js'

let exerciseLibrary = []
let lineCounter = 0

export async function renderSessionForm(container, { mode, id }, user) {
  container.innerHTML = `<p class="loading">Laster …</p>`
  exerciseLibrary = await listExercises()

  let state = {
    date: todayIso(),
    title: '',
    rpe: 5,
    note: '',
    lines: [],
  }
  let editingSessionId = null

  if (mode === 'edit' || mode === 'duplicate') {
    const session = await getSession(id)
    state = {
      date: mode === 'duplicate' ? todayIso() : session.date,
      title: session.title,
      rpe: mode === 'duplicate' ? 5 : session.rpe,
      note: mode === 'duplicate' ? '' : session.note || '',
      lines: session.exercises.map((ex) => exerciseToLine(ex)),
    }
    if (mode === 'edit') editingSessionId = session.id
  }

  renderForm(container, state, editingSessionId, user, mode)
}

function exerciseToLine(ex) {
  lineCounter += 1
  return {
    lineId: lineCounter,
    exerciseId: ex.exercise.id,
    type: ex.exercise.type,
    note: ex.note || '',
    weightKg: ex.strength ? ex.strength.weight_kg : '',
    repsScheme: ex.strength ? ex.strength.reps_scheme : '',
    distanceM: ex.run ? ex.run.distanceM : '',
    times: ex.run ? ex.run.times.map((t) => t.seconds) : [],
    newExerciseName: '',
    newExerciseType: 'styrke',
  }
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function findLine(state, lineId) {
  return state.lines.find((l) => String(l.lineId) === String(lineId))
}

function groupedExerciseOptions(selectedId) {
  const groups = { styrke: [], løp: [], annet: [] }
  exerciseLibrary.forEach((ex) => groups[ex.type]?.push(ex))
  const labels = { styrke: 'Styrke', løp: 'Løp', annet: 'Annet' }
  return Object.entries(groups)
    .map(([type, list]) => {
      if (!list.length) return ''
      const options = list
        .map(
          (ex) =>
            `<option value="${ex.id}" ${ex.id === selectedId ? 'selected' : ''}>${escapeHtml(ex.name)}</option>`
        )
        .join('')
      return `<optgroup label="${labels[type]}">${options}</optgroup>`
    })
    .join('')
}

function renderLine(line, index) {
  const isNew = line.exerciseId === '__new__'
  const type = isNew ? line.newExerciseType : line.type

  return `
    <div class="exercise-line" data-line-id="${line.lineId}">
      <div class="exercise-line__header">
        <span class="exercise-line__number">${index + 1}</span>
        <button type="button" class="exercise-line__remove" data-action="remove-line" data-line-id="${line.lineId}" aria-label="Fjern øvelse">×</button>
      </div>

      <label>Øvelse</label>
      <select data-field="exerciseId" data-line-id="${line.lineId}">
        <option value="">Velg øvelse …</option>
        ${groupedExerciseOptions(line.exerciseId)}
        <option value="__new__" ${isNew ? 'selected' : ''}>+ Ny øvelse</option>
      </select>

      ${
        isNew
          ? `
        <label>Navn på ny øvelse</label>
        <input type="text" data-field="newExerciseName" data-line-id="${line.lineId}" value="${escapeHtml(line.newExerciseName || '')}" />
        <label>Type</label>
        <select data-field="newExerciseType" data-line-id="${line.lineId}">
          <option value="styrke" ${line.newExerciseType === 'styrke' ? 'selected' : ''}>Styrke</option>
          <option value="løp" ${line.newExerciseType === 'løp' ? 'selected' : ''}>Løp</option>
          <option value="annet" ${line.newExerciseType === 'annet' ? 'selected' : ''}>Annet</option>
        </select>
      `
          : ''
      }

      ${renderTypeFields(line, type)}

      ${
        type && type !== 'løp'
          ? `
        <label>Notat (valgfritt)</label>
        <input type="text" data-field="note" data-line-id="${line.lineId}" value="${escapeHtml(line.note || '')}" />
      `
          : ''
      }
    </div>
  `
}

function renderTypeFields(line, type) {
  if (type === 'styrke') {
    return `
      <label>Tyngste sett (kg)</label>
      <input type="number" step="0.5" min="0" data-field="weightKg" data-line-id="${line.lineId}" value="${line.weightKg ?? ''}" />
      <label>Sett/reps</label>
      <input type="text" placeholder="f.eks. 5×3" data-field="repsScheme" data-line-id="${line.lineId}" value="${escapeHtml(line.repsScheme || '')}" />
    `
  }
  if (type === 'løp') {
    return `
      <label>Distanse (m)</label>
      <input type="number" step="1" min="0" data-field="distanceM" data-line-id="${line.lineId}" value="${line.distanceM ?? ''}" />
      <label>Tider (sekunder per rep)</label>
      <div class="time-list">
        ${line.times
          .map(
            (t, i) => `
          <div class="time-list__row">
            <input type="number" step="0.01" min="0" data-field="time" data-line-id="${line.lineId}" data-time-index="${i}" value="${t}" />
            <button type="button" data-action="remove-time" data-line-id="${line.lineId}" data-time-index="${i}" aria-label="Fjern tid">×</button>
          </div>
        `
          )
          .join('')}
      </div>
      <button type="button" class="add-time-btn" data-action="add-time" data-line-id="${line.lineId}">+ Legg til tid</button>
    `
  }
  return ''
}

function renderForm(container, state, editingSessionId, user, mode) {
  container.innerHTML = `
    <div class="session-form-page">
      <h1 class="page-title">${mode === 'edit' ? 'Rediger økt' : 'Ny økt'}</h1>
      <form id="session-form" class="session-form" novalidate>
        <div class="field-row">
          <div class="field">
            <label for="field-date">Dato</label>
            <input id="field-date" type="date" data-field="date" value="${state.date}" required />
          </div>
          <div class="field field--grow">
            <label for="field-title">Tittel</label>
            <input id="field-title" type="text" data-field="title" value="${escapeHtml(state.title)}" placeholder="f.eks. Sprintdag" required />
          </div>
        </div>

        <div class="field">
          <label for="field-rpe">RPE (1–10): <span id="rpe-value">${state.rpe}</span></label>
          <input id="field-rpe" type="range" min="1" max="10" step="1" data-field="rpe" value="${state.rpe}" />
        </div>

        <div class="field">
          <label for="field-note">Notat</label>
          <textarea id="field-note" data-field="sessionNote" rows="3" placeholder="Følelse, søvn, energi …">${escapeHtml(state.note)}</textarea>
        </div>

        <hr class="hard-rule" />

        <h2 class="section-title">Øvelser</h2>
        <div id="exercise-lines">
          ${state.lines.map((line, i) => renderLine(line, i)).join('') || '<p class="empty-hint">Ingen øvelser lagt til ennå.</p>'}
        </div>
        <button type="button" class="add-exercise-btn" data-action="add-line">+ Legg til øvelse</button>

        <hr class="hard-rule" />

        <div class="form-actions">
          <button type="submit" class="auth-submit" id="submit-btn">${mode === 'edit' ? 'Lagre endringer' : 'Lagre økt'}</button>
          <p class="form-error" id="form-error" role="alert" hidden></p>
        </div>
      </form>
    </div>
  `

  wireForm(container, state, editingSessionId, user, mode)
}

function wireForm(container, state, editingSessionId, user, mode) {
  const form = container.querySelector('#session-form')
  const rerender = () => renderForm(container, state, editingSessionId, user, mode)

  form.querySelector('[data-field="date"]').addEventListener('input', (e) => {
    state.date = e.target.value
  })
  form.querySelector('[data-field="title"]').addEventListener('input', (e) => {
    state.title = e.target.value
  })
  form.querySelector('[data-field="rpe"]').addEventListener('input', (e) => {
    state.rpe = Number(e.target.value)
    container.querySelector('#rpe-value').textContent = state.rpe
  })
  form.querySelector('[data-field="sessionNote"]').addEventListener('input', (e) => {
    state.note = e.target.value
  })

  container.querySelector('[data-action="add-line"]').addEventListener('click', () => {
    lineCounter += 1
    state.lines.push({
      lineId: lineCounter,
      exerciseId: '',
      type: '',
      note: '',
      weightKg: '',
      repsScheme: '',
      distanceM: '',
      times: [],
      newExerciseName: '',
      newExerciseType: 'styrke',
    })
    rerender()
  })

  container.querySelectorAll('[data-action="remove-line"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const lineId = btn.dataset.lineId
      state.lines = state.lines.filter((l) => String(l.lineId) !== String(lineId))
      rerender()
    })
  })

  container.querySelectorAll('[data-action="add-time"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      findLine(state, btn.dataset.lineId).times.push('')
      rerender()
    })
  })

  container.querySelectorAll('[data-action="remove-time"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      findLine(state, btn.dataset.lineId).times.splice(Number(btn.dataset.timeIndex), 1)
      rerender()
    })
  })

  container.querySelectorAll('select[data-field="exerciseId"]').forEach((sel) => {
    sel.addEventListener('change', () => {
      const line = findLine(state, sel.dataset.lineId)
      line.exerciseId = sel.value
      if (sel.value === '__new__') {
        line.type = ''
      } else {
        const ex = exerciseLibrary.find((e) => e.id === sel.value)
        line.type = ex ? ex.type : ''
      }
      rerender()
    })
  })

  container.querySelectorAll('select[data-field="newExerciseType"]').forEach((sel) => {
    sel.addEventListener('change', () => {
      findLine(state, sel.dataset.lineId).newExerciseType = sel.value
      rerender()
    })
  })
  ;['newExerciseName', 'weightKg', 'repsScheme', 'distanceM', 'note'].forEach((field) => {
    container.querySelectorAll(`[data-field="${field}"]`).forEach((input) => {
      input.addEventListener('input', () => {
        findLine(state, input.dataset.lineId)[field] = input.value
      })
    })
  })

  container.querySelectorAll('input[data-field="time"]').forEach((input) => {
    input.addEventListener('input', () => {
      const line = findLine(state, input.dataset.lineId)
      line.times[Number(input.dataset.timeIndex)] = input.value
    })
  })

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    const errorEl = container.querySelector('#form-error')
    errorEl.hidden = true
    const submitBtn = container.querySelector('#submit-btn')
    submitBtn.disabled = true

    try {
      const payload = await buildPayload(state)
      let sessionId
      if (mode === 'edit') {
        await updateSession(editingSessionId, payload)
        sessionId = editingSessionId
      } else {
        sessionId = await createSession(payload, user.id)
      }
      navigate(`/okt/${sessionId}`)
    } catch (err) {
      errorEl.textContent = err.message || 'Noe gikk galt. Prøv igjen.'
      errorEl.hidden = false
      submitBtn.disabled = false
    }
  })
}

async function buildPayload(state) {
  if (!state.title.trim()) throw new Error('Tittel må fylles ut.')
  if (!state.date) throw new Error('Dato må fylles ut.')

  const exercises = []
  for (const line of state.lines) {
    if (!line.exerciseId) throw new Error('Velg eller opprett en øvelse for hver linje.')

    let exerciseId = line.exerciseId
    let type = line.type

    if (line.exerciseId === '__new__') {
      if (!line.newExerciseName || !line.newExerciseName.trim()) {
        throw new Error('Navn på ny øvelse må fylles ut.')
      }
      const created = await createExercise({
        name: line.newExerciseName.trim(),
        type: line.newExerciseType,
      })
      exerciseLibrary.push(created)
      exerciseId = created.id
      type = created.type
    }

    const entry = { exerciseId, type, note: type !== 'løp' ? line.note || '' : '' }

    if (type === 'styrke') {
      if (!line.weightKg) throw new Error('Fyll ut tyngste sett for styrkeøvelser.')
      entry.strength = {
        weightKg: Number(line.weightKg),
        repsScheme: line.repsScheme || '',
      }
    }

    if (type === 'løp') {
      if (!line.distanceM) throw new Error('Fyll ut distanse for løpsøvelser.')
      entry.run = {
        distanceM: Number(line.distanceM),
        times: line.times.filter((t) => t !== '').map(Number),
      }
    }

    exercises.push(entry)
  }

  return {
    date: state.date,
    title: state.title.trim(),
    rpe: state.rpe,
    note: state.note || '',
    exercises,
  }
}
