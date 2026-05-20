import React, { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  CCard,
  CCardHeader,
  CCardBody,
  CRow,
  CCol,
  CFormLabel,
  CFormInput,
  CFormTextarea,
  CButton,
  CAlert,
} from '@coreui/react'
import Select from '../../../components/forms/ThemedSelect'
import PasteImage from './PasteImage'
import {
  handleChange,
  handleFileChange,
  handleSelectChange,
  handleSubmit,
  handleReset,
} from './formHandlers'

// Key to identify the draft in localStorage
const DRAFT_KEY = 'catalogItemDraft'

const MainForms = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = location.state?.returnTo || '/catalog/manage'
  const initialFormData = {
    item_name: '',
    category_id: '',
    description: '',
    unit: '',
    supplier_price: '',
    supplier_name: '',
    price_date: '',
    image: null,
  }

  const [formData, setFormData] = useState(initialFormData)
  const [remarks, setRemarks] = useState('')
  const [showWarning, setShowWarning] = useState(true)
  const fileInputRef = useRef(null)

  const categories = [
    {
      category_id: 'Personal Protective Equipment',
      category_name: 'Personal Protective Equipment',
    },
    {
      category_id: 'Monitoring Device / Equipment',
      category_name: 'Monitoring Device / Equipment',
    },
    { category_id: 'Training Material / Kit', category_name: 'Training Material / Kit' },
    { category_id: 'Emergency / Rescue Equipment', category_name: 'Emergency / Rescue Equipment' },
    { category_id: 'Industrial Hygiene Equipment', category_name: 'Industrial Hygiene Equipment' },
    { category_id: 'General Safety Item', category_name: 'General Safety Item' },
  ]

  // Load draft on mount
  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY)
    if (saved) {
      try {
        const { formData: fd, remarks: rm } = JSON.parse(saved)
        setFormData(fd)
        setRemarks(rm)
      } catch (e) {
        console.warn('Could not parse catalog draft:', e)
      }
    }
  }, [])

  // Auto-save draft whenever formData or remarks change
  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ formData, remarks }))
  }, [formData, remarks])

  return (
    <CCard>
      <CCardHeader>
        <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
          <strong>Create New Catalog Item</strong>
          <CButton size="sm" color="secondary" variant="outline" onClick={() => navigate(returnTo)}>
            Back
          </CButton>
        </div>
      </CCardHeader>
      <CCardBody>
        <CRow className="g-3">
          {showWarning && (
            <CCol md={12}>
              <CAlert color="primary" dismissible onClose={() => setShowWarning(false)}>
                <strong>
                  This form creates our own equipment database for shared use in this platform. One
                  item per entry.
                </strong>
              </CAlert>
            </CCol>
          )}

          <CCol md={4}>
            <CFormLabel htmlFor="item_name">Item Name</CFormLabel>
            <CFormInput
              name="item_name"
              value={formData.item_name}
              onChange={(e) => handleChange(e, setFormData)}
              placeholder="e.g. Brand - Model name"
            />
          </CCol>

          <CCol md={4}>
            <CFormLabel htmlFor="category_id">Category</CFormLabel>
            <Select
              id="category_id"
              name="category_id"
              value={categories.find((c) => c.category_id === formData.category_id) || null}
              onChange={(opt) => handleSelectChange(opt, setFormData)}
              options={categories}
              getOptionLabel={(c) => c.category_name}
              getOptionValue={(c) => c.category_id}
              placeholder="Select Category..."
              isClearable
            />
          </CCol>

          <CCol md={4}>
            <CFormLabel htmlFor="unit">Unit</CFormLabel>
            <CFormInput
              name="unit"
              value={formData.unit}
              onChange={(e) => handleChange(e, setFormData)}
              placeholder="e.g. Piece, Set, Hour"
            />
          </CCol>

          <CCol md={12}>
            <CFormLabel htmlFor="description">Description</CFormLabel>
            <CFormTextarea
              name="description"
              value={formData.description}
              onChange={(e) => handleChange(e, setFormData)}
              placeholder="Usage notes, specs, etc."
              rows={3}
            />
          </CCol>

          <CCol md={4}>
            <CFormLabel htmlFor="supplier_name">Supplier Name</CFormLabel>
            <CFormInput
              name="supplier_name"
              value={formData.supplier_name}
              onChange={(e) => handleChange(e, setFormData)}
              placeholder="e.g. ABC Trading Sdn Bhd"
            />
          </CCol>

          <CCol md={4}>
            <CFormLabel htmlFor="supplier_price">Latest Supplier Price (RM / unit)</CFormLabel>
            <CFormInput
              type="number"
              name="supplier_price"
              value={formData.supplier_price}
              onChange={(e) => handleChange(e, setFormData)}
              placeholder="e.g. 88.00"
            />
          </CCol>

          <CCol md={4}>
            <CFormLabel htmlFor="price_date">Price Date</CFormLabel>
            <CFormInput
              type="date"
              name="price_date"
              value={formData.price_date}
              onChange={(e) => handleChange(e, setFormData)}
            />
          </CCol>

          <CCol md={12}>
            <CFormLabel htmlFor="entry_remarks">Entry Remarks</CFormLabel>
            <CFormTextarea
              name="entry_remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              placeholder="Internal notes, additional info, or alternative supplier info"
            />
          </CCol>

          <CCol md={12}>
            <CFormLabel>Product Brochure (Recommended)</CFormLabel>
            <PasteImage setFormData={setFormData} ref={fileInputRef} />
          </CCol>

          <CCol md={12} className="d-flex gap-2">
            <CButton
              color="primary"
              onClick={() =>
                handleSubmit(formData, remarks, {
                  setFormData,
                  setRemarks,
                  initialFormData,
                  fileInputRef,
                  navigate,
                  returnTo,
                })
              }
            >
              Create Catalog Item
            </CButton>
            <CButton
              color="secondary"
              variant="outline"
              onClick={() => handleReset(setFormData, setRemarks, initialFormData, fileInputRef)}
            >
              Reset
            </CButton>
          </CCol>
        </CRow>
      </CCardBody>
    </CCard>
  )
}

export default MainForms
