import React from 'react'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CRow,
  CCol,
  CCard,
  CCardHeader,
  CCardBody,
} from '@coreui/react'

const valueOrDash = (value) => (String(value || '').trim() ? value : '-')
const formatDT = (iso) => {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}

const ViewContactModal = ({ visible, contact, onClose }) => {
  const calls = Array.isArray(contact?.calls) ? contact.calls : []

  return (
    <CModal visible={visible} onClose={onClose} alignment="center" size="lg">
      <CModalHeader>
        <CModalTitle>Contact Overview</CModalTitle>
      </CModalHeader>

      <CModalBody>
        <CCard>
          <CCardHeader className="py-2">
            <strong>Contact Details</strong>
          </CCardHeader>
          <CCardBody>
            <CRow className="mb-2">
              <CCol xs={4} className="small text-muted">
                Company Name
              </CCol>
              <CCol xs={8} className="fw-semibold">
                {valueOrDash(contact?.name)}
              </CCol>
            </CRow>

            <CRow className="mb-2">
              <CCol xs={4} className="small text-muted">
                Phone
              </CCol>
              <CCol xs={8}>{valueOrDash(contact?.phone)}</CCol>
            </CRow>

            <CRow className="mb-2">
              <CCol xs={4} className="small text-muted">
                Address
              </CCol>
              <CCol xs={8}>{valueOrDash(contact?.address)}</CCol>
            </CRow>

            <CRow className="mb-2">
              <CCol xs={4} className="small text-muted">
                Web URL
              </CCol>
              <CCol xs={8}>
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
              </CCol>
            </CRow>

            <CRow className="mb-2">
              <CCol xs={4} className="small text-muted">
                Created At
              </CCol>
              <CCol xs={8}>{valueOrDash(contact?.created_at)}</CCol>
            </CRow>

            <CRow>
              <CCol xs={4} className="small text-muted">
                Created By
              </CCol>
              <CCol xs={8}>{valueOrDash(contact?.created_by_code)}</CCol>
            </CRow>
          </CCardBody>

          <CCardHeader className="py-2 border-top">
            <strong>Call Logs</strong>
          </CCardHeader>
          <CCardBody>
            {calls.length === 0 ? (
              <div className="text-muted">No call logs yet.</div>
            ) : (
              <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                {calls.map((call, idx) => (
                  <div key={call?.id || idx} className={idx < calls.length - 1 ? 'mb-3' : ''}>
                    <div className="d-flex flex-wrap align-items-center gap-2">
                      <span className="fw-semibold">{valueOrDash(call?.outcome)}</span>
                      <span className="text-muted">{formatDT(call?.called_at)}</span>
                      <span className="text-primary">- {valueOrDash(call?.called_by_code)}</span>
                    </div>
                    {call?.note && <div className="text-muted small mt-1">{call.note}</div>}
                  </div>
                ))}
              </div>
            )}
          </CCardBody>
        </CCard>
      </CModalBody>

      <CModalFooter>
        <CButton size="sm" color="secondary" variant="outline" onClick={onClose}>
          Close
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default ViewContactModal
