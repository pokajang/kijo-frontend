import React, { useCallback, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { useNavigate } from 'react-router-dom'
import {
  CCardBody,
  CCardHeader,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'

import {
  DataTableActionMenu,
  DataTableLoadingState,
  DataTableStatusBadge,
} from '../../../../components/datatable'
import dialog from '../../../../components/dialog/dialogService'
import {
  getProjectReturnState,
  withProjectReturnParams,
} from '../../../commercial/shared/commercialReturnNavigation'
import { showToast } from '../../../../components/toast/toastService'
import { useProjectCommercialDocs } from '../commercialDocsWarning'
import { deleteProjectCommercialRecord } from '../projectApi'
import { formatProjectMoney } from '../projectDetailFormatters'

const statusToneMap = {
  approved: 'success',
  awarded: 'success',
  paid: 'success',
  pending: 'warning',
  rejected: 'danger',
  cancelled: 'danger',
}

const parseSecondary = (secondary = '') => {
  const parts = String(secondary || '')
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean)
  const amount = parts.find((part) => /^RM\s+/i.test(part))
  const status = parts.find((part) => statusToneMap[part.toLowerCase()])
  const detail = parts.filter((part) => part !== amount && part !== status).join(' | ')

  return { status, amount, detail }
}

const getDeleteConfirmMessage = (row) => {
  const reference = row.reference || row.label || 'this record'

  if (row.deleteKind === 'vendor-loa-assignment') {
    return `Remove Vendor LOA/assignment ${reference} from this project? This removes the project vendor assignment/LOA, not just this notice.`
  }
  if (row.documentType === 'invoice') {
    return `Delete invoice ${reference}? This will delete the actual invoice record from this project, not just this notice.`
  }
  if (row.documentType === 'delivery-order') {
    return `Delete delivery order ${reference}? This will delete the actual delivery order record from this project, not just this notice.`
  }
  if (row.documentType === 'jd14') {
    return `Delete JD14 record ${reference}? This will delete the actual JD14 record from this project, not just this notice.`
  }
  if (row.documentType === 'supplier-po') {
    return `Delete supplier PO ${reference}? This will delete the actual supplier PO record from this project, not just this notice.`
  }
  return `Delete ${reference}? This will delete the actual commercial record from this project, not just this notice.`
}

const shouldRefreshProgress = (row) =>
  ['invoice', 'jd14', 'vendor-loa-assignment'].includes(row.deleteKind)

const CommercialTrailsCard = ({
  projectId,
  refreshKey = 0,
  onCommercialRecordsChanged,
  onProgressUpdate,
  onVendorAssignmentsChanged,
}) => {
  const navigate = useNavigate()
  const [localRefreshKey, setLocalRefreshKey] = useState(0)
  const [deletingRecordKey, setDeletingRecordKey] = useState(null)
  const { groups, loading, error } = useProjectCommercialDocs(
    projectId,
    Boolean(projectId),
    null,
    refreshKey + localRefreshKey,
  )

  const rows = useMemo(
    () =>
      groups.flatMap((group) =>
        (Array.isArray(group.items) ? group.items : []).map((item) => {
          const secondary = parseSecondary(item.secondary)

          return {
            ...item,
            type: group.label,
            reference: item.label || '-',
            details: item.secondary || '-',
            ...secondary,
            status: secondary.status || item.status || '',
          }
        }),
      ),
    [groups],
  )

  const openRecord = useCallback(
    (event, href) => {
      if (
        !href ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return
      }

      event.preventDefault()
      navigate(href, { state: getProjectReturnState(projectId) })
    },
    [navigate, projectId],
  )

  const getContextualHref = useCallback(
    (href) => withProjectReturnParams(href, projectId),
    [projectId],
  )

  const refreshCommercialRecords = useCallback(() => {
    setLocalRefreshKey((current) => current + 1)
    if (typeof onCommercialRecordsChanged === 'function') {
      onCommercialRecordsChanged()
    }
  }, [onCommercialRecordsChanged])

  const handleDeleteRecord = useCallback(
    async (row) => {
      if (!projectId || !row?.canDelete || deletingRecordKey != null) return
      if (
        !(await dialog.confirm(getDeleteConfirmMessage(row), {
          confirmText: 'Delete',
          confirmColor: 'danger',
        }))
      )
        return

      setDeletingRecordKey(row.key || `${row.documentType}-${row.recordId}`)
      try {
        const result = await deleteProjectCommercialRecord({ projectId, record: row })
        if (result?.status === 'success') {
          showToast(result.message || 'Commercial record deleted.')
          refreshCommercialRecords()

          if (shouldRefreshProgress(row) && typeof onProgressUpdate === 'function') {
            onProgressUpdate()
          }
          if (
            row.deleteKind === 'vendor-loa-assignment' &&
            typeof onVendorAssignmentsChanged === 'function'
          ) {
            onVendorAssignmentsChanged()
          }
        } else {
          dialog.alert(result?.message || 'Failed to delete commercial record.')
        }
      } catch (err) {
        console.error('Delete commercial record error:', err)
        dialog.alert(err.message || 'Server error while deleting commercial record.')
      } finally {
        setDeletingRecordKey(null)
      }
    },
    [
      deletingRecordKey,
      onProgressUpdate,
      onVendorAssignmentsChanged,
      projectId,
      refreshCommercialRecords,
    ],
  )

  const renderCell = (row, column) => {
    if (column === 'reference') {
      const contextualHref = getContextualHref(row.href)

      return contextualHref ? (
        <a href={contextualHref} onClick={(event) => openRecord(event, contextualHref)}>
          {row.reference}
        </a>
      ) : (
        row.reference
      )
    }

    return row[column] || '-'
  }

  const renderDetails = (row) => {
    const status = row.status || ''
    const statusKey = String(status).trim().toLowerCase()
    const tone = statusToneMap[statusKey]
    const amount = row.amount ? formatProjectMoney(row.amount.replace(/^RM\s+/i, '')) : ''

    if (!tone && !amount) return row.details || '-'

    return (
      <div className="d-flex flex-wrap align-items-center gap-2">
        {tone ? <DataTableStatusBadge tone={tone}>{status}</DataTableStatusBadge> : null}
        {amount ? <span>{amount}</span> : null}
        {row.detail ? <span>{row.detail}</span> : null}
      </div>
    )
  }

  const getRowActions = (row) => {
    const normalizedStatus = String(row.status || '')
      .trim()
      .toLowerCase()
    const invoiceDeleteDisabled = row.documentType === 'invoice' && normalizedStatus !== 'pending'
    const deleting = deletingRecordKey === (row.key || `${row.documentType}-${row.recordId}`)

    return [
      row.canOpen && row.href
        ? {
            key: 'open',
            label: 'Open',
            onClick: () =>
              navigate(getContextualHref(row.href), { state: getProjectReturnState(projectId) }),
          }
        : null,
      row.canEdit && row.href
        ? {
            key: 'edit',
            label: 'Edit',
            onClick: () =>
              navigate(getContextualHref(row.href), { state: getProjectReturnState(projectId) }),
          }
        : null,
      row.canDelete
        ? {
            key: 'delete',
            label: deleting ? 'Deleting...' : 'Delete',
            danger: true,
            dividerBefore: true,
            disabled: deletingRecordKey != null || invoiceDeleteDisabled,
            tooltip: invoiceDeleteDisabled ? 'Only pending invoices can be deleted.' : undefined,
            onClick: () => handleDeleteRecord(row),
          }
        : null,
    ].filter(Boolean)
  }

  return (
    <>
      <CCardHeader className="rounded-0">
        <div className="d-flex align-items-center gap-2">
          <strong>Commercial Trails</strong>
          {!loading && !error && <small className="text-medium-emphasis">({rows.length})</small>}
        </div>
      </CCardHeader>
      <CCardBody>
        <div className="mb-1 data-table-embedded-shell">
          {/* datatable-exempt: existing embedded/layout table */}
          <CTable hover className="data-table-compact embedded-data-table">
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell>Document Type</CTableHeaderCell>
                <CTableHeaderCell>Reference</CTableHeaderCell>
                <CTableHeaderCell>Details</CTableHeaderCell>
                <CTableHeaderCell className="text-end">Actions</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {loading ? (
                <CTableRow>
                  <CTableDataCell colSpan={4} className="text-center text-muted">
                    <DataTableLoadingState message="Loading commercial records..." />
                  </CTableDataCell>
                </CTableRow>
              ) : error ? (
                <CTableRow>
                  <CTableDataCell colSpan={4} className="text-center text-danger">
                    {error}
                  </CTableDataCell>
                </CTableRow>
              ) : rows.length === 0 ? (
                <CTableRow>
                  <CTableDataCell colSpan={4} className="text-center text-muted">
                    No commercial records found for this project.
                  </CTableDataCell>
                </CTableRow>
              ) : (
                rows.map((row, index) => {
                  const actions = getRowActions(row)

                  return (
                    <CTableRow key={row.key || `${row.type}-${index}`}>
                      <CTableDataCell>{renderCell(row, 'type')}</CTableDataCell>
                      <CTableDataCell>{renderCell(row, 'reference')}</CTableDataCell>
                      <CTableDataCell>{renderDetails(row)}</CTableDataCell>
                      <CTableDataCell className="text-end">
                        {actions.length > 0 ? (
                          <DataTableActionMenu
                            record={row}
                            actions={actions}
                            ariaLabel="Commercial record actions"
                          />
                        ) : (
                          '-'
                        )}
                      </CTableDataCell>
                    </CTableRow>
                  )
                })
              )}
            </CTableBody>
          </CTable>
        </div>
      </CCardBody>
    </>
  )
}

CommercialTrailsCard.propTypes = {
  projectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  refreshKey: PropTypes.number,
  onCommercialRecordsChanged: PropTypes.func,
  onProgressUpdate: PropTypes.func,
  onVendorAssignmentsChanged: PropTypes.func,
}

export default CommercialTrailsCard
