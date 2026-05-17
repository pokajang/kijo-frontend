// src/components/AppraisalRecords.js
import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CAlert, CCol, CRow } from '@coreui/react'
import { DataTableRecordList, DataTableTextCell } from '../datatable'
import { PeriodRangeSelector, getPeriodRangePreset, isDateInPeriodRange } from '../filters'

const dataColumns = [
  {
    key: 'createdAt',
    label: 'Appraisal Date',
    width: '160px',
    sortable: true,
    sortType: 'date',
    align: 'center',
    shrinkToFit: true,
  },
  {
    key: 'appraisedBy',
    label: 'Appraised By',
    width: '220px',
    sortable: true,
    sortType: 'string',
    textMode: 'expandable',
    cellMaxWidth: '220px',
    previewCharThreshold: 34,
  },
  {
    key: 'eventDate',
    label: 'Event Date',
    width: '140px',
    sortable: true,
    sortType: 'date',
    align: 'center',
    shrinkToFit: true,
  },
  {
    key: 'section',
    label: 'Type',
    width: '140px',
    sortable: true,
    sortType: 'string',
    shrinkToFit: true,
  },
  {
    key: 'feedback',
    label: 'Feedback',
    width: '220px',
    sortable: true,
    sortType: 'string',
    textMode: 'expandable',
    cellMaxWidth: '220px',
    previewCharThreshold: 34,
  },
]

const defaultVisibleColumns = {
  createdAt: true,
  appraisedBy: true,
  eventDate: true,
  section: true,
  feedback: true,
}

const requiredColumns = new Set(['createdAt', 'section'])

const AppraisalRecords = () => {
  const navigate = useNavigate()
  const [records, setRecords] = useState([])
  const [error, setError] = useState('')
  const [periodRange, setPeriodRange] = useState(() => getPeriodRangePreset('ytd'))

  useEffect(() => {
    const fetchMyAppraisals = async () => {
      setError('')
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE}hr/appraisals/personal`, {
          credentials: 'include',
        })
        const json = await res.json()
        if (json.status === 'success') {
          setRecords(json.records)
        } else {
          setError(json.message || 'Failed to load appraisal records.')
        }
      } catch (err) {
        console.error('Fetch error:', err)
        setError('Network error: Could not fetch appraisal records.')
      }
    }

    fetchMyAppraisals()
  }, [])

  const normalizedRecords = useMemo(
    () =>
      records
        .filter((record) =>
          isDateInPeriodRange(record.event_date || record.created_at, periodRange),
        )
        .map((record) => ({
          ...record,
          createdAt: record.created_at || '',
          appraisedBy: `${record.creator_name} (${record.creator_code}), ${record.creator_position}, ${record.creator_department}`,
          eventDate: record.event_date || '',
          section: record.section || '-',
          feedback: record.feedback || '',
        })),
    [periodRange, records],
  )

  const renderCell = (record, column) => {
    if (column.key === 'feedback') {
      return (
        <DataTableTextCell
          value={record.feedback}
          maxWidth="220px"
          title="Feedback"
          mode="expandable"
          previewCharThreshold={34}
        />
      )
    }
    return record[column.key] || '-'
  }

  return (
    <>
      {error && (
        <CAlert color="danger" dismissible onClose={() => setError('')}>
          {error}
        </CAlert>
      )}

      {records.length > 0 && (
        <CAlert color="primary">
          Viewing appraisal records for{' '}
          <strong>
            {records[0].staff_name} ({records[0].staff_code}), {records[0].staff_position},{' '}
            {records[0].staff_department}
          </strong>
        </CAlert>
      )}

      <CRow>
        <CCol>
          {records.length > 0 ? (
            <DataTableRecordList
              rows={normalizedRecords}
              dataColumns={dataColumns}
              defaultVisibleColumns={defaultVisibleColumns}
              requiredColumns={requiredColumns}
              storageKey="appraisal.personal-records.visible-columns.v3"
              apiKey="appraisal-personal-records-visible-columns-v3"
              idPrefix="personal-appraisal-record"
              emptyMessage="No appraisal records found."
              exportFilename={`appraisal-records-${new Date().toISOString().slice(0, 10)}.csv`}
              getRowKey={(record, index) => record.id || index}
              renderCell={renderCell}
              onRowOpen={(record) =>
                navigate(`/appraisal/records/${record.id}`, {
                  state: { record },
                })
              }
              getMobileTitle={(record) => record.section}
              getMobileSubtitle={(record) => record.eventDate}
              getMobileMeta={(record) => record.appraisedBy}
              mobileFieldKeys={{
                title: 'section',
                subtitle: 'eventDate',
                meta: 'appraisedBy',
              }}
              initialSortField="createdAt"
              initialSortDir="desc"
              initialSortDirByField={{ createdAt: 'desc', eventDate: 'desc' }}
              renderQuickFilters={() => (
                <PeriodRangeSelector value={periodRange} onChange={setPeriodRange} />
              )}
              resetDeps={[records, periodRange]}
            />
          ) : (
            !error && <>No appraisal records found.</>
          )}
        </CCol>
      </CRow>
    </>
  )
}

export default AppraisalRecords
