import React, { useState } from 'react'
import {
  CCard,
  CRow,
  CCol,
  CCardHeader,
  CCardBody,
  CAlert,
  CButton,
  CFormSwitch,
} from '@coreui/react'

import { cilBell } from '@coreui/icons'
import CIcon from '@coreui/icons-react'

// Mock data for notifications
const mockNotifications = [
  {
    id: 1,
    title: 'New Feature Available',
    message: 'Check out the latest updates in your dashboard.',
    date: '2025-03-25 10:00 AM',
    read: false,
  },
  {
    id: 2,
    title: 'System Maintenance',
    message: 'Scheduled maintenance on 2025-03-28, 2:00 AM - 4:00 AM.',
    date: '2025-03-24 09:00 AM',
    read: true,
  },
  {
    id: 3,
    title: 'Reminder: Update your profile',
    message: 'Please update your profile to continue using our services.',
    date: '2025-03-23 08:00 AM',
    read: false,
  },
  // Add more notifications as needed...
]

const Updates = () => {
  // State to toggle between showing unread (true) and read (false) notifications.
  const [showUnread, setShowUnread] = useState(true)

  // Filter notifications based on the switch value.
  const filteredNotifications = mockNotifications.filter((notification) =>
    showUnread ? !notification.read : notification.read,
  )

  return (
    <>
      {/* Switch to toggle between unread and read notifications */}
      <CRow className="mb-3">
        <CCol className="d-flex justify-content-end align-items-center">
          <CFormSwitch
            id="toggle-unread"
            checked={showUnread}
            onChange={(e) => setShowUnread(e.target.checked)}
          />

          <span className="ms-2">{showUnread ? 'View Unreads' : 'View Reads'}</span>
        </CCol>
      </CRow>
      {filteredNotifications.map((notification) => (
        <CAlert
          key={notification.id}
          // Use 'success' color for unread (green) and 'secondary' for read notifications
          color={!notification.read ? 'success' : 'secondary'}
          className="mb-1"
        >
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h5 className="mb-0">{notification.title}</h5>
              <small>{notification.date}</small>
            </div>
            {!notification.read && (
              <CButton size="sm" color="primary">
                Mark as read
              </CButton>
            )}
          </div>
          <p className="mb-0 mt-2">{notification.message}</p>
        </CAlert>
      ))}
    </>
  )
}

export default Updates
