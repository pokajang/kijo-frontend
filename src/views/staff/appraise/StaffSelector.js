// src/components/StaffSelector.js
import React, { useState, useEffect } from 'react'
import Select from '../../../components/forms/ThemedSelect'
import { CAlert } from '@coreui/react'

/**
 * Props:
 *  - name: string            (the form field name, e.g. "selectedStaff")
 *  - value: string|number    (the current staff_id)
 *  - onChange: (event)       (expects event.target.name & .value)
 *  - disabled?: boolean
 */
const StaffSelector = ({ name, value, onChange, disabled = false }) => {
  const [options, setOptions] = useState([])
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

  // find the matching option object (or null)
  const selectedOption = options.find((o) => String(o.value) === String(value)) || null

  const handleChange = (opt) => {
    // build a fake event that your handleInputChange expects
    onChange({ target: { name, value: opt?.value ?? '' } })
  }

  return (
    <>
      <Select
        options={options}
        value={selectedOption}
        onChange={handleChange}
        placeholder="Select an employee..."
        isDisabled={disabled}
        styles={{
          option: (b) => ({ ...b, textTransform: 'capitalize' }),
          singleValue: (b) => ({ ...b, textTransform: 'capitalize' }),
        }}
      />
      {error && (
        <CAlert color="danger" className="mt-2">
          {error}
        </CAlert>
      )}
    </>
  )
}

export default StaffSelector
