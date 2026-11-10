import '@fontsource/big-shoulders-display/latin-700'
import '@fontsource/big-shoulders-display/latin-800'
import '@fontsource/space-grotesk/latin-400'
import '@fontsource/space-grotesk/latin-500'
import '@fontsource/space-grotesk/latin-600'
import '@fontsource/space-grotesk/latin-700'
import './style.css'
import { supabase } from './supabaseClient.js'
import { getProfileMap } from './api/profiles.js'
import { registerRoute, startRouter, navigate } from './router.js'
import { escapeHtml } from './utils/format.js'
import { renderLogin } from './views/login.js'
import { renderDashboard } from './views/dashboard.js'
import { renderHistory } from './views/history.js'
import { renderProgression } from './views/progression.js'
import { renderProgressionDetail } from './views/progressionDetail.js'
import { renderSessionDetail } from './views/sessionDetail.js'
import { renderSessionForm } from './views/sessionForm.js'
import { renderSuggestions } from './views/suggestions.js'
import { renderInjuries } from './views/injuries.js'
import { renderExport } from './views/export.js'

const APP_NAME = 'Løpedagboken'

const NAV_ITEMS = [
  { key: 'oversikt', href: '#/', label: 'Oversikt' },
  { key: 'historikk', href: '#/historikk', label: 'Historikk' },
  { key: 'progresjon', href: '#/progresjon', label: 'Progresjon' },
  { key: 'skader', href: '#/skader', label: 'Skader' },
  { key: 'forslag', href: '#/forslag', label: 'Forslag' },
]

const app = document.getElementById('app')
let currentUser = null

const isAthlete = () => currentUser?.role === 'utøver'

function navLinks(className) {
  return NAV_ITEMS.map(
    (item) => `<a href="${item.href}" class="${className}" data-nav="${item.key}">${item.label}</a>`
  ).join('')
}

function ensureShell() {
  if (app.querySelector('.app-header')) return

  const roleLabel = currentUser.role === 'utøver' ? 'Utøver' : currentUser.role === 'trener' ? 'Trener' : ''

  app.innerHTML = `
    <header class="app-header">
      <div class="app-header__inner">
        <a href="#/" class="brand">${APP_NAME}</a>
        <nav class="primary-nav" aria-label="Hovednavigasjon">
          ${navLinks('primary-nav__link')}
        </nav>
        <div class="app-header__tools">
          <span class="user-chip">
            <span class="user-chip__name">${escapeHtml(currentUser.displayName || currentUser.email)}</span>
            ${roleLabel ? `<span class="user-chip__role">${roleLabel}</span>` : ''}
          </span>
          ${isAthlete() ? '<a href="#/okt/ny" class="btn btn--primary app-header__cta">Logg økt</a>' : ''}
          <button type="button" class="btn btn--quiet" id="signout-btn">Logg ut</button>
        </div>
      </div>
    </header>
    <main id="view" class="view" tabindex="-1"></main>
    <nav class="tabbar" aria-label="Hovednavigasjon">
      ${navLinks('tabbar__link')}
    </nav>
  `

  app.querySelector('#signout-btn').addEventListener('click', () => supabase.auth.signOut())
}

// Each navigation gets a fresh <main>, so a slow request from the previous
// page can never paint into the page the user has moved on to.
function mountView(navKey, title) {
  ensureShell()

  const previous = app.querySelector('#view')
  const view = previous.cloneNode(false)
  previous.replaceWith(view)

  app.querySelectorAll('[data-nav]').forEach((link) => {
    const active = link.dataset.nav === navKey
    link.classList.toggle('is-active', active)
    if (active) link.setAttribute('aria-current', 'page')
    else link.removeAttribute('aria-current')
  })

  document.title = title ? `${title} – ${APP_NAME}` : APP_NAME
  window.scrollTo(0, 0)
  return view
}

function renderRouteError(view, retry) {
  view.innerHTML = `
    <div class="state state--error" role="alert">
      <h2 class="state__title">Noe gikk galt</h2>
      <p class="state__text">Kunne ikke hente dataene. Sjekk nettforbindelsen og prøv igjen.</p>
      <button type="button" class="btn btn--primary" data-action="retry">Prøv igjen</button>
    </div>
  `
  view.querySelector('[data-action="retry"]').addEventListener('click', retry)
}

