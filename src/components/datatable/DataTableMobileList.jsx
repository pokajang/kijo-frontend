import React from 'react'
import DataTableActionMenu from './DataTableActionMenu'
import EmptyTableState from './EmptyTableState'
import DataTableStatusBadge from './DataTableStatusBadge'

const isGroupRow = (row) => row?.__dataTableGroupRow === true

const DataTableMobileList = ({
  rows = [],
  getRowKey = (row, index) => row?.id || index,
  renderItem,
  pageStart = 0,
  getTitle,
  getSubtitle,
  getMeta,
  getStatus,
  getStatusTone,
  getActions,
  renderActions,
  showTitle = true,
  showSubtitle = true,
  showMeta = true,
  showStatus = true,
  showRowIndex = true,
  emptyMessage = 'No records to display.',
  desktopBreakpoint = 'lg',
  rowProps,
  mobileRecord,
  resetRowIndexOnGroup = false,
}) => (
  <div className={`d-${desktopBreakpoint}-none data-table-mobile-list records-mobile-list`}>
    {rows.length === 0 ? (
      <EmptyTableState message={emptyMessage} />
    ) : (
      (() => {
        let recordIndex = -1
        let groupRecordIndex = -1

        return rows.map((row, index) => {
          if (isGroupRow(row)) {
            groupRecordIndex = -1
            return (
              <div
                key={row.key || `group-${index}`}
                className="data-table-mobile-group-header"
                data-group-row="true"
              >
                {row.label}
              </div>
            )
          }

          recordIndex += 1
          groupRecordIndex += 1
          const displayRowIndex = resetRowIndexOnGroup ? groupRecordIndex : recordIndex
          if (typeof renderItem === 'function') {
            const itemRowProps = rowProps?.(row, recordIndex) || {}
            return (
              <React.Fragment key={getRowKey(row, recordIndex)}>
                {renderItem(row, displayRowIndex, {
                  pageStart,
                  showTitle,
                  showSubtitle,
                  showMeta,
                  showStatus,
                  rowProps: itemRowProps,
                })}
              </React.Fragment>
            )
          }

          const resolveMobileValue = (resolver) =>
            typeof resolver === 'function' ? resolver(row, recordIndex) : resolver
          const structured = mobileRecord && typeof mobileRecord === 'object'
          const status = getStatus?.(row)
          const eyebrow = structured ? resolveMobileValue(mobileRecord.eyebrow) : null
          const badges = structured
            ? resolveMobileValue(mobileRecord.badges) || []
            : status
              ? [
                  {
                    key: 'status',
                    label: status,
                    tone: getStatusTone?.(row) || 'info',
                  },
                ]
              : []
          const title = structured ? resolveMobileValue(mobileRecord.title) : getTitle?.(row)
          const subtitle = structured
            ? resolveMobileValue(mobileRecord.subtitle)
            : getSubtitle?.(row)
          const meta = structured ? resolveMobileValue(mobileRecord.meta) : getMeta?.(row)
          const kv = structured ? resolveMobileValue(mobileRecord.kv) || [] : []
          const summary = structured ? resolveMobileValue(mobileRecord.summary) : null
          const badgePlacement = structured ? mobileRecord.badgePlacement || 'inline' : 'inline'
          const isCompactLayout = structured && mobileRecord.layout === 'compact'
          const actionBadges = badgePlacement === 'actions' ? badges : []
          const inlineBadges = badgePlacement === 'actions' ? [] : badges
          const customActions =
            typeof renderActions === 'function'
              ? renderActions(row, `${getRowKey(row, recordIndex)}-mobile`)
              : null
          const actions = typeof renderActions === 'function' ? [] : getActions?.(row) || []
          const mobileRowProps = rowProps?.(row, recordIndex) || {}
          const { className: mobileRowClassName = '', ...mobileMainProps } = mobileRowProps

          return (
            <div
              key={getRowKey(row, recordIndex)}
              className={`data-table-mobile-item records-mobile-item ${
                isCompactLayout ? 'records-mobile-item--compact' : ''
              } ${mobileRowClassName}`.trim()}
            >
              <div className="records-mobile-item-head">
                <div
                  {...mobileMainProps}
                  className={`records-mobile-item-main text-start ${mobileRowClassName}`.trim()}
                >
                  {eyebrow && <div className="small text-muted text-truncate">{eyebrow}</div>}
                  <div className="d-flex align-items-center gap-2 min-w-0">
                    {showRowIndex && (
                      <span className="records-mobile-row-index text-muted">
                        #{resetRowIndexOnGroup ? displayRowIndex + 1 : pageStart + recordIndex + 1}
                      </span>
                    )}
                    {showTitle && (structured || getTitle) && (
                      <span className="records-mobile-quote-id text-truncate">{title || '-'}</span>
                    )}
                    {showStatus &&
                      inlineBadges.map((badge) => (
                        <DataTableStatusBadge
                          key={badge.key || badge.label}
                          tone={badge.tone || 'info'}
                        >
                          {badge.label}
                        </DataTableStatusBadge>
                      ))}
                  </div>
                  {(!summary || isCompactLayout) &&
                    showSubtitle &&
                    (structured || getSubtitle) &&
                    subtitle && (
                      <div className="records-mobile-subtitle mt-1 text-truncate">{subtitle}</div>
                    )}
                  {(!summary || isCompactLayout) && showMeta && (structured || getMeta) && meta && (
                    <div className="records-mobile-client mt-1">{meta}</div>
                  )}
                </div>
                {isCompactLayout && summary && (
                  <div className="records-mobile-compact-summary">
                    <div className="records-mobile-summary-value">{summary}</div>
                  </div>
                )}
                <div className="records-mobile-head-actions d-flex align-items-start gap-2 ms-2">
                  {showStatus &&
                    actionBadges.map((badge) => (
                      <DataTableStatusBadge
                        key={badge.key || badge.label}
                        tone={badge.tone || 'info'}
                      >
                        {badge.label}
                      </DataTableStatusBadge>
                    ))}
                  {actions.length > 0 && (
                    <DataTableActionMenu
                      record={row}
                      actions={actions}
                      actionKey={`${getRowKey(row, recordIndex)}-mobile`}
                    />
                  )}
                  {customActions}
                </div>
              </div>
              {summary && !isCompactLayout && (
                <div className="records-mobile-item-summary">
                  {showSubtitle && (structured || getSubtitle) && subtitle && (
                    <div className="records-mobile-subtitle">{subtitle}</div>
                  )}
                  <div className="records-mobile-summary-value">{summary}</div>
                </div>
              )}
              {summary && showMeta && (structured || getMeta) && meta && (
                <div className="records-mobile-client mt-1">{meta}</div>
              )}
              {kv.length > 0 && (
                <div className="records-mobile-kv-grid mt-2">
                  {kv.map((item) => (
                    <div key={item.key || item.label} className="records-mobile-kv">
                      <span className="records-mobile-k">{item.label}</span>
                      <span className="records-mobile-v">{item.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })
      })()
    )}
  </div>
)

export default DataTableMobileList
