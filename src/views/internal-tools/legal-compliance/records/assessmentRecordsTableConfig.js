import React from 'react'
import { DataTableStatusBadge } from '../../../../components/datatable'
import { buildCsv, downloadCsv } from '../../../../utils/datatable/csv'
import {
  displayValue,
  formatDate,
  formatDateTime,
  getCompletedCount,
  getCompletedDisplay,
  getStageLabel,
  getStageTone,
  getTemplateDisplay,
} from '../utils/formatters'

export const COLUMN_STORAGE_KEY = 'legalComplianceAssessmentRecords.columns.v5'
export const REQUIRED_COLUMNS = new Set(['company_name'])

export const DEFAULT_VISIBLE_COLUMNS = {
  company_name: true,
  client_pic_name: false,
  client_pic_email: false,
  site_location: false,
  assessment_date: true,
  assessor: true,
  stage: true,
  template: true,
  completed: false,
  updated_at: false,
}

export const dataColumns = [
  {
    key: 'company_name',
    label: 'Company',
    sortable: true,
    width: '180px',
    getExportValue: (record) => displayValue(record.company_name),
  },
  {
    key: 'site_location',
    label: 'Address',
    sortable: true,
    width: '170px',
    getExportValue: (record) => displayValue(record.site_location),
  },
  {
    key: 'client_pic_name',
    label: 'Client PIC',
    sortable: true,
    width: '170px',
    getExportValue: (record) => displayValue(record.client_pic_name),
  },
  {
    key: 'client_pic_email',
    label: 'PIC Email',
    sortable: true,
    width: '190px',
    getExportValue: (record) => displayValue(record.client_pic_email),
  },
  {
    key: 'assessment_date',
    label: 'Assessment Date',
    sortable: true,
    sortType: 'date',
    width: '140px',
    getExportValue: (record) => formatDate(record.assessment_date),
  },
  {
    key: 'assessor',
    label: 'Assessor',
    sortable: true,
    width: '180px',
    getExportValue: (record) =>
      [record.assessor_name, record.assessor_email].filter(Boolean).join(' - ') || '-',
  },
  {
    key: 'stage',
    label: 'Status',
    sortable: true,
    width: '130px',
    shrinkToFit: true,
    getExportValue: (record) => getStageLabel(record.stage),
  },
  {
    key: 'template',
    label: 'Template',
    sortable: true,
    width: '170px',
    getExportValue: (record) => getTemplateDisplay(record),
  },
  {
    key: 'completed',
    label: 'Completed',
    sortable: true,
    sortType: 'number',
    width: '110px',
    shrinkToFit: true,
    getExportValue: (record) => getCompletedDisplay(record),
  },
  {
    key: 'updated_at',
    label: 'Updated',
    sortable: true,
    sortType: 'date',
    width: '170px',
    getExportValue: (record) => formatDateTime(record.updated_at),
  },
]

