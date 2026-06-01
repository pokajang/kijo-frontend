import React from 'react'
import { CBadge } from '@coreui/react'

const salaryStatuses = [
  { key: 'Draft', color: 'secondary', description: 'not submitted yet' },
  { key: 'Submitted', color: 'info', description: 'submitted for review' },
  { key: 'Approved', color: 'success', description: 'approved' },
]

const SalaryStatusHint = ({ className = '' }) => (
  <div className={`salary-status-hint ${className}`.trim()} aria-label="Salary status guide">
    {salaryStatuses.map((status) => (
      <span className="salary-status-hint-item" key={status.key}>
        <CBadge color={status.color} className="salary-status-hint-badge">
          {status.key}
        </CBadge>
        <span>{status.description}</span>
      </span>
    ))}
  </div>
)

export default SalaryStatusHint
