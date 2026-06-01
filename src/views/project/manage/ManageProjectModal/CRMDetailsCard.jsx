import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { CAlert, CCardHeader, CCardBody, CRow, CCol, CFormLabel } from '@coreui/react'

import { DataTableLoadingState, DataTableStatusBadge } from '../../../../components/datatable'
import { getProjectCrmDetails } from '../projectApi'
import {
  formatProjectDate,
  formatProjectDateTime,
  formatProjectDurationDays,
} from '../projectDetailFormatters'

const CRMDetailsCard = ({ project }) => {
  const [crmDetails, setCrmDetails] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // If there's no project ID, clear out any old data
    if (!project?.id) {
      setCrmDetails(null)
      setError('')
      return
    }

    const controller = new AbortController()

    const fetchCrmDetails = async () => {
      setLoading(true)
      setError('')

      try {
        const data = await getProjectCrmDetails(project.id, { signal: controller.signal })

        // Handle backend-level errors or missing expected fields.
        if (data.status === 'error' || !data.quote_ref_no) {
          setCrmDetails(null)
          setError(data.message || 'No CRM details found.')
        } else {
          setCrmDetails(data)
        }
      } catch (err) {
        if (err.name === 'AbortError') return
        console.error('Fetch failed:', err)
        setError('Failed to load CRM details.')
        setCrmDetails(null)
      } finally {
        setLoading(false)
      }
    }

    fetchCrmDetails()

    return () => {
      controller.abort()
    }
  }, [project?.id])

  return (
    <>
      <CCardHeader className="rounded-0">
        <strong>CRM Trails</strong>
      </CCardHeader>

      <CCardBody className="project-detail-compact-body">
        {loading ? (
          <DataTableLoadingState message="Loading CRM details..." />
        ) : error ? (
          <CAlert color="danger" className="mb-0 py-2">
            {error}
          </CAlert>
        ) : !crmDetails ? (
          <p className="mb-0 text-medium-emphasis">No CRM details available.</p>
        ) : (
          <CRow className="project-detail-compact-grid">
            <CCol md={4} className="project-detail-kv">
              <CFormLabel>Quote Ref No</CFormLabel>
              <p>{crmDetails.quote_ref_no || '-'}</p>
            </CCol>
            <CCol md={4} className="project-detail-kv">
              <CFormLabel>Quote Created At</CFormLabel>
              <p>{formatProjectDateTime(crmDetails.created_at)}</p>
            </CCol>
            <CCol md={4} className="project-detail-kv">
              <CFormLabel>Quotation Status</CFormLabel>
              <p>
                <DataTableStatusBadge tone={crmDetails.status === 'Awarded' ? 'success' : 'info'}>
                  {crmDetails.status || '-'}
                </DataTableStatusBadge>
              </p>
            </CCol>
            <CCol md={4} className="project-detail-kv">
              <CFormLabel>Quotation Issuer</CFormLabel>
              <p>{crmDetails.created_by_name || '-'}</p>
            </CCol>
            <CCol md={4} className="project-detail-kv">
              <CFormLabel>Issuer Staff Code</CFormLabel>
              <p>{crmDetails.created_by_code || '-'}</p>
            </CCol>
            <CCol md={4} className="project-detail-kv">
              <CFormLabel>Award Date</CFormLabel>
              <p>{formatProjectDate(crmDetails.award_date)}</p>
            </CCol>
            <CCol md={4} className="project-detail-kv">
              <CFormLabel>Status Remarks</CFormLabel>
              <p>{crmDetails.status_remarks || '-'}</p>
            </CCol>
            <CCol md={4} className="project-detail-kv">
              <CFormLabel>Days to Award</CFormLabel>
              <p>{formatProjectDurationDays(crmDetails.created_at, crmDetails.award_date)}</p>
            </CCol>
          </CRow>
        )}
      </CCardBody>
    </>
  )
}

CRMDetailsCard.propTypes = {
  project: PropTypes.object,
}

export default CRMDetailsCard