export const getSearchText = (record) =>
  [
    record.company_name,
    record.site_location,
    record.client_pic_name,
    record.client_pic_email,
    record.assessment_date,
    formatDate(record.assessment_date),
    record.assessor_name,
    record.assessor_email,
    getStageLabel(record.stage),
    record.template_name,
    record.project_name,
    record.revision_number ? `Rev ${record.revision_number}` : '',
    record.template_version,
    record.published_version_number ? `Version ${record.published_version_number}` : '',
    getCompletedDisplay(record),
    record.updated_at,
    formatDateTime(record.updated_at),
    record.created_by_name,
    record.created_by_code,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

export const renderRecordCell = (record, column) => {
  switch (column.key) {
    case 'company_name':
      return <div className="fw-semibold">{displayValue(record.company_name)}</div>
    case 'site_location':
      return displayValue(record.site_location)
    case 'client_pic_name':
      return displayValue(record.client_pic_name)
    case 'client_pic_email':
      return displayValue(record.client_pic_email)
    case 'assessment_date':
      return formatDate(record.assessment_date)
    case 'assessor':
      return displayValue(record.assessor_name)
    case 'stage':
      return (
        <DataTableStatusBadge tone={getStageTone(record.stage)}>
          {getStageLabel(record.stage)}
        </DataTableStatusBadge>
      )
    case 'template':
      return (
        <div>
          <div>{displayValue(record.template_name)}</div>
          {record.revision_number > 1 && (
            <div className="small text-body-secondary">Rev. {record.revision_number}</div>
          )}
        </div>
      )
    case 'completed':
      return getCompletedDisplay(record)
    case 'updated_at':
      return formatDateTime(record.updated_at)
    default:
      return record[column.key] || '-'
  }
}

export const getSortValue = (record, field) => {
  switch (field) {
    case 'assessor':
      return record.assessor_name || record.assessor_email || ''
    case 'template':
      return getTemplateDisplay(record)
    case 'completed':
      return getCompletedCount(record)
    case 'stage':
      return getStageLabel(record.stage)
    default:
      return record[field]
  }
}

export const mobileRecord = {
  title: (record) => displayValue(record.company_name),
  subtitle: (record) => displayValue(record.template_name),
  meta: (record) =>
    [
      record.assessor_name ? `Assessor: ${record.assessor_name}` : null,
      record.assessment_date ? `Date: ${formatDate(record.assessment_date)}` : null,
    ]
      .filter(Boolean)
      .join(' | '),
  badges: (record) => [
    {
      key: 'stage',
      label: getStageLabel(record.stage),
      tone: getStageTone(record.stage),
    },
  ],
  kv: (record) => [
    { key: 'address', label: 'Address', value: displayValue(record.site_location) },
    { key: 'completed', label: 'Completed', value: getCompletedDisplay(record) },
    { key: 'updated', label: 'Updated', value: formatDateTime(record.updated_at) },
  ],
}

export const exportAssessmentRecordsCsv = ({ rows, visibleColumns }) => {
  if (rows.length === 0) return

  const csv = buildCsv({
    rows,
    columns: visibleColumns.map((column) => ({
      key: column.key,
      label: column.label,
      getValue: column.getExportValue,
    })),
  })

  downloadCsv('legal-compliance-assessment-records.csv', csv)
}

export const getRecordActions = (
  record,
  { navigate, onDelete, onExportPdf, onExportWord, onCreateRevision, returnTo },
) => {
  const reviewPath = `/internal-tools/legal-compliance?assessmentId=${encodeURIComponent(record.id)}&mode=review`
  const editPath = `/internal-tools/legal-compliance?assessmentId=${encodeURIComponent(record.id)}`
  const state = returnTo ? { returnTo } : undefined
  return [
    {
      key: 'view',
      label:
        record.stage === 'details_saved'
          ? 'Continue Assessment'
          : record.stage === 'submitted'
            ? 'View Submitted Report'
            : 'Review Report',
      onClick: () => navigate(record.stage === 'details_saved' ? editPath : reviewPath, { state }),
    },
    record.stage === 'submitted'
      ? {
          key: 'revision',
          label: 'Create Revision',
          onClick: () => onCreateRevision(record),
        }
      : {
          key: 'edit',
          label: 'Edit Assessment',
          onClick: () => navigate(editPath, { state }),
        },
    {
      key: 'pdf',
      label: 'Export Report PDF',
      hidden: record.stage !== 'submitted',
      onClick: () => onExportPdf(record),
    },
    {
      key: 'word',
      label: 'Export Report Word',
      hidden: record.stage !== 'submitted',
      onClick: () => onExportWord(record),
    },
    {
      key: 'delete',
      label: 'Delete',
      danger: true,
      dividerBefore: true,
      onClick: () => onDelete(record),
    },
  ].filter(Boolean)
}

export const openRecordReport = (record, navigate, returnTo) => {
  const path = `/internal-tools/legal-compliance?assessmentId=${encodeURIComponent(record.id)}`
  navigate(record.stage === 'details_saved' ? path : `${path}&mode=review`, {
    state: returnTo ? { returnTo } : undefined,
  })
}
