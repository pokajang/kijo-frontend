import React, { useId, useState } from 'react'
import { cilChartPie } from '@coreui/icons'
import CIcon from '@coreui/icons-react'
import {
  CButton,
  CFormLabel,
  CFormSwitch,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CTooltip,
} from '@coreui/react'

const DataTableStatsToggle = ({
  visible,
  onToggle,
  controlsVisible = true,
  onControlsToggle,
  className = '',
}) => {
  const statsSwitchId = useId()
  const controlsSwitchId = useId()
  const [settingsVisible, setSettingsVisible] = useState(false)
  const [draftVisible, setDraftVisible] = useState(visible)
  const [draftControlsVisible, setDraftControlsVisible] = useState(controlsVisible)
  const [applyScope, setApplyScope] = useState('page')
  const controlsToggleEnabled = typeof onControlsToggle === 'function'
  const statsHasPendingChange = draftVisible !== visible
  const controlsHasPendingChange = controlsToggleEnabled && draftControlsVisible !== controlsVisible
  const hasPendingChange = statsHasPendingChange || controlsHasPendingChange

  const openSettings = () => {
    setDraftVisible(visible)
    setDraftControlsVisible(controlsVisible)
    setApplyScope('page')
    setSettingsVisible(true)
  }

  const closeSettings = () => {
    setSettingsVisible(false)
  }

  const applyToggle = () => {
    if (!hasPendingChange) return
    setSettingsVisible(false)
    if (statsHasPendingChange && typeof onToggle === 'function') onToggle(applyScope)
    if (controlsHasPendingChange && typeof onControlsToggle === 'function') {
      onControlsToggle(applyScope)
    }
  }

  return (
    <>
      <CTooltip content="Table display" placement="top">
        <CButton
          type="button"
          color="secondary"
          variant="ghost"
          size="sm"
          className={`data-table-stats-toggle ${className}`.trim()}
          aria-label="Table display"
          title="Table display"
          onClick={openSettings}
        >
          <CIcon icon={cilChartPie} />
        </CButton>
      </CTooltip>

      <CModal
        alignment="center"
        className="data-table-display-modal"
        visible={settingsVisible}
        onClose={closeSettings}
      >
        <CModalHeader closeButton>
          <CModalTitle>Table display</CModalTitle>
        </CModalHeader>
        <CModalBody className="data-table-stats-toggle__body">
          <div className="data-table-stats-toggle__settings">
            <div className="data-table-stats-toggle__setting-row">
              <div className="data-table-stats-toggle__setting-copy">
                <CFormLabel
                  htmlFor={statsSwitchId}
                  className="data-table-stats-toggle__setting-label"
                >
                  Statistics row
                </CFormLabel>
                <div className="data-table-stats-toggle__setting-help">
                  Summary cards above the table.
                </div>
              </div>
              <div className="data-table-stats-toggle__state-control">
                <span
                  className={`data-table-stats-toggle__state-label${
                    !draftVisible ? ' data-table-stats-toggle__state-label--active' : ''
                  }`}
                >
                  Hidden
                </span>
                <CFormSwitch
                  id={statsSwitchId}
                  className="data-table-stats-toggle__switch"
                  checked={draftVisible}
                  aria-label="Show statistics"
                  title={draftVisible ? 'Statistics visible' : 'Statistics hidden'}
                  onChange={(event) => setDraftVisible(event.target.checked)}
                />
                <span
                  className={`data-table-stats-toggle__state-label${
                    draftVisible ? ' data-table-stats-toggle__state-label--active' : ''
                  }`}
                >
                  Visible
                </span>
              </div>
            </div>

            {controlsToggleEnabled && (
              <div className="data-table-stats-toggle__setting-row">
                <div className="data-table-stats-toggle__setting-copy">
                  <CFormLabel
                    htmlFor={controlsSwitchId}
                    className="data-table-stats-toggle__setting-label"
                  >
                    Search and filters row
                  </CFormLabel>
                  <div className="data-table-stats-toggle__setting-help">
                    Search, filters, reset, export, and column tools.
                  </div>
                </div>
                <div className="data-table-stats-toggle__state-control">
                  <span
                    className={`data-table-stats-toggle__state-label${
                      !draftControlsVisible ? ' data-table-stats-toggle__state-label--active' : ''
                    }`}
                  >
                    Hidden
                  </span>
                  <CFormSwitch
                    id={controlsSwitchId}
                    className="data-table-stats-toggle__switch"
                    checked={draftControlsVisible}
                    aria-label="Show search and filters row"
                    title={
                      draftControlsVisible
                        ? 'Search and filters row visible'
                        : 'Search and filters row hidden'
                    }
                    onChange={(event) => setDraftControlsVisible(event.target.checked)}
                  />
                  <span
                    className={`data-table-stats-toggle__state-label${
                      draftControlsVisible ? ' data-table-stats-toggle__state-label--active' : ''
                    }`}
                  >
                    Visible
                  </span>
                </div>
              </div>
            )}
          </div>

          <fieldset className="data-table-stats-toggle__scope">
            <CFormLabel as="legend" className="data-table-stats-toggle__scope-label">
              Apply change to
            </CFormLabel>
            <div className="data-table-stats-toggle__scope-options" role="group">
              <CButton
                type="button"
                color={applyScope === 'page' ? 'primary' : 'secondary'}
                variant={applyScope === 'page' ? undefined : 'outline'}
                size="sm"
                aria-pressed={applyScope === 'page'}
                onClick={() => setApplyScope('page')}
              >
                This page
              </CButton>
              <CButton
                type="button"
                color={applyScope === 'systemwide' ? 'primary' : 'secondary'}
                variant={applyScope === 'systemwide' ? undefined : 'outline'}
                size="sm"
                aria-pressed={applyScope === 'systemwide'}
                onClick={() => setApplyScope('systemwide')}
              >
                All data tables
              </CButton>
            </div>
          </fieldset>
        </CModalBody>
        <CModalFooter className="data-table-stats-toggle__footer">
          <CButton color="secondary" variant="outline" size="sm" onClick={closeSettings}>
            Cancel
          </CButton>
          <CButton color="primary" size="sm" disabled={!hasPendingChange} onClick={applyToggle}>
            {hasPendingChange ? 'Apply changes' : 'Apply'}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default DataTableStatsToggle
