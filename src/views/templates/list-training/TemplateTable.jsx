// src/templates/list/TemplateTable.jsx
import React, { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CBadge, CCol, CFormLabel, CFormSelect } from '@coreui/react'
import {
  DataTableRecordControls,
  DataTableRecordList,
  DataTableTextCell,
} from '../../../components/datatable'
import { StatsStrip } from '../../../components/stats'
import { countByPredicate, formatCount } from '../../../utils/stats/formatStats'
import {
  getTrainingEditUrl,
  getTrainingPdfUrl,
  normalizeTrainingTemplateRow,
} from './trainingTemplateUtils'
import { getProposalDetailPath } from '../proposals/proposalTabs'

const dataColumns = [
  {
    key: 'proposalLanguage',
    label: 'Language',
    width: '150px',
    sortable: true,
    sortType: 'string',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (row) =>
      row.proposalLanguage === 'ms-MY' ? 'BM' : row.hasBmCopy ? 'ENG, BM' : 'ENG',
  },
  {
    key: 'title',
    label: 'Title',
    width: '220px',
    sortable: true,
    sortType: 'string',
    textMode: 'expandable',
    cellMaxWidth: '220px',
    previewCharThreshold: 34,
    getExportValue: (row) => row.title || '-',
  },
  {
    key: 'trainingCode',
    label: 'Code',
    width: '150px',
    sortable: true,
    sortType: 'string',
    shrinkToFit: true,
    headerClassName: 'text-nowrap',
    cellClassName: 'text-nowrap',
    getExportValue: (row) => row.trainingCode || '-',
  },
  {
    key: 'durationLabel',
    label: 'Duration',
    width: '150px',
    sortable: true,
    sortType: 'string',
    shrinkToFit: true,
    headerClassName: 'text-nowrap',
    cellClassName: 'text-nowrap',
    getExportValue: (row) => row.durationLabel || '-',
  },
  {
    key: 'hrdNo',
    label: 'HRD Program No',
    width: '170px',
    sortable: true,
    sortType: 'string',
    shrinkToFit: true,
    headerClassName: 'text-nowrap',
    cellClassName: 'text-nowrap',
    getExportValue: (row) => row.hrdNo || '-',
  },
  {
    key: 'description',
    label: 'Description',
    width: '200px',
    sortable: true,
    sortType: 'string',
    textMode: 'expandable',
    cellMaxWidth: '200px',
    previewCharThreshold: 34,
    getExportValue: (row) => row.description || '-',
  },
  {
    key: 'dateCreated',
    label: 'Date Created',
    width: '150px',
    sortable: true,
    sortType: 'date',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (row) => row.dateCreated || '-',
  },
  {
    key: 'createdBy',
    label: 'Created By',
    width: '150px',
    sortable: true,
    sortType: 'string',
    shrinkToFit: true,
    headerClassName: 'text-nowrap',
    cellClassName: 'text-nowrap',
    getExportValue: (row) => row.createdBy || '-',
  },
  {
    key: 'editedBy',
    label: 'Last Edited By',
    width: '150px',
    sortable: true,
    sortType: 'string',
    shrinkToFit: true,
    headerClassName: 'text-nowrap',
    cellClassName: 'text-nowrap',
    getExportValue: (row) => row.editedBy || '-',
  },
]

const defaultVisibleColumns = {
  title: true,
  trainingCode: true,
  proposalLanguage: true,
  durationLabel: true,
  hrdNo: true,
  description: false,
  dateCreated: true,
  createdBy: true,
  editedBy: false,
}

const requiredColumns = new Set(['title'])

const getDurationFilterKey = (row) => {
  const label = String(row.durationLabel || '')
    .trim()
    .toLowerCase()
  if (label === 'half day (4 hours)') return 'half-day'
  if (label === '1 day') return '1-day'
  if (label === '2 days') return '2-days'
  if (label === '3 days') return '3-days'
  return label && label !== '-' ? 'other' : ''
}

const isMissingHrdNo = (row) => {
  const value = String(row.hrdNo || '').trim()
  return !value || value === '-'
}

