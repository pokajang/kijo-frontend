import React, { useEffect, useState } from 'react'
import {
  CRow,
  CCol,
  CCard,
  CCardBody,
  CCardHeader,
  CTable,
  CTableBody,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CTableDataCell,
  CButton,
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CDropdownItem,
  CFormCheck,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilOptions, cilTrash, cilPencil, cibWhatsapp, cilDescription } from '@coreui/icons'

import EditVendorModal from './edit/EditVendorModal'
import ViewVendorModal from './view/ViewVendorModal'
import FrozenVendorTable from './FrozenVendorTable'
import dialog from '../../../components/dialog/dialogService'
const ManageVendor = () => {
  const [vendors, setVendors] = useState([]) // load active vendors
  const [inactiveVendors, setInactiveVendors] = useState([]) // load inactive vendors

  const [selectedVendor, setSelectedVendor] = useState(null)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [viewModalVisible, setViewModalVisible] = useState(false)

  const [showFrozen, setShowFrozen] = useState(false)

  // Called when checkbox toggled
  const handleToggleFrozen = (e) => {
    const checked = e.target.checked
    setShowFrozen(checked)

    if (checked && inactiveVendors.length === 0) {
      fetchVendorsByStatus('inactive')
    }
  }

  // useeffect to fetch vendor by status
  useEffect(() => {
    fetchVendorsByStatus('active')
  }, [])

  // Shared function
  const fetchVendorsByStatus = async (status = 'all') => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE}vendors?status=${encodeURIComponent(status)}`,
        {
          credentials: 'include',
        },
      )
      const result = await response.json()

      if (result.status === 'success') {
        const normalized = result.data.map((v) => ({
          id: v.vendor_id,
          vendorName: v.vendor_name,
          ssmNumber: v.ssm_number,
          sstNo: v.sst_number,
          address: v.address,
          city: v.city,
          state: v.state,
          zip: v.zip,
          contactPersonName: v.contact_person_name,
          mobileNumber: v.mobile_number,
          email: v.email,
          companyWebsite: v.website,
          emergencyContactName: v.emergency_name,
          emergencyRelationship: v.emergency_relation,
          emergencyMobileNumber: v.emergency_mobile,
          bankName: v.bank_name,
          bankAccountNumber: v.bank_account,
          bankHolderName: v.bank_holder_name,
          category: v.category,
          trainingTopics: v.trainingTopics,
          competency: v.competency,
          supplierProducts: v.supplierProducts,
          consultancy: v.consultancy,
          servicesOffered: v.servicesOffered,
          delete_reason: v.delete_reason,
          status: v.status,
        }))

        if (status === 'active') {
          setVendors(normalized)
        } else if (status === 'inactive') {
          setInactiveVendors(normalized) // You'll define this state separately
        }
      } else {
        console.error('Failed to fetch vendors:', result.message)
      }
    } catch (error) {
      console.error('Error fetching vendors:', error)
    }
  }

  // Edit vendor
  const handleVendorEdit = (vendor) => {
    setSelectedVendor({
      ...vendor,
      trainingTopicsText: (vendor.trainingTopics || []).join('\n'),
      supplierProductsText: (vendor.supplierProducts || []).join('\n'),
      consultancyText: (vendor.consultancy || []).join('\n'),
      servicesOfferedText: (vendor.servicesOffered || []).join('\n'),
    })
    setEditModalVisible(true)
  }

  // View vendor
  const handleVendorView = (vendor) => {
    setSelectedVendor(vendor)
    setViewModalVisible(true)
  }

  // save edit
  const handleSaveVendor = async (formData) => {
    const confirmed = await dialog.confirm('Are you sure you want to save changes to this vendor?')
    if (!confirmed) return

    try {
      const payload = {
        vendor_id: formData.id,
        vendorName: formData.vendorName,
        ssmNumber: formData.ssmNumber,
        sstNo: formData.sstNo,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zip: formData.zip,
        contactPersonName: formData.contactPersonName,
        mobileNumber: formData.mobileNumber,
        email: formData.email,
        companyWebsite: formData.companyWebsite,
        emergencyContactName: formData.emergencyContactName,
        emergencyRelationship: formData.emergencyRelationship,
        emergencyMobileNumber: formData.emergencyMobileNumber,
        bankName: formData.bankName,
        bankAccountNumber: formData.bankAccountNumber,
        bankHolderName: formData.bankHolderName,
        status: formData.status,
        category: formData.category || [],
        trainingTopics: formData.trainingTopics || [],
        competency: formData.competency || [],
        supplierProducts: formData.supplierProducts || [],
        consultancy: formData.consultancy || [],
        servicesOffered: formData.servicesOffered || [],
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE}vendors/${encodeURIComponent(formData.id)}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          credentials: 'include',
        },
      )

      const result = await response.json()

      if (result.status === 'success') {
        dialog.alert(`✅ Vendor "${formData.vendorName}" updated successfully.`)

        // Refresh vendor list
        setVendors((prev) => prev.map((v) => (v.id === formData.id ? { ...v, ...formData } : v)))
      } else {
        dialog.alert(`❌ Update failed: ${result.message}`)
      }
    } catch (error) {
      console.error('❌ Error updating vendor:', error)
      dialog.alert('❌ Server error while updating vendor.')
    } finally {
      setEditModalVisible(false)
    }
  }

  // handle vendor deletion
  const handleVendorDelete = async (vendor) => {
    const confirmed = await dialog.confirm(
      `Are you sure you want to deactivate "${vendor.vendorName}"? This will move the vendor to the Frozen Vendor list.`,
    )
    if (!confirmed) return

    const reason = await dialog.prompt('Optional: Provide a reason for deactivation', '')

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE}vendors/${encodeURIComponent(vendor.id)}/deactivate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            delete_reason: reason || null,
          }),
          credentials: 'include',
        },
      )

      const result = await response.json()

      if (result.status === 'success') {
        setVendors((prev) => prev.filter((v) => v.id !== vendor.id))
        dialog.alert(`✅ Vendor "${vendor.vendorName}" was deactivated.`)
        // can also switch the state for the show vendor checkform
        await fetchVendorsByStatus('inactive')
      } else {
        console.error(result)
        dialog.alert(`❌ Failed to deactivate vendor: ${result.message}`)
      }
    } catch (error) {
      console.error(error)
      dialog.alert('❌ Error: Could not reach the server.')
    }
  }

  // handle vendor permanent delete
  const handleDeactivateVendor = async (vendor) => {
    const confirmed = await dialog.confirm(
      `Are you sure you want to permanently delete "${vendor.vendorName}"? This action cannot be undone.`,
    )
    if (!confirmed) return

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE}vendors/${encodeURIComponent(vendor.id)}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        },
      )

      const result = await response.json()

      if (result.status === 'success') {
        // Remove vendor from the list after successful deletion
        setVendors((prev) => prev.filter((v) => v.id !== vendor.id))
        dialog.alert(`Vendor "${vendor.vendorName}" has been permanently deleted.`)
        fetchVendorsByStatus('inactive') // 🔁 Reload updated list
      } else {
        dialog.alert(`❌ Failed to delete vendor: ${result.message}`)
      }
    } catch (error) {
      console.error('Error during deletion:', error)
      dialog.alert('❌ An error occurred while trying to delete the vendor.')
    }
  }

  const handleReactivateVendor = async (vendor) => {
    const confirmed = await dialog.confirm(`Reactivate vendor "${vendor.vendorName}"?`)
    if (!confirmed) return

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE}vendors/${encodeURIComponent(vendor.id)}/reactivate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        },
      )

      const result = await response.json()

      if (result.status === 'success') {
        dialog.alert(`✅ Vendor "${vendor.vendorName}" has been reactivated.`)
        fetchVendorsByStatus('inactive')
        fetchVendorsByStatus('active')
      } else {
        dialog.alert(`❌ Failed to reactivate vendor: ${result.message}`)
      }
    } catch (error) {
      console.error('Error during reactivation:', error)
      dialog.alert('❌ An error occurred while trying to reactivate the vendor.')
    }
  }

  return (
    <>
      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Manage Vendors</strong>
            </CCardHeader>
            <CCardBody>
              {/* datatable-exempt: existing embedded/layout table */}
              <CTable hover responsive className="data-table-compact embedded-data-table">
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>#</CTableHeaderCell>
                    <CTableHeaderCell>Vendor Name</CTableHeaderCell>
                    <CTableHeaderCell>Contact Person</CTableHeaderCell>
                    <CTableHeaderCell>Contact Details</CTableHeaderCell>
                    <CTableHeaderCell>Service Details</CTableHeaderCell>
                    <CTableHeaderCell>Bank Details</CTableHeaderCell>
                    <CTableHeaderCell className="text-center">Actions</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {vendors.map((vendor, index) => (
                    <CTableRow key={vendor.id}>
                      <CTableDataCell>{index + 1}</CTableDataCell>
                      <CTableDataCell>{vendor.vendorName}</CTableDataCell>
                      <CTableDataCell>{vendor.contactPersonName}</CTableDataCell>
                      <CTableDataCell>
                        {vendor.mobileNumber ? (
                          <CButton
                            size="sm"
                            color="success"
                            className="text-white mb-1"
                            onClick={() => {
                              const message = `Hi ${vendor.contactPersonName || vendor.vendorName}, this is regarding your Safety & Health Vendor Registration.`
                              const urlMessage = encodeURIComponent(message)
                              const whatsappUrl = `https://wa.me/6${vendor.mobileNumber}?text=${urlMessage}`
                              window.open(whatsappUrl, '_blank')
                            }}
                          >
                            <CIcon icon={cibWhatsapp} className="me-1" />
                            {vendor.mobileNumber}
                          </CButton>
                        ) : (
                          <small className="text-muted d-block">No mobile</small>
                        )}

                        {vendor.email && (
                          <div className="mt-1">
                            <small className="text-muted">{vendor.email}</small>
                          </div>
                        )}
                      </CTableDataCell>

                      <CTableDataCell>
                        {vendor.trainingTopics?.length > 0 && (
                          <>
                            Training Topics
                            <br />
                            <small className="text-muted">
                              {vendor.trainingTopics.map((item, i) => (
                                <div key={`train-${i}`}>{item}</div>
                              ))}
                            </small>
                          </>
                        )}

                        {vendor.competency?.length > 0 && (
                          <>
                            Competency
                            <br />
                            <small className="text-muted">
                              {vendor.competency.map((item, i) => (
                                <div key={`comp-${i}`}>{item}</div>
                              ))}
                            </small>
                          </>
                        )}

                        {vendor.supplierProducts?.length > 0 && (
                          <>
                            Supplier Products
                            <br />
                            <small className="text-muted">
                              {vendor.supplierProducts.map((item, i) => (
                                <div key={`sup-${i}`}>{item}</div>
                              ))}
                            </small>
                          </>
                        )}

                        {vendor.consultancy?.length > 0 && (
                          <>
                            Consultancy
                            <br />
                            <small className="text-muted">
                              {vendor.consultancy.map((item, i) => (
                                <div key={`con-${i}`}>{item}</div>
                              ))}
                            </small>
                          </>
                        )}

                        {vendor.servicesOffered?.length > 0 && (
                          <>
                            Other Services
                            <br />
                            <small className="text-muted">
                              {vendor.servicesOffered.map((item, i) => (
                                <div key={`srv-${i}`}>{item}</div>
                              ))}
                            </small>
                          </>
                        )}
                      </CTableDataCell>

                      <CTableDataCell>
                        <div>{vendor.bankAccountNumber}</div>
                        <div>
                          <small className="text-muted">{vendor.bankName}</small>
                        </div>
                      </CTableDataCell>
                      <CTableDataCell className="text-center">
                        <CDropdown portal>
                          <CDropdownToggle color="transparent">
                            <CIcon icon={cilOptions} />
                          </CDropdownToggle>
                          <CDropdownMenu>
                            <CDropdownItem onClick={() => handleVendorEdit(vendor)}>
                              Edit
                            </CDropdownItem>
                            <CDropdownItem onClick={() => handleVendorView(vendor)}>
                              View
                            </CDropdownItem>
                            <CDropdownItem
                              onClick={() => handleVendorDelete(vendor)}
                              className="text-danger"
                            >
                              Deactivate
                            </CDropdownItem>
                          </CDropdownMenu>
                        </CDropdown>
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* List inactive vendors */}
      <FrozenVendorTable
        showFrozen={showFrozen}
        onToggleFrozen={handleToggleFrozen}
        inactiveVendors={inactiveVendors}
        onDeleteVendor={handleDeactivateVendor}
        onReactivateVendor={handleReactivateVendor}
      />

      {/* Edit Modal */}
      {selectedVendor && (
        <EditVendorModal
          visible={editModalVisible}
          vendor={selectedVendor}
          setVendor={setSelectedVendor} // ✅ Add this line
          onClose={() => setEditModalVisible(false)}
          onSave={handleSaveVendor}
        />
      )}

      {/* View Modal */}
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
