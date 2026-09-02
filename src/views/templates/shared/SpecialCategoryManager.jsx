import React, { useCallback, useEffect, useState } from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CFormInput,
  CFormLabel,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import dialog from '../../../components/dialog/dialogService'
import {
  createSpecialCategory,
  deleteSpecialCategory,
  listSpecialCategories,
  setSpecialCategoryStatus,
  updateSpecialCategory,
} from './specialCategoryApi'

export default function SpecialCategoryManager({ visible, onClose, onChanged }) {
  const [rows, setRows] = useState([])
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [workingId, setWorkingId] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const payload = await listSpecialCategories({ manage: true })
      setRows(Array.isArray(payload?.data) ? payload.data : [])
    } catch (err) {
      setError(err?.message || 'Failed to load categories.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (visible) load()
  }, [visible, load])

  const resetForm = () => {
    setEditingId(null)
    setName('')
  }

  const close = () => {
    resetForm()
    setError('')
    onClose()
  }

  const edit = (row) => {
    setEditingId(row.id)
    setName(row.name)
    setError('')
  }

  const save = async () => {
    if (saving || workingId !== null) return
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Category name is required.')
      return
    }

    setSaving(true)
    setError('')
    try {
      if (editingId) await updateSpecialCategory(editingId, { name: trimmedName })
      else await createSpecialCategory({ name: trimmedName })
      resetForm()
      await load()
      onChanged?.()
    } catch (err) {
      setError(err?.message || 'Failed to save category.')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (row) => {
    if (!(await dialog.confirm(`Delete category “${row.name}”?`))) return
    setWorkingId(row.id)
    setError('')
    try {
      await deleteSpecialCategory(row.id)
      if (editingId === row.id) resetForm()
      await load()
      onChanged?.()
    } catch (err) {
      setError(err?.message || 'Failed to delete category.')
    } finally {
      setWorkingId(null)
    }
  }

  const changeStatus = async (row, isActive) => {
    if (
      !isActive &&
      !(await dialog.confirm(
        `Deactivate “${row.name}”? Existing templates keep this category, but it will not be available for new templates.`,
      ))
    ) {
      return
    }

    setWorkingId(row.id)
    setError('')
    try {
      await setSpecialCategoryStatus(row.id, isActive)
      await load()
      onChanged?.()
    } catch (err) {
      setError(err?.message || `Failed to ${isActive ? 'reactivate' : 'deactivate'} category.`)
    } finally {
      setWorkingId(null)
    }
  }

  return (
    <CModal visible={visible} onClose={close} size="lg" backdrop="static" scrollable>
      <CModalHeader>
        <CModalTitle>Manage Other Service Categories</CModalTitle>
      </CModalHeader>
      <CModalBody>
        {error && <CAlert color="danger">{error}</CAlert>}
        <div className="row g-3 align-items-end mb-4">
          <div className="col-md-8">
            <CFormLabel htmlFor="special-category-name">Category name</CFormLabel>
            <CFormInput
              id="special-category-name"
              value={name}
              maxLength={100}
              placeholder="e.g., Environmental Services"
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  save()
                }
              }}
            />
          </div>
          <div className="col-md-4 d-flex gap-2">
            <CButton color="primary" onClick={save} disabled={saving || workingId !== null}>
              {saving ? 'Saving…' : editingId ? 'Save Rename' : 'Add Category'}
            </CButton>
            {editingId && (
              <CButton color="secondary" variant="outline" onClick={resetForm} disabled={saving}>
                Cancel
              </CButton>
            )}
          </div>
        </div>

        <CTable responsive hover align="middle">
          <CTableHead>
            <CTableRow>
              <CTableHeaderCell>Category</CTableHeaderCell>
              <CTableHeaderCell>Templates</CTableHeaderCell>
              <CTableHeaderCell className="text-end">Actions</CTableHeaderCell>
            </CTableRow>
          </CTableHead>
          <CTableBody>
            {rows.map((row) => {
              const canDelete = row.isActive && !row.isSystem && row.templateCount === 0

              return (
                <CTableRow key={row.id}>
                  <CTableDataCell>
                    <span className="me-2">{row.name}</span>
                    {!row.isActive && <CBadge color="secondary">Inactive</CBadge>}
                    {row.isSystem && <small className="d-block text-muted">System category</small>}
                  </CTableDataCell>
                  <CTableDataCell>{row.templateCount}</CTableDataCell>
                  <CTableDataCell className="text-end text-nowrap">
                    <CButton
                      size="sm"
                      variant="outline"
                      className="me-2"
                      onClick={() => edit(row)}
                      disabled={saving || workingId !== null}
                    >
                      Rename
                    </CButton>
                    {row.isActive && canDelete && (
                      <CButton
                        size="sm"
                        color="danger"
                        variant="outline"
                        onClick={() => remove(row)}
                        disabled={saving || workingId !== null}
                      >
                        Delete
                      </CButton>
                    )}
                    {row.isActive && !canDelete && (
                      <CButton
                        size="sm"
                        color="warning"
                        variant="outline"
                        onClick={() => changeStatus(row, false)}
                        disabled={saving || workingId !== null}
                      >
                        Deactivate
                      </CButton>
                    )}
                    {!row.isActive && (
                      <CButton
                        size="sm"
                        color="success"
                        variant="outline"
                        onClick={() => changeStatus(row, true)}
                        disabled={saving || workingId !== null}
                      >
                        Reactivate
                      </CButton>
                    )}
                  </CTableDataCell>
                </CTableRow>
              )
            })}
          </CTableBody>
        </CTable>
        {!loading && rows.length === 0 && <div className="text-muted">No categories found.</div>}
        {loading && <div className="text-muted">Loading categories…</div>}
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" onClick={close}>
          Close
        </CButton>
      </CModalFooter>
    </CModal>
  )
}