function route(handler, { nav = null, title = '', athleteOnly = false } = {}) {
  const run = (params) => {
    if (!currentUser) return
    const view = mountView(nav, title)

    if (athleteOnly && !isAthlete()) {
      view.innerHTML = `
        <div class="state state--empty">
          <h2 class="state__title">Ingen tilgang</h2>
          <p class="state__text">Bare utøveren kan logge og endre økter. Bruk Forslag for å foreslå en økt.</p>
          <a href="#/forslag" class="btn btn--primary">Gå til forslag</a>
        </div>
      `
      return
    }

    Promise.resolve()
      .then(() => handler(view, params, currentUser))
      .catch((error) => {
        console.error(error)
        renderRouteError(view, () => run(params))
      })
  }
  return run
}

registerRoute(/^\/$/, route((view, _p, user) => renderDashboard(view, user), { nav: 'oversikt', title: 'Oversikt' }))
registerRoute(
  /^\/historikk$/,
  route((view, _p, user) => renderHistory(view, user), { nav: 'historikk', title: 'Historikk' })
)
registerRoute(/^\/eksport$/, route((view) => renderExport(view), { nav: 'historikk', title: 'Eksport' }))
registerRoute(
  /^\/forslag$/,
  route((view, _p, user) => renderSuggestions(view, user), { nav: 'forslag', title: 'Forslag' })
)
registerRoute(/^\/skader$/, route((view) => renderInjuries(view), { nav: 'skader', title: 'Skader' }))
registerRoute(
  /^\/progresjon$/,
  route((view) => renderProgression(view), { nav: 'progresjon', title: 'Progresjon' })
)
registerRoute(
  /^\/progresjon\/(?<distance>\d+)$/,
  route((view, params) => renderProgressionDetail(view, params), { nav: 'progresjon', title: 'Progresjon' })
)
registerRoute(
  /^\/okt\/ny(?:\/(?<date>\d{4}-\d{2}-\d{2}))?$/,
  route((view, { date }, user) => renderSessionForm(view, { mode: 'new', date }, user), {
    title: 'Ny økt',
    athleteOnly: true,
  })
)
registerRoute(
  /^\/okt\/(?<id>[^/]+)\/rediger$/,
  route((view, { id }, user) => renderSessionForm(view, { mode: 'edit', id }, user), {
    title: 'Rediger økt',
    athleteOnly: true,
  })
)
registerRoute(
  /^\/okt\/(?<id>[^/]+)\/dupliser$/,
  route((view, { id }, user) => renderSessionForm(view, { mode: 'duplicate', id }, user), {
    title: 'Ny økt',
    athleteOnly: true,
  })
)
registerRoute(
  /^\/okt\/(?<id>[^/]+)$/,
  route((view, { id }, user) => renderSessionDetail(view, id, user), { nav: 'historikk', title: 'Økt' })
)

function showLogin() {
  document.title = APP_NAME
  renderLogin(app)
}

async function loadProfile(user) {
  const profile = (await getProfileMap())[user.id]
  user.role = profile?.role || null
  user.displayName = profile?.display_name || null
  return user
}

async function enterApp(user) {
  currentUser = user
  try {
    await loadProfile(user)
  } catch (error) {
    console.error(error)
    app.innerHTML = `
      <div class="boot-error" role="alert">
        <h1 class="state__title">Får ikke kontakt med databasen</h1>
        <p class="state__text">Sjekk nettforbindelsen og last siden på nytt.</p>
        <button type="button" class="btn btn--primary" id="reload-btn">Last på nytt</button>
      </div>
    `
    app.querySelector('#reload-btn').addEventListener('click', () => window.location.reload())
    return
  }
  startRouter(() => navigate('/'))
}

async function boot() {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) await enterApp(session.user)
  else showLogin()

  supabase.auth.onAuthStateChange((_event, newSession) => {
    const newUser = newSession ? newSession.user : null

    if (!newUser) {
      currentUser = null
      window.location.hash = ''
      showLogin()
      return
    }

    // Same user re-announced (initial session echo, token refresh): the
    // profile is already loaded on currentUser, so there is nothing to do.
    if (currentUser && currentUser.id === newUser.id) return

    enterApp(newUser)
  })
}

boot()
