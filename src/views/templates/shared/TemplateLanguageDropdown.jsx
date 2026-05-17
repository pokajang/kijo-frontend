import React from 'react'
import { CButton } from '@coreui/react'

const languageOptions = [
  { value: 'en', label: 'ENG', ariaLabel: 'English templates' },
  { value: 'ms-MY', label: 'BM', ariaLabel: 'Bahasa Melayu templates' },
]

const TemplateLanguageDropdown = ({ value, onChange }) => {
  return (
    <div className="d-flex gap-2 flex-wrap" role="group" aria-label="Template language">
      {languageOptions.map((option) => {
        const selected = value === option.value

        return (
          <CButton
            key={option.value}
            type="button"
            size="sm"
            color={selected ? 'primary' : 'secondary'}
            variant={selected ? undefined : 'outline'}
            className="px-3"
            aria-pressed={selected}
            aria-label={option.ariaLabel}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </CButton>
        )
      })}
    </div>
  )
}

export default TemplateLanguageDropdown
