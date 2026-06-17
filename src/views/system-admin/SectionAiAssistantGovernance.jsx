import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CButtonGroup,
  CCard,
  CCardBody,
  CCardHeader,
  CFormInput,
  CFormSelect,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalHeader,
  CModalTitle,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import { apiJson } from '../../api/apiClient'
import { apiUrl } from '../../api/apiUrl'
import { showToast } from '../../components/toast/toastService'
import SummaryTile from './schema-sync/SummaryTile'

const views = [
  { key: 'feedback', label: 'Feedback' },
  { key: 'cache', label: 'Cache' },
  { key: 'provider-memory', label: 'Provider Memory' },
  { key: 'source-gaps', label: 'Source Gaps' },
]

const safeArray = (value) => (Array.isArray(value) ? value : [])

const formatDate = (value) => {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '-'
  return parsed.toLocaleString('en-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const shortText = (value, max = 120) => {
  const text = String(value || '').trim()
  return text.length > max ? `${text.slice(0, max)}...` : text || '-'
}

const ratingTone = (rating) =>
  rating === 'helpful' ? 'success' : rating === 'bad' ? 'danger' : 'secondary'

const formatCost = (value) => {
  const cost = value && typeof value === 'object' ? value : {}
  if (!cost.known || cost.amount === null || cost.amount === undefined) return '-'
  return `${cost.currency || 'USD'} ${Number(cost.amount).toFixed(4)}`
}

const aiStatusBreakdown = (overview) => {
  const counts =
    overview?.ai_status_counts && typeof overview.ai_status_counts === 'object'
      ? overview.ai_status_counts
      : {}
  return [
    ['usage_limit', 'Usage limit'],
    ['rate_limit', 'Rate limit'],
    ['not_configured', 'Not configured'],
    ['temporary_unavailable', 'Temporary unavailable'],
    ['generation_failed', 'Generation failed'],
    ['source_fallback', 'Source fallback'],
  ]
    .map(([key, label]) => ({
      key,
      label,
      value: counts[key] ?? overview?.[`${key}_count`] ?? 0,
    }))
    .filter((item) => Number(item.value) > 0)
}

const buildQuery = (filters) => {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value)
  })
  const query = params.toString()
  return query ? `?${query}` : ''
}

const JsonBlock = ({ value }) => (
  <pre className="bg-light border rounded p-2 mb-0 small overflow-auto">
    {JSON.stringify(value || {}, null, 2)}
  </pre>
)

const DiagnosticsSection = ({ title, children }) => (
  <div className="border rounded p-3">
    <strong className="d-block mb-2">{title}</strong>
    {children}
  </div>
)

