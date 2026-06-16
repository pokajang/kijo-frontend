import React, { Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './scss/style.scss'
import './scss/workload.scss'
import './scss/custom.scss'

import { CSpinner, useColorModes } from '@coreui/react'

import { Chart } from 'chart.js'
import { getStyle } from '@coreui/utils'
import AuthProvider from './auth/AuthProvider'
import RequireAuth from './auth/RequireAuth'
import VersionNotifier from './components/VersionNotifier'
import AppDialogProvider from './components/dialog/AppDialogProvider'
import AppToastProvider from './components/toast/AppToastProvider'
import AppApiProvider from './api/AppApiProvider'
import AppNotificationProvider from './notifications/AppNotificationProvider'
import WorkflowSetupStatusProvider from './workflows/WorkflowSetupStatusProvider'
import { RightDrawerProvider } from './components/right-drawer/RightDrawerContext'

// Set global defaults for all charts
Chart.defaults.font.family = 'var(--cui-font-sans-serif)'
Chart.defaults.font.size = 20

// Containers
const DefaultLayout = React.lazy(() => import('./layout/DefaultLayout'))

// Pages
const Login = React.lazy(() => import('./views/pages/login/Login'))
const PasswordReset = React.lazy(() => import('./views/pages/login/PasswordReset'))
const SharedWorkloadDashboard = React.lazy(
  () => import('./views/dashboard/workload/SharedWorkloadDashboard'),
)

const App = () => {
  const { colorMode } = useColorModes('coreui-free-react-admin-template-theme')

  useEffect(() => {
    Chart.defaults.color =
      colorMode === 'dark' ? '#9aa5b4' : getStyle('--cui-body-color') || '#636f83'
  }, [colorMode])

  return (
    <BrowserRouter basename={import.meta.env.VITE_BASENAME || '/'}>
      <AppToastProvider>
        <AppApiProvider>
          <AuthProvider>
            <AppDialogProvider>
              <VersionNotifier />
              <Suspense
                fallback={
                  <div className="pt-3 text-center">
                    <CSpinner color="primary" variant="grow" />
                  </div>
                }
              >
                <Routes>
                  <Route path="/login" name="Login Page" element={<Login />} />
                  <Route
                    path="/reset-password/:token"
                    name="Password Reset"
                    element={<PasswordReset />}
                  />
                  <Route
                    path="/share/workload/:token"
                    name="Shared Workload Dashboard"
                    element={
                      <RightDrawerProvider>
                        <SharedWorkloadDashboard />
                      </RightDrawerProvider>
                    }
                  />
                  {/* Wildcard route for everything else */}
                  <Route
                    path="*"
                    name="Home"
                    element={
                      <RequireAuth>
                        <AppNotificationProvider>
                          <WorkflowSetupStatusProvider>
                            <DefaultLayout />
                          </WorkflowSetupStatusProvider>
                        </AppNotificationProvider>
                      </RequireAuth>
                    }
                  />
                </Routes>
              </Suspense>
            </AppDialogProvider>
          </AuthProvider>
        </AppApiProvider>
      </AppToastProvider>
    </BrowserRouter>
  )
}

export default App
