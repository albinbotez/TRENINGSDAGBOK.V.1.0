import './style.css'
import { supabase } from './supabaseClient.js'

const app = document.getElementById('app')

function renderShell(innerHtml) {
  app.innerHTML = `
    <header class="site-header">
      <span class="site-header__mark">Løpedagboken</span>
    </header>
    ${innerHtml}
  `
}

function renderLogin(errorMessage = '') {
  renderShell(`
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
            ${
              errorMessage
                ? `<p class="auth-error" role="alert">${errorMessage}</p>`
                : ''
            }
          </form>
        </div>
      </div>
    </main>
  `)

  const form = document.getElementById('login-form')
  form.addEventListener('submit', handleLogin)
}

function renderSignedIn(user) {
  renderShell(`
    <main class="session-placeholder">
      <div class="session-placeholder__block">
        <h1 class="auth-title">Innlogget</h1>
        <p>${user.email} — dashbordet kommer i neste steg.</p>
        <button type="button" class="session-signout" id="signout-btn">Logg ut</button>
      </div>
    </main>
  `)

  document.getElementById('signout-btn').addEventListener('click', async () => {
    await supabase.auth.signOut()
  })
}

async function handleLogin(event) {
  event.preventDefault()
  const form = event.currentTarget
  const submitButton = form.querySelector('.auth-submit')
  const email = form.email.value.trim()
  const password = form.password.value

  submitButton.disabled = true

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    renderLogin('Feil e-post eller passord.')
    return
  }
}

async function init() {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) {
    renderSignedIn(session.user)
  } else {
    renderLogin()
  }

  supabase.auth.onAuthStateChange((_event, newSession) => {
    if (newSession) {
      renderSignedIn(newSession.user)
    } else {
      renderLogin()
    }
  })
}

init()
