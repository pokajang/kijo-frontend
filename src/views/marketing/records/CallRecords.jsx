import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { CButton, CCard, CCardBody, CAlert } from '@coreui/react'
import { useNavigate } from 'react-router-dom'
import CallSearchControls from './CallSearchControls'
import CallTable from './CallTable'
import AddCallModal from './AddCallModal'
import AddContactModal from './AddContactModal'
import ViewContactModal from './ViewContactModal'
import EditContactModal from './EditContactModal'
import { fetchApi } from './fetchApi'
import dialog from '../../../components/dialog/dialogService'
import {
  DataTableCardHeader,
  DataTableStatsToggle,
  getAdvancedFilterCount,
} from '../../../components/datatable'
import ModuleNavStrip from '../../../components/navigation/ModuleNavStrip'
import { pipelineCrmModuleTabs } from '../../../components/navigation/moduleNavConfigs'
import { useAuth } from '../../../auth/AuthProvider'
import { useDataTableStatsVisibility } from '../../../hooks/datatable'
import {
  PeriodRangeSelector,
  getPeriodRangeLabel,
  getPeriodRangePreset,
  getPeriodRangeScopeLabel,
  isDefaultPeriodRange,
} from '../../../components/filters'

const YEAR_RE = /^\d{4}$/

const extractYear = (dateValue) => {
  const year = String(dateValue || '').slice(0, 4)
  return YEAR_RE.test(year) ? year : ''
}

const toDateOnly = (dateValue) => {
  if (!dateValue) return ''
  const text = String(dateValue)
  if (text.includes('T')) return text.split('T')[0]
  if (text.includes(' ')) return text.split(' ')[0]
  return text
}

const matchesPeriodRange = (dateValue, periodRange) => {
  if (!periodRange || periodRange.preset === 'all') return true

  const dateOnly = toDateOnly(dateValue)
  if (!dateOnly) return false

  if (periodRange.startDate && dateOnly < periodRange.startDate) return false
  if (periodRange.endDate && dateOnly > periodRange.endDate) return false

  return true
}

