import React, { useState } from 'react'
import { CBadge, CButton, CButtonGroup } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowRight, cilCheckCircle, cilWarning } from '@coreui/icons'
import { formatDisplayDate, formatWeekLabel, getWeekEnd } from './taskWeekUtils'

const sectionConfig = {
  achievements: {
    title: 'Achievements',
    color: 'success',
    icon: cilCheckCircle,
    empty: 'No achievements recorded for this week.',
  },
  hiccups: {
    title: 'Hiccups',
    color: 'warning',
    icon: cilWarning,
    empty: 'No hiccups reported for this week.',
  },
  nextWeek: {
    title: 'Next Week',
    color: 'primary',
    icon: cilArrowRight,
    empty: 'No tasks were carried or planned into next week.',
  },
}

const compactWeekLabel = (weekStart) =>
  `${formatDisplayDate(weekStart, { day: 'numeric', month: 'short' })}–${formatDisplayDate(
    getWeekEnd(weekStart),
    { day: 'numeric', month: 'short' },
  )}`

const WeeklySummarySection = ({ sectionKey, summary, management, onOpenTask }) => {
  const config = sectionConfig[sectionKey]
  const items = summary?.[sectionKey] || []

  return (
    <section className="mb-4" aria-label={config.title}>
      <div
        className={`border-start border-4 border-${config.color} ps-2 mb-2 d-flex align-items-center gap-2`}
      >
        <CIcon icon={config.icon} className={`text-${config.color}`} />
        <h3 className="h6 mb-0">{config.title}</h3>
        <CBadge color={config.color} className="ms-auto">
          {items.length}
        </CBadge>
      </div>
      {items.length === 0 ? (
        <div className="small text-body-secondary px-1 py-2">{config.empty}</div>
      ) : (
        <div className="border rounded overflow-hidden">
          {items.map((item) => (
            <button
              key={item.taskId}
              type="button"
              className="btn btn-link text-start text-decoration-none text-body w-100 rounded-0 border-0 border-bottom p-3"
              onClick={() => onOpenTask?.(item)}
            >
              <div className="d-flex flex-wrap align-items-center gap-2">
                <span className="fw-semibold text-break">{item.taskTitle || '-'}</span>
                {item.projectName ? <CBadge color="secondary">{item.projectName}</CBadge> : null}
              </div>
              {management ? (
                <div className="small text-body-secondary mt-1">
                  {[item.staffCode, item.staffName].filter(Boolean).join(' - ')}
                </div>
              ) : null}
              <div className="mt-2 d-grid gap-1">
                {(item.events || []).map((event, index) => (
                  <div key={`${event.type}-${event.activityDate}-${index}`} className="small">
                    <span style={{ whiteSpace: 'pre-wrap' }}>{event.text}</span>
                    <span className="text-body-secondary ms-2">
                      {formatDisplayDate(event.activityDate)}
                    </span>
                  </div>
                ))}
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

const WeekColumn = ({ label, summary, management, onOpenTask }) => (
  <div>
    <h2 className="h6 mb-3">{label}</h2>
    {Object.keys(sectionConfig).map((sectionKey) => (
      <WeeklySummarySection
        key={sectionKey}
        sectionKey={sectionKey}
        summary={summary}
        management={management}
        onOpenTask={onOpenTask}
      />
    ))}
  </div>
)

const WeeklyComparisonGrid = ({
  previousSummary,
  previousWeekStart,
  selectedSummary,
  selectedWeekStart,
  management = false,
  onOpenTask,
}) => {
  const [mobileWeek, setMobileWeek] = useState('selected')
  const previousLabel = formatWeekLabel(previousWeekStart)
  const selectedLabel = formatWeekLabel(selectedWeekStart)

  return (
    <section aria-label="Two week task comparison">
      <div className="row g-4 d-none d-lg-flex">
        <div className="col-lg-6">
          <WeekColumn
            label={previousLabel}
            summary={previousSummary}
            management={management}
            onOpenTask={onOpenTask}
          />
        </div>
        <div className="col-lg-6">
          <WeekColumn
            label={selectedLabel}
            summary={selectedSummary}
            management={management}
            onOpenTask={onOpenTask}
          />
        </div>
      </div>

      <div className="d-lg-none">
        <CButtonGroup className="w-100 mb-3" aria-label="Comparison week display">
          <CButton
            color={mobileWeek === 'previous' ? 'primary' : 'secondary'}
            variant={mobileWeek === 'previous' ? undefined : 'outline'}
            aria-pressed={mobileWeek === 'previous'}
            onClick={() => setMobileWeek('previous')}
          >
            {compactWeekLabel(previousWeekStart)}
          </CButton>
          <CButton
            color={mobileWeek === 'selected' ? 'primary' : 'secondary'}
            variant={mobileWeek === 'selected' ? undefined : 'outline'}
            aria-pressed={mobileWeek === 'selected'}
            onClick={() => setMobileWeek('selected')}
          >
            {compactWeekLabel(selectedWeekStart)}
          </CButton>
        </CButtonGroup>
        <WeekColumn
          label={mobileWeek === 'previous' ? previousLabel : selectedLabel}
          summary={mobileWeek === 'previous' ? previousSummary : selectedSummary}
          management={management}
          onOpenTask={onOpenTask}
        />
      </div>
    </section>
  )
}

export default WeeklyComparisonGrid
