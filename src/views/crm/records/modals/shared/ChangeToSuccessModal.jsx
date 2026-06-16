import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CModal,
  CAlert,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CFormTextarea,
  CRow,
  CCol,
  CFormLabel,
  CFormInput,
  CFormCheck,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilTrash } from '@coreui/icons'
import Select from '../../../../../components/forms/ThemedSelect'
import { listStaff } from '../../../../project/manage/projectApi'

const projectRoleOptions = [
  { value: 'Leader', label: 'Leader' },
  { value: 'Assistant', label: 'Assistant' },
  { value: 'Collaborator', label: 'Collaborator' },
]

const editableProjectRoleOptions = projectRoleOptions.filter((role) => role.value !== 'Leader')

const getStaffId = (staff) => staff?.staff_id ?? staff?.id ?? staff?.user_id
const getStaffName = (staff) => staff?.full_name || staff?.name || '-'
const getStaffCode = (staff) => staff?.name_code || staff?.code || '-'
const normalizeId = (value) => {
  const normalized = Number(value)
  return Number.isFinite(normalized) && normalized > 0 ? normalized : null
}

const getQuoteOwnerId = (record) => normalizeId(record?.createdById ?? record?.created_by_id)

const getCurrentUserStaffId = (user) => normalizeId(user?.staff_id ?? user?.id)

const moneyValue = (record) => {
  const raw =
    record?.amount ??
    record?.quote_value ??
    record?.quoteValue ??
    record?.grand_total ??
    record?.grandTotal ??
    0
  const numeric = Number(String(raw).replace(/,/g, ''))
  return Number.isFinite(numeric) ? numeric : 0
}

