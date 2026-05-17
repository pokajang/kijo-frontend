import dialog from '../../../components/dialog/dialogService'
// src/views/catalog/create/formHandlers.js

// Key for saving/loading drafts
const DRAFT_KEY = 'catalogItemDraft'

/**
 * Generic input change for text fields
 */
export const handleChange = (e, setFormData) => {
  setFormData((prev) => ({
    ...prev,
    [e.target.name]: e.target.value,
  }))
}

/**
 * Handle react-select changes for category
 */
export const handleSelectChange = (selectedOption, setFormData) => {
  setFormData((prev) => ({
    ...prev,
    category_id: selectedOption?.category_id || '',
  }))
}

/**
 * Handle file input change
 */
export const handleFileChange = (e, setFormData) => {
  setFormData((prev) => ({
    ...prev,
    image: e.target.files[0],
  }))
}

/**
 * Submit handler: sends FormData, clears draft on success
 */
export const handleSubmit = async (
  formData,
  remarks,
  {
    setFormData,
    setRemarks,
    initialFormData,
    fileInputRef,
    navigate,
    returnTo = '/catalog/manage',
  },
) => {
  if (!(await dialog.confirm('Are you sure you want to add this item?'))) return

  const submitData = new FormData()
  for (const key in formData) {
    submitData.append(key, formData[key])
  }
  submitData.append('entry_remarks', remarks)

  try {
    const res = await fetch(`${import.meta.env.VITE_API_BASE}catalog/items`, {
      method: 'POST',
      body: submitData,
      credentials: 'include',
    })
    const data = await res.json()

    if (data.status === 'success') {
      // reset form state
      setFormData(initialFormData)
      setRemarks('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      // clear saved draft
      localStorage.removeItem(DRAFT_KEY)

      const goToList = await dialog.confirm(
        'Catalog item created successfully. Go to catalog list?',
        {
          title: 'Catalog Item Created',
          confirmText: 'Go to list',
          cancelText: 'Create another',
        },
      )
      if (goToList && navigate) {
        navigate(returnTo)
      }
    } else {
      dialog.alert(data.message || 'Failed to create item.')
    }
  } catch (err) {
    console.error('Create error', err)
    dialog.alert('Server error occurred.')
  }
}

/**
 * Reset handler: clears form and removes draft
 */
export const handleReset = (setFormData, setRemarks, initialFormData, fileInputRef) => {
  setFormData(initialFormData)
  setRemarks('')
  if (fileInputRef.current) fileInputRef.current.value = ''
  // clear saved draft
  localStorage.removeItem(DRAFT_KEY)
}