const CallRecords = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const currentYear = String(new Date().getFullYear())
  const desktopToolsId = 'call-records-table-tools'
  const mobileToolsId = 'call-records-mobile-table-tools'

  //  State
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(false)

  // Alerts
  const [info, setInfo] = useState('')
  const [error, setError] = useState('')

  // Search / filters
  const [q, setQ] = useState('') // name / phone / address / note
  const [filterCaller, setFilterCaller] = useState('')
  const [filterOutcome, setFilterOutcome] = useState('')
  const [selectedYear, setSelectedYear] = useState('all')
  const [periodRange, setPeriodRange] = useState(() => getPeriodRangePreset('ytd'))
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const { statsVisible, toggleStatsVisible, controlsVisible, toggleControlsVisible } =
    useDataTableStatsVisibility('marketing.call-records')

  // Modal
  const [showAddCall, setShowAddCall] = useState(false)
  const [showAddContact, setShowAddContact] = useState(false)
  const [showViewContact, setShowViewContact] = useState(false)
  const [showEditContact, setShowEditContact] = useState(false)
  const [selectedContact, setSelectedContact] = useState(null)

  const currentUser = useMemo(
    () => ({
      id: user?.staff_id ?? null,
      code: user?.name_code ?? null,
      roles: Array.isArray(user?.roles) ? user.roles : [],
    }),
    [user],
  )

  const yearOptions = useMemo(() => {
    const yearSet = new Set()
    contacts.forEach((contact) => {
      const calls = Array.isArray(contact?.calls) ? contact.calls : []
      calls.forEach((call) => {
        const year = extractYear(call?.called_at)
        if (year) yearSet.add(year)
      })
    })
    return Array.from(yearSet).sort((a, b) => Number(b) - Number(a))
  }, [contacts])

  //  Load contacts and their calls
  const loadContacts = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      // Preferred path: single endpoint returns contacts + their call logs.
      const rows = await fetchApi.listContactsWithCalls({ q: '', year: currentYear, all: true })
      const normalized = rows.map((c) => ({
        ...c,
        calls: Array.isArray(c?.calls) ? c.calls : [],
      }))
      setContacts(normalized)
      return normalized
    } catch (e) {
      // Fallback keeps legacy behavior if the aggregate endpoint is unavailable.
      try {
        const rows = await fetchApi.listContacts({ q: '', year: currentYear, all: true })
        const contactsWithCalls = rows.map((c) => ({ ...c, calls: [] }))
        setContacts(contactsWithCalls)

        const callsResults = await Promise.allSettled(
          contactsWithCalls.map((c) => fetchApi.listCalls(c.id)),
        )

        const merged = contactsWithCalls.map((c, idx) => ({
          ...c,
          calls:
            callsResults[idx]?.status === 'fulfilled' && Array.isArray(callsResults[idx].value)
              ? callsResults[idx].value
              : [],
        }))

        const failedCount = callsResults.filter((r) => r.status === 'rejected').length
        if (failedCount > 0) {
          setError(`Some call logs could not be loaded (${failedCount}).`)
          setTimeout(() => setError(''), 10000)
        }
        setContacts(merged)
        return merged
      } catch (fallbackErr) {
        setError(fallbackErr?.message || e?.message || 'Failed to load call records.')
        setTimeout(() => setError(''), 10000)
        return []
      }
    } finally {
      setLoading(false)
    }
  }, [currentYear])

  useEffect(() => {
    loadContacts()
  }, [loadContacts])

  useEffect(() => {
    if (selectedYear === 'all' || yearOptions.includes(selectedYear)) return
    setSelectedYear('all')
  }, [yearOptions, selectedYear])

  //  Caller list (for dropdown)
  const availableCallers = useMemo(() => {
    const set = new Set()
    contacts.forEach((c) => {
      ;(c.calls || []).forEach((cl) => {
        if (cl.called_by_code) set.add(cl.called_by_code)
      })
    })
    return Array.from(set)
  }, [contacts])

  const activeChips = useMemo(
    () =>
      [
        q.trim() ? { key: 'search', label: `Search: ${q.trim()}` } : null,
        periodRange && !isDefaultPeriodRange(periodRange)
          ? { key: 'period', label: `Period: ${getPeriodRangeLabel(periodRange)}` }
          : null,
        selectedYear !== 'all' ? { key: 'year', label: `Year: ${selectedYear}` } : null,
        filterCaller ? { key: 'caller', label: `Caller: ${filterCaller}` } : null,
        filterOutcome ? { key: 'outcome', label: `Outcome: ${filterOutcome}` } : null,
      ].filter(Boolean),
    [filterCaller, filterOutcome, periodRange, q, selectedYear],
  )

  const activeFilterCount = getAdvancedFilterCount(activeChips)

  //  Reset filters
  const handleReset = () => {
    setQ('')
    setFilterCaller('')
    setFilterOutcome('')
    setSelectedYear('all')
    setPeriodRange(getPeriodRangePreset('ytd'))
  }

  const clearChip = (key) => {
    if (key === 'search') setQ('')
    if (key === 'period') setPeriodRange(getPeriodRangePreset('ytd'))
    if (key === 'year') setSelectedYear('all')
    if (key === 'caller') setFilterCaller('')
    if (key === 'outcome') setFilterOutcome('')
  }

  //  Live client-side filtering
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    const caller = filterCaller.trim().toLowerCase()
    const outcome = filterOutcome.trim().toLowerCase()
    const year = selectedYear === 'all' ? '' : String(selectedYear || '').trim()
    const hasCallFilters = Boolean(year || caller || outcome || periodRange?.preset !== 'all')

    return contacts.reduce((acc, c) => {
      // Contact-level search (name, phone, address, note)
      const name = (c.name || '').toLowerCase()
      const phone = (c.phone || '').toLowerCase()
      const address = (c.address || '').toLowerCase()

      const calls = Array.isArray(c.calls) ? c.calls : []
      const visibleCalls = calls.filter((call) => {
        const byCode = (call.called_by_code || '').toLowerCase()
        const outc = (call.outcome || '').toLowerCase()
        const callYear = extractYear(call?.called_at)
        const okPeriod = matchesPeriodRange(call?.called_at, periodRange)
        const okYear = !year || callYear === year
        const okCaller = !caller || byCode === caller
        const okOutcome = !outcome || outc === outcome
        return okPeriod && okYear && okCaller && okOutcome
      })

      // Check term against contact fields and visible call notes
      const noteMatch = visibleCalls.some((call) => (call.note || '').toLowerCase().includes(term))

      const matchContact =
        !term || name.includes(term) || phone.includes(term) || address.includes(term) || noteMatch

      if (!matchContact) return acc

      // When call-level filters are active, keep only contacts with matching logs.
      if (hasCallFilters && visibleCalls.length === 0) return acc

      acc.push({
        ...c,
        visibleCalls,
      })
      return acc
    }, [])
  }, [contacts, q, filterCaller, filterOutcome, periodRange, selectedYear])

  //  Modal actions
  const handleAddCall = (contact) => {
    setSelectedContact(contact)
    setShowAddCall(true)
  }

  const handleViewContact = (contact) => {
    setSelectedContact(contact)
    setShowViewContact(true)
  }

  const handleOpenContact = (contact) => {
    if (!contact?.id) return
    navigate(`/pipeline/call-records/${contact.id}`)
  }

  const handleEditContact = (contact) => {
    setSelectedContact(contact)
    setShowEditContact(true)
  }

  const handleCallSaved = (message) => {
    setShowAddCall(false)
    setInfo(message || 'Call record added successfully.')
    setTimeout(() => setInfo(''), 10000)
    loadContacts()
  }

  const handleAddContact = () => {
    setShowAddContact(true)
  }

  const handleContactSaved = async (payload = {}) => {
    const contactId = Number(payload?.contactId || 0)
    const message = payload?.message
    const draft = payload?.contactDraft || {}

    setShowAddContact(false)
    setInfo(message || 'Contact added successfully.')
    setTimeout(() => setInfo(''), 10000)
    const refreshedContacts = await loadContacts()

    let nextContact = null
    if (contactId > 0) {
      nextContact = (refreshedContacts || []).find((c) => Number(c?.id) === contactId) || null
    }

    if (!nextContact && contactId > 0) {
      nextContact = {
        id: contactId,
        name: draft?.name || '-',
        phone: draft?.phone || '',
        address: draft?.address || '',
        website: draft?.website || '',
        calls: [],
      }
    }

    if (nextContact) {
      setSelectedContact(nextContact)
      setShowAddCall(true)
    }
  }

  const handleContactUpdated = async (message) => {
    setShowEditContact(false)
    setInfo(message || 'Contact updated successfully.')
    setTimeout(() => setInfo(''), 10000)
    await loadContacts()
  }

  const handleDeleteContact = async (contact) => {
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
      setInfo('Contact deleted successfully.')
      setTimeout(() => setInfo(''), 10000)
      setShowViewContact(false)
      setShowEditContact(false)
      setSelectedContact((prev) => (Number(prev?.id) === Number(contact.id) ? null : prev))
      await loadContacts()
    } catch (e) {
      setError(e?.message || 'Failed to delete contact.')
      setTimeout(() => setError(''), 10000)
    }
  }

  //  Delete single call log
  const handleDeleteCall = async (contact, call) => {
    if (
      !(await dialog.confirm('Delete this call log?', {
        confirmText: 'Delete',
        confirmColor: 'danger',
      }))
    )
      return
    try {
      await fetchApi.deleteCall(call.id)
      setInfo('Call log deleted.')
      setTimeout(() => setInfo(''), 10000)
      const refreshedContacts = await loadContacts()

      if (selectedContact?.id) {
        const updatedSelected =
          (refreshedContacts || []).find((row) => Number(row?.id) === Number(selectedContact.id)) ||
          null

        // Keep modal/view context in sync with latest dataset after deletion.
        if (updatedSelected) {
          setSelectedContact(updatedSelected)
        } else if (Number(contact?.id) === Number(selectedContact.id)) {
          setSelectedContact(null)
        }
      }
    } catch (e) {
      setError(e?.message || 'Failed to delete call log.')
      setTimeout(() => setError(''), 10000)
    }
  }

  //  Render
  const statsScopeLabel = periodRange ? getPeriodRangeScopeLabel(periodRange) : ''

  return (
    <>
      <ModuleNavStrip tabs={pipelineCrmModuleTabs} ariaLabel="Pipeline CRM sections" />
      <CCard className="mb-4">
        <DataTableCardHeader title="Call Records" scopeLabel={statsScopeLabel}>
          <DataTableStatsToggle
            visible={statsVisible}
            onToggle={toggleStatsVisible}
            controlsVisible={controlsVisible}
            onControlsToggle={toggleControlsVisible}
          />
          <div className="d-flex flex-wrap align-items-center justify-content-end gap-3 ms-auto">
            <CButton color="primary" size="sm" onClick={handleAddContact}>
              Add My Contact
            </CButton>
          </div>
        </DataTableCardHeader>

        <CCardBody>
          {/* Alerts */}
          {error && (
            <CAlert color="danger" dismissible onClose={() => setError('')} className="mb-3">
              {error}
            </CAlert>
          )}
          {info && (
            <CAlert color="info" dismissible onClose={() => setInfo('')} className="mb-3">
              {info}
            </CAlert>
          )}

          {/* Table */}
          <CallTable
            contacts={filtered}
            loading={loading}
            beforeList={
              <CallSearchControls
                q={q}
                setQ={setQ}
                filterCaller={filterCaller}
                setFilterCaller={setFilterCaller}
                filterOutcome={filterOutcome}
                setFilterOutcome={setFilterOutcome}
                selectedYear={selectedYear}
                setSelectedYear={setSelectedYear}
                yearOptions={yearOptions}
                availableCallers={availableCallers}
                showAdvancedFilters={showAdvancedFilters}
                setShowAdvancedFilters={setShowAdvancedFilters}
                controlsVisible={controlsVisible}
                activeFilterCount={activeFilterCount}
                activeChips={activeChips}
                clearChip={clearChip}
                resetFilters={handleReset}
                loading={loading}
                desktopToolsId={desktopToolsId}
                mobileToolsId={mobileToolsId}
              />
            }
            onAddCall={handleAddCall}
            onOpenContact={handleOpenContact}
            onViewContact={handleViewContact}
            onEditContact={handleEditContact}
            onDeleteContact={handleDeleteContact}
            onDeleteCall={handleDeleteCall}
            currentUser={currentUser}
            showInlineStats={statsVisible}
            renderQuickFilters={() => (
              <PeriodRangeSelector
                value={periodRange}
                onChange={setPeriodRange}
                className="d-none d-lg-block"
              />
            )}
            desktopUtilityPortalId={desktopToolsId}
            mobileUtilityPortalId={mobileToolsId}
          />
        </CCardBody>

        {showAddCall && selectedContact && (
          <AddCallModal
            visible={showAddCall}
            contact={selectedContact}
            onClose={() => setShowAddCall(false)}
            onSaved={handleCallSaved}
          />
        )}

        {showAddContact && (
          <AddContactModal
            visible={showAddContact}
            onClose={() => setShowAddContact(false)}
            onSaved={handleContactSaved}
          />
        )}

        {showViewContact && selectedContact && (
          <ViewContactModal
            visible={showViewContact}
            contact={selectedContact}
            onClose={() => setShowViewContact(false)}
          />
        )}

        {showEditContact && selectedContact && (
          <EditContactModal
            visible={showEditContact}
            contact={selectedContact}
            onClose={() => setShowEditContact(false)}
            onSaved={handleContactUpdated}
          />
        )}
      </CCard>
    </>
  )
}

export default CallRecords
