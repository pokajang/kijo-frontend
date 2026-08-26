let dialogImpl = null

export const registerDialogImpl = (impl) => {
  dialogImpl = impl
}

const fallbackResult = (type, options = {}) => {
  if (type === 'confirm') return false
  if (type === 'prompt') return null
  if (type === 'choice') return options.dismissAction || options.actions?.[0]?.key || null
  return undefined
}

const normalizeOptions = (type, options) => {
  if (type === 'prompt') {
    if (options && typeof options === 'object' && !Array.isArray(options)) {
      return options
    }
    return { defaultValue: options == null ? '' : String(options) }
  }

  if (options && typeof options === 'object' && !Array.isArray(options)) {
    return options
  }
  return {}
}

const invoke = (type, message, options = {}) => {
  if (!dialogImpl || typeof dialogImpl[type] !== 'function') {
    console.error(`Dialog service is not ready for "${type}".`)
    return Promise.resolve(fallbackResult(type, options))
  }
  return dialogImpl[type](message, normalizeOptions(type, options))
}

const dialog = {
  alert: (message, options) => invoke('alert', message, options),
  choice: (message, options) => invoke('choice', message, options),
  confirm: (message, options) => invoke('confirm', message, options),
  prompt: (message, options) => invoke('prompt', message, options),
}

export default dialog
