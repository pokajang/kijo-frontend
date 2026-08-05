import React, { useState } from 'react'
import PropTypes from 'prop-types'
import CIcon from '@coreui/icons-react'
import { cilCheckCircle, cilClock, cilWarning, cilXCircle } from '@coreui/icons'
import { CBadge, CButton } from '@coreui/react'
import {
  formatVendorPaymentWorkflowDate,
  getVendorPaymentStagePeopleLabel,
  getVendorPaymentWorkflowStages,
} from './vendorPaymentWorkflow'

const stateMeta = {
  completed: { color: 'success', icon: cilCheckCircle },
  current: { color: 'primary', icon: cilClock },
  waiting: { color: 'secondary', icon: cilClock },
  returned: { color: 'warning', icon: cilWarning },
  rejected: { color: 'danger', icon: cilXCircle },
}

const getRecipientLabel = (stage) => {
  if (['current', 'waiting'].includes(stage.state)) return 'Assigned to'
  if (stage.stageType === 'review') return 'Configured reviewers'
  if (stage.stageType === 'approval') return 'Configured approvers'
  if (stage.stageType === 'finance') return 'Configured finance personnel'
  return 'Configured personnel'
}

const VendorPaymentWorkflowTimeline = ({
  payment = {},
  stages: suppliedStages,
  className = '',
}) => {
  const [expandedStages, setExpandedStages] = useState({})
  const stages = suppliedStages
    ? getVendorPaymentWorkflowStages({ workflow_flow: { stages: suppliedStages } })
    : getVendorPaymentWorkflowStages(payment)

  if (!stages.length) {
    return <div className="vendor-payment-workflow-empty">Workflow details unavailable.</div>
  }

  const toggleRecipients = (stageKey) => {
    setExpandedStages((current) => ({ ...current, [stageKey]: !current[stageKey] }))
  }

  return (
    <ol
      className={`vendor-payment-workflow-timeline ${className}`.trim()}
      aria-label="Vendor payment workflow"
    >
      {stages.map((stage, index) => {
        const meta = stateMeta[stage.state] || stateMeta.waiting
        const actor = stage.actor?.label
        const completedAt = formatVendorPaymentWorkflowDate(stage.completedAt)
        const isExpanded = Boolean(expandedStages[stage.key])
        const visibleRecipients = isExpanded ? stage.recipients : stage.recipients.slice(0, 3)
        const hiddenRecipientCount = Math.max(0, stage.recipients.length - visibleRecipients.length)

        return (
          <li
            key={stage.key || `${stage.label}-${index}`}
            className="vendor-payment-workflow-stage"
            data-state={stage.state}
          >
            <span className="vendor-payment-workflow-stage__marker" aria-hidden="true">
              <CIcon icon={meta.icon} />
            </span>

            <div className="vendor-payment-workflow-stage__surface">
              <div className="vendor-payment-workflow-stage__header">
                <div>
                  <div className="vendor-payment-workflow-stage__eyebrow">Stage {index + 1}</div>
                  <div className="vendor-payment-workflow-stage__title">{stage.label}</div>
                </div>
                <CBadge color={meta.color} shape="rounded-pill" className="fw-normal">
                  {stage.status}
                </CBadge>
              </div>

              <div className="vendor-payment-workflow-stage__details">
                {actor ? (
                  <div className="vendor-payment-workflow-stage__detail">
                    <span>{getVendorPaymentStagePeopleLabel(stage)}</span>
                    <strong>{actor}</strong>
                    {completedAt && <time dateTime={stage.completedAt}>{completedAt}</time>}
                  </div>
                ) : stage.state === 'completed' ? (
                  <div className="vendor-payment-workflow-stage__detail">
                    <span>Completion record</span>
                    <strong>Historical actor unavailable</strong>
                  </div>
                ) : null}

                {stage.recipients.length > 0 && (
                  <div className="vendor-payment-workflow-stage__detail">
                    <span>{getRecipientLabel(stage)}</span>
                    <div className="vendor-payment-workflow-stage__people">
                      {visibleRecipients.map((person) => (
                        <span
                          key={`${stage.key}-${person.staffId || person.label}`}
                          className="vendor-payment-workflow-person"
                        >
                          {person.label}
                        </span>
                      ))}
                      {(hiddenRecipientCount > 0 || isExpanded) && stage.recipients.length > 3 && (
                        <CButton
                          color="link"
                          size="sm"
                          className="vendor-payment-workflow-stage__people-toggle"
                          onClick={() => toggleRecipients(stage.key)}
                          aria-expanded={isExpanded}
                        >
                          {isExpanded ? 'Show fewer' : `+${hiddenRecipientCount} more`}
                        </CButton>
                      )}
                    </div>
                  </div>
                )}

                {stage.remarks && (
                  <div className="vendor-payment-workflow-stage__remarks">
                    <span>Remarks</span>
                    <p>{stage.remarks}</p>
                  </div>
                )}
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

VendorPaymentWorkflowTimeline.propTypes = {
  payment: PropTypes.object,
  stages: PropTypes.array,
  className: PropTypes.string,
}

export default VendorPaymentWorkflowTimeline
