import React, { useEffect, useState } from 'react'
import {
  CBadge,
  CButton,
  CDropdown,
  CDropdownDivider,
  CDropdownHeader,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CTooltip,
} from '@coreui/react'
import { useNavigate } from 'react-router-dom'
import {
  cilAccountLogout,
  cilCalendar,
  cilCalendarCheck,
  cilCash,
  cilDescription,
  cilLockLocked,
  cilPencil,
  cilSettings,
  cilSpeedometer,
  cilSpreadsheet,
  cilUser,
} from '@coreui/icons'
import CIcon from '@coreui/icons-react'

import { useAuth } from '../../auth/AuthProvider'
import { useAppNotifications } from '../../notifications/AppNotificationProvider'
import { getRouteNotificationBadge } from '../../notifications/notificationRegistry'

import AppraisalRecords from '../appraisal/AppraisalRecords'
import dialog from '../dialog/dialogService'
const menuSections = [
  {
    title: 'Off Days',
    headerClass: 'app-header-dropdown-heading',
    items: [
      {
        key: 'applyLeave',
        label: 'Apply Leave',
        to: '/my/leaves/apply',
        icon: cilCalendarCheck,
      },
      {
        key: 'leaveRecords',
        label: 'Leave Records',
        to: '/my/leaves',
        icon: cilCalendar,
      },
    ],
  },
  {
    title: 'Salary',
    headerClass: 'app-header-dropdown-heading',
    items: [
      {
        key: 'applySalary',
        label: 'Apply Salary',
        to: '/my/salary/apply',
        icon: cilCash,
      },
      {
        key: 'salaryRecords',
        label: 'Salary Records',
        to: '/my/salary',
        icon: cilSpreadsheet,
      },
      {
        key: 'salarySettings',
        label: 'Salary Settings',
        to: '/my/salary/settings',
        icon: cilSettings,
      },
    ],
  },
  {
    title: 'KPI Achievements',
    headerClass: 'app-header-dropdown-heading',
    items: [
      {
        key: 'kpiWorkspace',
        label: 'My KPI',
        to: '/my/kpi',
        icon: cilSpeedometer,
      },
    ],
  },
  {
    title: 'Appraisal',
    headerClass: 'app-header-dropdown-heading',
    items: [
      {
        key: 'appraisalRecords',
        label: 'Records',
        modalTitle: 'My Appraisal Records',
        component: AppraisalRecords,
        icon: cilDescription,
      },
    ],
  },
  {
    title: 'Settings',
    headerClass: 'app-header-dropdown-heading',
    items: [
      {
        key: 'userProfile',
        label: 'Profile',
        to: '/my/profile',
        icon: cilUser,
      },
      {
        key: 'personalSignature',
        label: 'Signature',
        to: '/my/signature',
        icon: cilPencil,
      },
      {
        key: 'userSetting',
        label: 'Password',
        to: '/my/password',
        icon: cilLockLocked,
      },
    ],
  },
]

const modalMapping = menuSections.reduce((mapping, section) => {
  section.items.forEach((item) => {
    if (item.modalTitle && item.component) {
      mapping[item.key] = { title: item.modalTitle, component: item.component }
    }
  })
  return mapping
}, {})

const defaultModalKey = Object.keys(modalMapping)[0] || null

