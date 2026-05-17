import React from 'react'
import {
  CCard,
  CCardHeader,
  CCardBody,
  CRow,
  CCol,
  CFormLabel,
  CBadge,
  CProgress,
} from '@coreui/react'
import { DataTableLoadingState } from '../../../components/datatable'

/**
 * Displays a progress bar + badge for each KPI in annualOverview.
 */
const AnnualKpiSection = ({
  year, // optional: selected year for display
  annualOverview,
  loading,
  error,
}) => {
  const toNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0)

  return (
    <CCard className="mb-4">
      <CCardHeader>
        <strong>Annual Overview{year ? ` (${year})` : ''}</strong>
      </CCardHeader>
      <CCardBody>
        {loading && <DataTableLoadingState message="Loading annual overview..." />}
        {error && <p className="text-danger">{error}</p>}

        {!loading && !error && (!annualOverview || annualOverview.length === 0) && (
          <p className="text-muted mb-0">No annual data to display.</p>
        )}

        {!loading &&
          !error &&
          annualOverview?.map((kpi) => {
            const current = toNum(kpi.current)
            const target = toNum(kpi.annual_target)
            const pct = target > 0 ? Math.round((current / target) * 100) : 0

            const badgeColor =
              pct > 100 ? 'primary' : pct >= 80 ? 'success' : pct >= 50 ? 'warning' : 'danger'

            return (
              <div key={kpi.id} className="mb-4">
                <CRow className="align-items-center">
                  <CCol xs={6}>
                    <CFormLabel>{kpi.label}</CFormLabel>
                  </CCol>
                  <CCol xs={6} className="text-end">
                    {current} / {target} {kpi.unit}
                    <br />
                    <CBadge color={badgeColor} className="mt-1">
                      {pct}%
                    </CBadge>
                  </CCol>
                </CRow>
                <CProgress
                  value={pct}
                  label={`${pct}%`}
                  color={kpi.color || 'primary'}
                  className="mt-2"
                />
              </div>
            )
          })}
      </CCardBody>
    </CCard>
  )
}

export default AnnualKpiSection
