// src/components/PaymentActions.jsx

import React from 'react'
import { CDropdown, CDropdownToggle, CDropdownMenu, CDropdownItem } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilOptions } from '@coreui/icons'

const PaymentActions = ({
  payment,
  staffRoles = [], // now an array
  onView,
  onApprove,
  onDelete,
}) => {
  // determine if user can approve/delete
  const canManage = staffRoles.includes('Manager')
  // you can expand this to multiple roles:
  // const canManage = staffRoles.some(r => ['Manager','Finance'].includes(r))

  return (
    <CDropdown>
      <CDropdownToggle color="transparent">
        <CIcon icon={cilOptions} />
      </CDropdownToggle>
      <CDropdownMenu>
        <CDropdownItem onClick={() => onView(payment)}>View Payment</CDropdownItem>

        {payment.status === 'Pending' && (
          <CDropdownItem disabled={!canManage} onClick={() => canManage && onApprove(payment.id)}>
            Approve Payment
          </CDropdownItem>
        )}

        <CDropdownItem
          disabled={!canManage}
          onClick={() => canManage && onDelete(payment.id)}
          className={!canManage ? 'text-muted' : 'text-danger'}
        >
          Delete Payment
        </CDropdownItem>
      </CDropdownMenu>
    </CDropdown>
  )
}

export default PaymentActions
