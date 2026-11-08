/**
 * Global Enter-key navigation.
 *
 * Many screens only move focus with Tab. This installs a single document-level
 * listener that makes Enter behave like Tab inside the active form/panel:
 *  - Enter moves to the next visible input/select/textarea
 *  - On the last field it clicks the form's primary action (when the field
 *    belongs to a form grid / dialog)
 *  - Textareas, buttons, contenteditable and Ctrl/Alt/Meta/Shift+Enter keep
 *    their normal behaviour
 *  - Search boxes are left alone (they already filter as you type)
 *
 * Existing components that handle Enter themselves call preventDefault(), so
 * this listener only runs as a fallback for the modules that do not.
 */

const SCOPE_SELECTOR = [
  'form',
  '[data-form]',
  '[data-enter-scope]',
  '.doc-workspace',
  '.report-wrap',
  '.stock-wrap',
  '.cust-wrap',
  '.coa-form-wrap',
  '.je-wrap',
  '.je-recurring-form',
  '.je-list-wrap',
  '.banking-wrap',
  '.banking-form',
  '.admin-wrap',
  '.inv-wrap',
  '.inv-card',
  '.fa-wrap',
  '.fa-form',
  '.tax-wrap',
  '.audit-wrap',
  '.sd-wrap',
  '.sd-form',
  '.bank-recon-wrap',
  '.auth-wrap',
  '.modal',
  '.cheque-overlay',
].join(',')

// If the focused field is in one of these containers we treat the surrounding
// panel as a form and allow Enter on the last field to trigger Save/Next.
const FORM_FIELD_SELECTOR = [
  'form',
  '[data-form]',
  '[data-enter-scope]',
  '.inv-grid',
  '.coa-form-grid',
  '.items-table',
  '.inv-card',
  '.fa-form',
  '.sd-form',
  '.banking-form',
  '.modal',
  '.cheque-overlay',
].join(',')

const SKIP_INPUT_TYPES = new Set([
  'hidden', 'checkbox', 'radio', 'file', 'submit', 'button',
  'reset', 'image', 'color', 'range',
])

const isSearchField = (el: HTMLElement): boolean => {
  if (el instanceof HTMLInputElement && el.type === 'search') return true
  const cls = el.className || ''
  if (/\b(search|coa-search|list-search|header-search|mobile-menu-search)\b/.test(cls)) return true
  const placeholder = el.getAttribute('placeholder') || ''
  return placeholder.includes('🔍') || /^\s*search/i.test(placeholder)
}

const isNavigable = (el: HTMLElement): boolean => {
  if (!el || el.hasAttribute('disabled')) return false
  if (el.getAttribute('tabindex') === '-1') return false
  if (el.getAttribute('aria-hidden') === 'true') return false
  if (el.hasAttribute('data-enter-ignore')) return false
  if (el.classList.contains('no-enter-nav')) return false
  if (el.tagName === 'INPUT' && SKIP_INPUT_TYPES.has((el as HTMLInputElement).type.toLowerCase())) return false
  // Hidden tabs / collapsed sections have no offsetParent
  if (!el.offsetParent) return false
  return true
}

const focusablesIn = (root: HTMLElement): HTMLElement[] =>
  Array.from(root.querySelectorAll<HTMLElement>('input, select, textarea'))
    .filter(isNavigable)

const onEnter = (e: KeyboardEvent) => {
  if (e.key !== 'Enter' || e.defaultPrevented) return
  if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return
  if (e.isComposing) return

  const target = e.target as HTMLElement | null
  if (!target || !(target instanceof HTMLElement)) return

  const tag = target.tagName
  if (tag === 'TEXTAREA' || tag === 'BUTTON' || tag === 'A' || target.isContentEditable) return
  if (target.closest('[data-enter-ignore]')) return
  if (isSearchField(target)) return

  const scope = target.closest<HTMLElement>(SCOPE_SELECTOR)
  if (!scope) return

  const fields = focusablesIn(scope)
  const idx = fields.indexOf(target)
  if (idx === -1) return

  e.preventDefault()

  if (idx < fields.length - 1) {
    fields[idx + 1].focus()
    return
  }

  // Last field: submit only from an actual form area, never from a list header.
  if (!target.closest(FORM_FIELD_SELECTOR)) return
  const submit = scope.querySelector<HTMLButtonElement>('button.btn-primary:not([disabled])')
  if (submit) submit.click()
}

export const installEnterKeyNavigation = (): (() => void) => {
  document.addEventListener('keydown', onEnter)
  return () => document.removeEventListener('keydown', onEnter)
}
