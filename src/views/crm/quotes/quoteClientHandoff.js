export const LAST_CREATED_CLIENT_ID_KEY = 'lastCreatedClientId'
export const LAST_CREATED_CLIENT_NAME_KEY = 'lastCreatedClientName'
export const CAME_FROM_QUOTE_KEY = 'cameFromQuote'

const getStorage = (storage) => {
  if (storage) return storage
  return typeof sessionStorage !== 'undefined' ? sessionStorage : null
}

const getItem = (key, storage) => {
  const activeStorage = getStorage(storage)
  if (!activeStorage || typeof activeStorage.getItem !== 'function') return ''

  try {
    return activeStorage.getItem(key) || ''
  } catch {
    return ''
  }
}

const setItem = (key, value, storage) => {
  const activeStorage = getStorage(storage)
  if (!activeStorage || typeof activeStorage.setItem !== 'function') return false

  try {
    activeStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

const removeItem = (key, storage) => {
  const activeStorage = getStorage(storage)
  if (!activeStorage || typeof activeStorage.removeItem !== 'function') return false

  try {
    activeStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}

export const readPendingCreatedClient = (storage) => ({
  id: getItem(LAST_CREATED_CLIENT_ID_KEY, storage),
  name: getItem(LAST_CREATED_CLIENT_NAME_KEY, storage),
})

export const hasPendingCreatedClient = (storage) => {
  const pending = readPendingCreatedClient(storage)
  return Boolean(pending.id || pending.name)
}

export const clearPendingCreatedClient = (storage) => {
  removeItem(LAST_CREATED_CLIENT_ID_KEY, storage)
  removeItem(LAST_CREATED_CLIENT_NAME_KEY, storage)
}

export const markCameFromQuote = (storage) => setItem(CAME_FROM_QUOTE_KEY, 'true', storage)
