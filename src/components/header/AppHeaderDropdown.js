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
  cilGift,
  cilLockLocked,
  cilPencil,
  cilSpeedometer,
  cilSpreadsheet,
  cilSun,
  cilMoon,
  cilPaperPlane,
  cilUser,
} from '@coreui/icons'
import CIcon from '@coreui/icons-react'

import PropTypes from 'prop-types'

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
        key: 'applyOtherClaim',
        label: 'Apply Claims',
        to: '/my/salary/other-claims/apply',
        icon: cilSpreadsheet,
      },
      {
        key: 'salaryRecords',
        label: 'Records',
        to: '/my/salary/records',
        icon: cilDescription,
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
const getThemeIcon = (themeToggleLabel = '') =>
  themeToggleLabel.toLowerCase().includes('light') ? cilSun : cilMoon

const AppHeaderDropdown = ({
  sessionUser,
  onOpenTicket,
  onToggleTheme,
  onAccountActiveChange,
  themeToggleLabel,
  whatsNewLabel,
}) => {
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

  const utilitySection = {
    title: 'Utilities',
    sectionClass: 'd-md-none',
    headerClass: 'app-header-dropdown-heading',
    items: [
      {
        key: 'theme',
        label: 'Theme',
        icon: getThemeIcon(themeToggleLabel),
        action: 'toggleTheme',
        tooltip: themeToggleLabel || 'Toggle theme',
      },
      {
        key: 'whatsNew',
        label: "What's New",
        to: '/whats-new',
        icon: cilGift,
        tooltip: whatsNewLabel || 'See Latest Updates',
      },
      {
        key: 'submitTicket',
        label: 'Submit Ticket',
        icon: cilPaperPlane,
        action: 'openTicket',
      },
    ],
  }

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
    setIsDropdownOpen(false)
    const runAfterClose = (callback) => {
      if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
        setTimeout(callback, 0)
        return
      }
      window.requestAnimationFrame(() => callback())
    }

    if (item.action === 'toggleTheme') {
      runAfterClose(() => onToggleTheme?.())
      return
    }
    if (item.action === 'openTicket') {
      runAfterClose(() => onOpenTicket?.())
      return
    }
    if (item.to) {
      runAfterClose(() => navigate(item.to))
      return
    }
    runAfterClose(() => openModal(item.key))
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
        visible={isDropdownOpen}
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

            {[utilitySection, ...menuSections].map((section) => (
              <div
                key={section.title}
                className={`app-header-dropdown-section${section.sectionClass ? ` ${section.sectionClass}` : ''}`}
              >
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
                        aria-label={item.tooltip || item.label}
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

AppHeaderDropdown.propTypes = {
  sessionUser: PropTypes.shape({
    full_name: PropTypes.string,
    roles: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.string), PropTypes.string]),
  }),
  onOpenTicket: PropTypes.func,
  onToggleTheme: PropTypes.func,
  onAccountActiveChange: PropTypes.func,
  themeToggleLabel: PropTypes.string,
  whatsNewLabel: PropTypes.string,
}

export default AppHeaderDropdown
