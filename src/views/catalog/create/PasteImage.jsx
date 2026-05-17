// src/views/catalog/create/PasteImage.jsx
import React, { forwardRef } from 'react'
import { CFormInput } from '@coreui/react'

const PasteImage = forwardRef(({ setFormData }, fileInputRef) => {
  const handleFileChange = (e) => {
    setFormData((prev) => ({ ...prev, image: e.target.files[0] }))
  }

  return (
    <CFormInput
      type="file"
      name="image"
      accept=".jpg,.jpeg,.png,.pdf"
      onChange={handleFileChange}
      ref={fileInputRef}
    />
  )
})

export default PasteImage
