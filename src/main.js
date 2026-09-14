import './style.css'
import { supabase } from './supabaseClient.js'
import { registerRoute, startRouter, navigate } from './router.js'
import { renderLogin } from './views/login.js'
import { renderDashboard } from './views/dashboard.js'
import { renderHistory } from './views/history.js'
import { renderProgression } from './views/progression.js'
import { renderSessionDetail } from './views/sessionDetail.js'
import { renderSessionForm } from './views/sessionForm.js'

const app = document.getElementById('app')
let currentUser = null

function renderAppShell(activePath) {
  app.innerHTML = `
    <header class="site-header">
      <div class="site-header__row">
        <span class="site-header__mark">Løpedagboken</span>
        <button type="button" class="site-header__signout" id="signout-btn">Logg ut</button>
      </div>
      <nav class="site-nav" aria-label="Hovednavigasjon">
        <a href="#/" class="site-nav__link" data-path="/">Siste økt</a>
        <a href="#/historikk" class="site-nav__link" data-path="historikk">Historikk</a>
        <a href="#/progresjon" class="site-nav__link" data-path="progresjon">Progresjon</a>
        <a href="#/okt/ny" class="site-nav__link site-nav__link--cta" data-path="ny">Logg ny økt</a>
      </nav>
    </header>
    <main id="view"></main>
  `

  document.getElementById('signout-btn').addEventListener('click', async () => {
    await supabase.auth.signOut()
  })

  app.querySelectorAll('.site-nav__link').forEach((link) => {
    if (link.dataset.path === activePath) {
      link.classList.add('site-nav__link--active')
    }
  })
}

function getView() {
  return document.getElementById('view')
}

function guard(handler, activePath) {
  return (params) => {
    if (!currentUser) return
    renderAppShell(activePath)
    handler(getView(), params, currentUser)
  }
}

registerRoute(/^\/$/, guard((view) => renderDashboard(view), '/'))
registerRoute(/^\/historikk$/, guard((view) => renderHistory(view), 'historikk'))
registerRoute(/^\/progresjon$/, guard((view) => renderProgression(view), 'progresjon'))
registerRoute(
  /^\/okt\/ny$/,
  guard((view, params, user) => renderSessionForm(view, { mode: 'new' }, user), 'ny')
)
registerRoute(
  /^\/okt\/(?<id>[^/]+)\/rediger$/,
  guard((view, { id }, user) => renderSessionForm(view, { mode: 'edit', id }, user), null)
)
registerRoute(
  /^\/okt\/(?<id>[^/]+)\/dupliser$/,
  guard((view, { id }, user) => renderSessionForm(view, { mode: 'duplicate', id }, user), 'ny')
)
registerRoute(
  /^\/okt\/(?<id>[^/]+)$/,
  guard((view, { id }, user) => renderSessionDetail(view, id, user), null)
)

function renderLoginScreen() {
  renderLogin(app)
}

async function boot() {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  currentUser = session ? session.user : null

  if (currentUser) {
    startRouter(() => navigate('/'))
  } else {
    renderLoginScreen()
  }

  supabase.auth.onAuthStateChange((_event, newSession) => {
    const wasAuthed = !!currentUser
    currentUser = newSession ? newSession.user : null

    if (currentUser && !wasAuthed) {
      startRouter(() => navigate('/'))
    } else if (!currentUser) {
      window.location.hash = ''
      renderLoginScreen()
    }
  })
}

boot()
