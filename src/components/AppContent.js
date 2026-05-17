import React, { Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { CContainer, CSpinner } from '@coreui/react'

// routes config
import routes from '../routes'

const AppContent = () => {
  return (
    <CContainer fluid className="px-4 pb-4 app-content-container">
      <Suspense fallback={<CSpinner color="primary" />}>
        <Routes>
          {routes.map((route, idx) => {
            if (!route.element) return null

            // If it's already a React element (e.g. <ProtectedRoute>…), use it as-is.
            // Otherwise assume it's a component and create an element from it.
            const elementNode = React.isValidElement(route.element)
              ? route.element
              : React.createElement(route.element)

            return (
              <Route
                key={idx}
                path={route.path}
                exact={route.exact}
                name={route.name}
                element={elementNode}
              />
            )
          })}

          {/* fallback from “/” to dashboard */}
          <Route path="/" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </Suspense>
    </CContainer>
  )
}

export default React.memo(AppContent)