const durationFilterLabel = (value) => {
  if (value === 'half-day') return 'Half-day'
  if (value === '1-day') return '1-day'
  if (value === '2-days') return '2-day'
  if (value === '3-days') return '3-day'
  if (value === 'other') return 'Other duration'
  return 'All durations'
}

const hrdFilterLabel = (value) => {
  if (value === 'with-hrd') return 'With HRD Program No'
  if (value === 'without-hrd') return 'Without HRD Program No'
  return 'All HRD statuses'
}

export default function TemplateTable({ data = [], onDelete, onCreateBmCopy, loading = false }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchTerm, setSearchTerm] = useState('')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [durationFilter, setDurationFilter] = useState('')
  const [hrdFilter, setHrdFilter] = useState('')
  const [createdByFilter, setCreatedByFilter] = useState('')
  const desktopToolsId = 'training-template-table-tools'
  const mobileToolsId = 'training-template-mobile-table-tools'

  const rows = useMemo(() => (Array.isArray(data) ? data : []), [data])
  const normalizedRows = useMemo(() => rows.map(normalizeTrainingTemplateRow), [rows])
  const createdByOptions = useMemo(
    () =>
      Array.from(
        new Set(
          normalizedRows.map((row) => row.createdBy).filter((value) => value && value !== '-'),
        ),
      )
        .sort((a, b) => a.localeCompare(b))
        .map((value) => ({ value, label: value })),
    [normalizedRows],
  )

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    const searchedRows = term
      ? normalizedRows.filter((row) =>
          [
            row.title,
            row.trainingCode,
            row.durationLabel,
            row.hrdNo,
            row.description,
            row.createdBy,
            row.editedBy,
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(term)),
        )
      : normalizedRows

    return searchedRows.filter((row) => {
      const matchesDuration = durationFilter ? getDurationFilterKey(row) === durationFilter : true
      const matchesHrd =
        hrdFilter === 'with-hrd'
          ? !isMissingHrdNo(row)
          : hrdFilter === 'without-hrd'
            ? isMissingHrdNo(row)
            : true
      const matchesCreator = !createdByFilter || row.createdBy === createdByFilter

      return matchesDuration && matchesHrd && matchesCreator
    })
  }, [createdByFilter, durationFilter, hrdFilter, normalizedRows, searchTerm])

  const statsItems = useMemo(() => {
    const isDuration = (row, label) => String(row.durationLabel || '').toLowerCase() === label
    return [
      {
        key: 'half-day',
        label: 'Half-Day Program',
        value: formatCount(
          countByPredicate(filtered, (row) => isDuration(row, 'half day (4 hours)')),
        ),
        tone: 'primary',
        onClick: () => {
          setDurationFilter('half-day')
          setShowAdvancedFilters(true)
        },
      },
      {
        key: 'one-day',
        label: '1-Day Program',
        value: formatCount(countByPredicate(filtered, (row) => isDuration(row, '1 day'))),
        tone: 'success',
        onClick: () => {
          setDurationFilter('1-day')
          setShowAdvancedFilters(true)
        },
      },
      {
        key: 'two-days',
        label: '2-Day Program',
        value: formatCount(countByPredicate(filtered, (row) => isDuration(row, '2 days'))),
        tone: 'info',
        onClick: () => {
          setDurationFilter('2-days')
          setShowAdvancedFilters(true)
        },
      },
      {
        key: 'missing-hrd',
        label: 'Without HRD Program No',
        value: formatCount(countByPredicate(filtered, isMissingHrdNo)),
        tone: 'warning',
        onClick: () => {
          setHrdFilter('without-hrd')
          setShowAdvancedFilters(true)
        },
      },
    ]
  }, [filtered])

  const resetFilters = () => {
    setSearchTerm('')
    setDurationFilter('')
    setHrdFilter('')
    setCreatedByFilter('')
  }

  const activeChips = useMemo(
    () =>
      [
        searchTerm.trim()
          ? {
              key: 'search',
              label: `Search: ${searchTerm.trim()}`,
            }
          : null,
        durationFilter
          ? {
              key: 'duration',
              label: `Duration: ${durationFilterLabel(durationFilter)}`,
            }
          : null,
        hrdFilter
          ? {
              key: 'hrd',
              label: `HRD: ${hrdFilterLabel(hrdFilter)}`,
            }
          : null,
        createdByFilter
          ? {
              key: 'createdBy',
              label: `Created By: ${createdByFilter}`,
            }
          : null,
      ].filter(Boolean),
    [createdByFilter, durationFilter, hrdFilter, searchTerm],
  )

  const clearChip = (key) => {
    if (key === 'search') setSearchTerm('')
    if (key === 'duration') setDurationFilter('')
    if (key === 'hrd') setHrdFilter('')
    if (key === 'createdBy') setCreatedByFilter('')
  }

  const openDetail = (row) => {
    if (!row?.templateId) return
    navigate(getProposalDetailPath('training', row.templateId), {
      state: { returnTo: `${location.pathname}${location.search}` },
    })
  }

  const getActions = (row) => [
    {
      key: 'export',
      label: 'Export Brochure',
      onClick: () => window.open(getTrainingPdfUrl(row.templateId), '_blank'),
    },
    ...(row.proposalLanguage !== 'ms-MY'
      ? [
          {
            key: 'bm-copy',
            label: row.hasBmCopy ? 'Open BM Proposal' : 'Create BM Copy',
            onClick: () => onCreateBmCopy?.(row.templateId, row),
          },
        ]
      : []),
    {
      key: 'edit',
      label: 'Edit',
      onClick: () =>
        navigate(getTrainingEditUrl(row.templateId), {
          state: { returnTo: `${location.pathname}${location.search}` },
        }),
    },
    {
      key: 'delete',
      label: 'Delete',
      danger: true,
      dividerBefore: true,
      onClick: () => onDelete(row.templateId),
    },
  ]

  const renderCell = (row, column) => {
    if (column.key === 'description') {
      return (
        <DataTableTextCell
          value={row.description}
          maxWidth={column.cellMaxWidth || column.width || '200px'}
          title="Description"
          mode="expandable"
          previewCharThreshold={column.previewCharThreshold || 34}
          truncateCharThreshold={column.truncateCharThreshold || column.previewCharThreshold || 34}
        />
      )
    }
    if (column.key === 'proposalLanguage') {
      const isBm = row.proposalLanguage === 'ms-MY'
      return (
        <div className="d-flex justify-content-center gap-1 flex-wrap">
          {isBm ? <CBadge color="info">BM</CBadge> : <CBadge color="secondary">ENG</CBadge>}
          {!isBm && row.hasBmCopy ? <CBadge color="info">BM</CBadge> : null}
        </div>
      )
    }
    return row[column.key] || '-'
  }

  return (
    <>
      <StatsStrip items={statsItems} loading={loading} />

      <DataTableRecordControls
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search title, code, HRD No, description, creator, or editor"
        searchAriaLabel="Search training proposal templates"
        showAdvancedFilters={showAdvancedFilters}
        setShowAdvancedFilters={setShowAdvancedFilters}
        activeFilterCount={[durationFilter, hrdFilter, createdByFilter].filter(Boolean).length}
        activeChips={activeChips}
        clearChip={clearChip}
        resetFilters={resetFilters}
        loading={loading}
        desktopToolsId={desktopToolsId}
        mobileToolsId={mobileToolsId}
      >
        <CCol xs={12} md={4} lg={3}>
          <CFormLabel htmlFor="training-template-duration-filter">Duration</CFormLabel>
          <CFormSelect
            id="training-template-duration-filter"
            value={durationFilter}
            onChange={(event) => setDurationFilter(event.target.value)}
          >
            <option value="">All durations</option>
            <option value="half-day">Half-day</option>
            <option value="1-day">1-day</option>
            <option value="2-days">2-day</option>
            <option value="3-days">3-day</option>
            <option value="other">Other duration</option>
          </CFormSelect>
        </CCol>
        <CCol xs={12} md={4} lg={3}>
          <CFormLabel htmlFor="training-template-hrd-filter">HRD Program No</CFormLabel>
          <CFormSelect
            id="training-template-hrd-filter"
            value={hrdFilter}
            onChange={(event) => setHrdFilter(event.target.value)}
          >
            <option value="">All HRD statuses</option>
            <option value="with-hrd">With HRD Program No</option>
            <option value="without-hrd">Without HRD Program No</option>
          </CFormSelect>
        </CCol>
        <CCol xs={12} md={4} lg={3}>
          <CFormLabel htmlFor="training-template-creator-filter">Created By</CFormLabel>
          <CFormSelect
            id="training-template-creator-filter"
            value={createdByFilter}
            onChange={(event) => setCreatedByFilter(event.target.value)}
          >
            <option value="">All creators</option>
            {createdByOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </CFormSelect>
        </CCol>
      </DataTableRecordControls>

      <DataTableRecordList
        rows={filtered}
        dataColumns={dataColumns}
        defaultVisibleColumns={defaultVisibleColumns}
        requiredColumns={requiredColumns}
        storageKey="templates.training.visible-columns.v3"
        idPrefix="training-template"
        emptyMessage={rows.length ? 'No matching records.' : 'No records to display.'}
        exportFilename={`training-templates-${new Date().toISOString().slice(0, 10)}.csv`}
        loading={loading}
        loadingMessage="Loading training proposal templates..."
        showDesktopSummary={false}
        desktopUtilityPlacement="portal"
        desktopUtilityPortalId={desktopToolsId}
        mobileUtilityPlacement="portal"
        mobileUtilityPortalId={mobileToolsId}
        showMobileUtilityRow={false}
        getRowKey={(row, index) => row.templateId || index}
        renderCell={renderCell}
        getActions={getActions}
        onRowOpen={openDetail}
        getRowOpenDisabled={(row) => !row?.templateId}
        getMobileTitle={(row) => row.title}
        getMobileSubtitle={(row) =>
          [
            row.trainingCode !== '-' ? row.trainingCode : '',
            row.proposalLanguage === 'ms-MY' ? 'BM' : row.hasBmCopy ? 'ENG | BM' : 'ENG',
            row.hrdNo !== '-' ? row.hrdNo : '',
          ]
            .filter(Boolean)
            .join(' | ')
        }
        getMobileMeta={(row) => [row.dateCreated, row.createdBy].filter(Boolean).join(' | ')}
        getMobileStatus={(row) => row.durationLabel}
        getMobileStatusTone={() => 'secondary'}
        mobileRecord={{
          title: (row) => row.title,
          subtitle: (row) =>
            [row.trainingCode !== '-' ? row.trainingCode : '', row.hrdNo !== '-' ? row.hrdNo : '']
              .filter(Boolean)
              .join(' | '),
          meta: (row) => [row.dateCreated, row.createdBy].filter(Boolean).join(' | '),
          badges: (row) => [
            {
              key: 'language',
              label: row.proposalLanguage === 'ms-MY' ? 'BM' : row.hasBmCopy ? 'ENG | BM' : 'ENG',
              tone: row.proposalLanguage === 'ms-MY' ? 'info' : 'secondary',
            },
            {
              key: 'duration',
              label: row.durationLabel,
              tone: 'secondary',
            },
          ],
        }}
        mobileFieldKeys={{
          title: 'title',
          subtitle: ['trainingCode', 'hrdNo'],
          meta: ['dateCreated', 'createdBy'],
          status: 'durationLabel',
        }}
        initialSortField="dateCreated"
        initialSortDir="desc"
        initialSortDirByField={{ dateCreated: 'desc' }}
        getSortValue={(row, field) => (field === 'dateCreated' ? row.dateCreatedRaw : row[field])}
        resetDeps={[filtered, searchTerm, durationFilter, hrdFilter, createdByFilter]}
        actionColumnWidth="56px"
      />
    </>
  )
}
