import React, { useEffect, useMemo, useState } from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CButtonGroup,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CDropdown,
  CDropdownDivider,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CRow,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowRight, cilCheckCircle, cilWarning } from '@coreui/icons'
import { getWeeklySummary } from './taskUpdateApi'
import {
  formatDateOnly,
  formatDisplayDate,
  formatWeekLabel,
  getRecentWeekOptions,
  getWeekStart,
  shiftWeekStart,
} from './taskWeekUtils'
import WeeklyComparisonGrid from './WeeklyComparisonGrid'

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

const emptySummary = { achievements: [], hiccups: [], nextWeek: [] }
const normalizeSummary = (data) => ({
  achievements: Array.isArray(data?.achievements) ? data.achievements : [],
  hiccups: Array.isArray(data?.hiccups) ? data.hiccups : [],
  nextWeek: Array.isArray(data?.nextWeek) ? data.nextWeek : [],
})

const WeeklyTaskSummary = ({
  embedded = false,
  management = false,
  staffOptions = [],
  headerActions,
  onOpenTask,
  reviewState,
  onReviewChange,
}) => {
  const currentWeek = getWeekStart()
  const [localReview, setLocalReview] = useState({
    weekStart: currentWeek,
    staffId: 'all',
    compareEnabled: false,
    compareWeekStart: shiftWeekStart(currentWeek, -1),
  })
  const [summary, setSummary] = useState(emptySummary)
  const [comparisonSummary, setComparisonSummary] = useState(emptySummary)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const activeReview = reviewState || localReview
  const { weekStart, staffId, compareEnabled, compareWeekStart } = activeReview
  const canCompare = management && staffId !== 'all'
  const showComparison = canCompare && compareEnabled
  const recentWeekOptions = useMemo(() => getRecentWeekOptions(new Date(), 8), [])

  useEffect(() => {
    if (reviewState) setLocalReview(reviewState)
  }, [reviewState])

  const updateReview = (changes) => {
    const next = { ...activeReview, ...changes }
    if (next.staffId === 'all') next.compareEnabled = false
    if (next.compareWeekStart >= next.weekStart)
      next.compareWeekStart = shiftWeekStart(next.weekStart, -1)
    if (!reviewState) setLocalReview(next)
    onReviewChange?.(next)
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    const selectedRequest = getWeeklySummary({ weekStart, staffId: management ? staffId : '' })
    const comparisonRequest = showComparison
      ? getWeeklySummary({ weekStart: compareWeekStart, staffId })
      : Promise.resolve(null)

    Promise.all([selectedRequest, comparisonRequest])
      .then(([selectedData, comparisonData]) => {
        if (!active) return
        if (selectedData.status !== 'success')
          throw new Error(selectedData.message || 'Unable to load weekly summary.')
        if (comparisonData && comparisonData.status !== 'success') {
          throw new Error(comparisonData.message || 'Unable to load comparison week.')
        }
        setSummary(normalizeSummary(selectedData))
        setComparisonSummary(normalizeSummary(comparisonData))
      })
      .catch((err) => {
        if (active) setError(err?.message || 'Unable to load weekly summary.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [compareWeekStart, management, showComparison, staffId, weekStart])

  const staffSelectOptions = useMemo(
    () =>
      [...staffOptions]
        .filter((option) => option?.value && option?.label)
        .sort((a, b) => a.label.localeCompare(b.label)),
    [staffOptions],
  )
  const renderSection = (key) => {
    const config = sectionConfig[key]
    const items = summary[key] || []
    return (
      <section className="mb-4" aria-labelledby={`weekly-summary-${key}`}>
        <div
          className={`border-start border-4 border-${config.color} ps-2 mb-2 d-flex align-items-center gap-2`}
        >
          <CIcon icon={config.icon} className={`text-${config.color}`} />
          <h2 id={`weekly-summary-${key}`} className="h6 mb-0">
            {config.title}
          </h2>
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

  const content = (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <div className="d-flex flex-wrap align-items-center gap-2">
          {management ? (
            <CFormSelect
              aria-label="Filter weekly summary by staff"
              size="sm"
              value={staffId}
              style={{ minWidth: '190px', width: '220px' }}
              onChange={(event) => updateReview({ staffId: event.target.value })}
            >
              <option value="all">All Staff</option>
              {staffSelectOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </CFormSelect>
          ) : null}
        </div>
        <div className="d-flex flex-wrap align-items-center gap-2">
          <CButtonGroup aria-label="Quick weekly summary periods">
            {[0, -1].map((offset) => {
              const value = shiftWeekStart(currentWeek, offset)
              const label = offset === 0 ? 'This Week' : offset === -1 ? 'Last Week' : '2 Weeks Ago'
              const active = !showComparison && weekStart === value
              return (
                <CButton
                  key={value}
                  size="sm"
                  color={active ? 'primary' : 'secondary'}
                  variant={active ? undefined : 'outline'}
                  aria-pressed={active}
                  onClick={() => updateReview({ weekStart: value, compareEnabled: false })}
                >
                  {label}
                </CButton>
              )
            })}
            {management ? (
              <CButton
                size="sm"
                color={showComparison ? 'primary' : 'secondary'}
                variant={showComparison ? undefined : 'outline'}
                aria-pressed={showComparison}
                disabled={!canCompare}
                title={
                  canCompare
                    ? 'Show the selected week beside the immediately preceding week.'
                    : 'Select one staff member to view two weeks side by side.'
                }
                onClick={() =>
                  updateReview({
                    compareEnabled: true,
                    compareWeekStart: shiftWeekStart(weekStart, -1),
                  })
                }
              >
                2 Week View
              </CButton>
            ) : null}
          </CButtonGroup>
          <CDropdown>
            <CDropdownToggle size="sm" color="secondary" variant="outline">
              More
            </CDropdownToggle>
            <CDropdownMenu>
              {recentWeekOptions.slice(3).map((option, index) => (
                <CDropdownItem
                  key={option.value}
                  onClick={() => updateReview({ weekStart: option.value, compareEnabled: false })}
                >
                  {index + 3} Weeks Ago
                </CDropdownItem>
              ))}
              <CDropdownDivider />
              <div className="px-3 py-2">
                <CFormLabel htmlFor="weekly-summary-week-picker" className="small">
                  Choose week
                </CFormLabel>
                <CFormInput
                  id="weekly-summary-week-picker"
                  type="date"
                  max={formatDateOnly(new Date())}
                  value={weekStart}
                  onChange={(event) => {
                    const value = getWeekStart(event.target.value)
                    if (value) updateReview({ weekStart: value, compareEnabled: false })
                  }}
                />
              </div>
            </CDropdownMenu>
          </CDropdown>
          {management && !canCompare ? (
            <div className="small text-body-secondary w-100 text-end" role="status">
              Select one staff member to compare two weeks.
            </div>
          ) : null}
        </div>
      </div>

      {error ? <CAlert color="danger">{error}</CAlert> : null}
      {loading ? (
        <div className="d-flex align-items-center gap-2 text-body-secondary py-4">
          <CSpinner size="sm" /> Loading weekly summary...
        </div>
      ) : showComparison ? (
        <WeeklyComparisonGrid
          previousSummary={comparisonSummary}
          previousWeekStart={compareWeekStart}
          selectedSummary={summary}
          selectedWeekStart={weekStart}
          management={management}
          onOpenTask={onOpenTask}
        />
      ) : (
        <CRow>
          <CCol xs={12}>{renderSection('achievements')}</CCol>
          <CCol xs={12}>{renderSection('hiccups')}</CCol>
          <CCol xs={12}>{renderSection('nextWeek')}</CCol>
        </CRow>
      )}
    </>
  )

  if (embedded) return <CCardBody>{content}</CCardBody>

  return (
    <CCard>
      <CCardHeader className="d-flex flex-wrap align-items-start justify-content-between gap-2">
        <div>
          <h1 className="h5 mb-1">Weekly Summary</h1>
          <div className="small text-body-secondary">{formatWeekLabel(weekStart)}</div>
        </div>
        {headerActions ? <div className="d-flex flex-wrap gap-2">{headerActions}</div> : null}
      </CCardHeader>
      <CCardBody>{content}</CCardBody>
    </CCard>
  )
}

export default WeeklyTaskSummary
