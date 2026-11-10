import { supabase } from '../supabaseClient.js'

export function renderLogin(container) {
  container.innerHTML = `
    <main class="auth">
      <div class="auth__panel">
        <div class="auth__spine" aria-hidden="true"></div>
        <div class="auth__content">
          <p class="auth__brand">Løpedagboken</p>
          <h1 class="auth__title">Logg inn</h1>
          <p class="auth__subtitle">Treningsdagbok for Albin og Hilde</p>
          <form class="form auth__form" novalidate>
            <div class="field">
              <label class="field__label" for="email">E-post</label>
              <input id="email" name="email" type="email" required autocomplete="username" inputmode="email" />
            </div>
            <div class="field">
              <label class="field__label" for="password">Passord</label>
              <input id="password" name="password" type="password" required autocomplete="current-password" />
            </div>
            <p class="form__error" role="alert" hidden></p>
            <button type="submit" class="btn btn--primary btn--large btn--block">Logg inn</button>
          </form>
        </div>
      </div>
    </main>
  `

  const form = container.querySelector('.auth__form')
  const errorEl = form.querySelector('.form__error')
  const submitBtn = form.querySelector('button[type="submit"]')

  const showError = (message) => {
    errorEl.textContent = message
    errorEl.hidden = false
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    const email = form.email.value.trim()
    const password = form.password.value
    errorEl.hidden = true

    if (!email || !password) {
      showError('Fyll inn både e-post og passord.')
      return
    }

    submitBtn.disabled = true
    submitBtn.textContent = 'Logger inn …'

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    // On success the auth listener in main.js replaces this screen.
    if (!error) return

    submitBtn.disabled = false
    submitBtn.textContent = 'Logg inn'
    showError(
      error.status === 400
        ? 'Feil e-post eller passord.'
        : 'Får ikke kontakt med serveren. Sjekk nettforbindelsen og prøv igjen.'
    )
    form.password.focus()
  })
}
