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
} from './templateProposalUtils'
import { getProposalDetailPath } from '../proposals/proposalTabs'

const createColumns = (type) => [
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
    key: 'serviceCode',
    label: 'Code',
    width: '150px',
    sortable: true,
    sortType: 'string',
    shrinkToFit: true,
    headerClassName: 'text-nowrap',
    cellClassName: 'text-nowrap',
    getExportValue: (row) => row.serviceCode || '-',
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
  ...(type === 'special'
    ? [
        {
          key: 'attachmentsCount',
          label: 'Attachments',
          width: '140px',
          sortable: true,
          sortType: 'number',
          align: 'center',
          shrinkToFit: true,
          getExportValue: (row) => String(row.attachmentsCount || 0),
        },
      ]
    : []),
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
    width: '140px',
    sortable: true,
    sortType: 'string',
    shrinkToFit: true,
    headerClassName: 'text-nowrap',
    cellClassName: 'text-nowrap',
    getExportValue: (row) => row.createdBy || '-',
  },
]

const createDefaultVisibleColumns = (type) => ({
  title: true,
  serviceCode: true,
  proposalLanguage: true,
  description: true,
  ...(type === 'special' ? { attachmentsCount: true } : {}),
  dateCreated: true,
  createdBy: false,
})

const requiredColumns = new Set(['title'])

const getYear = (row) => {
  if (!row.dateCreatedRaw) return ''
  const date = new Date(row.dateCreatedRaw)
  if (Number.isNaN(date.getTime())) return ''
  return String(date.getFullYear())
}

const hasText = (value) => {
  const normalized = stripHtml(value)
  return Boolean(normalized) && normalized !== '-'
}

const getTopCreatorStat = (rows) => {
  const topCreator = getTopGroupByCount(rows, (row) => row.createdBy)
  return {
    key: 'top-creator',
    label: 'Top Creator',
    value: topCreator.value,
    sublabel: `${formatCount(topCreator.count)} templates`,
    tone: 'secondary',
  }
}

const buildStatsItems = (type, rows) => {
  if (type === 'ih') {
    return [
      {
        key: 'templates',
        label: 'IH Templates',
        value: formatCount(rows.length),
        tone: 'primary',
      },
      {
        key: 'with-schedule',
        label: 'With Schedule',
        value: formatCount(countByPredicate(rows, (row) => hasText(row.schedule))),
        tone: 'success',
      },
      {
        key: 'with-reference',
        label: 'With Reference',
        value: formatCount(countByPredicate(rows, (row) => hasText(row.reference))),
        tone: 'info',
      },
      getTopCreatorStat(rows),
    ]
  }

  if (type === 'manpower') {
    return [
      {
        key: 'templates',
        label: 'Manpower Templates',
        value: formatCount(rows.length),
        tone: 'primary',
      },
      {
        key: 'with-deliverables',
        label: 'With Deliverables',
        value: formatCount(countByPredicate(rows, (row) => hasText(row.serviceDeliverables))),
        tone: 'success',
      },
      {
        key: 'with-supplied',
        label: 'With Supplied Deliverables',
        value: formatCount(
          countByPredicate(rows, (row) => hasText(row.suppliedManpowerDeliverables)),
        ),
        tone: 'info',
      },
      getTopCreatorStat(rows),
    ]
  }

  return [
    {
      key: 'templates',
      label: 'Special Templates',
      value: formatCount(rows.length),
      tone: 'primary',
    },
    {
      key: 'with-attachments',
      label: 'With Attachments',
      value: formatCount(countByPredicate(rows, (row) => row.attachmentsCount > 0)),
      tone: 'success',
    },
    {
      key: 'without-attachments',
      label: 'Without Attachments',
      value: formatCount(countByPredicate(rows, (row) => row.attachmentsCount <= 0)),
      tone: 'warning',
    },
    getTopCreatorStat(rows),
  ]
}

