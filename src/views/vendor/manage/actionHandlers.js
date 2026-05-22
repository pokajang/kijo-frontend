import dialog from '../../../components/dialog/dialogService'
// actionHandlers.js
// ────────────────────
// All of the functions that were inside ManageVendor()
// which deal with fetching or mutating vendors.

export const normalizeVendorRows = (vendorRows = []) =>
  vendorRows.map((v) => ({
    id: v.vendor_id || v.id,
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

export const getVendorsByStatus = async (status) => {
  const res = await fetch(
    `${import.meta.env.VITE_API_BASE}vendors?status=${encodeURIComponent(status)}`,
    { credentials: 'include' },
  )
  const result = await res.json()
  const vendorRows = Array.isArray(result?.data)
    ? result.data
    : Array.isArray(result?.vendors)
      ? result.vendors
      : []

  if (result?.status === 'success' || result?.success === true || vendorRows.length > 0) {
    return normalizeVendorRows(vendorRows)
  }

  throw new Error(result.message || 'Failed to fetch vendors')
}

export const fetchVendorsByStatus = async (status, setVendors, setInactiveVendors) => {
  try {
    const normalized = await getVendorsByStatus(status)

    if (status === 'active') {
      setVendors(normalized)
    } else if (status === 'inactive') {
      setInactiveVendors(normalized)
    } else {
      setVendors(normalized)
    }
  } catch (error) {
    console.error('Error fetching vendors:', error)
  }
}

export const handleVendorEdit = (vendor, setSelectedVendor, setEditModalVisible) => {
  setSelectedVendor({
    ...vendor,
    trainingTopicsText: (vendor.trainingTopics || []).join('\n'),
    supplierProductsText: (vendor.supplierProducts || []).join('\n'),
    consultancyText: (vendor.consultancy || []).join('\n'),
    servicesOfferedText: (vendor.servicesOffered || []).join('\n'),
  })
  setEditModalVisible(true)
}

export const handleVendorView = (vendor, setSelectedVendor, setViewModalVisible) => {
  setSelectedVendor(vendor)
  setViewModalVisible(true)
}

// actionHandlers.js

export const handleSaveVendor = async (formData, setVendors, setEditModalVisible) => {
  const confirmed = await dialog.confirm('Are you sure you want to save changes to this vendor?')
  if (!confirmed) return

  // 🔹 NEW: normalise multi-line text -> arrays before sending
  const normaliseLines = (text) =>
    (text || '')
      .split('\n')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)

  const payload = {
    // Vendor ID required by the update route.
    vendor_id: formData.id,

    // Scalar fields mirror create and update payloads.
    vendorName: formData.vendorName || '',
    ssmNumber: formData.ssmNumber || '',
    sstNo: formData.sstNo || '',
    address: formData.address || '',
    city: formData.city || '',
    state: formData.state || '',
    zip: formData.zip || '',
    contactPersonName: formData.contactPersonName || '',
    mobileNumber: formData.mobileNumber || '',
    email: formData.email || '',
    companyWebsite: formData.companyWebsite || '',
    emergencyContactName: formData.emergencyContactName || '',
    emergencyRelationship: formData.emergencyRelationship || '',
    emergencyMobileNumber: formData.emergencyMobileNumber || '',
    bankName: formData.bankName || '',
    bankAccountNumber: formData.bankAccountNumber || '',
    bankHolderName: formData.bankHolderName || '',
    status: formData.status || 'Active', // optional, backend default is Active

    // 🔹 category is already an array from the checkboxes
    category: formData.category || [],

    // 🔹 multi-line fields: use the *Text* props if present, else existing arrays
    trainingTopics: formData.trainingTopicsText
      ? normaliseLines(formData.trainingTopicsText)
      : formData.trainingTopics || [],

    competency: formData.competency || [],

    supplierProducts: formData.supplierProductsText
      ? normaliseLines(formData.supplierProductsText)
      : formData.supplierProducts || [],

    consultancy: formData.consultancyText
      ? normaliseLines(formData.consultancyText)
      : formData.consultancy || [],

    servicesOffered: formData.servicesOfferedText
      ? normaliseLines(formData.servicesOfferedText)
      : formData.servicesOffered || [],
  }

  try {
    const res = await fetch(
      `${import.meta.env.VITE_API_BASE}vendors/${encodeURIComponent(formData.id)}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      },
    )
    const result = await res.json()

    if (result?.status === 'success' || result?.success === true) {
      dialog.alert(`✅ Vendor "${formData.vendorName}" updated successfully.`)
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

export const handleVendorDelete = async (vendor, setVendors) => {
  const confirmed = await dialog.confirm(
    `Are you sure you want to deactivate "${vendor.vendorName}"? This will move the vendor to the Frozen Vendor list.`,
  )
  if (!confirmed) return

  const reason = await dialog.prompt('Optional: Provide a reason for deactivation', '')

  try {
    const res = await fetch(
      `${import.meta.env.VITE_API_BASE}vendors/${encodeURIComponent(vendor.id)}/deactivate`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          delete_reason: reason || null,
        }),
        credentials: 'include',
      },
    )
    const result = await res.json()

    if (result?.status === 'success' || result?.success === true) {
      setVendors((prev) => prev.filter((v) => v.id !== vendor.id))
      dialog.alert(`✅ Vendor "${vendor.vendorName}" was deactivated.`)
    } else {
      dialog.alert(`❌ Failed to deactivate vendor: ${result.message}`)
    }
  } catch (error) {
    console.error(error)
    dialog.alert('❌ Error: Could not reach the server.')
  }
}

export const handleDeactivateVendor = async (vendor, setVendors, refreshVendors) => {
  const confirmed = await dialog.confirm(
    `Are you sure you want to permanently delete "${vendor.vendorName}"? This action cannot be undone.`,
  )
  if (!confirmed) return

  try {
    const res = await fetch(
      `${import.meta.env.VITE_API_BASE}vendors/${encodeURIComponent(vendor.id)}`,
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      },
    )
    const result = await res.json()

    if (result?.status === 'success' || result?.success === true) {
      setVendors((prev) => prev.filter((v) => v.id !== vendor.id))
      dialog.alert(`✅ Vendor "${vendor.vendorName}" has been permanently deleted.`)
      refreshVendors()
    } else {
      dialog.alert(`❌ Failed to delete vendor: ${result.message}`)
    }
  } catch (error) {
    console.error(error)
    dialog.alert('❌ An error occurred while trying to delete the vendor.')
  }
}

export const handleReactivateVendor = async (vendor, refreshVendors) => {
  const confirmed = await dialog.confirm(`Reactivate vendor "${vendor.vendorName}"?`)
  if (!confirmed) return

  try {
    const res = await fetch(
      `${import.meta.env.VITE_API_BASE}vendors/${encodeURIComponent(vendor.id)}/reactivate`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      },
    )
    const result = await res.json()

    if (result?.status === 'success' || result?.success === true) {
      dialog.alert(`✅ Vendor "${vendor.vendorName}" has been reactivated.`)
      refreshVendors()
    } else {
      dialog.alert(`❌ Failed to reactivate vendor: ${result.message}`)
    }
  } catch (error) {
    console.error(error)
    dialog.alert('❌ An error occurred while trying to reactivate the vendor.')
  }
}
