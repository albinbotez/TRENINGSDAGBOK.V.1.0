import { supabase } from '../supabaseClient.js'

export function renderLogin(container, errorMessage = '') {
  container.innerHTML = `
    <header class="site-header">
      <span class="site-header__mark">Løpedagboken</span>
    </header>
    <main class="auth-screen">
      <div class="auth-block">
        <div class="auth-block__spine" aria-hidden="true"></div>
        <div class="auth-block__content">
          <h1 class="auth-title">Logg inn</h1>
          <p class="auth-subtitle">For utøveren og treneren</p>
          <form id="login-form" class="auth-form" novalidate>
            <label for="email">E-post</label>
            <input id="email" name="email" type="email" required autocomplete="username" />
            <label for="password">Passord</label>
            <input id="password" name="password" type="password" required autocomplete="current-password" />
            <button type="submit" class="auth-submit">Logg inn</button>
            ${errorMessage ? `<p class="auth-error" role="alert">${errorMessage}</p>` : ''}
          </form>
        </div>
      </div>
    </main>
  `

  document.getElementById('login-form').addEventListener('submit', handleLogin(container))
}

function handleLogin(container) {
  return async (event) => {
    event.preventDefault()
    const form = event.currentTarget
    const submitButton = form.querySelector('.auth-submit')
    const email = form.email.value.trim()
    const password = form.password.value
    submitButton.disabled = true

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      renderLogin(container, 'Feil e-post eller passord.')
    }
  }
}
