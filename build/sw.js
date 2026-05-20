const CACHE_NAME = 'kijo-shell-v1'
const APP_SHELL = [
  '/',
  '/manifest.json',
  '/meta.json',
  '/favicon.ico',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.allSettled(APP_SHELL.map((url) => cache.add(url))).then(() => undefined),
      ),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

const isCacheableRequest = (requestUrl, request) => {
  if (request.method !== 'GET') return false
  if (requestUrl.origin !== self.location.origin) return false
  if (requestUrl.pathname.startsWith('/proxy')) return false
  if (requestUrl.pathname.startsWith('/api')) return false
  if (requestUrl.pathname.startsWith('/sanctum')) return false

  return (
    request.mode === 'navigate' ||
    ['document', 'script', 'style', 'image', 'font'].includes(request.destination)
  )
}

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url)
  if (!isCacheableRequest(requestUrl, event.request)) return

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put('/', copy))
          return response
        })
        .catch(async () => {
          const cached = await caches.match(event.request)
          return cached || caches.match('/')
        }),
    )
    return
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
          }
          return response
        })
        .catch(() => cached)

      return cached || networkFetch
    }),
  )
})
