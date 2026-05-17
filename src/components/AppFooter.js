import React from 'react'
import { NavLink } from 'react-router-dom'
import { CFooter } from '@coreui/react'

const AppFooter = () => {
  const year = new Date().getFullYear()

  return (
    <CFooter className="app-main-footer px-4 d-flex align-items-center flex-wrap gap-3">
      <div className="d-flex align-items-center gap-3">
        <span>
          &copy; {year} <strong className="text-primary">amioshIT</strong>
        </span>
        <NavLink to="/about" className="text-decoration-none">
          About
        </NavLink>
      </div>
    </CFooter>
  )
}

export default React.memo(AppFooter)
