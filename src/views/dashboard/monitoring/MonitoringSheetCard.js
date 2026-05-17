import React from 'react'
import { CCard, CCardHeader, CCardBody, CRow, CCol } from '@coreui/react'

const MonitoringSheetCard = ({ title, scopeLabel, headerActions, children, tourTarget }) => {
  return (
    <CCard className="mb-4">
      <style>{`
        .monitoring-sheet-table > :not(caption) > * > * {
          border-color: transparent !important;
        }

        .monitoring-table-frame {
          background: var(--app-surface-raised);
          border-radius: 8px;
          overflow: hidden;
        }

        .monitoring-table-frame .monitoring-sheet-table {
          border-collapse: separate;
          border-spacing: 0;
          overflow: hidden;
        }

        .monitoring-table-frame .monitoring-sheet-table thead tr:first-child > *:first-child {
          border-top-left-radius: 8px;
        }

        .monitoring-table-frame .monitoring-sheet-table thead tr:first-child > *:last-child {
          border-top-right-radius: 8px;
        }

        .monitoring-table-frame .monitoring-sheet-table tbody:last-child tr:last-child > *:first-child,
        .monitoring-table-frame .monitoring-sheet-table tfoot tr:last-child > *:first-child {
          border-bottom-left-radius: 8px;
        }

        .monitoring-table-frame .monitoring-sheet-table tbody:last-child tr:last-child > *:last-child,
        .monitoring-table-frame .monitoring-sheet-table tfoot tr:last-child > *:last-child {
          border-bottom-right-radius: 8px;
        }

        .monitoring-sheet-table thead tr:first-child > *:not([rowspan]):not(.monitoring-data-band) {
          border-bottom: 0 !important;
        }

        .monitoring-sheet-table thead tr:first-child > [rowspan],
        .monitoring-sheet-table thead tr:last-child > * {
          border-bottom: 1px solid rgba(255, 255, 255, 0.72) !important;
        }

        .monitoring-sheet-table tbody tr > * {
          border-bottom: 1px solid rgba(255, 255, 255, 0.72) !important;
        }

        .monitoring-sheet-table .monitoring-total-col {
          border-left: 1px solid rgba(255, 255, 255, 0.72) !important;
        }

        .monitoring-sheet-table .monitoring-data-start-col {
          border-left: 1px solid rgba(255, 255, 255, 0.72) !important;
        }

        .monitoring-sheet-table .monitoring-data-band {
          box-shadow: inset 0 -1px 0 rgba(255, 255, 255, 0.72) !important;
        }

        .monitoring-sheet-table .monitoring-week-heading {
          box-shadow: inset 0 -1px 0 rgba(255, 255, 255, 0.72) !important;
        }

        .monitoring-sheet-table tfoot tr > * {
          border-top: 1px solid rgba(255, 255, 255, 0.9) !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.72) !important;
        }

        .monitoring-cell-details-trigger {
          color: inherit;
          font: inherit;
          line-height: inherit;
          min-width: 0;
          text-decoration: underline dotted rgba(88, 86, 214, 0.55);
          text-underline-offset: 3px;
        }

        .monitoring-cell-details-trigger:hover,
        .monitoring-cell-details-trigger:focus {
          color: var(--cui-primary);
          text-decoration-color: var(--cui-primary);
        }

        .monitoring-cell-details-popover {
          --cui-popover-max-width: min(460px, calc(100vw - 48px));
          max-width: min(460px, calc(100vw - 48px)) !important;
          width: min(460px, calc(100vw - 48px));
          z-index: 2100;
        }

        .monitoring-cell-details-popover .popover-body {
          max-height: 320px;
          overflow-y: auto;
          scrollbar-color: var(--app-scrollbar-chrome) transparent;
          scrollbar-width: thin;
        }

        .monitoring-cell-details-popover .popover-body::-webkit-scrollbar {
          width: 6px;
        }

        .monitoring-cell-details-popover .popover-body::-webkit-scrollbar-track {
          background: transparent;
        }

        .monitoring-cell-details-popover .popover-body::-webkit-scrollbar-thumb {
          background-color: var(--app-scrollbar-chrome);
          border-radius: 999px;
        }

        .monitoring-cell-details-row {
          border-bottom: 1px solid var(--app-border-subtle);
          padding: 5px 0 6px;
        }

        .monitoring-cell-details-row:last-child {
          border-bottom: 0;
          padding-bottom: 2px;
        }

        .monitoring-cell-details-stage-row {
          background: var(--app-surface-raised);
          border-bottom: 1px solid var(--app-border-subtle);
          border-top: 1px solid var(--app-border-subtle);
          margin-left: -1rem;
          margin-right: -1rem;
          padding: 6px 1rem;
        }

        .monitoring-cell-details-notes {
          color: var(--app-text-secondary);
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
          overflow: hidden;
        }
      `}</style>
      <CCardHeader data-tour={tourTarget || undefined} className="py-2">
        <CRow className="align-items-center g-2">
          <CCol className="d-flex align-items-center min-w-0">
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <strong>{title}</strong>
              {scopeLabel && <span className="text-muted">{scopeLabel}</span>}
            </div>
          </CCol>
          {headerActions && (
            <CCol xs="auto" className="d-flex align-items-center align-self-center ms-auto">
              <div className="d-flex align-items-center justify-content-end">{headerActions}</div>
            </CCol>
          )}
        </CRow>
      </CCardHeader>
      <CCardBody>{children}</CCardBody>
    </CCard>
  )
}

export default MonitoringSheetCard
