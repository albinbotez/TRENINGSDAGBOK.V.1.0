import { listSuggestions, createSuggestion, deleteSuggestion } from '../api/suggestions.js'
import { getProfileMap } from '../api/profiles.js'
import { formatDateTime, escapeHtml } from '../utils/format.js'

export async function renderSuggestions(container, params, user) {
  container.innerHTML = `<p class="loading">Laster …</p>`

  const [suggestions, profileMap] = await Promise.all([listSuggestions(), getProfileMap()])

  container.innerHTML = `
    <div class="suggestions-page">
      <h1 class="page-title">Forslag</h1>
      <form id="suggestion-form" class="suggestion-form">
        <label for="suggestion-text">Nytt forslag</label>
        <textarea id="suggestion-text" rows="3" placeholder="f.eks. Kjør 5x150m i dag, fokuser på oppstart …" required></textarea>
        <button type="submit" class="auth-submit">Post forslag</button>
      </form>
      <hr class="hard-rule" />
      <ul class="suggestion-list">
        ${
          suggestions.length
            ? suggestions.map((s) => renderSuggestionItem(s, profileMap)).join('')
            : '<p class="empty-hint">Ingen forslag ennå.</p>'
        }
      </ul>
    </div>
  `

  wireForm(container, params, user)
  wireDeleteButtons(container, params, user)
}

function renderSuggestionItem(suggestion, profileMap) {
  const author = profileMap[suggestion.created_by]
  return `
    <li class="suggestion-bubble">
      <div class="suggestion-bubble__head">
        ${author ? `<span class="badge">${escapeHtml(author.display_name)}</span>` : ''}
        <span class="suggestion-bubble__date">${formatDateTime(suggestion.created_at)}</span>
      </div>
      <p class="suggestion-bubble__text">${escapeHtml(suggestion.text)}</p>
      <button type="button" class="text-link text-link--danger" data-action="delete-suggestion" data-id="${suggestion.id}">Slett</button>
    </li>
  `
}

function wireForm(container, params, user) {
  const form = container.querySelector('#suggestion-form')
  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    const textarea = container.querySelector('#suggestion-text')
    const text = textarea.value.trim()
    if (!text) return

    const submitBtn = form.querySelector('.auth-submit')
    submitBtn.disabled = true

    await createSuggestion(text, user.id)
    renderSuggestions(container, params, user)
  })
}

function wireDeleteButtons(container, params, user) {
  container.querySelectorAll('[data-action="delete-suggestion"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!window.confirm('Slette dette forslaget?')) return
      await deleteSuggestion(btn.dataset.id)
      renderSuggestions(container, params, user)
    })
  })
}