const AppHeaderDropdown = ({ sessionUser, onOpenTicket, onAccountActiveChange }) => {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const { getRouteGroupCount } = useAppNotifications()
  const personalLeaveNotificationCount = Number(getRouteGroupCount('/my/leaves') || 0)
  const personalSalaryNotificationCount = Number(getRouteGroupCount('/my/salary') || 0)
  const personalNotificationCount = personalLeaveNotificationCount + personalSalaryNotificationCount

  const [modalVisible, setModalVisible] = useState(false)
  const [signOutModalVisible, setSignOutModalVisible] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [activeModal, setActiveModal] = useState(defaultModalKey)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const isAccountModalActive = modalVisible || signOutModalVisible
  const isAccountActive = isDropdownOpen || isAccountModalActive

  useEffect(() => {
    onAccountActiveChange?.(isAccountActive)
  }, [isAccountActive, onAccountActiveChange])

  const closeModal = () => setModalVisible(false)
  const openModal = (key) => {
    if (!modalMapping[key]) {
      console.error(`No modal configuration found for key: ${key}`)
      return
    }
    setActiveModal(key)
    setModalVisible(true)
  }

  const handleMenuItemClick = (item) => {
    if (item.action === 'openTicket') {
      onOpenTicket?.()
      return
    }
    if (item.to) {
      navigate(item.to)
      return
    }
    openModal(item.key)
  }

  const activeModalData = activeModal ? modalMapping[activeModal] : null
  const ActiveModalComponent = activeModalData?.component || null
  const activeComponentTitle = activeModalData?.title || 'Unavailable'

  const toggleSignOutModal = () => {
    setSignOutModalVisible((prevState) => !prevState)
  }

  const confirmSignOut = async () => {
    if (isSigningOut) return

    setIsSigningOut(true)
    try {
      await logout()
      setSignOutModalVisible(false)
    } catch (error) {
      console.error('Error signing out:', error)
      dialog.alert('Failed to log out. Please try again.')
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <>
      <CDropdown
        variant="nav-item"
        alignment="end"
        popper={false}
        className="app-bottom-nav-entry"
        onShow={() => setIsDropdownOpen(true)}
        onHide={() => setIsDropdownOpen(false)}
      >
        <CDropdownToggle
          className={`py-0 pe-0 app-bottom-nav-link app-bottom-nav-dropdown-toggle${
            isAccountActive ? ' active' : ''
          }`}
          caret={false}
          aria-pressed={isAccountActive}
        >
          <CTooltip
            content={
              personalNotificationCount > 0
                ? `${personalNotificationCount} account update${
                    personalNotificationCount === 1 ? '' : 's'
                  } available`
                : 'Open Account Menu'
            }
            placement="bottom"
          >
            <span
              className={`app-bottom-nav-icon app-bottom-nav-icon--account${
                personalNotificationCount > 0 ? ' app-bottom-nav-icon--with-badge' : ''
              }`}
              aria-hidden="true"
            >
              <CIcon icon={cilUser} className="app-bottom-nav-account-icon" />
              {personalNotificationCount > 0 && <span className="app-bottom-nav-unread-dot" />}
            </span>
          </CTooltip>
          <span className="app-bottom-nav-label">Account</span>
        </CDropdownToggle>

        <CDropdownMenu as="div" className="app-header-dropdown-menu p-0">
          <div className="app-header-dropdown-scroll">
            <div className="app-header-dropdown-profile">
              {sessionUser ? (
                <>
                  <div className="app-header-dropdown-profile-name">{sessionUser.full_name}</div>
                  <div className="app-header-dropdown-profile-role">
                    {Array.isArray(sessionUser.roles)
                      ? sessionUser.roles.join(', ')
                      : sessionUser.roles}
                  </div>
                </>
              ) : (
                <div className="app-header-dropdown-profile-role">Not logged in</div>
              )}
            </div>

            {menuSections.map((section) => (
              <div key={section.title} className="app-header-dropdown-section">
                <CDropdownHeader className={section.headerClass}>{section.title}</CDropdownHeader>
                <div className="app-header-dropdown-grid">
                  {section.items.map((item) => {
                    const count = item.to ? Number(getRouteGroupCount(item.to) || 0) : 0
                    const badgeConfig = item.to ? getRouteNotificationBadge(item.to) : null
                    const badge = count > 0 && badgeConfig ? { ...badgeConfig, text: count } : null

                    return (
                      <CDropdownItem
                        key={item.key}
                        className="app-header-dropdown-item"
                        onClick={() => handleMenuItemClick(item)}
                      >
                        {item.icon && (
                          <CIcon icon={item.icon} className="app-header-dropdown-item-icon" />
                        )}
                        <span className="app-header-dropdown-item-label">{item.label}</span>
                        {badge ? (
                          <CBadge
                            color={badge.color}
                            className="rounded-pill ms-auto"
                            title={badge.title}
                          >
                            {badge.text}
                          </CBadge>
                        ) : null}
                      </CDropdownItem>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="app-header-dropdown-footer">
            <CDropdownDivider className="my-0" />
            <CDropdownItem onClick={toggleSignOutModal}>
              <CIcon icon={cilAccountLogout} className="me-2" />
              Sign Out
            </CDropdownItem>
          </div>
        </CDropdownMenu>
      </CDropdown>

      <CModal
        scrollable
        size="lg"
        backdrop="static"
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        alignment="center"
      >
        <CModalHeader closeButton>
          <CModalTitle>{activeComponentTitle}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {ActiveModalComponent ? (
            <ActiveModalComponent closeModal={closeModal} />
          ) : (
            'This option is currently unavailable.'
          )}
        </CModalBody>
      </CModal>

      <CModal
        visible={signOutModalVisible}
        onClose={isSigningOut ? undefined : toggleSignOutModal}
        alignment="center"
      >
        <CModalHeader closeButton={!isSigningOut}>
          <CModalTitle>Confirm Sign Out</CModalTitle>
        </CModalHeader>
        <CModalBody>Are you sure you want to sign out?</CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            variant="outline"
            size="sm"
            onClick={toggleSignOutModal}
            disabled={isSigningOut}
          >
            Cancel
          </CButton>
          <CButton color="primary" size="sm" onClick={confirmSignOut} disabled={isSigningOut}>
            {isSigningOut ? 'Signing Out...' : 'Sign Out'}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default AppHeaderDropdown
