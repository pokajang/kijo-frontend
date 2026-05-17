import React, { useState } from 'react'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CForm,
  CFormInput,
} from '@coreui/react'
import { fetchApi } from './fetchApi'

const AddContactModal = ({ visible, onClose, onSaved }) => {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    website: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Company name is required.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const data = await fetchApi.registerContact(form)
      await Promise.resolve(
        onSaved({
          contactId: data?.id ? Number(data.id) : null,
          message: data?.message || 'Contact added successfully.',
          contactDraft: {
            name: form.name.trim(),
            phone: form.phone.trim(),
            address: form.address.trim(),
            website: form.website.trim(),
          },
        }),
      )
      setForm({
        name: '',
        phone: '',
        address: '',
        website: '',
      })
    } catch (e) {
      setError(e?.message || 'Failed to add contact.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <CModal visible={visible} onClose={onClose} backdrop="static" alignment="center">
      <CModalHeader>
        <CModalTitle>Add My Contact</CModalTitle>
      </CModalHeader>

      <CModalBody>
        {error && <div className="text-danger small mb-2">{error}</div>}

        <CForm>
          <CFormInput
            className="mb-3"
            label="Company Name"
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Enter company name"
          />
          <CFormInput
            className="mb-3"
            label="Phone"
            value={form.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="Enter phone number"
          />
          <CFormInput
            className="mb-3"
            label="Address"
            value={form.address}
            onChange={(e) => handleChange('address', e.target.value)}
            placeholder="Enter address"
          />
          <CFormInput
            label="Web URL"
            value={form.website}
            onChange={(e) => handleChange('website', e.target.value)}
            placeholder="https://example.com"
          />
        </CForm>
      </CModalBody>

      <CModalFooter>
        <CButton size="sm" color="secondary" variant="outline" onClick={onClose}>
          Cancel
        </CButton>
        <CButton size="sm" color="primary" disabled={saving} onClick={handleSave}>
          {saving ? 'Saving...' : 'Save'}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default AddContactModal
