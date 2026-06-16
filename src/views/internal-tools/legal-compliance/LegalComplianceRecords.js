import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CAlert, CButton, CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus } from '@coreui/icons'

import dialog from '../../../components/dialog/dialogService'
import {
  DataTableColumnMenu,
  DataTableRecordList,
  DataTableToolbar,
} from '../../../components/datatable'
import { useColumnPreferences, useDataTableSort } from '../../../hooks/datatable'
import {
  createLegalComplianceAssessmentRevision,
  deleteLegalComplianceAssessment,
  getLegalComplianceAssessmentPdfUrl,
  listLegalComplianceAssessments,
} from './api/legalComplianceApi'
import {
  COLUMN_STORAGE_KEY,
  DEFAULT_VISIBLE_COLUMNS,
  REQUIRED_COLUMNS,
  dataColumns,
  exportAssessmentRecordsCsv,
  getRecordActions,
  getSearchText,
  getSortValue,
  mobileRecord,
  openRecordReport,
  renderRecordCell,
} from './records/assessmentRecordsTableConfig'

const LegalComplianceRecords = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [records, setRecords] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchValue, setSearchValue] = useState('')
  const [submittedAssessmentId, setSubmittedAssessmentId] = useState(
    () => location.state?.submittedAssessmentId || null,
  )
  const [revisionRecordId, setRevisionRecordId] = useState(null)
  const { isColumnVisible, toggleColumnVisibility, resetColumnVisibility } = useColumnPreferences({
    storageKey: COLUMN_STORAGE_KEY,
    defaultVisibleColumns: DEFAULT_VISIBLE_COLUMNS,
    requiredColumns: REQUIRED_COLUMNS,
  })

  useEffect(() => {
    const controller = new AbortController()

    ;(async () => {
      try {
        setIsLoading(true)
        setError('')
        const payload = await listLegalComplianceAssessments({ signal: controller.signal })
        setRecords(Array.isArray(payload.records) ? payload.records : [])
      } catch (loadError) {
        if (loadError.name === 'AbortError') return
        setError(loadError.message || 'Could not load legal compliance records.')
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    })()

    return () => controller.abort()
  }, [])

  const filteredRecords = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase()
    if (!normalizedSearch) return records

    return records.filter((record) => getSearchText(record).includes(normalizedSearch))
  }, [records, searchValue])

  const visibleExportColumns = useMemo(
    () => dataColumns.filter((column) => isColumnVisible(column.key)),
    [isColumnVisible],
  )
  const sortTypes = useMemo(
    () =>
      dataColumns.reduce((types, column) => {
        types[column.key] = column.sortType || 'string'
        return types
      }, {}),
    [],
  )
  const {
    sortField,
    sortDir,
    toggleSort,
    sortedRows: sortedFilteredRecords,
  } = useDataTableSort({
    rows: filteredRecords,
    initialSortField: 'updated_at',
    initialSortDir: 'desc',
    getSortValue,
    sortTypes,
  })

  const renderColumnMenu = () => (
    <div className="d-none d-lg-block">
      <DataTableColumnMenu
        columns={dataColumns.map((column) => ({ key: column.key, label: column.label }))}
        isColumnVisible={isColumnVisible}
        toggleColumnVisibility={toggleColumnVisibility}
        resetColumnVisibility={resetColumnVisibility}
        requiredColumns={REQUIRED_COLUMNS}
        idPrefix="legal-compliance-records-column"
      />
    </div>
  )

  const handleDeleteRecord = async (record) => {
    const companyName = record.company_name || 'this assessment record'
    const confirmed = await dialog.confirm(
      `Delete ${companyName}? It will be hidden from records but kept for audit history.`,
      {
        title: 'Delete Assessment Record',
        confirmText: 'Delete',
        confirmColor: 'danger',
        cancelText: 'Cancel',
        intent: 'danger',
      },
    )
    if (!confirmed) return

    try {
      setError('')
      await deleteLegalComplianceAssessment(record.id)
      setRecords((current) => current.filter((item) => String(item.id) !== String(record.id)))
      if (String(submittedAssessmentId) === String(record.id)) {
        setSubmittedAssessmentId(null)
      }
    } catch (deleteError) {
      setError(deleteError.message || 'Assessment record could not be deleted.')
    }
  }

  const handleExportPdf = (record) => {
    window.open(getLegalComplianceAssessmentPdfUrl(record.id), '_blank', 'noopener,noreferrer')
  }

  const handleCreateRevision = async (record) => {
    if (revisionRecordId) return

    try {
      setRevisionRecordId(record.id)
      setError('')
      const payload = await createLegalComplianceAssessmentRevision(record.id)
      const revisionId = payload?.data?.id
      if (!revisionId) throw new Error('Assessment revision could not be created.')
      navigate(`/internal-tools/legal-compliance?assessmentId=${encodeURIComponent(revisionId)}`)
    } catch (revisionError) {
      setError(revisionError.message || 'Assessment revision could not be created.')
      setRevisionRecordId(null)
    }
  }

  const handleExportSubmittedPdf = () => {
    if (!submittedAssessmentId) return
    window.open(
      getLegalComplianceAssessmentPdfUrl(submittedAssessmentId),
      '_blank',
      'noopener,noreferrer',
    )
  }

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4 records-page-card">
          <CCardHeader className="d-flex align-items-center justify-content-between gap-2 flex-wrap records-page-card-header">
            <strong>Legal Compliance Assessment Records</strong>
            <div className="d-flex gap-2 flex-wrap">
              <CButton
                color="secondary"
                size="sm"
                variant="outline"
                onClick={() => navigate('/internal-tools')}
              >
                Back
              </CButton>
              <CButton
                color="primary"
                size="sm"
                className="d-inline-flex align-items-center gap-1"
                onClick={() => navigate('/internal-tools/legal-compliance/select-template')}
              >
                <CIcon icon={cilPlus} />
                Start New
              </CButton>
            </div>
          </CCardHeader>
          <CCardBody className="records-page-card-body">
            {submittedAssessmentId && (
              <CAlert
                color="success"
                className="mb-3 d-flex align-items-center justify-content-between gap-2 flex-wrap"
                dismissible
                onClose={() => setSubmittedAssessmentId(null)}
              >
                <span>Report submitted.</span>
                <span className="d-flex gap-2 flex-wrap">
                  <CButton
                    color="success"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      navigate(
                        `/internal-tools/legal-compliance?assessmentId=${encodeURIComponent(
                          submittedAssessmentId,
                        )}&mode=review`,
                      )
                    }
                  >
                    View Submitted Report
                  </CButton>
                  <CButton
                    color="success"
                    size="sm"
                    variant="outline"
                    onClick={handleExportSubmittedPdf}
                  >
                    Export Report PDF
                  </CButton>
                  <CButton
                    color="success"
                    size="sm"
                    onClick={() => navigate('/internal-tools/legal-compliance/select-template')}
                  >
                    Start New
                  </CButton>
                </span>
              </CAlert>
            )}
            {error && (
              <CAlert color="danger" className="mb-3">
                {error}
              </CAlert>
            )}

            <DataTableToolbar
              searchValue={searchValue}
              onSearchChange={setSearchValue}
              searchPlaceholder="Search assessment records..."
              searchAriaLabel="Search legal compliance assessment records"
              onExportCsv={() =>
                exportAssessmentRecordsCsv({
                  rows: sortedFilteredRecords,
                  visibleColumns: visibleExportColumns,
                })
              }
              exportDisabled={sortedFilteredRecords.length === 0}
              renderColumnMenu={renderColumnMenu}
            />

            <DataTableRecordList
              rows={sortedFilteredRecords}
              loading={isLoading}
              loadingMessage="Loading records..."
              emptyMessage="No legal compliance assessments saved yet."
              dataColumns={dataColumns}
              defaultVisibleColumns={DEFAULT_VISIBLE_COLUMNS}
              requiredColumns={REQUIRED_COLUMNS}
              scrollStorageKey="legal-compliance.records.scroll"
              idPrefix="legal-compliance-records"
              getRowKey={(record) => record.id}
              renderCell={renderRecordCell}
              getSortValue={getSortValue}
              getActions={(record) =>
                getRecordActions(record, {
                  navigate,
                  onDelete: handleDeleteRecord,
                  onExportPdf: handleExportPdf,
                  onCreateRevision: handleCreateRevision,
                })
              }
              onRowOpen={(record) => openRecordReport(record, navigate)}
              initialSortField="updated_at"
              initialSortDir="desc"
              controlledSortField={sortField}
              controlledSortDir={sortDir}
              onControlledSort={toggleSort}
              columnVisibilityController={{
                isColumnVisible,
                toggleColumnVisibility,
                resetColumnVisibility,
              }}
              desktopBreakpoint="lg"
              showDesktopSummary={false}
              desktopUtilityPlacement="hidden"
              mobileUtilityPlacement="hidden"
              showMobileUtilityRow={false}
              showExport={false}
              showColumnMenu={false}
              mobileRecord={mobileRecord}
              resetDeps={[searchValue]}
              tableViewportDeps={[searchValue]}
            />
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default LegalComplianceRecords
