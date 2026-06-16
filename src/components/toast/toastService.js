export const toastEvents = {
  name: 'kijo:toast',
}

export const TOAST_DELAYS = {
  success: 4000,
  info: 4000,
  warning: 6000,
  danger: 8000,
}

export const getToastDelay = (color = 'success') => TOAST_DELAYS[color] || TOAST_DELAYS.success

export const showToast = (message) => {
  if (!message || typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent(toastEvents.name, {
      detail: {
        type: 'toast',
        message,
      },
    }),
  )
}
