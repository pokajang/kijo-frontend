import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { CAlert, CCol, CRow } from '@coreui/react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import LoadingImage from '../../../components/LoadingImage'
import { DataTableDetailShell, DataTableStatusBadge } from '../../../components/datatable'
import InquiryAssignModal from './InquiryAssignModal'
import InquiryEditModal from './InquiryEditModal'
import {
  deleteInquiry,
  formatDate,
  getInquiry,
  getInquiryProofUrl,
  getStatusTone,
  quoteServiceKeyByInquiryService,
  serviceLabel,
  statusLabel,
} from './inquiryUtils'

const DetailField = ({ label, value, children, md = 6, lg = 4 }) => (
  <CCol xs={12} md={md} lg={lg}>
    <div className="records-detail-field">
      <div className="small text-muted">{label}</div>
      <div>{children || value || '-'}</div>
    </div>
  </CCol>
)

const DetailSectionHeading = ({ children }) => (
  <CCol xs={12}>
    <div className="fw-semibold border-bottom pb-2 mt-2">{children}</div>
  </CCol>
)

const formatCompanyAddress = (inquiry) => {
  if (!inquiry) return '-'

  const cityLine = [inquiry.zip, inquiry.city].filter(Boolean).join(' ')
  return [inquiry.address, cityLine, inquiry.state].filter(Boolean).join(', ') || '-'
}

const InquiryProofsPanel = ({ inquiry }) => {
  const proofs = inquiry?.proofs || []
  if (proofs.length === 0) return null

  return (
    <div>
      <CRow className="g-3">
        {proofs.map((proof, index) => {
          const src = getInquiryProofUrl(inquiry.id, proof)
          if (!src) return null

          return (
            <CCol xs={12} md={6} xl={4} key={proof.id || index}>
              <a
                href={src}
                target="_blank"
                rel="noreferrer"
                className="d-block text-decoration-none"
                title={proof.originalName || `Proof ${index + 1}`}
              >
                <LoadingImage
                  src={src}
                  alt={proof.originalName || `Inquiry proof ${index + 1}`}
                  className="img-fluid rounded border bg-white d-block"
                  style={{
                    width: '100%',
                    maxHeight: '360px',
                    objectFit: 'contain',
                  }}
                  placeholderStyle={{ minHeight: 180 }}
                />
              </a>
              <div className="small text-muted text-truncate mt-2" title={proof.originalName}>
                {proof.originalName || `Proof ${index + 1}`}
              </div>
            </CCol>
          )
        })}
      </CRow>
    </div>
  )
}

const normalizeInquiry = (inquiry) =>
  inquiry
    ? {
        ...inquiry,
        inquiryDateDisplay: formatDate(inquiry.inquiryDate),
        statusLabel: statusLabel(inquiry.status),
        serviceRequiredLabel: serviceLabel(inquiry.serviceRequired),
        proofCount: Number(inquiry.proofCount || inquiry.proofs?.length || 0),
        ownerStaffDisplay: inquiry.ownerStaffCode || inquiry.ownerStaffName || '-',
        ownerAssignedByDisplay: inquiry.ownerAssignedByCode || inquiry.ownerAssignedByName || '-',
      }
    : null

const InquiryDetailPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams()
  const [inquiry, setInquiry] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [info, setInfo] = useState(location.state?.inquiryMessage || '')
  const [actionError, setActionError] = useState('')
  const [editInquiry, setEditInquiry] = useState(null)
  const [assignInquiry, setAssignInquiry] = useState(null)

  const loadInquiry = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      setInquiry(normalizeInquiry(await getInquiry(id)))
    } catch (err) {
      setInquiry(null)
      setLoadError(err?.message || 'Unable to load inquiry.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadInquiry()
  }, [loadInquiry])

  useEffect(() => {
    if (location.state?.inquiryMessage) {
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  const actions = useMemo(
    () =>
      inquiry
        ? [
            {
              key: 'edit',
              label: 'Edit',
              onClick: () => setEditInquiry(inquiry),
            },
            {
              key: 'assign',
              label: 'Assign PIC',
              onClick: () => setAssignInquiry(inquiry),
            },
            {
              key: 'client',
              label: inquiry.clientId ? 'View Client' : 'Create Client',
              onClick: () => {
                if (inquiry.clientId) {
                  navigate(`/client/manage/${inquiry.clientId}`)
                  return
                }

                try {
                  sessionStorage.setItem(
                    'inquiryCreateClientDraft',
                    JSON.stringify({
                      companyName: inquiry.companyName || '',
                      ssmNumber: inquiry.ssmNumber || '',
                      taxIdNoTin: inquiry.taxIdNoTin || '',
                      contactName: inquiry.contactName || '',
                      mobile: inquiry.mobile || '601',
                      email: inquiry.email || '',
                      address: inquiry.address || '',
                      city: inquiry.city || '',
                      state: inquiry.state || '',
                      zip: inquiry.zip || '',
                      inquiryId: inquiry.id,
                    }),
                  )
                  navigate('/client/create')
                } catch (err) {
                  setActionError('Unable to prepare client draft from inquiry.')
                }
              },
            },
            inquiry.serviceRequired
              ? {
                  key: 'quote',
                  label: inquiry.clientId ? 'Create Quote' : 'Create Client First',
                  onClick: () => {
                    if (!inquiry.clientId) {
                      try {
                        sessionStorage.setItem(
                          'inquiryCreateClientDraft',
                          JSON.stringify({
                            companyName: inquiry.companyName || '',
                            ssmNumber: inquiry.ssmNumber || '',
                            taxIdNoTin: inquiry.taxIdNoTin || '',
                            contactName: inquiry.contactName || '',
                            mobile: inquiry.mobile || '601',
                            email: inquiry.email || '',
                            address: inquiry.address || '',
                            city: inquiry.city || '',
                            state: inquiry.state || '',
                            zip: inquiry.zip || '',
                            inquiryId: inquiry.id,
                          }),
                        )
                        navigate('/client/create')
                      } catch (err) {
                        setActionError('Unable to prepare client draft from inquiry.')
                      }
                      return
                    }

                    try {
                      const quoteServiceKey =
                        quoteServiceKeyByInquiryService(inquiry.serviceRequired) || 'training'
                      sessionStorage.setItem('lastCreatedClientId', String(inquiry.clientId))
                      if (inquiry.clientName) {
                        sessionStorage.setItem('lastCreatedClientName', inquiry.clientName)
                      }
                      sessionStorage.setItem(
                        'quoteInquirySource',
                        JSON.stringify({
                          clientId: '',
                          service: inquiry.serviceRequiredLabel,
                          serviceKey: quoteServiceKey,
                          source: inquiry.source,
                          remarks: inquiry.sourceRemarks || inquiry.remarks || '',
                          inquiryId: inquiry.id,
                          timestamp: new Date().toISOString(),
                        }),
                      )
                      navigate(`/crm/quotes?service=${quoteServiceKey}`)
                    } catch (err) {
                      setActionError('Unable to prepare inquiry source for quotation.')
                    }
                  },
                }
              : null,
            {
              key: 'delete',
              label: 'Delete',
              danger: true,
              onClick: async () => {
                if (!window.confirm(`Delete ${inquiry.companyName}?`)) return
                try {
                  await deleteInquiry(inquiry.id)
                  navigate('/pipeline/inquiries', {
                    state: { inquiryMessage: 'Inquiry deleted.' },
                  })
                } catch (err) {
                  setActionError(err?.message || 'Unable to delete inquiry.')
                }
              },
            },
          ].filter(Boolean)
        : [],
    [inquiry, navigate],
  )

  const handleEditSaved = async () => {
    setEditInquiry(null)
    setActionError('')
    setInfo('Inquiry updated.')
    await loadInquiry()
  }

  const handleAssignmentSaved = async () => {
    setAssignInquiry(null)
    setActionError('')
    setInfo('Inquiry PIC assignment updated.')
    await loadInquiry()
  }

  return (
    <>
      {info && (
        <CAlert color="success" dismissible onClose={() => setInfo('')} className="mb-3">
          {info}
        </CAlert>
      )}
      {actionError && (
        <CAlert color="danger" dismissible onClose={() => setActionError('')} className="mb-3">
          {actionError}
        </CAlert>
      )}

      <DataTableDetailShell
        title="Inquiry Details"
        backLabel="Back"
        onBack={() => navigate('/pipeline/inquiries')}
        loading={loading}
        error={loadError}
        record={inquiry}
        actions={actions}
        beforeActions={
          inquiry?.proofs?.length > 0 ? <InquiryProofsPanel inquiry={inquiry} /> : null
        }
        beforeActionsTitle="Screenshot Proofs"
        emptyMessage="Inquiry not found."
      >
        <CRow className="g-3">
          <DetailSectionHeading>Company Details</DetailSectionHeading>
          <DetailField label="Company" value={inquiry?.companyName} />
          <DetailField label="Status">
            <DataTableStatusBadge tone={getStatusTone(inquiry?.status)}>
              {inquiry?.statusLabel || '-'}
            </DataTableStatusBadge>
          </DetailField>
          <DetailField label="Date of Inquiry" value={inquiry?.inquiryDateDisplay} />
          <DetailField label="SSM Number" value={inquiry?.ssmNumber} />
          <DetailField label="Tax Id. No. (TIN)" value={inquiry?.taxIdNoTin} />
          <DetailField label="Service Required" value={inquiry?.serviceRequiredLabel} />
          <DetailField
            label="Company Address"
            value={formatCompanyAddress(inquiry)}
            md={12}
            lg={12}
          />
          <DetailField label="Source" value={inquiry?.source} />
          <DetailField label="Source Remarks" value={inquiry?.sourceRemarks} />
          <DetailField label="Created At" value={inquiry?.createdAt} />
          <DetailField label="Updated At" value={inquiry?.updatedAt} />
          <CCol xs={12}>
            <div className="records-detail-field">
              <div className="small text-muted">Remarks</div>
              <div>{inquiry?.remarks || '-'}</div>
            </div>
          </CCol>

          <DetailSectionHeading>PIC Details</DetailSectionHeading>
          <DetailField label="Contact Name" value={inquiry?.contactName} />
          <DetailField label="Mobile" value={inquiry?.mobile} />
          <DetailField label="Email" value={inquiry?.email} />
          <DetailField label="Assigned PIC" value={inquiry?.ownerStaffDisplay} />
          <DetailField label="Assigned By" value={inquiry?.ownerAssignedByDisplay} />
          <DetailField label="Assigned At" value={inquiry?.ownerAssignedAt} />
        </CRow>
      </DataTableDetailShell>

      <InquiryAssignModal
        visible={Boolean(assignInquiry)}
        inquiry={assignInquiry}
        onClose={() => setAssignInquiry(null)}
        onSaved={handleAssignmentSaved}
      />
      <InquiryEditModal
        visible={Boolean(editInquiry)}
        inquiry={editInquiry}
        onClose={() => setEditInquiry(null)}
        onSaved={handleEditSaved}
      />
    </>
  )
}

export default InquiryDetailPage
