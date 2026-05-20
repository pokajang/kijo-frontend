export const APP_NOTIFICATIONS_CHANGED_EVENT = 'app-notifications:changed'

export const dispatchAppNotificationsChanged = () => {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(APP_NOTIFICATIONS_CHANGED_EVENT))
}
