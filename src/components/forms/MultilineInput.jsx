import React from 'react'
import { CFormLabel, CFormTextarea } from '@coreui/react'

const MultilineInput = ({
  label,
  placeholder,
  rows = 3,
  valueKey,
  textKey,
  formData,
  setFormData,
}) => {
  return (
    <>
      <CFormLabel htmlFor={valueKey}>{label}</CFormLabel>
      <CFormTextarea
        rows={rows}
        placeholder={placeholder}
        value={formData[textKey] || ''}
        onChange={(e) => {
          const lines = e.target.value
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)

          setFormData({
            ...formData,
            [textKey]: e.target.value,
            [valueKey]: lines,
          })
        }}
      />
    </>
  )
}

export default MultilineInput
