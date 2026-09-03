import React, { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import {
  CAlert,
  CContainer,
  CHeader,
  CHeaderNav,
  CHeaderToggler,
  CNavLink,
  CNavItem,
  CButton,
  CCloseButton,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CFormTextarea,
  CTooltip,
  useColorModes,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilGift,
  cilListRich,
  cilMenu,
  cilMoon,
  cilPaperPlane,
  cilSpeech,
  cilSpeedometer,
  cilSun,
} from '@coreui/icons'
import { AppHeaderDropdown, AppNotificationsDropdown } from './header/index'
import AppModuleSearch from './search/AppModuleSearch'
import HandbookAcknowledgementNotice from './handbook/HandbookAcknowledgementNotice'
import { useAuth } from '../auth/AuthProvider'
import { submitFeedback } from '../views/feedback/actionHandlers'
import dialog from './dialog/dialogService'
import { useKnowledgePanel } from '../views/knowledge/KnowledgePanelContext'
import { loadLatestWhatsNew } from './whatsNewLatest'

const getSignatureDismissalKey = (staffId) =>
  staffId ? `kijo:signature-warning:dismissed:${staffId}` : null

const isSignatureWarningDismissed = (staffId) => {
  const key = getSignatureDismissalKey(staffId)
  if (!key || typeof window === 'undefined') return false
  return window.sessionStorage.getItem(key) === '1'
}

const dismissSignatureWarning = (staffId) => {
  const key = getSignatureDismissalKey(staffId)
  if (!key || typeof window === 'undefined') return
  window.sessionStorage.setItem(key, '1')
}

const clearSignatureWarningDismissal = (staffId) => {
  const key = getSignatureDismissalKey(staffId)
  if (!key || typeof window === 'undefined') return
  window.sessionStorage.removeItem(key)
}

const SIGNATURE_REQUIRED_ROUTE_PREFIXES = ['/commercial/invoice']

const AppHeader = () => {
  const headerRef = useRef()
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()
  const sidebarShow = useSelector((state) => state.sidebarShow)
  const { colorMode, setColorMode } = useColorModes('coreui-free-react-admin-template-theme')
  const { user: sessionUser } = useAuth()
  const [ticketModalVisible, setTicketModalVisible] = useState(false)
  const [ticketMessage, setTicketMessage] = useState('')
  const [ticketSubmitting, setTicketSubmitting] = useState(false)
  const [accountActive, setAccountActive] = useState(false)
  const [signatureStatus, setSignatureStatus] = useState({ checked: false, url: null })
  const [signatureDismissed, setSignatureDismissed] = useState(false)
  const [unreadWhatsNewCount, setUnreadWhatsNewCount] = useState(0)
  const {
    closeKnowledgePanel,
    isOpen: knowledgePanelOpen,
    openKnowledgeSearch,
  } = useKnowledgePanel()
  const lastKnowledgePointerOpenRef = useRef(0)

  useEffect(() => {
    const onScroll = () => {
      headerRef.current?.classList.toggle('shadow-sm', window.scrollY > 0)
    }
    document.addEventListener('scroll', onScroll)
    return () => document.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const header = headerRef.current
    if (!header || typeof ResizeObserver === 'undefined') return undefined

    const updateMobileHeaderHeight = () => {
      document.documentElement.style.setProperty(
        '--app-mobile-fixed-header-height',
        `${Math.ceil(header.getBoundingClientRect().height)}px`,
      )
    }
    const observer = new ResizeObserver(updateMobileHeaderHeight)

    observer.observe(header)
    updateMobileHeaderHeight()

    return () => {
      observer.disconnect()
      document.documentElement.style.removeProperty('--app-mobile-fixed-header-height')
    }
  }, [])

  const loadSignatureStatus = React.useCallback(
    async (staffId = sessionUser?.staff_id) => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE}signature`, {
          credentials: 'include',
        })
        const data = await res.json()
        if (data.status === 'success') {
          setSignatureStatus({ checked: true, url: data.url || null })
          if (data.url) {
            clearSignatureWarningDismissal(staffId)
            setSignatureDismissed(false)
          } else {
            setSignatureDismissed(isSignatureWarningDismissed(staffId))
          }
        }
      } catch {
        setSignatureStatus({ checked: false, url: null })
      }
    },
    [sessionUser?.staff_id],
  )

  useEffect(() => {
    if (!sessionUser?.staff_id) return
    setSignatureDismissed(isSignatureWarningDismissed(sessionUser.staff_id))
    loadSignatureStatus(sessionUser.staff_id)
  }, [sessionUser?.staff_id, loadSignatureStatus])

  useEffect(() => {
    const refreshSignatureStatus = () => {
      loadSignatureStatus(sessionUser?.staff_id)
    }

    window.addEventListener('kijo:signature-updated', refreshSignatureStatus)

    return () => {
      window.removeEventListener('kijo:signature-updated', refreshSignatureStatus)
    }
  }, [loadSignatureStatus, sessionUser?.staff_id])

  const loadWhatsNewStatus = React.useCallback(async () => {
    try {
      const result = await loadLatestWhatsNew()
      if (!result.ok) {
        setUnreadWhatsNewCount(0)
        return
      }
      setUnreadWhatsNewCount(Number(result.data?.meta?.unread_count) || (result.data?.data ? 1 : 0))
    } catch {
      setUnreadWhatsNewCount(0)
    }
  }, [])

  useEffect(() => {
    if (!sessionUser?.staff_id) return undefined

    loadWhatsNewStatus()
    window.addEventListener('focus', loadWhatsNewStatus)
    window.addEventListener('kijo:whats-new-read', loadWhatsNewStatus)

    return () => {
      window.removeEventListener('focus', loadWhatsNewStatus)
      window.removeEventListener('kijo:whats-new-read', loadWhatsNewStatus)
    }
  }, [sessionUser?.staff_id, loadWhatsNewStatus])

  const openTicketModal = () => {
    setTicketModalVisible(true)
  }

  const closeTicketModal = () => {
    setTicketModalVisible(false)
    setTicketMessage('')
  }

  const toggleKnowledgeHelp = (event) => {
    event?.preventDefault?.()
    if (knowledgePanelOpen) {
      closeKnowledgePanel()
      return
    }

    openKnowledgeSearch()
  }

  const handleKnowledgePointerDown = (event) => {
    if (event.pointerType === 'mouse') return
    lastKnowledgePointerOpenRef.current = Date.now()
    toggleKnowledgeHelp(event)
  }

  const handleKnowledgeClick = (event) => {
    if (Date.now() - lastKnowledgePointerOpenRef.current < 700) {
      event.preventDefault()
      return
    }
    toggleKnowledgeHelp(event)
  }

  const handleTicketSubmit = async () => {
    const text = ticketMessage.trim()
    if (!text) {
      dialog.alert('Please describe the issue before submitting.')
      return
    }

    setTicketSubmitting(true)
    try {
      const result = await submitFeedback(text)
      if (result.status === 'success') {
        dialog.alert(
          result.mail_sent === false
            ? result.message || 'Ticket submitted, but the email notification could not be sent.'
            : 'Ticket submitted successfully.',
        )
        closeTicketModal()
      } else {
        dialog.alert(result.message || 'Failed to submit ticket.')
      }
    } catch (err) {
      dialog.alert('Unable to submit ticket right now.')
    } finally {
      setTicketSubmitting(false)
    }
  }

  const signatureRelevantToRoute = SIGNATURE_REQUIRED_ROUTE_PREFIXES.some((prefix) =>
    location.pathname.startsWith(prefix),
  )
  const signatureMissing =
    signatureRelevantToRoute &&
    signatureStatus.checked &&
    !signatureStatus.url &&
    !signatureDismissed
  const hasUnreadWhatsNew = unreadWhatsNewCount > 0
  const themeToggleLabel = colorMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
  const themeToggleTooltip = colorMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'
  const handleThemeToggle = () => {
    setColorMode(colorMode === 'dark' ? 'light' : 'dark')
  }
  const whatsNewLabel = hasUnreadWhatsNew
    ? `What's New, ${unreadWhatsNewCount} unread update${unreadWhatsNewCount === 1 ? '' : 's'}`
    : "What's New"
  const whatsNewTooltip = hasUnreadWhatsNew
    ? `See Latest Updates (${unreadWhatsNewCount} unread)`
    : 'See Latest Updates'

  return (
    <CHeader
      position="sticky"
      className={`mb-4 p-0 app-main-header${sidebarShow ? ' app-main-header--sidebar-open' : ''}${
        ticketModalVisible ? ' app-bottom-nav--ticket-active' : ''
      }${accountActive ? ' app-bottom-nav--account-active' : ''}`}
      ref={headerRef}
    >
      <CContainer fluid className="border-bottom px-2 px-md-4 app-bottom-nav-container">
        <CHeaderToggler
          className="app-bottom-nav-item app-bottom-nav-menu"
          onClick={() => dispatch({ type: 'set', sidebarShow: !sidebarShow })}
          aria-label="Toggle menu"
        >
          <CTooltip content="Toggle Sidebar" placement="bottom">
            <span className="app-bottom-nav-icon" aria-hidden="true">
              <CIcon icon={cilMenu} />
            </span>
          </CTooltip>
          <span className="app-bottom-nav-label">Menu</span>
        </CHeaderToggler>

        <div className="app-header-search-help">
          <AppModuleSearch />
          <CTooltip
            content={knowledgePanelOpen ? 'Close Learn Kijo help' : 'Open Learn Kijo help'}
            placement="bottom"
          >
            <CButton
              type="button"
              color="primary"
              variant="outline"
              className={`app-knowledge-header-help${knowledgePanelOpen ? ' active' : ''}`}
              onPointerDown={handleKnowledgePointerDown}
              onClick={handleKnowledgeClick}
              aria-label={knowledgePanelOpen ? 'Close Knowledge help' : 'Open Knowledge help'}
              aria-pressed={knowledgePanelOpen}
            >
              <CIcon icon={cilSpeech} />
              <span className="app-knowledge-header-help__label">Help</span>
            </CButton>
          </CTooltip>
        </div>

        <CHeaderNav className="d-flex align-items-center ms-auto app-bottom-nav-actions">
          <CNavItem className="me-2 app-bottom-nav-entry d-md-none">
            <CNavLink to="/dashboard" as={NavLink} className="app-bottom-nav-link">
              <CTooltip content="Open Dashboard" placement="bottom">
                <span className="app-bottom-nav-icon" aria-hidden="true">
                  <CIcon icon={cilSpeedometer} />
                </span>
              </CTooltip>
              <span className="app-bottom-nav-label">Home</span>
            </CNavLink>
          </CNavItem>

          <CNavItem className="me-2 app-bottom-nav-entry d-none d-md-flex">
            <CButton
              type="button"
              color="link"
              className="app-bottom-nav-link--button"
              onClick={handleThemeToggle}
              aria-label={themeToggleLabel}
            >
              <CTooltip content={themeToggleTooltip} placement="bottom">
                <span className="app-bottom-nav-icon" aria-hidden="true">
                  <CIcon icon={colorMode === 'dark' ? cilSun : cilMoon} />
                </span>
              </CTooltip>
              <span className="app-bottom-nav-label">Theme</span>
            </CButton>
          </CNavItem>

          <CNavItem className="me-2 app-bottom-nav-entry d-none d-md-flex">
            <CNavLink
              to="/whats-new"
              as={NavLink}
              className="app-bottom-nav-link"
              aria-label={whatsNewLabel}
            >
              <CTooltip content={whatsNewTooltip} placement="bottom">
                <span
                  className="app-bottom-nav-icon app-bottom-nav-icon--with-badge"
                  aria-hidden="true"
                >
                  <CIcon icon={cilGift} />
                  {hasUnreadWhatsNew && <span className="app-bottom-nav-unread-dot" />}
                </span>
              </CTooltip>
              <span className="app-bottom-nav-label">News</span>
            </CNavLink>
          </CNavItem>

          <CNavItem className="me-2 app-bottom-nav-entry">
            <CNavLink to="/task-manager" as={NavLink} className="app-bottom-nav-link">
              <CTooltip content="Manage Tasks" placement="bottom">
                <span className="app-bottom-nav-icon" aria-hidden="true">
                  <CIcon icon={cilListRich} className="app-bottom-nav-task-icon" />
                </span>
              </CTooltip>
              <span className="app-bottom-nav-label">Tasks</span>
            </CNavLink>
          </CNavItem>

          <CNavItem className="me-2 app-bottom-nav-entry d-none d-md-flex">
            <CButton
              type="button"
              color="link"
              className={`app-bottom-nav-link--button${ticketModalVisible ? ' active' : ''}`}
              onClick={openTicketModal}
              aria-label="Open support ticket"
              aria-pressed={ticketModalVisible}
            >
              <CTooltip content="Submit Ticket" placement="bottom">
                <span className="app-bottom-nav-icon" aria-hidden="true">
                  <CIcon icon={cilPaperPlane} />
                </span>
              </CTooltip>
              <span className="app-bottom-nav-label">Ticket</span>
            </CButton>
          </CNavItem>

          <AppNotificationsDropdown />

          <AppHeaderDropdown
            sessionUser={sessionUser}
            onOpenTicket={openTicketModal}
            onToggleTheme={handleThemeToggle}
            themeToggleLabel={themeToggleLabel}
            whatsNewLabel={whatsNewLabel}
            onAccountActiveChange={setAccountActive}
          />
        </CHeaderNav>
      </CContainer>

      {signatureMissing && (
        <CAlert color="warning" className="mb-0 rounded-0 border-0">
          <CContainer fluid className="px-4 d-flex flex-wrap align-items-center gap-2">
            <strong>Signature missing.</strong>
            <span className="text-muted">Upload your digital signature to enable invoicing.</span>
            <CButton
              size="sm"
              color="warning"
              variant="outline"
              className="ms-auto"
              onClick={() => navigate('/my/signature')}
            >
              Upload Signature
            </CButton>
            <CCloseButton
              aria-label="Dismiss signature warning"
              onClick={() => {
                dismissSignatureWarning(sessionUser?.staff_id)
                setSignatureDismissed(true)
              }}
            />
          </CContainer>
        </CAlert>
      )}

      <HandbookAcknowledgementNotice staffId={sessionUser?.staff_id} />

      <CModal visible={ticketModalVisible} onClose={closeTicketModal} alignment="center">
        <CModalHeader closeButton>
          <CModalTitle>Submit Support Ticket</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p className="text-muted small">
            Describe the issue you are facing or the improvement you would like to request.
          </p>
          <CFormTextarea
            rows={4}
            placeholder="Enter your feedback here..."
            value={ticketMessage}
            onChange={(e) => setTicketMessage(e.target.value)}
          />
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            variant="outline"
            size="sm"
            onClick={closeTicketModal}
            disabled={ticketSubmitting}
          >
            Cancel
          </CButton>
          <CButton
            color="primary"
            size="sm"
            onClick={handleTicketSubmit}
            disabled={ticketSubmitting}
          >
            {ticketSubmitting ? 'Submitting...' : 'Submit'}
          </CButton>
        </CModalFooter>
      </CModal>
    </CHeader>
  )
}

export default AppHeader
