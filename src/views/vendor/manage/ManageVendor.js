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
  CFormCheck,
  CFormLabel,
  CFormSelect,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
} from '@coreui/react'

import EditVendorModal from './edit/EditVendorModal'
import ViewVendorModal from './view/ViewVendorModal'
import FrozenVendorTable from './FrozenVendorTable'
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
  handleDeactivateVendor,
  handleReactivateVendor,
} from './actionHandlers'

const ManageVendor = () => {
  const navigate = useNavigate()
  const [vendors, setVendors] = useState([])
  const [inactiveVendors, setInactiveVendors] = useState([])

  const [selectedVendor, setSelectedVendor] = useState(null)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [viewModalVisible, setViewModalVisible] = useState(false)
  const [showFrozen, setShowFrozen] = useState(false)

  const [searchText, setSearchText] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  const fetchAllVendors = (status) => fetchVendorsByStatus(status, setVendors, setInactiveVendors)

  useEffect(() => {
    fetchAllVendors('active')
  }, [])

  const handleFrozenCheckboxChange = (e) => {
    const checked = e.target.checked
    if (checked && inactiveVendors.length === 0) {
      fetchAllVendors('inactive')
    }
    setShowFrozen(checked)
  }

  const handleCloseFrozenModal = () => {
    setShowFrozen(false)
  }

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
                <CFormCheck
                  label="Show Frozen Vendors"
                  checked={showFrozen}
                  onChange={handleFrozenCheckboxChange}
                  className="mb-0"
                />
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
                onDelete={(v) => handleVendorDelete(v, setVendors, fetchAllVendors)}
                desktopToolsId="vendor-manage-table-tools"
                mobileToolsId="vendor-manage-mobile-table-tools"
              />
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <CModal
        visible={showFrozen}
        onClose={handleCloseFrozenModal}
        size="xl"
        alignment="center"
        scrollable
      >
        <CModalHeader onClose={handleCloseFrozenModal}>
          <CModalTitle>Frozen Vendors</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <FrozenVendorTable
            inactiveVendors={inactiveVendors}
            onDeleteVendor={(v) => handleDeactivateVendor(v, setInactiveVendors, fetchAllVendors)}
            onReactivateVendor={(v) => handleReactivateVendor(v, fetchAllVendors)}
            onViewVendor={(vendor) =>
              navigate(`/vendor/manage/frozen/${vendor.id}`, {
                state: { record: vendor, returnTo: '/vendor/manage' },
              })
            }
          />
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={handleCloseFrozenModal}>
            Close
          </CButton>
        </CModalFooter>
      </CModal>

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
