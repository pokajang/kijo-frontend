import React, { useCallback, useMemo } from 'react'
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

import { DataTableLoadingState } from '../../../../components/datatable'
import { useProjectCommercialDocs } from '../commercialDocsWarning'

const CommercialTrailsCard = ({ projectId, refreshKey = 0 }) => {
  const navigate = useNavigate()
  const { groups, loading, error } = useProjectCommercialDocs(
    projectId,
    Boolean(projectId),
    null,
    refreshKey,
  )

  const rows = useMemo(
    () =>
      groups.flatMap((group) =>
        (Array.isArray(group.items) ? group.items : []).map((item) => ({
          ...item,
          type: group.label,
          reference: item.label || '-',
          details: item.secondary || '-',
        })),
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
      navigate(href)
    },
    [navigate],
  )

  const renderCell = (row, column) => {
    if (column === 'reference') {
      return row.href ? (
        <a href={row.href} onClick={(event) => openRecord(event, row.href)}>
          {row.reference}
        </a>
      ) : (
        row.reference
      )
    }

    return row[column] || '-'
  }

  return (
    <>
      <CCardHeader className="rounded-0">
        <strong>Commercial Trails</strong>
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
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {loading ? (
                <CTableRow>
                  <CTableDataCell colSpan={3} className="text-center text-muted">
                    <DataTableLoadingState message="Loading commercial records..." />
                  </CTableDataCell>
                </CTableRow>
              ) : error ? (
                <CTableRow>
                  <CTableDataCell colSpan={3} className="text-center text-danger">
                    {error}
                  </CTableDataCell>
                </CTableRow>
              ) : rows.length === 0 ? (
                <CTableRow>
                  <CTableDataCell colSpan={3} className="text-center text-muted">
                    No commercial records found for this project.
                  </CTableDataCell>
                </CTableRow>
              ) : (
                rows.map((row, index) => (
                  <CTableRow key={row.key || `${row.type}-${index}`}>
                    <CTableDataCell>{renderCell(row, 'type')}</CTableDataCell>
                    <CTableDataCell>{renderCell(row, 'reference')}</CTableDataCell>
                    <CTableDataCell>{renderCell(row, 'details')}</CTableDataCell>
                  </CTableRow>
                ))
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
}

export default CommercialTrailsCard
