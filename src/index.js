import React from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import 'core-js'

import App from './App'
import store from './store'
import { installApiClient } from './api/apiClient'
import { registerAppServiceWorker } from './lib/serviceWorkerRegistration'

installApiClient()

createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <App />
  </Provider>,
)

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    registerAppServiceWorker().catch(() => {})
  })
}
