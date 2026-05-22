// ManageVendor.js

import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CIcon from '@coreui/icons-react'
import { cilPlus } from '@coreui/icons'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormLabel,
  CFormSelect,
  CRow,
} from '@coreui/react'

import EditVendorModal from './edit/EditVendorModal'
import ViewVendorModal from './view/ViewVendorModal'
import VendorListTable from './VendorListTable'
import { DataTableRecordControls } from '../../../components/datatable'
import ModuleNavStrip from '../../../components/navigation/ModuleNavStrip'
import { vendorModuleTabs } from '../../../components/navigation/moduleNavConfigs'

import {
  fetchVendorsByStatus,
  handleVendorEdit,
  handleVendorView,
  handleSaveVendor,
  handleVendorDelete,
} from './actionHandlers'

const ManageVendor = () => {
  const navigate = useNavigate()
  const [vendors, setVendors] = useState([])

  const [selectedVendor, setSelectedVendor] = useState(null)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [viewModalVisible, setViewModalVisible] = useState(false)

  const [searchText, setSearchText] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  const fetchActiveVendors = () => fetchVendorsByStatus('active', setVendors, () => {})

  useEffect(() => {
    fetchActiveVendors()
  }, [])

  const availableCategories = useMemo(() => {
    const categories = new Set()
    vendors.forEach((vendor) => {
      ;(vendor.category || []).forEach((cat) => {
        if (cat) categories.add(cat)
      })
    })
    return Array.from(categories).sort()
  }, [vendors])

  const filteredVendors = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    return vendors.filter((v) => {
      const searchValues = [
        v.vendorName,
        v.contactPersonName,
        v.mobileNumber,
        v.email,
        v.companyWebsite,
        v.bankName,
        v.bankAccountNumber,
        v.bankHolderName,
        ...(v.trainingTopics || []),
        ...(v.competency || []),
        ...(v.supplierProducts || []),
        ...(v.consultancy || []),
        ...(v.servicesOffered || []),
      ]

      const matchesSearch =
        !q ||
        searchValues.some((item) =>
          String(item || '')
            .toLowerCase()
            .includes(q),
        )

      const matchesCategory =
        !categoryFilter ||
        (v.category || []).some(
          (c) => String(c || '').toLowerCase() === categoryFilter.toLowerCase(),
        )

      return matchesSearch && matchesCategory
    })
  }, [searchText, vendors, categoryFilter])

  const resetFilters = () => {
    setSearchText('')
    setCategoryFilter('')
  }

  const clearChip = (key) => {
    if (key === 'search') setSearchText('')
    if (key === 'category') setCategoryFilter('')
  }

  const activeChips = [
    searchText.trim() ? { key: 'search', label: `Search: ${searchText.trim()}` } : null,
    categoryFilter ? { key: 'category', label: `Category: ${categoryFilter}` } : null,
  ].filter(Boolean)

  const activeFilterCount = categoryFilter ? 1 : 0

  return (
    <>
      <CRow>
        <CCol xs={12}>
          <ModuleNavStrip tabs={vendorModuleTabs} ariaLabel="Vendor sections" />
          <CCard className="mb-4">
            <CCardHeader className="d-flex justify-content-between align-items-center gap-2 flex-wrap">
              <strong>Manage Vendors</strong>
              <div className="d-flex align-items-center justify-content-end gap-3 flex-wrap">
                <CButton size="sm" color="primary" onClick={() => navigate('/vendor/create')}>
                  <CIcon icon={cilPlus} className="me-1" />
                  Create Vendor
                </CButton>
              </div>
            </CCardHeader>
            <CCardBody>
              <DataTableRecordControls
                searchValue={searchText}
                onSearchChange={setSearchText}
                searchPlaceholder="Search vendor, contact, service"
                searchAriaLabel="Search vendors"
                showAdvancedFilters={showAdvancedFilters}
                setShowAdvancedFilters={setShowAdvancedFilters}
                activeFilterCount={activeFilterCount}
                activeChips={activeChips}
                clearChip={clearChip}
                resetFilters={resetFilters}
                desktopToolsId="vendor-manage-table-tools"
                mobileToolsId="vendor-manage-mobile-table-tools"
              >
                <CCol xs={12} md={4}>
                  <CFormLabel htmlFor="vendorCategoryFilter">Category</CFormLabel>
                  <CFormSelect
                    id="vendorCategoryFilter"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  >
                    <option value="">All Categories</option>
                    {availableCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
              </DataTableRecordControls>

              <VendorListTable
                vendors={filteredVendors}
                onEdit={(v) => handleVendorEdit(v, setSelectedVendor, setEditModalVisible)}
                onView={(v) => handleVendorView(v, setSelectedVendor, setViewModalVisible)}
                onDelete={(v) => handleVendorDelete(v, setVendors)}
                desktopToolsId="vendor-manage-table-tools"
                mobileToolsId="vendor-manage-mobile-table-tools"
              />
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {selectedVendor && (
        <EditVendorModal
          visible={editModalVisible}
          vendor={selectedVendor}
          setVendor={setSelectedVendor}
          onClose={() => setEditModalVisible(false)}
          onSave={(formData) => handleSaveVendor(formData, setVendors, setEditModalVisible)}
        />
      )}

      {selectedVendor && (
        <ViewVendorModal
          visible={viewModalVisible}
          vendor={selectedVendor}
          onClose={() => setViewModalVisible(false)}
        />
      )}
    </>
  )
}

export default ManageVendor
