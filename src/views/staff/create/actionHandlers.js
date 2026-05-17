import dialog from '../../../components/dialog/dialogService'
// actionHandlers.js
export const initialState = {
  fullName: '',
  nameCode: '',
  email: '',
  mobileNumber: 601,
  position: '',
  staffType: '',
  department: '',
  startDate: '',
  status: 'Active',
  grantAccess: false,
  systemRoles: [], // replaced single `role` with array
}

export const handleInputChange = (e, setStaffDetails) => {
  const { name, value } = e.target

  if (name === 'mobileNumber') {
    const cleaned = value.replace(/\D/g, '')
    if (cleaned.length > 12) return
    setStaffDetails((prev) => ({ ...prev, [name]: cleaned }))
    return
  }

  setStaffDetails((prev) => ({ ...prev, [name]: value }))
}

export const handleNameCodeInputChange = (e, setStaffDetails, setNameCodeTaken) => {
  const value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '')
  const trimmed = value.slice(0, 3)

  const usedCodes = ['ABC', 'XYZ', 'HRM']
  const isTaken = trimmed.length === 3 && usedCodes.includes(trimmed)
  setNameCodeTaken(isTaken)

  setStaffDetails((prev) => ({ ...prev, nameCode: trimmed }))
}

export const handleRoleToggle = (e, setStaffDetails) => {
  const { id, checked } = e.target
  setStaffDetails((prev) => {
    const nextRoles = checked ? [...prev.systemRoles, id] : prev.systemRoles.filter((r) => r !== id)
    return { ...prev, systemRoles: nextRoles }
  })
}

export const handleSubmit = async (staffDetails, setStaffDetails, navigate) => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE}staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(staffDetails),
    })

    const result = await response.json()

    if (result.status === 'success') {
      setStaffDetails(initialState)
      const goToList = await dialog.confirm(
        'Staff ' + result.data.full_name + ' successfully created. Go to staff list?',
        {
          title: 'Staff Created',
          confirmText: 'Go to list',
          cancelText: 'Create another',
        },
      )
      if (goToList) {
        navigate('/staff/manage')
      }
    } else {
      dialog.alert(result.message || 'Submission failed. Please try again.')
    }
  } catch (error) {
    console.error('Submission error:', error)
    dialog.alert('Server error occurred. Please check your network or server.')
  }
}

export const handleReset = (setStaffDetails) => {
  setStaffDetails(initialState)
}

export const mapStaffToFormState = (staff = {}) => ({
  fullName: staff.full_name || '',
  nameCode: staff.name_code || '',
  email: staff.email || '',
  mobileNumber: staff.mobile_number || 601,
  position: staff.position || '',
  staffType: staff.staff_type || '',
  department: staff.department || '',
  startDate: staff.start_date || '',
  status: staff.status || 'Active',
  grantAccess: Number(staff.grant_access) === 1,
  systemRoles: Array.isArray(staff.role) ? staff.role : [],
})

export const fetchStaffById = async (staffId) => {
  const response = await fetch(`${import.meta.env.VITE_API_BASE}staff/by-id?staff_id=${staffId}`, {
    credentials: 'include',
  })
  return await response.json()
}

export const handleUpdate = async (staffId, staffDetails, navigate) => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE}staff`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ ...staffDetails, staffId }),
    })

    const result = await response.json()

    if (result.status === 'success') {
      dialog.alert(`✅ Staff ${result.data.full_name} successfully updated.`)
      navigate('/staff/manage')
    } else {
      dialog.alert(result.message || 'Update failed. Please try again.')
    }
  } catch (error) {
    console.error('Update error:', error)
    dialog.alert('Server error occurred. Please check your network or server.')
  }
}
