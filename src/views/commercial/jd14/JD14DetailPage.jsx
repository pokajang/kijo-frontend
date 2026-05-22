import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { DataTableDetailShell } from '../../../components/datatable'
import { DetailField, DetailSection } from '../shared/CommercialDetailFields'
import EditJd14Modal from './EditJd14Modal'
import dialog from '../../../components/dialog/dialogService'

const JD14DetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [forms, setForms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editVisible, setEditVisible] = useState(false)

  useEffect(() => {
    const fetchForms = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE}jd14-forms`, {
          credentials: 'include',
        })
        const result = await res.json()
        if (result.status === 'success') {
          setForms(result.forms || [])
        } else {
          setError(result.message || 'Unable to load JD14 record.')
        }
      } catch (err) {
        console.error('Error fetching JD14 forms:', err)
        setError('Unable to load JD14 record.')
      } finally {
        setLoading(false)
      }
    }

    fetchForms()
  }, [])

  const record = useMemo(() => forms.find((form) => String(form.id) === String(id)), [forms, id])

  const handleGeneratePdf = () => {
    window.open(
      `${import.meta.env.VITE_API_BASE}jd14-forms/${encodeURIComponent(record.id)}/pdf`,
      '_blank',
    )
  }

  const handleDelete = async () => {
    const confirmed = await dialog.confirm(
      `Are you sure you want to delete JD14 record: ${record.approval_no}?`,
    )
    if (!confirmed) return

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE}jd14-forms/${encodeURIComponent(record.id)}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        },
      )
      const result = await res.json()
      if (result.status === 'success') {
        dialog.alert('JD14 deleted successfully.')
        navigate('/commercial/jd14')
      } else {
        dialog.alert(`Failed to delete: ${result.message}`)
      }
    } catch (err) {
      console.error('Delete JD14 error:', err)
      dialog.alert('Server error. Please try again later.')
    }
  }

  return (
    <>
      <DataTableDetailShell
        title="JD14 Details"
        backLabel="Back"
        onBack={() => navigate('/commercial/jd14')}
        loading={loading}
        error={error}
        record={record}
        actions={[
          record?.project_id
            ? {
                key: 'back-project',
                label: 'Back to Project',
                buttonColor: 'secondary',
                onClick: () => navigate(`/project/manage/${record.project_id}`),
              }
            : null,
          { key: 'edit', label: 'Edit', onClick: () => setEditVisible(true) },
          { key: 'pdf', label: 'Generate PDF', onClick: handleGeneratePdf },
          {
            key: 'delete',
            label: 'Delete',
            danger: true,
            dividerBefore: true,
            onClick: handleDelete,
          },
        ]}
      >
        <DetailSection title="Details">
          <DetailField label="Approval No" value={record?.approval_no} />
          <DetailField label="Employer" value={record?.employer_name} />
          <DetailField label="Course" value={record?.course_title || record?.course_name} />
          <DetailField label="Commenced" value={record?.commenced_date} />
          <DetailField label="Ended" value={record?.end_date} />
          <DetailField label="Venue" value={record?.training_venue} />
          <DetailField
            label="Created By"
            value={record?.created_by_code || record?.created_by_name || record?.created_by}
          />
        </DetailSection>
      </DataTableDetailShell>

      {record && (
        <EditJd14Modal
          visible={editVisible}
          formData={record}
          onClose={() => setEditVisible(false)}
        />
      )}
    </>
  )
}

export default JD14DetailPage
