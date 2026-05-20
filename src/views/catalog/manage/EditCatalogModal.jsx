import React, { useEffect, useRef, useState } from 'react'
import {
  CModal,
  CModalHeader,
  CModalBody,
  CCard,
  CCardHeader,
  CCardBody,
  CRow,
  CCol,
  CFormLabel,
  CFormInput,
  CFormTextarea,
  CButton,
} from '@coreui/react'
import Select from '../../../components/forms/ThemedSelect'
import dialog from '../../../components/dialog/dialogService'
const CATEGORIES = [
  { category_id: 'Personal Protective Equipment', category_name: 'Personal Protective Equipment' },
  { category_id: 'Monitoring Device / Equipment', category_name: 'Monitoring Device / Equipment' },
  { category_id: 'Training Material / Kit', category_name: 'Training Material / Kit' },
  { category_id: 'Emergency / Rescue Equipment', category_name: 'Emergency / Rescue Equipment' },
  { category_id: 'Industrial Hygiene Equipment', category_name: 'Industrial Hygiene Equipment' },
  { category_id: 'General Safety Item', category_name: 'General Safety Item' },
  { category_id: 'Medical Device', category_name: 'Medical Device' },
  { category_id: 'Others', category_name: 'Others' },
]

const EditCatalogModal = ({ visible, onClose, item, onUpdate }) => {
  const [formData, setFormData] = useState(item ? { ...item } : {})
  const [newFile, setNewFile] = useState(null)
  const [brochureRemoved, setBrochureRemoved] = useState(false)
  const fileInputRef = useRef()

  useEffect(() => {
    setFormData(item ? { ...item } : {})
    setNewFile(null)
    setBrochureRemoved(false)
  }, [item])

  if (!item) return null

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleSelectChange = (selectedOption) => {
    setFormData((prev) => ({
      ...prev,
      category_id: selectedOption?.category_id || '',
    }))
  }

  const handleRemoveBrochure = () => {
    setBrochureRemoved(true)
    setNewFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleNewFileChange = (e) => {
    setNewFile(e.target.files[0])
  }

  const handleUpdate = async () => {
    if (!formData.item_name || !formData.category_id) {
      dialog.alert('Item name and category are required.')
      return
    }

    const confirmUpdate = await dialog.confirm('Are you sure you want to save these changes?')
    if (!confirmUpdate) return

    const updateData = new FormData()

    // Append updated fields
    for (const key in formData) {
      if (formData[key] !== null && formData[key] !== undefined) {
        updateData.append(key, formData[key])
      }
    }

    // Flags to handle brochure logic
    updateData.append('remove_brochure', brochureRemoved ? '1' : '0')
    if (newFile) {
      updateData.append('new_brochure', newFile)
    }

    fetch(`${import.meta.env.VITE_API_BASE}catalog/items/${formData.id}`, {
      method: 'POST',
      body: updateData,
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'success') {
          dialog.alert('Catalog item updated successfully.')
          const updatedItem = data.data || {
            ...formData,
            brochure_filename: brochureRemoved ? '' : formData.brochure_filename,
          }
          if (typeof onUpdate === 'function') {
            onUpdate(updatedItem)
          } else {
            onClose()
          }
        } else {
          dialog.alert(data.message || 'Failed to update catalog item.')
        }
      })
      .catch((err) => {
        console.error('Update error:', err)
        dialog.alert('Server error occurred during update.')
      })
  }

  return (
    <CModal visible={visible} onClose={onClose} size="lg" backdrop="static" scrollable>
      <CModalHeader>
        <strong>Edit Catalog Item</strong>
      </CModalHeader>
      <CModalBody>
        <CCard>
          <CCardHeader>
            <strong>Item Details</strong>
          </CCardHeader>
          <CCardBody>
            <CRow className="mb-3">
              <CCol md={6}>
                <CFormLabel>Item Name</CFormLabel>
                <CFormInput name="item_name" value={formData.item_name} onChange={handleChange} />
              </CCol>
              <CCol md={6}>
                <CFormLabel>Category</CFormLabel>
                <Select
                  name="category_id"
                  value={CATEGORIES.find((c) => c.category_id === formData.category_id)}
                  onChange={handleSelectChange}
                  options={CATEGORIES}
                  getOptionLabel={(c) => c.category_name}
                  getOptionValue={(c) => c.category_id}
                />
              </CCol>
            </CRow>

            <CRow className="mb-3">
              <CCol md={6}>
                <CFormLabel>Supplier Name</CFormLabel>
                <CFormInput
                  name="supplier_name"
                  value={formData.supplier_name}
                  onChange={handleChange}
                />
              </CCol>
              <CCol md={6}>
                <CFormLabel>Supplier Price (RM)</CFormLabel>
                <CFormInput
                  type="number"
                  name="supplier_price"
                  value={formData.supplier_price}
                  onChange={handleChange}
                />
              </CCol>
            </CRow>

            <CRow className="mb-3">
              <CCol md={6}>
                <CFormLabel>Price Date</CFormLabel>
                <CFormInput
                  type="date"
                  name="price_date"
                  value={formData.price_date}
                  onChange={handleChange}
                />
              </CCol>
              <CCol md={6}>
                <CFormLabel>Created By</CFormLabel>
                <CFormInput value={formData.created_by_code || '-'} disabled />
              </CCol>
            </CRow>

            <CRow className="mb-3">
              <CCol md={12}>
                <CFormLabel>Description</CFormLabel>
                <CFormTextarea
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleChange}
                />
              </CCol>
            </CRow>

            <CRow className="mb-3">
              <CCol md={12}>
                <CFormLabel>Entry Remarks</CFormLabel>
                <CFormTextarea
                  name="remarks"
                  rows={3}
                  value={formData.remarks || ''}
                  onChange={handleChange}
                />
              </CCol>
            </CRow>
          </CCardBody>

          <CCardHeader>
            <strong>Product Brochure (1 file only)</strong>
          </CCardHeader>
          <CCardBody>
            {brochureRemoved || !formData.brochure_filename ? (
              <p className="text-muted fst-italic">No brochure attached.</p>
            ) : (
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span>{formData.brochure_filename}</span>
                <CButton color="danger" size="sm" onClick={handleRemoveBrochure}>
                  Remove
                </CButton>
              </div>
            )}

            <CFormLabel>Upload New Brochure (optional)</CFormLabel>
            <CFormInput
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleNewFileChange}
              ref={fileInputRef}
            />
          </CCardBody>
        </CCard>

        <div className="text-end mt-3 d-flex gap-2 justify-content-end">
          <CButton color="secondary" onClick={onClose}>
            Cancel
          </CButton>
          <CButton color="primary" onClick={handleUpdate}>
            Save Changes
          </CButton>
        </div>
      </CModalBody>
    </CModal>
  )
}

export default EditCatalogModal
