import React, { useEffect, useState } from 'react'

import dialog from '../../../components/dialog/dialogService'
import ClientModuleNavStrip from './components/ClientModuleNavStrip'
import PastPicCard from './components/PastPicCard'

const PastPicsPage = () => {
  const [unassignedPICs, setUnassignedPICs] = useState([])

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
    fetchPICs()
  }, [])

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
      <ClientModuleNavStrip />
      <PastPicCard
        showToggle={false}
        showUnassignedPICs
        unassignedPICs={unassignedPICs}
        onDeleteUnassignedPic={handleDeleteUnassignedPic}
      />
    </>
  )
}

export default PastPicsPage
