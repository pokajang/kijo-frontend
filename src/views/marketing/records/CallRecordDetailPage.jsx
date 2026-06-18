import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { CAlert, CCol, CRow } from '@coreui/react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { DataTableDetailShell } from '../../../components/datatable'
import dialog from '../../../components/dialog/dialogService'
import { getDetailReturnTo } from '../../../utils/navigation/returnTo'
import AddCallModal from './AddCallModal'
import EditContactModal from './EditContactModal'
import CallStackCell from './CallStackCell'
import { fetchApi } from './fetchApi'
import { useAuth } from '../../../auth/AuthProvider'

const valueOrDash = (value) => (String(value || '').trim() ? value : '-')

const DetailField = ({ label, value, children }) => (
  <CCol xs={12} md={6} lg={4}>
    <div className="records-detail-field">
      <div className="small text-muted">{label}</div>
      <div>{children || valueOrDash(value)}</div>
    </div>
  </CCol>
)

const CallRecordDetailPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams()
  const returnTo = getDetailReturnTo(location, '/pipeline/call-records')
  const { user } = useAuth()
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [info, setInfo] = useState('')
  const [showAddCall, setShowAddCall] = useState(false)
  const [showEditContact, setShowEditContact] = useState(false)
  const currentUser = useMemo(
    () => ({
      id: user?.staff_id ?? null,
      code: user?.name_code ?? null,
      roles: Array.isArray(user?.roles) ? user.roles : [],
    }),
    [user],
  )

  const loadContacts = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const rows = await fetchApi.listContactsWithCalls({ q: '', limit: 100 })
      setContacts(
        rows.map((contact) => ({
          ...contact,
          calls: Array.isArray(contact?.calls) ? contact.calls : [],
        })),
      )
    } catch (primaryErr) {
      try {
        const rows = await fetchApi.listContacts({ q: '', limit: 100 })
        const contactsWithCalls = rows.map((contact) => ({ ...contact, calls: [] }))
        const callResults = await Promise.allSettled(
          contactsWithCalls.map((contact) => fetchApi.listCalls(contact.id)),
        )

        setContacts(
          contactsWithCalls.map((contact, index) => ({
            ...contact,
            calls:
              callResults[index]?.status === 'fulfilled' && Array.isArray(callResults[index].value)
                ? callResults[index].value
                : [],
          })),
        )
      } catch (fallbackErr) {
        setLoadError(
          fallbackErr?.message || primaryErr?.message || 'Failed to load contact details.',
        )
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadContacts()
  }, [loadContacts])

  const contact = useMemo(
    () => contacts.find((row) => String(row?.id) === String(id)) || null,
    [contacts, id],
  )

  const calls = Array.isArray(contact?.calls) ? contact.calls : []
  const hasCallLogs = calls.length > 0

  const showInfo = (message) => {
    setInfo(message)
    setTimeout(() => setInfo(''), 10000)
  }

  const showError = (message) => {
    setActionError(message)
    setTimeout(() => setActionError(''), 10000)
  }

  const handleCallSaved = async (message) => {
    setShowAddCall(false)
    showInfo(message || 'Call record added successfully.')
    await loadContacts()
  }

  const handleContactUpdated = async (message) => {
    setShowEditContact(false)
    showInfo(message || 'Contact updated successfully.')
    await loadContacts()
  }

  const handleDeleteContact = async () => {
    if (!contact?.id) return
    if (
      !(await dialog.confirm('Delete this contact?', {
        confirmText: 'Delete',
        confirmColor: 'danger',
      }))
    )
      return
    try {
      await fetchApi.deleteContact(contact.id)
      showInfo('Contact deleted successfully.')
      navigate(returnTo)
    } catch (err) {
      showError(err?.message || 'Failed to delete contact.')
    }
  }

  const handleDeleteCall = async (call) => {
    if (!call?.id) return
    if (
      !(await dialog.confirm('Delete this call log?', {
        confirmText: 'Delete',
        confirmColor: 'danger',
      }))
    )
      return
    try {
      await fetchApi.deleteCall(call.id)
      showInfo('Call log deleted.')
      await loadContacts()
    } catch (err) {
      showError(err?.message || 'Failed to delete call log.')
    }
  }

  const actions = contact
    ? [
        { key: 'add-log', label: 'Add Log', onClick: () => setShowAddCall(true) },
        { key: 'edit', label: 'Edit Contact', onClick: () => setShowEditContact(true) },
        hasCallLogs
          ? {
              key: 'delete-disabled',
              label: 'Delete Contact',
              disabled: true,
              danger: true,
              tooltip: 'Delete call logs before deleting this contact.',
            }
          : {
              key: 'delete',
              label: 'Delete Contact',
              danger: true,
              onClick: handleDeleteContact,
            },
      ]
    : []

  return (
    <>
      {info && (
        <CAlert color="info" dismissible onClose={() => setInfo('')} className="mb-3">
          {info}
        </CAlert>
      )}
      {actionError && (
        <CAlert color="danger" dismissible onClose={() => setActionError('')} className="mb-3">
          {actionError}
        </CAlert>
      )}

      <DataTableDetailShell
        title="Call Record Details"
        backLabel="Back"
        onBack={() => navigate(returnTo)}
        loading={loading}
        error={loadError}
        record={contact}
        actions={actions}
        emptyMessage="Call record contact not found."
      >
        <CRow className="g-3">
          <DetailField label="Company Name" value={contact?.name} />
          <DetailField label="Phone" value={contact?.phone} />
          <DetailField label="Address" value={contact?.address} />
          <DetailField label="Web URL">
            {contact?.website ? (
              <a
                href={
                  contact.website.startsWith('http')
                    ? contact.website
                    : `https://${contact.website}`
                }
                target="_blank"
                rel="noreferrer"
              >
                {contact.website}
              </a>
            ) : (
              '-'
            )}
          </DetailField>
          <DetailField label="Created At" value={contact?.created_at} />
          <DetailField label="Created By" value={contact?.created_by_code} />
          <CCol xs={12}>
            <div className="records-detail-field">
              <div className="small text-muted mb-2">Call Logs</div>
              <CallStackCell calls={calls} currentUser={currentUser} onDelete={handleDeleteCall} />
            </div>
          </CCol>
        </CRow>
      </DataTableDetailShell>

      {showAddCall && contact && (
        <AddCallModal
          visible={showAddCall}
          contact={contact}
          onClose={() => setShowAddCall(false)}
          onSaved={handleCallSaved}
        />
      )}

      {showEditContact && contact && (
        <EditContactModal
          visible={showEditContact}
          contact={contact}
          onClose={() => setShowEditContact(false)}
          onSaved={handleContactUpdated}
        />
      )}
    </>
  )
}

export default CallRecordDetailPage
