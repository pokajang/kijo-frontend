import React from 'react'
import { CBadge } from '@coreui/react'

const salaryStatuses = [
  { key: 'Draft', color: 'secondary', description: 'not submitted yet' },
  { key: 'Submitted', color: 'info', description: 'submitted for review' },
  { key: 'Checked', color: 'primary', description: 'review complete' },
  { key: 'Approved', color: 'success', description: 'approved for payment' },
  { key: 'Returned', color: 'warning', description: 'changes requested' },
  { key: 'Rejected', color: 'danger', description: 'final decline' },
  { key: 'Paid', color: 'success', description: 'payment completed' },
  { key: 'Cancelled', color: 'warning', description: 'withdrawn' },
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