const formatMoney = (value) =>
  `RM ${Number(value || 0).toLocaleString('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

const ChangeToSuccessModal = ({
  visible,
  onCancel,
  onConfirm,
  record,
  currentUser,
  mode = 'award',
  value, // success reason
  onChange,
  loaRefNo = '',
  onLoaChange,
  onEditQuotation,
  awardDate,
  onAwardDateChange,
  description,
  onDescriptionChange,
  isSubmitting = false,
}) => {
  const [staffList, setStaffList] = useState([])
  const [staffLoading, setStaffLoading] = useState(false)
  const [staffLoadError, setStaffLoadError] = useState('')
  const [teamRows, setTeamRows] = useState([])
  const [useAdjustedProjectValue, setUseAdjustedProjectValue] = useState(false)
  const [currentProjectValue, setCurrentProjectValue] = useState('')
  const [projectValueReason, setProjectValueReason] = useState('')
  const teamTouchedRef = useRef(false)

  const isReAward = mode === 're-award'
  const titleText = isReAward ? 'Reason for Re-Award' : 'Reason for Success'
  const confirmText = isReAward ? 'Confirm Re-Award' : 'Confirm Award'
  const selectMenuPortalTarget = typeof document !== 'undefined' ? document.body : undefined
  const infoText = isReAward
    ? 'Upon Confirm Re-Award, a new project instance will be created under '
    : 'Upon Confirm Award, the project will be created under '
  const quoteTotal = moneyValue(record)

  // Convert JS Date to yyyy-MM-dd string for input display
  const formattedAwardDate = awardDate ? new Date(awardDate).toISOString().split('T')[0] : ''

  const staffOptions = useMemo(
    () =>
      staffList
        .map((staff) => {
          const staffId = getStaffId(staff)
          if (!staffId) return null
          return {
            value: Number(staffId),
            label: `${getStaffName(staff)} (${getStaffCode(staff)})`,
            data: staff,
          }
        })
        .filter(Boolean),
    [staffList],
  )

  const isStaffAvailable = useCallback(
    (staffId) => {
      if (!staffId || staffList.length === 0) return Boolean(staffId)
      return staffList.some((staff) => String(getStaffId(staff)) === String(staffId))
    },
    [staffList],
  )

  const getFallbackStaffOption = useCallback(
    (staffId) => {
      if (!staffId) return null
      const isQuoteOwner = String(staffId) === String(getQuoteOwnerId(record))
      const name = isQuoteOwner
        ? record?.createdByName || record?.created_by_name || 'Quote Owner'
        : currentUser?.full_name || currentUser?.name || 'Current User'
      const code = isQuoteOwner
        ? record?.createdByCode || record?.created_by_code || staffId
        : currentUser?.name_code || currentUser?.code || staffId

      return {
        value: Number(staffId),
        label: `${name} (${code})`,
      }
    },
    [currentUser, record],
  )

  const getStaffOption = useCallback(
    (staffId) => {
      if (!staffId) return null
      return (
        staffOptions.find((option) => String(option.value) === String(staffId)) ||
        getFallbackStaffOption(staffId)
      )
    },
    [getFallbackStaffOption, staffOptions],
  )

  const buildDefaultTeamRows = useCallback(() => {
    const quoteOwnerId = getQuoteOwnerId(record)
    const currentUserStaffId = getCurrentUserStaffId(currentUser)
    const leaderId = isStaffAvailable(quoteOwnerId) ? quoteOwnerId : currentUserStaffId

    return [
      {
        id: 'leader',
        staff_id: leaderId || '',
        project_role: 'Leader',
        role_description: '',
        required: true,
      },
    ]
  }, [currentUser, isStaffAvailable, record])

  useEffect(() => {
    if (!visible) return undefined

    const controller = new AbortController()
    setStaffLoading(true)
    setStaffLoadError('')

    listStaff({ signal: controller.signal })
      .then((staff) => {
        setStaffList(staff)
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        console.error('Failed to load staff options:', err)
        setStaffList([])
        setStaffLoadError('Staff options could not be loaded.')
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setStaffLoading(false)
        }
      })

    return () => controller.abort()
  }, [visible])

  useEffect(() => {
    if (!visible) {
      setTeamRows([])
      setUseAdjustedProjectValue(false)
      setCurrentProjectValue('')
      setProjectValueReason('')
      teamTouchedRef.current = false
      return
    }

    if (!teamTouchedRef.current) {
      setTeamRows(buildDefaultTeamRows())
    }
    if (currentProjectValue === '') {
      setCurrentProjectValue(quoteTotal ? quoteTotal.toFixed(2) : '')
    }
  }, [buildDefaultTeamRows, currentProjectValue, quoteTotal, visible])

  const selectedStaffIds = useMemo(
    () =>
      teamRows
        .map((row) => normalizeId(row.staff_id))
        .filter((staffId) => staffId != null)
        .map(String),
    [teamRows],
  )

  const getAvailableStaffOptions = (row) =>
    staffOptions.filter((option) => {
      const optionId = String(option.value)
      return optionId === String(row.staff_id || '') || !selectedStaffIds.includes(optionId)
    })

  const updateTeamRow = (rowId, patch) => {
    teamTouchedRef.current = true
    setTeamRows((prev) => prev.map((row) => (row.id === rowId ? { ...row, ...patch } : row)))
  }

  const addTeamRow = () => {
    teamTouchedRef.current = true
    setTeamRows((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${prev.length}`,
        staff_id: '',
        project_role: 'Assistant',
        role_description: '',
        required: false,
      },
    ])
  }

  const removeTeamRow = (rowId) => {
    teamTouchedRef.current = true
    setTeamRows((prev) => prev.filter((row) => row.id !== rowId || row.required))
  }

  const projectCollaborators = useMemo(() => {
    const seen = new Set()
    return teamRows
      .map((row) => ({
        staff_id: normalizeId(row.staff_id),
        project_role: row.project_role,
        role_description: String(row.role_description || '').trim(),
      }))
      .filter((row) => {
        if (!row.staff_id || !row.project_role || seen.has(row.staff_id)) return false
        seen.add(row.staff_id)
        return true
      })
  }, [teamRows])

  const leaderCount = projectCollaborators.filter((row) => row.project_role === 'Leader').length
  const adjustedValueNumber = Number(currentProjectValue)
  const hasValidAdjustedValue =
    !useAdjustedProjectValue || (Number.isFinite(adjustedValueNumber) && adjustedValueNumber >= 0)
  const hasProjectValueReason =
    !useAdjustedProjectValue || String(projectValueReason || '').trim().length > 0
  const disableConfirm =
    !value.trim() ||
    !description.trim() ||
    leaderCount !== 1 ||
    !hasValidAdjustedValue ||
    !hasProjectValueReason ||
    isSubmitting ||
    staffLoading

  const handleConfirm = () => {
    onConfirm(projectCollaborators, {
      project_value_decision: useAdjustedProjectValue ? 'adjusted' : 'default',
      current_project_value: useAdjustedProjectValue ? adjustedValueNumber : undefined,
      project_value_reason: useAdjustedProjectValue ? projectValueReason.trim() : undefined,
    })
  }

  return (
    <CModal visible={visible} onClose={onCancel} alignment="center" size="lg">
      <CModalHeader closeButton>
        <CModalTitle>{titleText}</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <CRow className="mb-3">
          <CCol xs={12}>
            <CFormLabel>Success Remarks</CFormLabel>
            <CFormTextarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="E.g., Constant follow-up with clients and persistent negotiation."
            />
          </CCol>
        </CRow>

        <CRow className="mb-3">
          <CCol xs={12}>
            <div className="border rounded p-3">
              <div className="d-flex flex-wrap align-items-start justify-content-between gap-2">
                <div>
                  <div className="small text-body-secondary">Quotation Grand Total</div>
                  <div className="fw-semibold">{formatMoney(quoteTotal)}</div>
                </div>
                {onEditQuotation ? (
                  <CButton
                    color="secondary"
                    variant="outline"
                    size="sm"
                    onClick={onEditQuotation}
                    disabled={isSubmitting}
                  >
                    Edit Quotation First
                  </CButton>
                ) : null}
              </div>

              <CFormCheck
                id="adjustProjectValue"
                className="mt-3"
                checked={useAdjustedProjectValue}
                onChange={(event) => setUseAdjustedProjectValue(event.target.checked)}
                label="Award with a different current project value"
                disabled={isSubmitting}
              />

              {useAdjustedProjectValue ? (
                <CRow className="g-2 mt-1">
                  <CCol md={4}>
                    <CFormLabel htmlFor="currentProjectValue" className="small text-muted mb-1">
                      Current Project Value (RM)
                    </CFormLabel>
                    <CFormInput
                      id="currentProjectValue"
                      type="number"
                      min="0"
                      step="0.01"
                      value={currentProjectValue}
                      onChange={(event) => setCurrentProjectValue(event.target.value)}
                      disabled={isSubmitting}
                    />
                  </CCol>
                  <CCol md={8}>
                    <CFormLabel htmlFor="projectValueReason" className="small text-muted mb-1">
                      Reason
                    </CFormLabel>
                    <CFormInput
                      id="projectValueReason"
                      value={projectValueReason}
                      onChange={(event) => setProjectValueReason(event.target.value)}
                      placeholder="Example: Client awarded with approved variation."
                      disabled={isSubmitting}
                    />
                  </CCol>
                  <CCol xs={12}>
                    <div className="small text-body-secondary">
                      The quotation total remains {formatMoney(quoteTotal)}. The adjusted amount is
                      stored as the project current value with revision history.
                    </div>
                  </CCol>
                </CRow>
              ) : null}
            </div>
          </CCol>
        </CRow>

        <CRow className="mb-3">
          <CCol xs={12}>
            <CFormLabel>PO / LOA Date</CFormLabel>
            <CFormInput
              type="date"
              value={formattedAwardDate}
              onChange={(e) => {
                const date = e.target.value ? new Date(e.target.value) : null
                onAwardDateChange(date)
              }}
              placeholder="Select award date"
            />
          </CCol>
        </CRow>

        <CRow className="mb-3">
          <CCol xs={12}>
            <CFormLabel>PO / LOA Reference No.</CFormLabel>
            <CFormTextarea
              value={loaRefNo}
              onChange={(e) => onLoaChange(e.target.value)}
              placeholder="E.g., UEM25PO-00000015 or Signed Quote Ref No"
            />
          </CCol>
        </CRow>

        <CRow className="mb-2">
          <CCol xs={12}>
            <CFormLabel>Project Description</CFormLabel>
            <CFormTextarea
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="Brief official project description for this awarded project"
            />
          </CCol>

          <CCol xs={12} className="mt-3">
            <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
              <CFormLabel className="mb-0">Project Team</CFormLabel>
              <CButton
                color="primary"
                variant="outline"
                size="sm"
                className="d-inline-flex align-items-center gap-1"
                onClick={addTeamRow}
                disabled={isSubmitting || staffLoading}
              >
                <CIcon icon={cilPlus} />
                Add
              </CButton>
            </div>
            {staffLoadError ? (
              <CAlert color="warning" className="py-2 mb-3">
                {staffLoadError}
              </CAlert>
            ) : null}
            {teamRows.map((row) => {
              const roleValue =
                projectRoleOptions.find((option) => option.value === row.project_role) || null
              return (
                <CRow className="g-2 align-items-end mb-2" key={row.id}>
                  <CCol md={5}>
                    <CFormLabel className="small text-muted mb-1">Staff</CFormLabel>
                    <Select
                      options={getAvailableStaffOptions(row)}
                      value={getStaffOption(row.staff_id)}
                      onChange={(option) =>
                        updateTeamRow(row.id, { staff_id: option?.value || '' })
                      }
                      isClearable={!row.required}
                      isDisabled={isSubmitting || staffLoading}
                      isLoading={staffLoading}
                      placeholder="Search staff..."
                      menuPortalTarget={selectMenuPortalTarget}
                    />
                  </CCol>
                  <CCol md={3}>
                    <CFormLabel className="small text-muted mb-1">Role</CFormLabel>
                    <Select
                      options={row.required ? projectRoleOptions : editableProjectRoleOptions}
                      value={roleValue}
                      onChange={(option) =>
                        updateTeamRow(row.id, { project_role: option?.value || 'Assistant' })
                      }
                      isDisabled={row.required || isSubmitting}
                      placeholder="Select role..."
                      menuPortalTarget={selectMenuPortalTarget}
                    />
                  </CCol>
                  <CCol md={3}>
                    <CFormLabel className="small text-muted mb-1">Description</CFormLabel>
                    <CFormInput
                      value={row.role_description}
                      onChange={(e) => updateTeamRow(row.id, { role_description: e.target.value })}
                      placeholder="Optional"
                      disabled={isSubmitting}
                    />
                  </CCol>
                  <CCol md={1} className="text-end">
                    <CButton
                      color="danger"
                      variant="outline"
                      size="sm"
                      onClick={() => removeTeamRow(row.id)}
                      disabled={row.required || isSubmitting}
                      aria-label="Remove team member"
                    >
                      <CIcon icon={cilTrash} />
                    </CButton>
                  </CCol>
                </CRow>
              )
            })}
            {leaderCount !== 1 ? (
              <div className="small text-danger">Select exactly one project Leader.</div>
            ) : null}
          </CCol>

          <CCol className="mt-3">
            <CAlert color="primary">
              {infoText}
              <strong>Project Management &gt; Manage</strong>
            </CAlert>
          </CCol>
        </CRow>
      </CModalBody>
      <CModalFooter>
        <CButton
          color="secondary"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </CButton>
        <CButton color="success" size="sm" onClick={handleConfirm} disabled={disableConfirm}>
          {isSubmitting ? 'Submitting...' : confirmText}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default ChangeToSuccessModal
