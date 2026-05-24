import React from 'react'
import CIcon from '@coreui/icons-react'
import { cilTrash } from '@coreui/icons'

/**
 * Format ISO datetime string to "YYYY-MM-DD HH:mm"
 */
const formatDT = (iso) => {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}

/**
 * CallStackCell.jsx
 * -----------------
 * Displays call logs with outcome, date/time, caller code, and note.
 * Delete icon (trash bin) appears on hover, next to the caller code.
 */
const CallStackCell = ({ calls = [], currentUser, onDelete }) => {
  if (!Array.isArray(calls) || calls.length === 0) {
    return <span className="text-muted small">No calls yet</span>
  }

  const outcomeColor = {
    'No Answer': 'text-secondary',
    'Callback Later': 'text-info',
    Interested: 'text-success',
    'Not Interested': 'text-danger',
  }

  const userRoles = Array.isArray(currentUser?.roles) ? currentUser.roles : []
  const isAdmin = userRoles.some((role) => {
    const roleText = String(role || '').toLowerCase()
    return roleText.includes('admin') || roleText.includes('manager') || roleText.includes('super')
  })

  const canDelete = (call) => {
    if (!onDelete) return false
    if (isAdmin) return true
    const userId = Number(currentUser?.id || 0)
    const ownerId = Number(call?.called_by || 0)
    if (userId && ownerId && userId === ownerId) return true
    if (currentUser?.code && call?.called_by_code) {
      return String(currentUser.code).toLowerCase() === String(call.called_by_code).toLowerCase()
    }
    return false
  }

  return (
    <div className="small text-body" style={{ maxHeight: 160, overflowY: 'auto' }}>
      {calls.map((call, idx) => {
        const colorClass = outcomeColor[call.outcome] || 'text-muted'
        return (
          <div key={call.id || idx} className="mb-1 position-relative calllog-row">
            <div className="d-flex align-items-center flex-wrap gap-2 pe-4">
              <span className={`${colorClass} fw-semibold`}>{call.outcome || '-'}</span>
              <span className="text-body">{formatDT(call.called_at)}</span>

              <div className="d-flex align-items-center text-primary">
                - {call.called_by_code || '-'}
                {canDelete(call) && (
                  <button
                    type="button"
                    className="btn btn-sm btn-link text-danger p-0 ms-1 d-none calllog-del"
                    onClick={() => onDelete(call)}
                    title="Delete this call log"
                  >
                    <CIcon icon={cilTrash} size="sm" />
                  </button>
                )}
              </div>
            </div>

            {call.note && <div className="text-muted">{call.note}</div>}
          </div>
        )
      })}

      <style>{`
        .calllog-row:hover .calllog-del {
          display: inline-block !important;
        }
      `}</style>
    </div>
  )
}

export default CallStackCell
