const routes = []
let started = false

export function registerRoute(pattern, handler) {
  routes.push({ pattern, handler })
}

function matchRoute(hash) {
  for (const { pattern, handler } of routes) {
    const match = pattern.exec(hash)
    if (match) return { handler, params: match.groups || {} }
  }
  return null
}

export function navigate(path) {
  window.location.hash = path
}

export function startRouter(fallback) {
  const render = () => {
    const hash = window.location.hash.slice(1) || '/'
    const matched = matchRoute(hash)
    if (matched) {
      matched.handler(matched.params)
    } else {
      fallback()
    }
  }

  if (!started) {
    window.addEventListener('hashchange', render)
    started = true
  }

  render()
}
