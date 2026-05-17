// SystemAccess.jsx
import React from 'react'
import { CCol, CFormLabel, CFormCheck } from '@coreui/react'

const SystemAccess = ({ staffDetails, setStaffDetails }) => (
  <>
    <CCol xs={12}>
      <div className="form-check">
        <input
          className="form-check-input"
          type="checkbox"
          id="grantAccess"
          name="grantAccess"
          checked={staffDetails.grantAccess}
          onChange={(e) => setStaffDetails((prev) => ({ ...prev, grantAccess: e.target.checked }))}
        />
        <label className="form-check-label" htmlFor="grantAccess">
          Grant System Access
        </label>
      </div>
    </CCol>

    {staffDetails.grantAccess && (
      <CCol xs={12}>
        <CFormLabel>System Roles</CFormLabel>
        {[
          { label: 'Manager', value: 'Manager' },
          { label: 'HQ Staff', value: 'Staff' },
          { label: 'Outsourced Staff', value: 'Guest' },
          { label: 'System Admin', value: 'System Admin' },
          { label: 'HR', value: 'HR' },
          { label: 'Finance', value: 'Finance' },
        ].map(({ label, value }) => (
          <div className="form-check" key={value}>
            <CFormCheck
              type="checkbox"
              id={value}
              label={label}
              name="systemRoles"
              checked={staffDetails.systemRoles.includes(value)}
              onChange={(e) => {
                const { id, checked } = e.target
                setStaffDetails((prev) => {
                  const systemRoles = checked
                    ? [...prev.systemRoles, id]
                    : prev.systemRoles.filter((r) => r !== id)
                  return { ...prev, systemRoles }
                })
              }}
            />
          </div>
        ))}
      </CCol>
    )}
  </>
)

export default SystemAccess