const TemplateProposalTable = ({ type, data = [], onDelete, onCreateBmCopy, loading = false }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const config = templateConfigs[type]
  const [searchTerm, setSearchTerm] = useState('')
  const [createdByFilter, setCreatedByFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [showAttachModal, setShowAttachModal] = useState(false)
  const [currentAttachments, setCurrentAttachments] = useState([])
  const desktopToolsId = `${config.idPrefix}-table-tools`
  const mobileToolsId = `${config.idPrefix}-mobile-table-tools`

  const rows = useMemo(
    () => (Array.isArray(data) ? data : []).map((row) => normalizeTemplateRow(row, type)),
    [data, type],
  )
  const dataColumns = useMemo(() => createColumns(type), [type])
  const defaultVisibleColumns = useMemo(() => createDefaultVisibleColumns(type), [type])

  const createdByOptions = useMemo(
    () =>
      Array.from(
        new Set(rows.map((row) => row.createdBy).filter((value) => value && value !== '-')),
      )
        .sort()
        .map((value) => ({ value, label: value })),
    [rows],
  )
  const yearOptions = useMemo(
    () =>
      Array.from(new Set(rows.map(getYear).filter(Boolean)))
        .sort((a, b) => Number(b) - Number(a))
        .map((value) => ({ value, label: value })),
    [rows],
  )

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()

    return rows.filter((row) => {
      const matchesSearch =
        !term ||
        [row.title, row.serviceCode, row.description, row.createdBy]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term))
      const matchesCreator = !createdByFilter || row.createdBy === createdByFilter
      const matchesYear = !yearFilter || getYear(row) === yearFilter
      return matchesSearch && matchesCreator && matchesYear
    })
  }, [createdByFilter, rows, searchTerm, yearFilter])

  const statsItems = useMemo(
    () =>
      buildStatsItems(type, filteredRows).map((item) => {
        if (item.key === 'top-creator' && item.value && item.value !== '-') {
          return {
            ...item,
            onClick: () => {
              setCreatedByFilter(item.value)
              setShowAdvancedFilters(true)
            },
          }
        }
        return item
      }),
    [filteredRows, type],
  )

  const resetFilters = () => {
    setSearchTerm('')
    setCreatedByFilter('')
    setYearFilter('')
  }

  const activeChips = useMemo(() => {
    const chips = []
    if (searchTerm.trim()) chips.push({ key: 'search', label: `Search: ${searchTerm.trim()}` })
    if (createdByFilter) chips.push({ key: 'createdBy', label: `Created By: ${createdByFilter}` })
    if (yearFilter) chips.push({ key: 'year', label: `Year: ${yearFilter}` })
    return chips
  }, [createdByFilter, searchTerm, yearFilter])

  const clearChip = (key) => {
    if (key === 'search') setSearchTerm('')
    if (key === 'createdBy') setCreatedByFilter('')
    if (key === 'year') setYearFilter('')
  }

  const openAttachments = (attachments) => {
    setCurrentAttachments(Array.isArray(attachments) ? attachments : [])
    setShowAttachModal(true)
  }

  const openDetail = (row) => {
    if (!row?.templateId) return
    navigate(getProposalDetailPath(type, row.templateId), {
      state: { returnTo: `${location.pathname}${location.search}` },
    })
  }

  const getActions = (row) => [
    {
      key: 'export',
      label: config.exportLabel,
      onClick: () => window.open(getTemplatePdfUrl(type, row.templateId), '_blank'),
    },
    ...(type === 'special' && row.attachmentsCount > 0
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
            onClick: () => onCreateBmCopy?.(row.templateId, row),
          },
        ]
      : []),
    {
      key: 'edit',
      label: 'Edit',
      onClick: () =>
        navigate(config.editUrl(row.templateId), {
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
    if (column.key === 'attachmentsCount') {
      return row.attachmentsCount > 0 ? (
        <CButton
          color="link"
          size="sm"
          className="p-0"
          onClick={() => openAttachments(row.attachments)}
        >
          View ({row.attachmentsCount})
        </CButton>
      ) : (
        '-'
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
        searchPlaceholder="Search title, code, description, or creator"
        searchAriaLabel={`Search ${config.listTitle.toLowerCase()}`}
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
          <CFormLabel htmlFor={`${config.idPrefix}-creator-filter`}>Created By</CFormLabel>
          <CFormSelect
            id={`${config.idPrefix}-creator-filter`}
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
        <CCol xs={12} md={4} lg={3}>
          <CFormLabel htmlFor={`${config.idPrefix}-year-filter`}>Year</CFormLabel>
          <CFormSelect
            id={`${config.idPrefix}-year-filter`}
            value={yearFilter}
            onChange={(event) => setYearFilter(event.target.value)}
          >
            <option value="">All years</option>
            {yearOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
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
        storageKey={config.storageKey}
        idPrefix={config.idPrefix}
        emptyMessage={rows.length ? 'No matching records.' : 'No records to display.'}
        exportFilename={`${config.filePrefix}-${new Date().toISOString().slice(0, 10)}.csv`}
        loading={loading}
        loadingMessage={`Loading ${config.listTitle.toLowerCase()}...`}
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
            row.serviceCode !== '-' ? row.serviceCode : '',
            row.proposalLanguage === 'ms-MY' ? 'BM' : row.hasBmCopy ? 'ENG | BM' : 'ENG',
            row.createdBy !== '-' ? row.createdBy : '',
          ]
            .filter(Boolean)
            .join(' | ')
        }
        getMobileMeta={(row) => row.dateCreated || '-'}
        getMobileStatus={(row) =>
          type === 'special' && row.attachmentsCount > 0 ? `${row.attachmentsCount} files` : null
        }
        getMobileStatusTone={() => 'secondary'}
        mobileRecord={{
          title: (row) => row.title,
          subtitle: (row) =>
            [
              row.serviceCode !== '-' ? row.serviceCode : '',
              row.proposalLanguage === 'ms-MY' ? 'BM' : row.hasBmCopy ? 'ENG | BM' : 'ENG',
              row.createdBy !== '-' ? row.createdBy : '',
            ]
              .filter(Boolean)
              .join(' | '),
          meta: (row) => row.dateCreated || '-',
          badges: (row) =>
            type === 'special' && row.attachmentsCount > 0
              ? [
                  {
                    key: 'language',
                    label:
                      row.proposalLanguage === 'ms-MY' ? 'BM' : row.hasBmCopy ? 'ENG | BM' : 'ENG',
                    tone: row.proposalLanguage === 'ms-MY' ? 'info' : 'secondary',
                  },
                  {
                    key: 'attachments',
                    label: `${row.attachmentsCount} files`,
                    tone: 'secondary',
                  },
                ]
              : [
                  {
                    key: 'language',
                    label:
                      row.proposalLanguage === 'ms-MY' ? 'BM' : row.hasBmCopy ? 'ENG | BM' : 'ENG',
                    tone: row.proposalLanguage === 'ms-MY' ? 'info' : 'secondary',
                  },
                ],
        }}
        mobileFieldKeys={{
          title: 'title',
          subtitle: ['serviceCode', 'createdBy'],
          meta: 'dateCreated',
          status: 'attachmentsCount',
        }}
        initialSortField="dateCreated"
        initialSortDir="desc"
        initialSortDirByField={{ dateCreated: 'desc', attachmentsCount: 'desc' }}
        getSortValue={(row, field) => (field === 'dateCreated' ? row.dateCreatedRaw : row[field])}
        resetDeps={[filteredRows, searchTerm, createdByFilter, yearFilter]}
        actionColumnWidth="56px"
      />

      {type === 'special' && (
        <AttachmentsModal
          visible={showAttachModal}
          attachments={currentAttachments}
          onClose={() => setShowAttachModal(false)}
        />
      )}
    </>
  )
}

export default TemplateProposalTable
