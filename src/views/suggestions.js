import { listSuggestions, createSuggestion, deleteSuggestion } from '../api/suggestions.js'
import { getProfileMap } from '../api/profiles.js'
import { confirmDialog, notify } from '../ui/feedback.js'
import { escapeHtml, formatDateTime } from '../utils/format.js'
import { renderLoading, renderPageHead } from './shared.js'

export async function renderSuggestions(container, user) {
  container.innerHTML = `
    ${renderPageHead('Forslag', { meta: 'Korte beskjeder og øktforslag mellom utøver og trener' })}
    <form class="form suggestion-form" novalidate>
      <div class="field">
        <label class="field__label" for="suggestion-text">Nytt forslag</label>
        <textarea id="suggestion-text" rows="3" maxlength="2000" placeholder="f.eks. 5 × 150 m i morgen, fokus på de første 30 meterne"></textarea>
      </div>
      <p class="form__error" role="alert" hidden></p>
      <button type="submit" class="btn btn--primary">Send forslag</button>
    </form>
    <section class="section" aria-label="Tidligere forslag" data-mount="list">${renderLoading()}</section>
  `

  const listMount = container.querySelector('[data-mount="list"]')
  const form = container.querySelector('.suggestion-form')
  const textarea = form.querySelector('textarea')
  const errorEl = form.querySelector('.form__error')

  async function loadList() {
    const [suggestions, profileMap] = await Promise.all([listSuggestions(), getProfileMap()])
    listMount.innerHTML = suggestions.length
      ? `<ul class="log-list">${suggestions.map((s) => renderItem(s, profileMap, user)).join('')}</ul>`
      : '<p class="muted">Ingen forslag ennå.</p>'
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    const text = textarea.value.trim()
    errorEl.hidden = true
    if (!text) {
      errorEl.textContent = 'Skriv inn et forslag først.'
      errorEl.hidden = false
      textarea.focus()
      return
    }

    const submitBtn = form.querySelector('button[type="submit"]')
    submitBtn.disabled = true
    try {
      await createSuggestion(text, user.id)
      textarea.value = ''
      await loadList()
      notify('Forslaget er sendt')
    } catch (error) {
      console.error(error)
      errorEl.textContent = 'Kunne ikke sende forslaget. Prøv igjen.'
      errorEl.hidden = false
    } finally {
      submitBtn.disabled = false
    }
  })

  listMount.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action="delete-suggestion"]')
    if (!button) return

    const confirmed = await confirmDialog({
      title: 'Slette forslaget?',
      message: 'Forslaget fjernes for begge. Dette kan ikke angres.',
    })
    if (!confirmed) return

    try {
      await deleteSuggestion(button.dataset.id)
      await loadList()
      notify('Forslaget er slettet')
    } catch (error) {
      console.error(error)
      notify('Kunne ikke slette forslaget. Prøv igjen.')
    }
  })

  await loadList()
}

function renderItem(suggestion, profileMap, user) {
  const author = profileMap[suggestion.created_by]
  const mine = suggestion.created_by === user.id
  return `
    <li class="log-item ${mine ? '' : 'log-item--incoming'}">
      <div class="log-item__head">
        ${author ? `<span class="tag ${mine ? '' : 'tag--solid'}">${escapeHtml(author.display_name)}</span>` : ''}
        <span class="log-item__date">${formatDateTime(suggestion.created_at)}</span>
      </div>
      <p class="log-item__text">${escapeHtml(suggestion.text)}</p>
      ${mine ? `<button type="button" class="link-action" data-action="delete-suggestion" data-id="${suggestion.id}">Slett</button>` : ''}
    </li>
  `
}
