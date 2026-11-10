import { escapeHtml } from '../utils/format.js'

// Resolves true when the user confirms, false on cancel or Escape.
export function confirmDialog({ title, message, confirmLabel = 'Slett', cancelLabel = 'Avbryt' }) {
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog')
    dialog.className = 'dialog'
    dialog.innerHTML = `
      <form method="dialog" class="dialog__body">
        <h2 class="dialog__title">${escapeHtml(title)}</h2>
        <p class="dialog__message">${escapeHtml(message)}</p>
        <div class="dialog__actions">
          <button type="submit" value="cancel" class="btn">${escapeHtml(cancelLabel)}</button>
          <button type="submit" value="confirm" class="btn btn--primary">${escapeHtml(confirmLabel)}</button>
        </div>
      </form>
    `
    dialog.addEventListener('close', () => {
      resolve(dialog.returnValue === 'confirm')
      dialog.remove()
    })
    document.body.appendChild(dialog)
    dialog.showModal()
  })
}

let toastTimer = null

export function notify(message) {
  let region = document.getElementById('toast-region')
  if (!region) {
    region = document.createElement('div')
    region.id = 'toast-region'
    region.className = 'toast-region'
    region.setAttribute('role', 'status')
    region.setAttribute('aria-live', 'polite')
    document.body.appendChild(region)
  }
  region.innerHTML = `<p class="toast">${escapeHtml(message)}</p>`
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    region.innerHTML = ''
  }, 3500)
}
