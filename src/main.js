import './style.css'
import { supabase } from './supabaseClient.js'
import { getProfileMap } from './api/profiles.js'
import { registerRoute, startRouter, navigate } from './router.js'
import { renderLogin } from './views/login.js'
import { renderDashboard } from './views/dashboard.js'
import { renderHistory } from './views/history.js'
import { renderProgression } from './views/progression.js'
import { renderSessionDetail } from './views/sessionDetail.js'
import { renderSessionForm } from './views/sessionForm.js'
import { renderSuggestions } from './views/suggestions.js'
import { renderInjuries } from './views/injuries.js'
import { renderProgressionDetail } from './views/progressionDetail.js'

const app = document.getElementById('app')
let currentUser = null

function renderAppShell(activePath) {
  const isAthlete = currentUser.role === 'utøver'

  app.innerHTML = `
    <header class="site-header">
      <div class="site-header__row">
        <span class="site-header__mark">Løpedagboken</span>
        <button type="button" class="site-header__signout" id="signout-btn">Logg ut</button>
      </div>
      <nav class="site-nav" aria-label="Hovednavigasjon">
        <a href="#/" class="site-nav__link" data-path="/">Siste økt</a>
        <a href="#/historikk" class="site-nav__link" data-path="historikk">Historikk</a>
        <a href="#/forslag" class="site-nav__link" data-path="forslag">Forslag</a>
        <a href="#/skader" class="site-nav__link" data-path="skader">Skader</a>
        <a href="#/progresjon" class="site-nav__link" data-path="progresjon">Progresjon</a>
        ${isAthlete ? '<a href="#/okt/ny" class="site-nav__link site-nav__link--cta" data-path="ny">Logg ny økt</a>' : ''}
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

function guardAthlete(handler, activePath) {
  return guard((view, params, user) => {
    if (user.role !== 'utøver') {
      view.innerHTML = `
        <div class="empty-state">
          <h1 class="page-title">Ingen tilgang</h1>
          <p>Kun utøveren kan logge, redigere eller duplisere økter. Bruk Forslag-siden for å foreslå en økt.</p>
        </div>
      `
      return
    }
    handler(view, params, user)
  }, activePath)
}

registerRoute(/^\/$/, guard((view, params, user) => renderDashboard(view, user), '/'))
registerRoute(
  /^\/historikk$/,
  guard((view, params, user) => renderHistory(view, params, user), 'historikk')
)
registerRoute(/^\/forslag$/, guard((view, params, user) => renderSuggestions(view, params, user), 'forslag'))
registerRoute(/^\/skader$/, guard((view) => renderInjuries(view), 'skader'))
registerRoute(/^\/progresjon$/, guard((view) => renderProgression(view), 'progresjon'))
registerRoute(
  /^\/progresjon\/(?<distance>\d+)$/,
  guard((view, params) => renderProgressionDetail(view, params), 'progresjon')
)
registerRoute(
  /^\/okt\/ny$/,
  guardAthlete((view, params, user) => renderSessionForm(view, { mode: 'new' }, user), 'ny')
)
registerRoute(
  /^\/okt\/(?<id>[^/]+)\/rediger$/,
  guardAthlete((view, { id }, user) => renderSessionForm(view, { mode: 'edit', id }, user), null)
)
registerRoute(
  /^\/okt\/(?<id>[^/]+)\/dupliser$/,
  guardAthlete((view, { id }, user) => renderSessionForm(view, { mode: 'duplicate', id }, user), 'ny')
)
registerRoute(
  /^\/okt\/(?<id>[^/]+)$/,
  guard((view, { id }, user) => renderSessionDetail(view, id, user), null)
)

function renderLoginScreen() {
  renderLogin(app)
}

async function loadRole(user) {
  const profileMap = await getProfileMap()
  user.role = profileMap[user.id]?.role || null
  return user
}

async function boot() {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  currentUser = session ? session.user : null

  if (currentUser) {
    await loadRole(currentUser)
    startRouter(() => navigate('/'))
  } else {
    renderLoginScreen()
  }

  supabase.auth.onAuthStateChange(async (_event, newSession) => {
    const newUser = newSession ? newSession.user : null

    if (!newUser) {
      currentUser = null
      window.location.hash = ''
      renderLoginScreen()
      return
    }

    if (currentUser && currentUser.id === newUser.id) {
      // Same user re-announced (initial session echo, token refresh) —
      // role is already loaded on currentUser, nothing to do.
      return
    }

    currentUser = newUser
    await loadRole(currentUser)
    startRouter(() => navigate('/'))
  })
}

boot()
