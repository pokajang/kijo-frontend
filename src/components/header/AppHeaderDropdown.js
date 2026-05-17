import React, { useEffect, useState } from 'react'
import {
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
  cilDescription,
  cilList,
  cilLockLocked,
  cilNotes,
  cilPencil,
  cilSpeedometer,
  cilUser,
} from '@coreui/icons'
import CIcon from '@coreui/icons-react'

import { useAuth } from '../../auth/AuthProvider'

import StaffProfile from '../profile/StaffProfile'
import UserSetting from '../user-setting/UserSetting'
import AppraisalRecords from '../appraisal/AppraisalRecords'
import PersonalSignature from '../signature/PersonalSignature'
import dialog from '../dialog/dialogService'
const menuSections = [
  {
    title: 'Off Days',
    headerClass: 'app-header-dropdown-heading',
    items: [
      {
        key: 'applyLeave',
        label: 'Apply',
        to: '/my/leaves/apply',
        icon: cilNotes,
      },
      {
        key: 'leaveRecords',
        label: 'Records',
        to: '/my/leaves',
        icon: cilList,
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
        modalTitle: 'My Profile',
        component: StaffProfile,
        icon: cilUser,
      },
      {
        key: 'personalSignature',
        label: 'Signature',
        modalTitle: 'Digital Signature',
        component: PersonalSignature,
        icon: cilPencil,
      },
      {
        key: 'userSetting',
        label: 'Password',
        modalTitle: 'User Settings',
        component: UserSetting,
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
          <CTooltip content="Open Account Menu" placement="bottom">
            <span className="app-bottom-nav-icon app-bottom-nav-icon--account" aria-hidden="true">
              <CIcon icon={cilUser} className="app-bottom-nav-account-icon" />
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
                  {section.items.map((item) => (
                    <CDropdownItem
                      key={item.key}
                      className="app-header-dropdown-item"
                      onClick={() => handleMenuItemClick(item)}
                    >
                      {item.icon && (
                        <CIcon icon={item.icon} className="app-header-dropdown-item-icon" />
                      )}
                      {item.label}
                    </CDropdownItem>
                  ))}
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
          <CButton color="primary" onClick={confirmSignOut} disabled={isSigningOut}>
            {isSigningOut ? 'Signing Out...' : 'Sign Out'}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default AppHeaderDropdown