const renderList = (items, renderItem) => {
  const list = safeArray(items)
  if (list.length === 0) return <span className="text-muted">None</span>
  return (
    <div className="d-flex flex-column gap-2">
      {list.map((item, index) => (
        <div key={`${index}-${JSON.stringify(item).slice(0, 40)}`} className="border rounded p-2">
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  )
}

const SectionAiAssistantGovernance = () => {
  const [overview, setOverview] = useState(null)
  const [activeView, setActiveView] = useState('feedback')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [gapStatus, setGapStatus] = useState({})
  const [gapNotes, setGapNotes] = useState({})
  const [gapPriority, setGapPriority] = useState({})
  const [diagnostics, setDiagnostics] = useState(null)
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false)
  const [diagnosticsError, setDiagnosticsError] = useState('')
  const [filters, setFilters] = useState({
    date_from: '',
    date_to: '',
    provider: '',
    confidence: '',
    answer_mode: '',
    rating: '',
  })

  const loadOverview = useCallback(async () => {
    const payload = await apiJson(
      apiUrl(`admin/assistant/analytics/overview${buildQuery(filters)}`),
      {
        credentials: 'include',
        silentError: true,
      },
    )
    setOverview(payload?.summary || {})
  }, [filters])

  const loadRows = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const endpoint =
        activeView === 'source-gaps'
          ? `admin/assistant/analytics/source-gaps${buildQuery(filters)}`
          : `admin/assistant/${activeView}`
      const payload = await apiJson(apiUrl(endpoint), {
        credentials: 'include',
        silentError: true,
      })
      setRows(safeArray(payload?.data))
    } catch (err) {
      setError(err.message || 'Failed to load assistant governance records.')
    } finally {
      setLoading(false)
    }
  }, [activeView, filters])

  const refreshAll = useCallback(async () => {
    setError('')
    try {
      await Promise.all([loadOverview(), loadRows()])
    } catch (err) {
      setError(err.message || 'Failed to load assistant governance data.')
    }
  }, [loadOverview, loadRows])

  useEffect(() => {
    refreshAll()
  }, [refreshAll])

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return rows
    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(query))
  }, [rows, search])

  const unblockSignature = async (signature) => {
    if (!signature) return
    await apiJson(apiUrl(`admin/assistant/blocked-signatures/${signature}/unblock`), {
      method: 'POST',
      credentials: 'include',
    })
    showToast('Answer signature unblocked.')
    refreshAll()
  }

  const updateGapStatus = async (row) => {
    const next = gapStatus[row.id] || row.status
    const priority = gapPriority[row.id] || row.priority || 'low'
    const notes = Object.prototype.hasOwnProperty.call(gapNotes, row.id)
      ? gapNotes[row.id]
      : row.notes || ''
    await apiJson(apiUrl(`admin/assistant/source-gaps/${row.id}/status`), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next, priority, notes }),
    })
    showToast('Source gap updated.')
    refreshAll()
  }

  const loadDiagnostics = async (row) => {
    const messageId = row.message_id || row.id
    if (!messageId) return
    setDiagnosticsLoading(true)
    setDiagnosticsError('')
    setDiagnostics(null)
    try {
      const payload = await apiJson(apiUrl(`admin/assistant/messages/${messageId}/diagnostics`), {
        credentials: 'include',
        silentError: true,
      })
      setDiagnostics(payload?.data || null)
    } catch (err) {
      setDiagnosticsError(err.message || 'Diagnostics are unavailable for this answer.')
    } finally {
      setDiagnosticsLoading(false)
    }
  }

  const runGapAction = async (row, action) => {
    const notes = Object.prototype.hasOwnProperty.call(gapNotes, row.id)
      ? gapNotes[row.id]
      : row.notes || ''
    const body =
      action === 'promote-provider-backlog' || action === 'create-knowledge-draft'
        ? JSON.stringify({ notes })
        : undefined
    const payload = await apiJson(apiUrl(`admin/assistant/source-gaps/${row.id}/${action}`), {
      method: 'POST',
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body,
    })
    showToast(String(payload?.message || 'Source gap action saved.'))
    refreshAll()
  }

  const renderFeedbackRows = () =>
    filteredRows.map((row) => (
      <CTableRow key={row.id}>
        <CTableDataCell>
          <CBadge color={ratingTone(row.rating)}>{row.rating}</CBadge>
          {row.blocked ? (
            <CBadge color="dark" className="ms-1">
              Blocked
            </CBadge>
          ) : null}
        </CTableDataCell>
        <CTableDataCell>{shortText(row.question, 160)}</CTableDataCell>
        <CTableDataCell>{shortText(row.answer_excerpt, 180)}</CTableDataCell>
        <CTableDataCell>{safeArray(row.reasons).join(', ') || '-'}</CTableDataCell>
        <CTableDataCell>{row.confidence || '-'}</CTableDataCell>
        <CTableDataCell>{row.answer_mode || '-'}</CTableDataCell>
        <CTableDataCell>{formatDate(row.created_at)}</CTableDataCell>
        <CTableDataCell>
          <CButton
            size="sm"
            color="secondary"
            variant="outline"
            onClick={() => loadDiagnostics(row)}
          >
            Diagnostics
          </CButton>
        </CTableDataCell>
      </CTableRow>
    ))

  const renderCacheRows = () =>
    filteredRows.map((row) => (
      <CTableRow key={`${row.mode}-${row.id}`}>
        <CTableDataCell>
          <CBadge color={row.mode === 'live' ? 'info' : 'secondary'}>{row.mode}</CBadge>
          {row.blocked ? (
            <CBadge color="dark" className="ms-1">
              Blocked
            </CBadge>
          ) : null}
        </CTableDataCell>
        <CTableDataCell>{shortText(row.normalized_question, 160)}</CTableDataCell>
        <CTableDataCell>{shortText(row.answer_excerpt, 180)}</CTableDataCell>
        <CTableDataCell>{row.hit_count}</CTableDataCell>
        <CTableDataCell>{formatDate(row.refreshed_at || row.updated_at)}</CTableDataCell>
        <CTableDataCell>{formatDate(row.expires_at)}</CTableDataCell>
        <CTableDataCell>
          {row.blocked && row.answer_signature ? (
            <CButton
              size="sm"
              color="secondary"
              variant="outline"
              onClick={() => unblockSignature(row.answer_signature)}
            >
              Unblock
            </CButton>
          ) : (
            '-'
          )}
        </CTableDataCell>
      </CTableRow>
    ))

  const renderProviderRows = () =>
    filteredRows.map((row) => (
      <CTableRow key={row.id}>
        <CTableDataCell>{shortText(row.normalized_question, 180)}</CTableDataCell>
        <CTableDataCell>{row.provider_key}</CTableDataCell>
        <CTableDataCell>{row.source_type}</CTableDataCell>
        <CTableDataCell>{shortText(row.source_slug, 140)}</CTableDataCell>
        <CTableDataCell>{row.positive_count}</CTableDataCell>
        <CTableDataCell>{row.negative_count}</CTableDataCell>
        <CTableDataCell>{formatDate(row.last_feedback_at)}</CTableDataCell>
      </CTableRow>
    ))

  const renderGapRows = () =>
    filteredRows.map((row) => (
      <CTableRow key={row.id}>
        <CTableDataCell>{shortText(row.normalized_intent, 180)}</CTableDataCell>
        <CTableDataCell>{shortText(row.sample_question, 180)}</CTableDataCell>
        <CTableDataCell>{row.current_route || '-'}</CTableDataCell>
        <CTableDataCell>{row.occurrence_count}</CTableDataCell>
        <CTableDataCell>{safeArray(row.provider_keys).join(', ') || '-'}</CTableDataCell>
        <CTableDataCell>{formatDate(row.last_seen_at)}</CTableDataCell>
        <CTableDataCell>
          <div className="d-flex flex-column gap-2" style={{ minWidth: 220 }}>
            <div className="d-flex gap-2">
              <CBadge
                color={
                  row.priority === 'high'
                    ? 'danger'
                    : row.priority === 'medium'
                      ? 'warning'
                      : 'secondary'
                }
              >
                {row.priority || 'low'}
              </CBadge>
              <CBadge color="secondary">{row.status || 'open'}</CBadge>
            </div>
            <CFormSelect
              size="sm"
              value={gapStatus[row.id] || row.status || 'open'}
              onChange={(event) =>
                setGapStatus((current) => ({ ...current, [row.id]: event.target.value }))
              }
            >
              <option value="open">Open</option>
              <option value="planned">Planned</option>
              <option value="resolved">Resolved</option>
              <option value="ignored">Ignored</option>
            </CFormSelect>
            <CFormSelect
              size="sm"
              value={gapPriority[row.id] || row.priority || 'low'}
              onChange={(event) =>
                setGapPriority((current) => ({ ...current, [row.id]: event.target.value }))
              }
            >
              <option value="low">Low priority</option>
              <option value="medium">Medium priority</option>
              <option value="high">High priority</option>
            </CFormSelect>
            <CFormTextarea
              rows={2}
              size="sm"
              value={
                Object.prototype.hasOwnProperty.call(gapNotes, row.id)
                  ? gapNotes[row.id]
                  : row.notes || ''
              }
              placeholder="Notes"
              onChange={(event) =>
                setGapNotes((current) => ({ ...current, [row.id]: event.target.value }))
              }
            />
            <div className="d-flex flex-wrap gap-1">
              <CButton size="sm" color="primary" onClick={() => updateGapStatus(row)}>
                Save
              </CButton>
              <CButton
                size="sm"
                color="secondary"
                variant="outline"
                onClick={() => runGapAction(row, 'promote-provider-backlog')}
              >
                Backlog
              </CButton>
              <CButton
                size="sm"
                color="secondary"
                variant="outline"
                onClick={() => runGapAction(row, 'create-knowledge-draft')}
              >
                Draft
              </CButton>
              <CButton
                size="sm"
                color="secondary"
                variant="outline"
                onClick={() => runGapAction(row, 'ignore')}
              >
                Ignore
              </CButton>
              <CButton
                size="sm"
                color="secondary"
                variant="outline"
                onClick={() => runGapAction(row, 'resolve')}
              >
                Resolve
              </CButton>
            </div>
            {safeArray(row.actions).length > 0 ? (
              <span className="text-muted small">{row.actions.length} action(s)</span>
            ) : null}
          </div>
        </CTableDataCell>
      </CTableRow>
    ))

  const tableHead = {
    feedback: [
      'Rating',
      'Question',
      'Answer',
      'Reasons',
      'Confidence',
      'Mode',
      'Submitted',
      'Diagnostics',
    ],
    cache: ['Mode', 'Question', 'Answer', 'Hits', 'Refreshed', 'Expires', 'Action'],
    'provider-memory': [
      'Question',
      'Provider',
      'Type',
      'Source',
      'Helpful',
      'Bad',
      'Last Feedback',
    ],
    'source-gaps': [
      'Intent',
      'Sample Question',
      'Route',
      'Count',
      'Providers',
      'Last Seen',
      'Status',
    ],
  }[activeView]

  const renderRows = {
    feedback: renderFeedbackRows,
    cache: renderCacheRows,
    'provider-memory': renderProviderRows,
    'source-gaps': renderGapRows,
  }[activeView]

  return (
    <CCard className="mb-4 records-page-card">
      <CCardHeader className="d-flex align-items-center gap-2 flex-wrap records-page-card-header">
        <strong>AI Assistant Governance</strong>
        <CBadge color="secondary" className="rounded-pill">
          Read-only
        </CBadge>
        <CButton
          size="sm"
          color="secondary"
          variant="outline"
          className="ms-auto"
          onClick={refreshAll}
        >
          Refresh
        </CButton>
      </CCardHeader>
      <CCardBody className="records-page-card-body">
        {error ? <CAlert color="danger">{error}</CAlert> : null}

        <div className="row g-2 mb-4">
          <div className="col-6 col-lg-3">
            <SummaryTile
              label="Helpful Rate"
              value={`${overview?.helpful_rate ?? 0}%`}
              color="success"
            />
          </div>
          <div className="col-6 col-lg-3">
            <SummaryTile label="Bad Rate" value={`${overview?.bad_rate ?? 0}%`} color="danger" />
          </div>
          <div className="col-6 col-lg-3">
            <SummaryTile
              label="Low Confidence"
              value={`${overview?.low_confidence_rate ?? 0}%`}
              color="warning"
            />
          </div>
          <div className="col-6 col-lg-3">
            <SummaryTile
              label="No Source"
              value={`${overview?.no_source_rate ?? 0}%`}
              color="secondary"
            />
          </div>
          <div className="col-6 col-lg-3">
            <SummaryTile
              label="Static Cache Hits"
              value={overview?.static_cache_hits ?? 0}
              color="info"
            />
          </div>
          <div className="col-6 col-lg-3">
            <SummaryTile
              label="Live Cache Hits"
              value={overview?.live_cache_hits ?? 0}
              color="info"
            />
          </div>
          <div className="col-6 col-lg-3">
            <SummaryTile
              label="Blocked Answers"
              value={overview?.blocked_signature_count ?? 0}
              color="dark"
            />
          </div>
          <div className="col-6 col-lg-3">
            <SummaryTile
              label="Tokens"
              value={(overview?.input_tokens ?? 0) + (overview?.output_tokens ?? 0)}
              color="secondary"
            />
          </div>
          <div className="col-6 col-lg-3">
            <SummaryTile
              label="Fallback Rate"
              value={`${overview?.validation_fallback_rate ?? 0}%`}
              color="warning"
            />
          </div>
          <div className="col-6 col-lg-3">
            <SummaryTile
              label="High Gaps"
              value={overview?.source_gap_high_count ?? 0}
              color="danger"
            />
          </div>
          <div className="col-6 col-lg-3">
            <SummaryTile
              label="AI Unavailable"
              value={overview?.ai_unavailable_count ?? 0}
              color="warning"
            />
          </div>
          <div className="col-6 col-lg-3">
            <SummaryTile
              label="Usage Limits"
              value={overview?.usage_limit_count ?? 0}
              color="danger"
            />
          </div>
          <div className="col-6 col-lg-3">
            <SummaryTile
              label="Source Fallbacks"
              value={overview?.source_fallback_count ?? 0}
              color="warning"
            />
          </div>
          <div className="col-6 col-lg-3">
            <SummaryTile
              label="Estimated AI Cost"
              value={formatCost(overview?.estimated_cost)}
              color="info"
            />
          </div>
        </div>

        {aiStatusBreakdown(overview).length > 0 ? (
          <div className="d-flex flex-wrap gap-2 mb-3" aria-label="AI availability breakdown">
            {aiStatusBreakdown(overview).map((item) => (
              <CBadge key={item.key} color="secondary" className="px-2 py-1">
                {item.label}: {item.value}
              </CBadge>
            ))}
          </div>
        ) : null}

        <div className="d-flex flex-wrap align-items-end gap-2 mb-3">
          <CFormInput
            type="date"
            size="sm"
            style={{ maxWidth: 170 }}
            value={filters.date_from}
            onChange={(event) =>
              setFilters((current) => ({ ...current, date_from: event.target.value }))
            }
            aria-label="From date"
          />
          <CFormInput
            type="date"
            size="sm"
            style={{ maxWidth: 170 }}
            value={filters.date_to}
            onChange={(event) =>
              setFilters((current) => ({ ...current, date_to: event.target.value }))
            }
            aria-label="To date"
          />
          <CFormInput
            size="sm"
            style={{ maxWidth: 190 }}
            placeholder="Provider"
            value={filters.provider}
            onChange={(event) =>
              setFilters((current) => ({ ...current, provider: event.target.value }))
            }
          />
          <CFormSelect
            size="sm"
            style={{ maxWidth: 150 }}
            value={filters.confidence}
            onChange={(event) =>
              setFilters((current) => ({ ...current, confidence: event.target.value }))
            }
          >
            <option value="">All confidence</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </CFormSelect>
          <CFormSelect
            size="sm"
            style={{ maxWidth: 140 }}
            value={filters.answer_mode}
            onChange={(event) =>
              setFilters((current) => ({ ...current, answer_mode: event.target.value }))
            }
          >
            <option value="">All modes</option>
            <option value="static">Static</option>
            <option value="live">Live</option>
            <option value="mixed">Mixed</option>
          </CFormSelect>
          <CFormSelect
            size="sm"
            style={{ maxWidth: 140 }}
            value={filters.rating}
            onChange={(event) =>
              setFilters((current) => ({ ...current, rating: event.target.value }))
            }
          >
            <option value="">All ratings</option>
            <option value="helpful">Helpful</option>
            <option value="bad">Bad</option>
          </CFormSelect>
          <CButton
            size="sm"
            color="secondary"
            variant="outline"
            onClick={() =>
              setFilters({
                date_from: '',
                date_to: '',
                provider: '',
                confidence: '',
                answer_mode: '',
                rating: '',
              })
            }
          >
            Reset filters
          </CButton>
        </div>

        <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
          <CButtonGroup role="group" aria-label="AI assistant governance views">
            {views.map((view) => (
              <CButton
                key={view.key}
                color={activeView === view.key ? 'primary' : 'secondary'}
                variant={activeView === view.key ? undefined : 'outline'}
                size="sm"
                onClick={() => setActiveView(view.key)}
              >
                {view.label}
              </CButton>
            ))}
          </CButtonGroup>
          <CFormInput
            size="sm"
            className="ms-auto"
            style={{ maxWidth: 320 }}
            placeholder="Search current view"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {loading ? (
          <div className="d-flex align-items-center gap-2 py-4">
            <CSpinner size="sm" />
            <span>Loading assistant governance records...</span>
          </div>
        ) : (
          <div className="table-responsive">
            {/* datatable-exempt: compact admin diagnostics layout table */}
            <CTable hover small align="middle">
              <CTableHead>
                <CTableRow>
                  {tableHead.map((label) => (
                    <CTableHeaderCell key={label}>{label}</CTableHeaderCell>
                  ))}
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {filteredRows.length > 0 ? (
                  renderRows()
                ) : (
                  <CTableRow>
                    <CTableDataCell
                      colSpan={tableHead.length}
                      className="text-center text-muted py-4"
                    >
                      No assistant governance records found.
                    </CTableDataCell>
                  </CTableRow>
                )}
              </CTableBody>
            </CTable>
          </div>
        )}

        <CModal
          visible={diagnosticsLoading || diagnosticsError !== '' || diagnostics !== null}
          size="xl"
          onClose={() => {
            setDiagnostics(null)
            setDiagnosticsError('')
            setDiagnosticsLoading(false)
          }}
        >
          <CModalHeader>
            <CModalTitle>Assistant Diagnostics</CModalTitle>
          </CModalHeader>
          <CModalBody>
            {diagnosticsLoading ? (
              <div className="d-flex align-items-center gap-2 py-3">
                <CSpinner size="sm" />
                <span>Loading diagnostics...</span>
              </div>
            ) : diagnosticsError ? (
              <CAlert color="warning" className="mb-0">
                {diagnosticsError}
              </CAlert>
            ) : diagnostics ? (
              <div className="d-flex flex-column gap-3">
                <div className="row g-2">
                  <div className="col-md-6">
                    <strong>Question</strong>
                    <div className="text-muted">{diagnostics.question || '-'}</div>
                  </div>
                  <div className="col-md-6">
                    <strong>Route</strong>
                    <div className="text-muted">{diagnostics.current_route || '-'}</div>
                  </div>
                </div>
                <DiagnosticsSection title="Request Summary">
                  <div className="row g-2 small">
                    <div className="col-md-4">
                      <span className="text-muted">Retrieval</span>
                      <div>{diagnostics.diagnostics?.retrieval_question || '-'}</div>
                    </div>
                    <div className="col-md-4">
                      <span className="text-muted">AI Status</span>
                      <div>{diagnostics.diagnostics?.ai_status || 'ok'}</div>
                    </div>
                    <div className="col-md-4">
                      <span className="text-muted">Failure Stage</span>
                      <div>{diagnostics.diagnostics?.ai_failure_stage || '-'}</div>
                    </div>
                  </div>
                </DiagnosticsSection>
                <DiagnosticsSection title="Planner">
                  <JsonBlock value={diagnostics.diagnostics?.planner || {}} />
                </DiagnosticsSection>
                <DiagnosticsSection title="Providers">
                  {renderList(diagnostics.diagnostics?.providers, (item) => (
                    <div className="small">
                      <div>
                        <strong>{item.provider_key || '-'}</strong>{' '}
                        <CBadge color={item.status === 'ran' ? 'success' : 'secondary'}>
                          {item.status || '-'}
                        </CBadge>
                      </div>
                      <div className="text-muted">
                        Sources: {item.source_count ?? 0} - Mode: {item.answer_mode || '-'} -
                        Quality: {item.context_quality || '-'}
                      </div>
                      {item.reason ? <div className="text-muted">Reason: {item.reason}</div> : null}
                    </div>
                  ))}
                </DiagnosticsSection>
                <DiagnosticsSection title="Selected Sources">
                  {renderList(
                    diagnostics.diagnostics?.score_stages?.after_intent_ranking,
                    (item) => (
                      <div className="small">
                        <div>
                          <strong>{item.title || item.slug || '-'}</strong>
                        </div>
                        <div className="text-muted">
                          {item.source_type || '-'} - Score: {item.score ?? '-'} -{' '}
                          {item.match_reason || '-'}
                        </div>
                        {safeArray(item.score_explanations).length > 0 ? (
                          <div className="mt-1">
                            {safeArray(item.score_explanations).map((reason) => (
                              <CBadge key={reason} color="secondary" className="me-1 mb-1">
                                {reason}
                              </CBadge>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ),
                  )}
                </DiagnosticsSection>
                <DiagnosticsSection title="Suppressed Sources">
                  {renderList(diagnostics.diagnostics?.suppressed_sources, (item) => (
                    <div className="small">
                      <div>
                        <strong>{item.title || item.slug || '-'}</strong>
                      </div>
                      <div className="text-muted">
                        {item.source_type || '-'} - Score: {item.score ?? '-'} - Reason:{' '}
                        {item.suppression_reason || '-'}
                      </div>
                    </div>
                  ))}
                </DiagnosticsSection>
                <DiagnosticsSection title="Denied Retrievals">
                  {renderList(diagnostics.diagnostics?.denied_retrievals, (item) => (
                    <div className="small">
                      <strong>{item.provider_key || '-'}</strong>
                      <div className="text-muted">
                        {item.record_type || '-'} · {item.reason || '-'}
                      </div>
                    </div>
                  ))}
                </DiagnosticsSection>
                <DiagnosticsSection title="Source Gap">
                  <JsonBlock value={diagnostics.diagnostics?.source_gap || {}} />
                </DiagnosticsSection>
                <DiagnosticsSection title="Raw JSON">
                  <JsonBlock value={diagnostics.diagnostics || {}} />
                </DiagnosticsSection>
              </div>
            ) : null}
          </CModalBody>
        </CModal>
      </CCardBody>
    </CCard>
  )
}

export default SectionAiAssistantGovernance
