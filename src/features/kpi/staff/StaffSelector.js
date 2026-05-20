import React, { useState, useEffect } from 'react'
import Select from '../../../components/forms/ThemedSelect'
import { CCard, CCardHeader, CCardBody } from '@coreui/react'

/**
 * HR-only staff selector.
 * onChange(value) - staff_id
 */
const StaffSelector = ({ onChange, children }) => {
  const [options, setOptions] = useState([])
  const [selected, setSelected] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE}staff/list`, {
          credentials: 'include',
        })
        const json = await res.json()
        if (json.status === 'success') {
          setOptions(
            json.staff.map((s) => ({
              value: s.staff_id,
              label: `${s.full_name} (${s.name_code}) - ${s.position}, ${s.department}`,
            })),
          )
        } else {
          setError(json.message)
        }
      } catch {
        setError('Could not load staff list.')
      }
    })()
  }, [])

  const handleChange = (opt) => {
    setSelected(opt)
    onChange(opt?.value ?? null)
  }

  return (
    <CCard className="mb-4">
      <CCardHeader>
        <strong>Staff KPI</strong>
      </CCardHeader>
      <CCardBody>
        <Select
          options={options}
          value={selected}
          onChange={handleChange}
          placeholder="Select an employee..."
          styles={{
            option: (b) => ({ ...b, textTransform: 'capitalize' }),
            singleValue: (b) => ({
              ...b,
              textTransform: 'capitalize',
            }),
          }}
        />

        {error && <p className="text-danger mt-2">{error}</p>}

        {selected && children && <div className="kpi-staff-content">{children}</div>}
      </CCardBody>
    </CCard>
  )
}

export default StaffSelector
