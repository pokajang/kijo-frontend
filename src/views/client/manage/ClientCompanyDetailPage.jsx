import React, { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { CAlert, CCol, CRow } from '@coreui/react'
import {
  DataTableDetailShell,
  DataTableEmbeddedList,
  DataTableStatusBadge,
} from '../../../components/datatable'
import DeleteCompanyModal from './components/DeleteCompanyModal'
import { getClientPaymentTermsMeta } from '../../../shared/paymentTerms'
import { getCurrentReturnTo, getDetailReturnTo } from '../../../utils/navigation/returnTo'

const API_BASE = import.meta.env.VITE_API_BASE
const emptyValue = '-'

const normalizeStatus = (status) => {
  const value = String(status || '').trim()
  if (!value) return 'No Status'
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
}

const getStatusTone = (status) => {
  if (status === 'New') return 'success'
  if (status === 'Old') return 'info'
  return 'danger'
}

const normalizePic = (pic) => ({
  pic_id: pic.pic_id,
  company_id: pic.company_id,
  full_name: pic.full_name || '',
  email: pic.email || '',
  mobile_number: pic.mobile_number || '',
  position: pic.position || '',
  status: pic.status || '',
})

const normalizeBranch = (branch, companyId) => ({
  branch_id: branch.branch_id || null,
  company_id: branch.company_id || companyId,
  branch_name: branch.branch_name || '',
  address: branch.address || '',
  city: branch.city || '',
  state: branch.state || '',
  zip: branch.zip || '',
  country: branch.country || 'Malaysia',
})

const DetailField = ({ label, value, children }) => (
  <CCol xs={12} md={6} lg={4}>
    <div className="records-detail-field">
      <div className="small text-muted">{label}</div>
      <div>{children || value || emptyValue}</div>
    </div>
  </CCol>
)

const branchColumns = [
  {
    key: 'branch_name',
    label: 'Branch',
    render: (branch, index) => branch.branch_name || `Branch ${index + 1}`,
  },
  { key: 'address', label: 'Address' },
  { key: 'zip', label: 'Zip' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'country', label: 'Country' },
]

const picColumns = [
  { key: 'full_name', label: 'Full Name' },
  { key: 'email', label: 'Email' },
  { key: 'mobile_number', label: 'Mobile' },
  { key: 'position', label: 'Position' },
]

const ClientCompanyDetailPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { companyId } = useParams()
  const returnTo = getDetailReturnTo(location, '/client/manage')
  const [company, setCompany] = useState(null)
  const [branches, setBranches] = useState([])
  const [pics, setPics] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [actionError, setActionError] = useState('')
  const [deleteModalVisible, setDeleteModalVisible] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const fetchCompanyPics = useCallback(async (id) => {
    const response = await fetch(`${API_BASE}client-companies/${id}/pics`, {
      credentials: 'include',
    })
    const result = await response.json()
    if (result.status !== 'success' || !Array.isArray(result.data)) return []
    return result.data.map(normalizePic)
  }, [])

  const fetchCompanyBranches = useCallback(async (id) => {
    const response = await fetch(`${API_BASE}client-companies/${id}/branches`, {
      credentials: 'include',
    })
    const result = await response.json()
    if (result.status !== 'success' || !Array.isArray(result.data)) return []
    return result.data.map((branch) => normalizeBranch(branch, id))
  }, [])

  const loadCompany = useCallback(async () => {
    const id = Number(companyId)
    if (!id) {
      setError('Invalid client company id.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    try {
      const response = await fetch(`${API_BASE}client-companies/${id}`, { credentials: 'include' })
      const result = await response.json()
      if (result.status !== 'success') {
        throw new Error(result.message || 'Unable to load client company.')
      }

      const nextCompany = result.data || null
      if (!nextCompany) {
        setCompany(null)
        setBranches([])
        setPics([])
        setError('Client company not found.')
        return
      }

      const [nextBranches, nextPics] = await Promise.all([
        fetchCompanyBranches(id),
        fetchCompanyPics(id),
      ])
      setCompany(nextCompany)
      setBranches(nextBranches)
      setPics(nextPics)
    } catch (err) {
      setCompany(null)
      setBranches([])
      setPics([])
      setError(err.message || 'Unable to load client company.')
    } finally {
      setLoading(false)
    }
  }, [companyId, fetchCompanyBranches, fetchCompanyPics])

  useEffect(() => {
    loadCompany()
  }, [loadCompany])

  useEffect(() => {
    if (location.state?.message) {
      setInfo(location.state.message)
    }
  }, [location.state?.message])

  const openEditPage = useCallback(() => {
    if (!company?.company_id) return
    navigate(`/client/manage/${company.company_id}/edit`, { state: { company } })
  }, [company, navigate])

  useEffect(() => {
    if (loading || !company || !location.hash) return undefined

    const timer = window.setTimeout(() => {
      document.getElementById(location.hash.slice(1))?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }, 50)

    return () => window.clearTimeout(timer)
  }, [company, loading, location.hash])

  const confirmDeleteCompany = async () => {
    if (!company?.company_id) return

    setDeleteLoading(true)
    setActionError('')
    try {
      const response = await fetch(`${API_BASE}client-companies/${company.company_id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const result = await response.json()
      if (result.status === 'success') {
        setDeleteModalVisible(false)
        navigate(returnTo)
      } else {
        setActionError(result.message || 'Unable to delete client company.')
      }
    } catch (err) {
      console.error('Delete company error:', err)
      setActionError('Server error. Please try again later.')
    } finally {
      setDeleteLoading(false)
    }
  }

  const status = normalizeStatus(company?.client_status)
  const actions = company
    ? [
        {
          key: 'edit',
          label: 'Edit',
          onClick: openEditPage,
        },
        {
          key: 'first-touch',
          label: 'View First Touch',
          onClick: () =>
            navigate(`/client/first-touch/${company.company_id}`, {
              state: { returnTo: getCurrentReturnTo(location) },
            }),
        },
        {
          key: 'delete',
          label: 'Delete',
          danger: true,
          onClick: () => setDeleteModalVisible(true),
        },
      ]
    : []

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
        title="Client Company Details"
        backLabel="Back"
        onBack={() => navigate(returnTo)}
        loading={loading}
        error={error}
        record={company}
        actions={actions}
        emptyMessage="Client company not found."
      >
        <CRow className="g-3 mb-4">
          <DetailField label="Company" value={company?.company_name} />
          <DetailField label="Status">
            <DataTableStatusBadge tone={getStatusTone(status)}>{status}</DataTableStatusBadge>
          </DetailField>
          <DetailField label="Payment Terms" value={getClientPaymentTermsMeta(company).display} />
          <DetailField label="SSM" value={company?.ssm_number} />
          <DetailField label="TIN" value={company?.tax_id_no_tin} />
          <DetailField label="Address" value={company?.address} />
          <DetailField label="Zip" value={company?.zip} />
          <DetailField label="City" value={company?.city} />
          <DetailField label="State" value={company?.state} />
        </CRow>

        <div id="branches" className="mb-4">
          <div className="fw-semibold mb-2">Branches ({branches.length})</div>
          <DataTableEmbeddedList
            rows={branches}
            columns={branchColumns}
            getRowKey={(branch, index) => branch.branch_id || `${branch.company_id}-${index}`}
            emptyMessage="No branch records found."
            renderMobileItem={(branch, index) => (
              <div className="records-mobile-item">
                <div className="records-mobile-quote-id">
                  {branch.branch_name || `Branch ${index + 1}`}
                </div>
                <div className="records-mobile-subtitle mt-1">{branch.address || '-'}</div>
                <div className="records-mobile-client mt-1">
                  {[branch.zip, branch.city, branch.state, branch.country]
                    .filter(Boolean)
                    .join(', ') || '-'}
                </div>
              </div>
            )}
          />
        </div>

        <div id="pics">
          <div className="fw-semibold mb-2">PICs ({pics.length})</div>
          <DataTableEmbeddedList
            rows={pics}
            columns={picColumns}
            getRowKey={(pic, index) => pic.pic_id || `${pic.company_id}-${index}`}
            emptyMessage="No PIC records found."
            renderMobileItem={(pic) => (
              <div className="records-mobile-item">
                <div className="records-mobile-quote-id">{pic.full_name || '-'}</div>
                <div className="records-mobile-subtitle mt-1">{pic.position || '-'}</div>
                <div className="records-mobile-client mt-1">
                  {[pic.email, pic.mobile_number].filter(Boolean).join(' | ') || '-'}
                </div>
              </div>
            )}
          />
        </div>
      </DataTableDetailShell>

      <DeleteCompanyModal
        visible={deleteModalVisible}
        onClose={() => {
          if (deleteLoading) return
          setDeleteModalVisible(false)
        }}
        onConfirm={confirmDeleteCompany}
        companyName={company?.company_name || ''}
        loading={deleteLoading}
      />
    </>
  )
}

export default ClientCompanyDetailPage
