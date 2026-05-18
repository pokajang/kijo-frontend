// src/components/Manage.js

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CRow, CCol, CCard, CCardBody, CCardHeader, CInputGroup, CFormInput } from '@coreui/react'

import StaffTable from './StaffTable'
import ViewStaffModal from './ViewStaffModal'
import dialog from '../../../components/dialog/dialogService'
export default function Manage() {
  const [staffList, setStaffList] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [viewModalVisible, setViewModalVisible] = useState(false)
  const [selectedStaffDetail, setSelectedStaffDetail] = useState(null)
  const navigate = useNavigate()

  // load all staff on mount
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE}staff/manage`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'success') {
          setStaffList(data.staff)
        } else {
          console.error('Error fetching staff:', data.message)
        }
      })
      .catch((err) => console.error('Fetch error:', err))
  }, [])

  // view details
  const handleViewStaff = async (staffId) => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE}hr/staff/${encodeURIComponent(staffId)}`,
        { credentials: 'include' },
      )
      const result = await res.json()
      if (result.status === 'success') {
        setSelectedStaffDetail(result.data)
        setViewModalVisible(true)
      } else {
        dialog.alert('Failed to fetch staff detail.')
      }
    } catch (err) {
      console.error('View error:', err)
      dialog.alert('Server error.')
    }
  }

  const handleEditStaff = (staffId) => {
    navigate(`/staff/create?edit_id=${staffId}`)
  }

  // terminate
  const handleTerminateStaff = async (staffId) => {
    if (!(await dialog.confirm('Are you sure? This cannot be undone.'))) return
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE}hr/staff/${encodeURIComponent(staffId)}/terminate`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ staff_id: staffId }),
        },
      )
      const result = await res.json()
      if (result.status === 'success') {
        dialog.alert('Staff terminated successfully.')
        // refresh
        const r2 = await fetch(`${import.meta.env.VITE_API_BASE}staff/manage`, {
          credentials: 'include',
        })
        const d2 = await r2.json()
        if (d2.status === 'success') setStaffList(d2.staff)
      } else {
        dialog.alert(`❌ Failed: ${result.message}`)
      }
    } catch (err) {
      console.error('Terminate error:', err)
      dialog.alert('Server error during termination.')
    }
  }

  // filter staffList by searchTerm on multiple fields
  const filteredStaff = staffList.filter((staff) => {
    const term = searchTerm.toLowerCase()
    return (
      staff.full_name?.toLowerCase().includes(term) ||
      staff.name_code?.toLowerCase().includes(term) ||
      staff.email?.toLowerCase().includes(term) ||
      staff.mobile_number?.toLowerCase().includes(term) ||
      staff.position?.toLowerCase().includes(term) ||
      staff.department?.toLowerCase().includes(term) ||
      staff.staff_type?.toLowerCase().includes(term) ||
      staff.status?.toLowerCase().includes(term)
    )
  })

  return (
    <>
      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Manage Staff</strong>
            </CCardHeader>
            <CCardBody>
              {/* Search bar sits here, above the table */}
              <CCol>
                <CInputGroup>
                  <CFormInput
                    placeholder="Search by name, code, email, mobile, position, or department…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </CInputGroup>
              </CCol>
              {/* Staff table */}
              <StaffTable
                staffList={filteredStaff}
                onView={handleViewStaff}
                onEdit={handleEditStaff}
                onTerminate={handleTerminateStaff}
              />
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* View details modal */}
      <ViewStaffModal
        visible={viewModalVisible}
        detail={selectedStaffDetail}
        onClose={() => setViewModalVisible(false)}
      />
    </>
  )
}
