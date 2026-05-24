import '@testing-library/jest-dom/vitest'

const createMemoryStorage = () => {
  const store = new Map()

  return {
    get length() {
      return store.size
    },
    clear: () => store.clear(),
    getItem: (key) => (store.has(String(key)) ? store.get(String(key)) : null),
    key: (index) => Array.from(store.keys())[index] || null,
    removeItem: (key) => store.delete(String(key)),
    setItem: (key, value) => store.set(String(key), String(value)),
  }
}

if (typeof window !== 'undefined') {
  const testLocalStorage = createMemoryStorage()

  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: testLocalStorage,
  })

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: testLocalStorage,
  })
}
