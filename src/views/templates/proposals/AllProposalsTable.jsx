import React, { useMemo, useState } from 'react'
import { CBadge, CButton, CCol, CFormLabel, CFormSelect } from '@coreui/react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  DataTableRecordControls,
  DataTableRecordList,
  DataTableTextCell,
  getAdvancedFilterCount,
} from '../../../components/datatable'
import { StatsStrip } from '../../../components/stats'
import { countByPredicate, formatCount, getTopGroupByCount } from '../../../utils/stats/formatStats'
import AttachmentsModal from '../list-special/AttachmentsModal'
import {
  getTemplatePdfUrl,
  normalizeTemplateRow,
  stripHtml,
  templateConfigs,
} from '../shared/templateProposalUtils'
import {
  getTrainingEditUrl,
  getTrainingPdfUrl,
  normalizeTrainingTemplateRow,
} from '../list-training/trainingTemplateUtils'
import { PROPOSAL_TYPES, getProposalDetailPath, proposalTypeMeta } from './proposalTabs'

const emptyValue = '-'
const desktopToolsId = 'proposal-records-table-tools'
const mobileToolsId = 'proposal-records-mobile-table-tools'

const dataColumns = [
  {
    key: 'service',
    label: 'Service',
    width: '170px',
    sortable: true,
    sortType: 'string',
  },
  {
    key: 'proposalLanguage',
    label: 'Language',
    width: '120px',
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
  },
  {
    key: 'code',
    label: 'Code',
    width: '150px',
    sortable: true,
    sortType: 'string',
    shrinkToFit: true,
    headerClassName: 'text-nowrap',
    cellClassName: 'text-nowrap',
  },
  {
    key: 'description',
    label: 'Description',
    width: '220px',
    sortable: true,
    sortType: 'string',
    textMode: 'expandable',
    cellMaxWidth: '220px',
    previewCharThreshold: 34,
  },
  {
    key: 'dateCreated',
    label: 'Date Created',
    width: '150px',
    sortable: true,
    sortType: 'date',
    align: 'center',
    shrinkToFit: true,
  },
  {
    key: 'createdBy',
    label: 'Created By',
    width: '140px',
    sortable: true,
    sortType: 'string',
    shrinkToFit: true,
    headerClassName: 'text-nowrap',
    cellClassName: 'text-nowrap',
  },
]

const defaultVisibleColumns = {
  service: true,
  title: true,
  code: true,
  proposalLanguage: true,
  description: true,
  dateCreated: true,
  createdBy: false,
}

const requiredColumns = new Set(['service', 'title'])

const getYear = (row) => {
  if (!row.dateCreatedRaw) return ''
  const date = new Date(row.dateCreatedRaw)
  if (Number.isNaN(date.getTime())) return ''
  return String(date.getFullYear())
}

const getEditUrl = (row) => {
  if (row.type === 'training') return getTrainingEditUrl(row.templateId)
  return templateConfigs[row.type].editUrl(row.templateId)
}

const getPdfUrl = (row) => {
  if (row.type === 'training') return getTrainingPdfUrl(row.templateId)
  return getTemplatePdfUrl(row.type, row.templateId)
}

const normalizeRows = (dataByType) =>
  PROPOSAL_TYPES.flatMap((type) =>
    (dataByType[type] || []).map((row) => {
      const normalized =
        type === 'training' ? normalizeTrainingTemplateRow(row) : normalizeTemplateRow(row, type)

      return {
        ...normalized,
        type,
        service: proposalTypeMeta[type].label,
        code: type === 'training' ? normalized.trainingCode : normalized.serviceCode,
        description: stripHtml(normalized.description),
        attachments: normalized.attachments || [],
        attachmentsCount: Number(normalized.attachmentsCount || 0),
      }
    }),
  )

