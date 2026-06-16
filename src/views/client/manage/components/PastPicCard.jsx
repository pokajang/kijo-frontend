import React, { useMemo, useState } from 'react'
import { CCard, CCardHeader, CCardBody, CFormCheck } from '@coreui/react'
import {
  DataTableRecordControls,
  DataTableRecordList,
  DataTableTextCell,
} from '../../../../components/datatable'

const emptyValue = '-'
const columnStorageKey = 'client.manage.past-pics.visible-columns.v3'
const actionColumnWidth = '56px'

const defaultVisibleColumns = {
  fullName: true,
  email: true,
  mobile: true,
  position: false,
}

const requiredColumns = new Set(['fullName'])

const dataColumns = [
  { key: 'fullName', label: 'Full Name', width: '220px', sortable: true, sortType: 'string' },
  { key: 'email', label: 'Email', width: '180px', sortable: true, sortType: 'string' },
  {
    key: 'mobile',
    label: 'Mobile',
    width: '140px',
    sortable: true,
    sortType: 'string',
    shrinkToFit: true,
  },
  { key: 'position', label: 'Position', width: '180px', sortable: true, sortType: 'string' },
]

const renderTruncated = (value) => (
  <DataTableTextCell value={value || emptyValue} maxWidth="180px" title="Past PIC" />
)

const PastPicCard = ({
  showToggle = true,
  showUnassignedPICs,
  onToggle,
  unassignedPICs = [],
  onDeleteUnassignedPic,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  const normalizedPics = useMemo(
    () =>
      unassignedPICs.map((pic) => ({
        ...pic,
        fullName: pic.full_name || emptyValue,
        email: pic.email || emptyValue,
        mobile: pic.mobile_number || emptyValue,
        position: pic.position || emptyValue,
      })),
    [unassignedPICs],
  )

  const filteredPics = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return normalizedPics

    return normalizedPics.filter((pic) =>
      [pic.fullName, pic.email, pic.mobile, pic.position]
        .map((value) => String(value || '').toLowerCase())
        .some((value) => value.includes(term)),
    )
  }, [normalizedPics, searchTerm])

  const activeChips = searchTerm.trim()
    ? [{ key: 'search', label: `Search: ${searchTerm.trim()}` }]
    : []

  const resetFilters = () => setSearchTerm('')

  const clearChip = (key) => {
    if (key === 'search') setSearchTerm('')
  }

  const getActions = (pic) => [
    {
      key: 'delete',
      label: 'Delete',
      danger: true,
      onClick: () => onDeleteUnassignedPic(pic),
    },
  ]

  const renderCell = (pic, column) => renderTruncated(pic[column.key])

  return (
    <CCard>
      <CCardHeader>
        <strong>Past Person In Charge</strong>
      </CCardHeader>
      <CCardBody>
        {showToggle && (
          <CFormCheck
            type="checkbox"
            id="toggleUnassignedPICs"
            label="View past PICs"
            checked={showUnassignedPICs}
            onChange={onToggle}
          />
        )}

        {showUnassignedPICs && (
          <div className={showToggle ? 'mt-3' : ''}>
            <DataTableRecordControls
              searchValue={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder="Search past PIC name, email, mobile, position"
              searchAriaLabel="Search past PICs"
              showAdvancedFilters={showAdvancedFilters}
              setShowAdvancedFilters={setShowAdvancedFilters}
              activeChips={activeChips}
              clearChip={clearChip}
              resetFilters={resetFilters}
              desktopToolsId="client-past-pics-table-tools"
              mobileToolsId="client-past-pics-mobile-table-tools"
            />

            <DataTableRecordList
              className="client-past-pics-table"
              rows={filteredPics}
              dataColumns={dataColumns}
              defaultVisibleColumns={defaultVisibleColumns}
              requiredColumns={requiredColumns}
              storageKey={columnStorageKey}
              scrollStorageKey="client.past-pic.records.scroll"
              idPrefix="client-past-pic-record"
              emptyMessage="No past PICs found."
              exportFilename={`past-pics-${new Date().toISOString().slice(0, 10)}.csv`}
              showDesktopSummary={false}
              desktopUtilityPlacement="portal"
              desktopUtilityPortalId="client-past-pics-table-tools"
              mobileUtilityPlacement="portal"
              mobileUtilityPortalId="client-past-pics-mobile-table-tools"
              showMobileUtilityRow={false}
              actionColumnWidth={actionColumnWidth}
              getRowKey={(pic, index) => pic.pic_id || index}
              renderCell={renderCell}
              getActions={getActions}
              getMobileTitle={(pic) => pic.fullName}
              getMobileSubtitle={(pic) => pic.email}
              getMobileMeta={(pic) =>
                [pic.mobile, pic.position]
                  .filter((value) => value && value !== emptyValue)
                  .join(' | ') || emptyValue
              }
              mobileFieldKeys={{
                title: 'fullName',
                subtitle: 'email',
                meta: ['mobile', 'position'],
              }}
              initialSortField="fullName"
              getSortValue={(pic, field) => pic[field]}
              resetDeps={[searchTerm]}
            />
          </div>
        )}
      </CCardBody>
    </CCard>
  )
}

export default PastPicCard
