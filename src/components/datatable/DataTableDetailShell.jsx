import React from 'react'
import { CButton, CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'
import DataTableActionButtonGroup from './DataTableActionButtonGroup'
import DataTableLoadingState from './DataTableLoadingState'

const DataTableDetailShell = ({
  title = 'Record Details',
  backLabel = 'Back',
  onBack,
  loading = false,
  error,
  record,
  actions = [],
  beforeActions = null,
  beforeActionsTitle = '',
  children,
  actionsTitle = 'Actions',
  emptyMessage = 'Record not found.',
}) => (
  <CRow>
    <CCol xs={12}>
      <CCard className="mb-4 data-table-detail-shell">
        <CCardHeader className="d-flex align-items-center justify-content-between gap-2">
          <strong>{title}</strong>
          {onBack && (
            <CButton size="sm" color="secondary" variant="outline" onClick={onBack}>
              {backLabel}
            </CButton>
          )}
        </CCardHeader>
        <CCardBody>
          {loading ? (
            <DataTableLoadingState message="Loading..." />
          ) : error ? (
            <div className="py-4 text-center text-danger">{error}</div>
          ) : !record ? (
            <div className="py-4 text-center text-muted">{emptyMessage}</div>
          ) : (
            children
          )}
        </CCardBody>

        {!loading && !error && record && beforeActions && (
          <>
            {beforeActionsTitle && (
              <CCardHeader>
                <strong>{beforeActionsTitle}</strong>
              </CCardHeader>
            )}
            <CCardBody className={beforeActionsTitle ? '' : 'border-top'}>
              {beforeActions}
            </CCardBody>
          </>
        )}

        {!loading && !error && record && actions.length > 0 && (
          <>
            <CCardHeader>
              <strong>{actionsTitle}</strong>
            </CCardHeader>
            <CCardBody>
              <DataTableActionButtonGroup record={record} actions={actions} />
            </CCardBody>
          </>
        )}
      </CCard>
    </CCol>
  </CRow>
)

export default DataTableDetailShell