const AllProposalsTable = ({
  dataByType,
  onDelete,
  onCreateBmCopy,
  loading = false,
  language = 'en',
}) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchTerm, setSearchTerm] = useState('')
  const [serviceFilter, setServiceFilter] = useState('')
  const [createdByFilter, setCreatedByFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [showAttachModal, setShowAttachModal] = useState(false)
  const [currentAttachments, setCurrentAttachments] = useState([])

  const rows = useMemo(() => normalizeRows(dataByType), [dataByType])

  const createdByOptions = useMemo(
    () =>
      Array.from(
        new Set(rows.map((row) => row.createdBy).filter((value) => value && value !== emptyValue)),
      ).sort(),
    [rows],
  )

  const yearOptions = useMemo(
    () =>
      Array.from(new Set(rows.map(getYear).filter(Boolean))).sort((a, b) => Number(b) - Number(a)),
    [rows],
  )

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()

    return rows.filter((row) => {
      const matchesSearch =
        !term ||
        [row.service, row.title, row.code, row.description, row.createdBy]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term))
      const matchesService = !serviceFilter || row.type === serviceFilter
      const matchesCreator = !createdByFilter || row.createdBy === createdByFilter
      const matchesYear = !yearFilter || getYear(row) === yearFilter

      return matchesSearch && matchesService && matchesCreator && matchesYear
    })
  }, [createdByFilter, rows, searchTerm, serviceFilter, yearFilter])

  const statsItems = useMemo(() => {
    const topCreator = getTopGroupByCount(filteredRows, (row) => row.createdBy)
    return [
      {
        key: 'total',
        label: 'Proposals',
        value: formatCount(filteredRows.length),
        tone: 'primary',
      },
      {
        key: 'training',
        label: 'Training',
        value: formatCount(countByPredicate(filteredRows, (row) => row.type === 'training')),
        tone: 'success',
        onClick: () => {
          setServiceFilter('training')
          setShowAdvancedFilters(true)
        },
      },
      {
        key: 'ih',
        label: 'IH / Manpower',
        value: `${formatCount(countByPredicate(filteredRows, (row) => row.type === 'ih'))} / ${formatCount(
          countByPredicate(filteredRows, (row) => row.type === 'manpower'),
        )}`,
        tone: 'info',
      },
      {
        key: 'top-creator',
        label: 'Top Creator',
        value: topCreator.value,
        sublabel: `${formatCount(topCreator.count)} proposals`,
        tone: 'secondary',
        onClick:
          topCreator.value && topCreator.value !== emptyValue
            ? () => {
                setCreatedByFilter(topCreator.value)
                setShowAdvancedFilters(true)
              }
            : undefined,
      },
    ]
  }, [filteredRows])

  const activeChips = useMemo(
    () =>
      [
        searchTerm.trim() ? { key: 'search', label: `Search: ${searchTerm.trim()}` } : null,
        serviceFilter
          ? { key: 'service', label: `Service: ${proposalTypeMeta[serviceFilter].label}` }
          : null,
        createdByFilter ? { key: 'createdBy', label: `Created By: ${createdByFilter}` } : null,
        yearFilter ? { key: 'year', label: `Year: ${yearFilter}` } : null,
      ].filter(Boolean),
    [createdByFilter, searchTerm, serviceFilter, yearFilter],
  )

  const resetFilters = () => {
    setSearchTerm('')
    setServiceFilter('')
    setCreatedByFilter('')
    setYearFilter('')
  }

  const clearChip = (key) => {
    if (key === 'search') setSearchTerm('')
    if (key === 'service') setServiceFilter('')
    if (key === 'createdBy') setCreatedByFilter('')
    if (key === 'year') setYearFilter('')
  }

  const openAttachments = (attachments) => {
    setCurrentAttachments(Array.isArray(attachments) ? attachments : [])
    setShowAttachModal(true)
  }

  const openDetail = (row) => {
    if (!row?.templateId) return
    navigate(getProposalDetailPath(row.type, row.templateId), {
      state: { returnTo: `${location.pathname}${location.search}` },
    })
  }

  const getActions = (row) => [
    {
      key: 'export',
      label: row.type === 'training' || row.type === 'ih' ? 'Export Brochure' : 'Export Proposal',
      onClick: () => window.open(getPdfUrl(row), '_blank'),
    },
    ...(row.type === 'special' && row.attachmentsCount > 0
      ? [
          {
            key: 'attachments',
            label: `View Attachments (${row.attachmentsCount})`,
            onClick: () => openAttachments(row.attachments),
          },
        ]
      : []),
    ...(row.proposalLanguage !== 'ms-MY'
      ? [
          {
            key: 'bm-copy',
            label: row.hasBmCopy ? 'Open BM Proposal' : 'Create BM Copy',
            onClick: () => onCreateBmCopy?.(row.type, row.templateId, row),
          },
        ]
      : []),
    {
      key: 'edit',
      label: 'Edit',
      onClick: () =>
        navigate(getEditUrl(row), {
          state: { returnTo: `${location.pathname}${location.search}` },
        }),
    },
    {
      key: 'delete',
      label: 'Delete',
      danger: true,
      dividerBefore: true,
      onClick: () => onDelete?.(row.type, row.templateId),
    },
  ]

  const renderCell = (row, column) => {
    if (column.key === 'description' || column.key === 'title') {
      return (
        <DataTableTextCell
          value={row[column.key] || emptyValue}
          maxWidth={column.cellMaxWidth || column.width || '220px'}
          title={column.label}
          mode={column.textMode || 'expandable'}
          previewCharThreshold={column.previewCharThreshold}
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
    return row[column.key] || emptyValue
  }

  return (
    <>
      <StatsStrip
        items={statsItems}
        loading={loading}
        scopeLabel={language === 'ms-MY' ? 'BM' : 'ENG'}
      />

      <DataTableRecordControls
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search service, title, code, description, or creator"
        searchAriaLabel="Search proposal records"
        showAdvancedFilters={showAdvancedFilters}
        setShowAdvancedFilters={setShowAdvancedFilters}
        activeFilterCount={getAdvancedFilterCount(activeChips)}
        activeChips={activeChips}
        clearChip={clearChip}
        resetFilters={resetFilters}
        loading={loading}
        desktopToolsId={desktopToolsId}
        mobileToolsId={mobileToolsId}
      >
        <CCol xs={12} md={4} lg={3}>
          <CFormLabel htmlFor="proposal-service-filter">Service</CFormLabel>
          <CFormSelect
            id="proposal-service-filter"
            value={serviceFilter}
            onChange={(event) => setServiceFilter(event.target.value)}
          >
            <option value="">All services</option>
            {PROPOSAL_TYPES.map((type) => (
              <option key={type} value={type}>
                {proposalTypeMeta[type].label}
              </option>
            ))}
          </CFormSelect>
        </CCol>
        <CCol xs={12} md={4} lg={3}>
          <CFormLabel htmlFor="proposal-created-by-filter">Created By</CFormLabel>
          <CFormSelect
            id="proposal-created-by-filter"
            value={createdByFilter}
            onChange={(event) => setCreatedByFilter(event.target.value)}
          >
            <option value="">All creators</option>
            {createdByOptions.map((creator) => (
              <option key={creator} value={creator}>
                {creator}
              </option>
            ))}
          </CFormSelect>
        </CCol>
        <CCol xs={12} md={4} lg={3}>
          <CFormLabel htmlFor="proposal-year-filter">Year</CFormLabel>
          <CFormSelect
            id="proposal-year-filter"
            value={yearFilter}
            onChange={(event) => setYearFilter(event.target.value)}
          >
            <option value="">All years</option>
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </CFormSelect>
        </CCol>
      </DataTableRecordControls>

      <DataTableRecordList
        rows={filteredRows}
        dataColumns={dataColumns}
        defaultVisibleColumns={defaultVisibleColumns}
        requiredColumns={requiredColumns}
        storageKey="templates.proposals.all.visible-columns.v1"
        idPrefix="proposal-record"
        emptyMessage={rows.length ? 'No matching records.' : 'No records to display.'}
        exportFilename={`proposal-records-${new Date().toISOString().slice(0, 10)}.csv`}
        loading={loading}
        loadingMessage="Loading proposal records..."
        showDesktopSummary={false}
        desktopUtilityPlacement="portal"
        desktopUtilityPortalId={desktopToolsId}
        mobileUtilityPlacement="portal"
        mobileUtilityPortalId={mobileToolsId}
        showMobileUtilityRow={false}
        getRowKey={(row, index) => `${row.type}-${row.templateId || index}`}
        renderCell={renderCell}
        getActions={getActions}
        onRowOpen={openDetail}
        getRowOpenDisabled={(row) => !row?.templateId}
        getMobileTitle={(row) => row.title}
        getMobileSubtitle={(row) =>
          [
            row.service,
            row.code !== emptyValue ? row.code : '',
            row.proposalLanguage === 'ms-MY' ? 'BM' : row.hasBmCopy ? 'ENG | BM' : 'ENG',
          ]
            .filter(Boolean)
            .join(' | ')
        }
        getMobileMeta={(row) => [row.dateCreated, row.createdBy].filter(Boolean).join(' | ')}
        initialSortField="dateCreated"
        initialSortDir="desc"
        initialSortDirByField={{ dateCreated: 'desc' }}
        getSortValue={(row, field) => (field === 'dateCreated' ? row.dateCreatedRaw : row[field])}
        resetDeps={[filteredRows, searchTerm, serviceFilter, createdByFilter, yearFilter]}
        actionColumnWidth="56px"
      />

      <AttachmentsModal
        visible={showAttachModal}
        attachments={currentAttachments}
        onClose={() => setShowAttachModal(false)}
      />
    </>
  )
}

export default AllProposalsTable
