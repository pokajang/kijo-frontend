import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import ClientListTableCard from './components/ClientListTableCard'
import DeleteCompanyModal from './components/DeleteCompanyModal'
import ClientModuleNavStrip from './components/ClientModuleNavStrip'
import dialog from '../../../components/dialog/dialogService'

const ClientsList = () => {
  const navigate = useNavigate()
  const [clientDatabase, setClientDatabase] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  const [clientsLoading, setClientsLoading] = useState(true)
  const [showDeleteCompanyModal, setShowDeleteCompanyModal] = useState(false)
  const [companyToDelete, setCompanyToDelete] = useState(null)
  const [deleteCompanyLoading, setDeleteCompanyLoading] = useState(false)
  const [refreshStatusLoading, setRefreshStatusLoading] = useState(false)

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

  useEffect(() => {
    fetchClients()
  }, [])

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
    navigate(`/client/manage/${companyId}/edit`, { state: { company: client } })
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

  const handleRefreshClientStatuses = async () => {
    if (
      !(await dialog.confirm(
        'Refresh client statuses from invoice records? Clients with invoices will be marked as Old.',
      ))
    ) {
      return
    }

    setRefreshStatusLoading(true)
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE}client-companies/refresh-status-from-invoices`,
        {
          method: 'POST',
          credentials: 'include',
        },
      )
      const result = await response.json()
      if (response.ok && result.status === 'success') {
        const updatedCount = Number(result.data?.updated_count || 0)
        await dialog.alert(`${updatedCount} client${updatedCount === 1 ? '' : 's'} updated to Old.`)
        await fetchClients()
      } else {
        dialog.alert(`Failed: ${result.message || 'Unable to refresh client statuses.'}`)
      }
    } catch (error) {
      console.error('Refresh client status error:', error)
      dialog.alert('Server error. Please try again later.')
    } finally {
      setRefreshStatusLoading(false)
    }
  }

  return (
    <>
      <ClientModuleNavStrip />

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
        onRefreshClientStatuses={handleRefreshClientStatuses}
        refreshStatusLoading={refreshStatusLoading}
      />

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
