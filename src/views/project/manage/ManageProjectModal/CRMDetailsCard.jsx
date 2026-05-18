import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { CCardHeader, CCardBody, CRow, CCol, CFormLabel } from '@coreui/react'

import { getProjectCrmDetails } from '../projectApi'

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

      <CCardBody>
        {loading ? (
          <p>Loading CRM details...</p>
        ) : error ? (
          <p className="text-danger">{error}</p>
        ) : !crmDetails ? (
          <p>No CRM details available.</p>
        ) : (
          <CRow className="g-3">
            <CCol md={4} className="project-detail-kv">
              <CFormLabel>Quote Ref No</CFormLabel>
              <p>{crmDetails.quote_ref_no || '-'}</p>
            </CCol>
            <CCol md={4} className="project-detail-kv">
              <CFormLabel>Quote Created At</CFormLabel>
              <p>{crmDetails.created_at || '-'}</p>
            </CCol>
            <CCol md={4} className="project-detail-kv">
              <CFormLabel>Quotation Status</CFormLabel>
              <p>{crmDetails.status || '-'}</p>
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
              <p>{crmDetails.award_date || '-'}</p>
            </CCol>
            <CCol md={4} className="project-detail-kv">
              <CFormLabel>Status Remarks</CFormLabel>
              <p>{crmDetails.status_remarks || '-'}</p>
            </CCol>
            <CCol md={4} className="project-detail-kv">
              <CFormLabel>Days to Award</CFormLabel>
              <p>
                {crmDetails.created_at && crmDetails.award_date
                  ? Math.round(
                      (new Date(crmDetails.award_date) - new Date(crmDetails.created_at)) /
                        (1000 * 60 * 60 * 24),
                    )
                  : '-'}
              </p>
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
