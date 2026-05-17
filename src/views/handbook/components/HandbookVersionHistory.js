import React, { useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { CBadge, CButton, CCol, CTooltip } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilReload } from '@coreui/icons'
import { useNavigate } from 'react-router-dom'
import {
  DataTableFilterPanel,
  DataTableRecordList,
  DataTableToolbar,
  getAdvancedFilterCount,
} from '../../../components/datatable'
import { useDebouncedSearch } from '../../../hooks/datatable'
import { recordsTruncateStyle } from '../../../utils/datatable/tableFormatters'
import dialog from '../../../components/dialog/dialogService'
import { getHandbookVersions, reactivateHandbookVersion } from '../api/handbookApi'

const emptyValue = 'N/A'
const desktopUtilityPortalId = 'handbook-version-history-utilities'
const mobileUtilityPortalId = 'handbook-version-history-mobile-utilities'
const versionColumnStorageKey = 'handbook-version-history-visible-columns'

const versionDataColumns = [
  { key: 'version', label: 'Version', sortable: true, width: '10rem', shrinkToFit: true },
  { key: 'current', label: 'Current', sortable: true, width: '8rem', shrinkToFit: true },
  { key: 'publishedAt', label: 'Published At', sortable: true, width: '12rem', sortType: 'date' },
  { key: 'publishedBy', label: 'Published By', sortable: true, width: '11rem' },
  {
    key: 'signatureCount',
    label: 'Signatures',
    sortable: true,
    width: '8rem',
    align: 'center',
    sortType: 'number',
    shrinkToFit: true,
  },
  {
    key: 'changeSummary',
    label: 'Summary',
    sortable: true,
    width: '18rem',
    previewCharThreshold: 80,
    truncateCharThreshold: 120,
  },
]

const defaultVersionVisibleColumns = {
  version: true,
  current: true,
  publishedAt: true,
  publishedBy: true,
  signatureCount: true,
  changeSummary: true,
}

const requiredVersionColumns = new Set(['version', 'current'])

const formatDateTime = (value) => {
  if (!value) return emptyValue

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? emptyValue : date.toLocaleString()
}

