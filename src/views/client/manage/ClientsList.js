import React, { useEffect, useState } from 'react'
import { CCol, CRow } from '@coreui/react'
import { useNavigate } from 'react-router-dom'

import ClientListTableCard from './components/ClientListTableCard'
import DeleteCompanyModal from './components/DeleteCompanyModal'
import PastPicCard from './components/PastPicCard'
import dialog from '../../../components/dialog/dialogService'

const ClientsList = () => {
  const navigate = useNavigate()
  const [clientDatabase, setClientDatabase] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  const [clientsLoading, setClientsLoading] = useState(true)
  const [showUnassignedPICs, setShowUnassignedPICs] = useState(false)
  const [unassignedPICs, setUnassignedPICs] = useState([])
  const [showDeleteCompanyModal, setShowDeleteCompanyModal] = useState(false)
  const [companyToDelete, setCompanyToDelete] = useState(null)
  const [deleteCompanyLoading, setDeleteCompanyLoading] = useState(false)

  const fetchClients = async () => {
    setClientsLoading(true)
    try {
      const perPage = 200
      let page = 1
      let lastPage = 1
      const rows = []

      do {
        const params = new URLSearchParams({
          page: String(page),
          per_page: String(perPage),
        })
        const res = await fetch(`${import.meta.env.VITE_API_BASE}client-companies?${params}`, {
          credentials: 'include',
        })
        const result = await res.json()

        if (result.status !== 'success') {
          console.error('API returned error:', result.message)
          break
        }

        rows.push(...(Array.isArray(result.data) ? result.data : []))
        lastPage = Number(result.pagination?.last_page || result.meta?.last_page || page)
        page += 1
      } while (page <= lastPage)

      setClientDatabase(rows)
    } catch (err) {
      console.error('Failed to fetch client list:', err)
    } finally {
      setClientsLoading(false)
    }
  }

  const fetchPICs = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}client-pics`, {
        credentials: 'include',
      })
      const result = await res.json()
      if (result.status === 'success') {
        const data = Array.isArray(result.data) ? result.data : []
        const unassigned = data.filter(
          (pic) => pic.status?.toLowerCase().trim() === 'unassigned' && !pic.deleted_at,
        )
        setUnassignedPICs(unassigned)
      }
    } catch (err) {
      console.error('Failed to fetch PIC list:', err)
    }
  }

  useEffect(() => {
    fetchClients()
  }, [])

  useEffect(() => {
    if (showUnassignedPICs) {
      fetchPICs()
    }
  }, [showUnassignedPICs])

  const filteredClients = clientDatabase.filter((client) => {
    const term = searchTerm.toLowerCase()
    const normalizedStatus = (client.client_status || '').trim().toLowerCase()

    const matchesSearch =
      client.company_name?.toLowerCase().includes(term) ||
      client.ssm_number?.toLowerCase().includes(term) ||
      client.tax_id_no_tin?.toLowerCase().includes(term) ||
      client.client_status?.toLowerCase().includes(term) ||
      client.pic_search_blob?.toLowerCase().includes(term) ||
      client.address?.toLowerCase().includes(term) ||
      client.zip?.toLowerCase().includes(term) ||
      client.city?.toLowerCase().includes(term) ||
      client.state?.toLowerCase().includes(term) ||
      client.branch_summary?.toLowerCase().includes(term)

    const matchesStatus =
      statusFilter === ''
        ? true
        : statusFilter === 'no_status'
          ? !normalizedStatus
          : normalizedStatus === statusFilter

    const branchCount = Number(client.branch_count || 0)
    const matchesBranch =
      branchFilter === ''
        ? true
        : branchFilter === 'with_branches'
          ? branchCount > 0
          : branchCount === 0

    return matchesSearch && matchesStatus && matchesBranch
  })

  const openCompanyRoute = (client, target = '') => {
    const companyId = Number(client.company_id)
    if (!companyId) return
    navigate(`/client/manage/${companyId}${target}`, { state: { company: client } })
  }

  const handleEditCompany = (client) => {
    const companyId = Number(client.company_id)
    if (!companyId) return
    navigate(`/client/manage/${companyId}`, { state: { company: client, openEdit: true } })
  }

  const handleDeleteCompany = (client) => {
    setCompanyToDelete(client)
    setShowDeleteCompanyModal(true)
  }

  const confirmDeleteCompany = async () => {
    if (!companyToDelete?.company_id) return

    setDeleteCompanyLoading(true)
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE}client-companies/${companyToDelete.company_id}`,
        {
          method: 'DELETE',
          credentials: 'include',
        },
      )
      const result = await response.json()
      if (result.status === 'success') {
        setShowDeleteCompanyModal(false)
        setCompanyToDelete(null)
        await fetchClients()
        if (showUnassignedPICs) {
          await fetchPICs()
        }
      } else {
        dialog.alert(`Failed: ${result.message}`)
      }
    } catch (error) {
      console.error('Delete company error:', error)
      dialog.alert('Server error. Please try again later.')
    } finally {
      setDeleteCompanyLoading(false)
    }
  }

  const handleDeleteUnassignedPic = async (pic) => {
    const confirmDelete = await dialog.confirm(`Delete ${pic.full_name}?`)
    if (!confirmDelete) return

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE}client-pics/${pic.pic_id}/unassigned`,
        {
          method: 'DELETE',
          credentials: 'include',
        },
      )
      const result = await res.json()
      if (result.status === 'success') {
        await fetchPICs()
      } else {
        dialog.alert(`Failed: ${result.message}`)
      }
    } catch (err) {
      console.error('Delete error:', err)
      dialog.alert('Server error. Please try again later.')
    }
  }

  return (
    <>
      <ClientListTableCard
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        branchFilter={branchFilter}
        onBranchFilterChange={setBranchFilter}
        filteredClients={filteredClients}
        loading={clientsLoading}
        onViewCompany={(client) => openCompanyRoute(client)}
        onEditCompany={handleEditCompany}
        onDeleteCompany={handleDeleteCompany}
        onSeeBranches={(client) => openCompanyRoute(client, '#branches')}
        onSeePics={(client) => openCompanyRoute(client, '#pics')}
        onCreateClient={() => navigate('/client/create')}
      />

      <CRow>
        <CCol xs={12}>
          <PastPicCard
            showUnassignedPICs={showUnassignedPICs}
            onToggle={() => setShowUnassignedPICs((prev) => !prev)}
            unassignedPICs={unassignedPICs}
            onDeleteUnassignedPic={handleDeleteUnassignedPic}
          />
        </CCol>
      </CRow>

      <DeleteCompanyModal
        visible={showDeleteCompanyModal}
        onClose={() => {
          if (deleteCompanyLoading) return
          setShowDeleteCompanyModal(false)
          setCompanyToDelete(null)
        }}
        onConfirm={confirmDeleteCompany}
        companyName={companyToDelete?.company_name || ''}
        loading={deleteCompanyLoading}
      />
    </>
  )
}

export default ClientsList