const HandbookVersionHistory = ({ refreshKey = 0 }) => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [versions, setVersions] = useState([])
  const [error, setError] = useState(null)
  const [reactivatingId, setReactivatingId] = useState(null)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const { searchInput, setSearchInput, searchTerm, setSearchTerm } = useDebouncedSearch()

  const loadVersions = React.useCallback(async ({ signal } = {}) => {
    setLoading(true)
    setError(null)

    try {
      const json = await getHandbookVersions({ signal })

      if (json.success) {
        setVersions(Array.isArray(json.data) ? json.data : [])
      } else {
        setVersions([])
        setError(json.message)
      }
    } catch (err) {
      if (err.name === 'AbortError') return

      setVersions([])
      setError('Network error')
    } finally {
      if (!signal?.aborted) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    loadVersions({ signal: controller.signal })

    return () => controller.abort()
  }, [loadVersions, refreshKey])

  const normalizedVersions = useMemo(
    () =>
      versions.map((version) => ({
        ...version,
        id: Number(version.id),
        version: version.version_label || emptyValue,
        current: version.is_current ? 'Current' : 'Historical',
        isCurrent: version.is_current === true,
        publishedAt: version.published_at || '',
        publishedAtDisplay: formatDateTime(version.published_at),
        publishedBy: version.published_by_name_code || emptyValue,
        signatureCount: Number(version.signature_count || 0),
        changeSummary: version.change_summary || emptyValue,
      })),
    [versions],
  )

  const filteredVersions = useMemo(() => {
    const needle = searchTerm.toLowerCase()
    if (!needle) return normalizedVersions

    return normalizedVersions.filter((version) =>
      [
        version.version,
        version.current,
        version.publishedAtDisplay,
        version.publishedBy,
        version.signatureCount,
        version.changeSummary,
      ]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    )
  }, [normalizedVersions, searchTerm])

  const activeChips = [
    searchTerm ? { key: 'search', label: `Search: ${searchTerm}` } : null,
  ].filter(Boolean)

  const resetFilters = () => {
    setSearchInput('')
    setSearchTerm('')
  }

  const clearChip = (key) => {
    if (key === 'search') {
      setSearchInput('')
      setSearchTerm('')
    }
  }

  const reactivateVersion = async (version) => {
    if (!version || version.isCurrent || reactivatingId) return

    const confirmed = await dialog.confirm(
      `Reactivate ${version.version} as the current handbook version? Existing signatures for this version will count as current again.`,
    )
    if (!confirmed) return

    const summary = await dialog.prompt('Summarize why this handbook version is being restored.', {
      title: 'Reactivate Handbook Version',
      multiline: true,
      required: true,
      defaultValue: `Reactivated ${version.version}.`,
      confirmText: 'Reactivate',
    })
    if (summary === null) return

    const trimmedSummary = summary.trim()
    if (!trimmedSummary) {
      dialog.alert('Rollback summary is required.')
      return
    }

    setReactivatingId(version.id)
    try {
      const json = await reactivateHandbookVersion({
        versionId: version.id,
        changeSummary: trimmedSummary,
      })

      if (json.success) {
        dialog.alert(json.message || 'Handbook version reactivated.')
        await loadVersions()
      } else {
        dialog.alert(json.message || 'Failed to reactivate handbook version.')
      }
    } catch (err) {
      console.error(err)
      dialog.alert('An unexpected error occurred.')
    } finally {
      setReactivatingId(null)
    }
  }

  const getActions = (version) => [
    {
      key: 'view',
      label: 'View',
      onClick: () => navigate(`/handbook/versions/${version.id}`),
    },
    {
      key: 'reactivate',
      label: reactivatingId === version.id ? 'Reactivating...' : 'Reactivate',
      onClick: () => reactivateVersion(version),
      hidden: version.isCurrent,
      disabled: Boolean(reactivatingId),
      dividerBefore: true,
    },
  ]

  const renderCell = (version, column) => {
    if (column.key === 'current') {
      return (
        <CBadge color={version.isCurrent ? 'success' : 'secondary'} shape="rounded-pill">
          {version.current}
        </CBadge>
      )
    }
    if (column.key === 'publishedAt') return version.publishedAtDisplay
    if (column.key === 'signatureCount') return version.signatureCount

    return (
      <span title={version[column.key]} style={recordsTruncateStyle}>
        {version[column.key]}
      </span>
    )
  }

  return (
    <>
      <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-3">
        <strong>Handbook Version History</strong>
        <div className="d-flex gap-2 flex-wrap">
          <CButton
            color="secondary"
            variant="outline"
            size="sm"
            onClick={() => navigate('/handbook/change-log')}
          >
            Change Log
          </CButton>
          <CButton
            color="secondary"
            variant="outline"
            size="sm"
            onClick={() => navigate('/handbook')}
          >
            Back to Handbook
          </CButton>
        </div>
      </div>

      {error && <p className="text-danger">{error}</p>}
      {!error && (
        <>
          <DataTableToolbar
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            showAdvancedFilters={showAdvancedFilters}
            setShowAdvancedFilters={setShowAdvancedFilters}
            activeFilterCount={getAdvancedFilterCount(activeChips)}
            onResetFilters={resetFilters}
            renderQuickFilters={() => (
              <div
                id={desktopUtilityPortalId}
                className="handbook-version-history-utilities d-none d-lg-flex gap-2"
              />
            )}
          />

          <DataTableFilterPanel
            visible={showAdvancedFilters}
            activeChips={activeChips}
            clearChip={clearChip}
            resetFilters={resetFilters}
            renderMobileActions={() => (
              <CCol xs={12} className="d-flex d-lg-none justify-content-end gap-2">
                <CTooltip content="Reset filters" placement="top">
                  <CButton
                    size="sm"
                    color="secondary"
                    variant="outline"
                    aria-label="Reset filters"
                    onClick={resetFilters}
                    className="records-filter-icon-btn"
                  >
                    <CIcon icon={cilReload} />
                  </CButton>
                </CTooltip>
                <div id={mobileUtilityPortalId} className="d-flex gap-2" />
              </CCol>
            )}
          />

          <DataTableRecordList
            rows={filteredVersions}
            loading={loading}
            loadingMessage="Loading handbook versions..."
            dataColumns={versionDataColumns}
            defaultVisibleColumns={defaultVersionVisibleColumns}
            requiredColumns={requiredVersionColumns}
            storageKey={versionColumnStorageKey}
            idPrefix="handbook-version-history"
            exportFilename={`handbook-version-history-${new Date().toISOString().slice(0, 10)}.csv`}
            getRowKey={(version) => version.id}
            renderCell={renderCell}
            emptyMessage={versions.length === 0 ? 'No versions found.' : 'No matching versions.'}
            initialSortField="publishedAt"
            initialSortDir="desc"
            initialSortDirByField={{ publishedAt: 'desc' }}
            getSortValue={(version, field) =>
              field === 'publishedAt' ? version.publishedAt : version[field]
            }
            className="handbook-version-history-table"
            desktopUtilityPlacement="portal"
            desktopUtilityPortalId={desktopUtilityPortalId}
            mobileUtilityPlacement="portal"
            mobileUtilityPortalId={mobileUtilityPortalId}
            showMobileUtilityRow={false}
            showDesktopSummary={false}
            resetDeps={[searchTerm, versions.length]}
            getActions={getActions}
            onRowOpen={(version) => navigate(`/handbook/versions/${version.id}`)}
            getMobileTitle={(version) => version.version}
            getMobileSubtitle={(version) => version.current}
            mobileRecord={{
              title: (version) => version.version,
              subtitle: (version) => version.current,
              meta: (version) => version.publishedAtDisplay,
              badges: (version) => [
                {
                  key: 'signatures',
                  label: `${version.signatureCount} signature${
                    version.signatureCount === 1 ? '' : 's'
                  }`,
                  tone: version.isCurrent ? 'success' : 'secondary',
                },
              ],
              kv: (version) => [
                { key: 'publishedBy', label: 'Published By', value: version.publishedBy },
                { key: 'summary', label: 'Summary', value: version.changeSummary },
              ],
            }}
          />
        </>
      )}
    </>
  )
}

HandbookVersionHistory.propTypes = {
  refreshKey: PropTypes.number,
}

export default HandbookVersionHistory
