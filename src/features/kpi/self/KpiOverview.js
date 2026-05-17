import React, { useEffect, useMemo, useRef, useState } from 'react'
import { getKpiParameters, getKpiTracker } from '../api/selfKpiProgressApi'
import ProgressSection from '../components/ProgressSection'
import WeightedScoreBar from '../components/WeightedScoreBar'
import { buildWeightedScoreSummary } from '../utils/kpiScore'
import { CRow, CCol } from '@coreui/react'
import { DataTableLoadingState } from '../../../components/datatable'

export const getVisibleKpiYears = (currentYear, dataYears = []) =>
  Array.from(
    new Set([currentYear, currentYear - 1, currentYear - 2, currentYear - 3, ...dataYears]),
  )
    .filter((year) => Number.isFinite(Number(year)))
    .map((year) => Number(year))
    .sort((a, b) => b - a)

const getDataYears = (items = []) =>
  Array.from(
    new Set((items || []).map((item) => Number(item.year)).filter((year) => Number.isFinite(year))),
  ).sort((a, b) => b - a)

const mapKpiParameter = (kpi) => ({
  value: kpi.value ?? kpi.id,
  label: kpi.label ?? kpi.parameter_name,
  annual_target: kpi.annual_target,
  unit: kpi.unit,
  color: kpi.color,
  description: kpi.description,
  weightage: kpi.weightage,
  year: kpi.year,
})

const KpiOverview = ({ onCreateKpi }) => {
  const currentYear = new Date().getFullYear()

  // Year + year list
  const [year, setYear] = useState(currentYear)
  const [yearOptions, setYearOptions] = useState([])

  // KPI options + derived views
  const [kpiOptions, setKpiOptions] = useState([])
  const [annualOverview, setAnnualOverview] = useState([])
  const [allTrackerData, setAllTrackerData] = useState([])

  // Loading / errors / flags
  const [loadingYears, setLoadingYears] = useState(true)
  const [loadingAnnual, setLoadingAnnual] = useState(false)
  const [errorAnnual, setErrorAnnual] = useState('')
  const [noData, setNoData] = useState(false)

  // UI cue when switching year
  const [switchingYear, setSwitchingYear] = useState(false)

  // ---------------- 1) Load available years on first mount ----------------
  const loadedYearsRef = useRef(false)
  const lastOverviewKeyRef = useRef('')
  const paramsRunIdRef = useRef(0)
  const overviewRunIdRef = useRef(0)
  const overviewCacheRef = useRef(new Map())
  useEffect(() => {
    if (loadedYearsRef.current) return
    loadedYearsRef.current = true

    let cancelled = false
    setLoadingYears(true)
    setSwitchingYear(true)
    ;(async () => {
      try {
        // Unfiltered params to build year dropdown
        const allParams = await getKpiParameters()
        if (cancelled) return

        const years = getDataYears(allParams)
        const visibleYears = getVisibleKpiYears(currentYear, years)

        setYearOptions(visibleYears)

        // Default to the latest year that has KPI data, but keep current year visible as a card.
        const defaultYear = years[0] ?? currentYear
        setYear(defaultYear)

        // Reuse the same payload to prefill kpiOptions for defaultYear
        const initialKpis = (allParams || []).filter((p) => Number(p.year) === Number(defaultYear))
        setNoData(initialKpis.length === 0)
        setSwitchingYear(initialKpis.length > 0)
        setKpiOptions(initialKpis.map(mapKpiParameter))
      } catch (err) {
        if (!cancelled) {
          setErrorAnnual(err?.message || 'Failed to load available years')
          setYearOptions([currentYear])
          setYear(currentYear)
          setSwitchingYear(false)
        }
      } finally {
        if (!cancelled) setLoadingYears(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [currentYear])

  // ---------------- 2) Load KPI parameters for the selected year ----------------
  useEffect(() => {
    if (loadingYears) return
    if (!year) return

    // If we already hold options for this year (e.g., reused from initial payload), skip refetch
    if (kpiOptions.length && kpiOptions.every((k) => Number(k.year) === Number(year))) {
      return
    }

    setSwitchingYear(true)
    setKpiOptions([])
    setAnnualOverview([])
    setAllTrackerData([])
    overviewRunIdRef.current += 1
    lastOverviewKeyRef.current = ''
    setErrorAnnual('')
    setNoData(false)

    const runId = ++paramsRunIdRef.current
    setLoadingAnnual(true)

    getKpiParameters(year)
      .then((optsRaw) => {
        if (runId !== paramsRunIdRef.current) return

        const opts = (optsRaw || []).filter((o) => Number(o.year) === Number(year))
        setKpiOptions(opts.map(mapKpiParameter))

        if (!opts.length) {
          setNoData(true)
          setSwitchingYear(false)
        }
      })
      .catch((err) => {
        if (runId === paramsRunIdRef.current) {
          setErrorAnnual(err?.message || 'Failed to load KPI parameters')
          setSwitchingYear(false)
        }
      })
      .finally(() => runId === paramsRunIdRef.current && setLoadingAnnual(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, loadingYears]) // intentionally not depending on kpiOptions here

  // ---------------- 3) Build annual overview (per-KPI tracker rows) ----------------
  useEffect(() => {
    if (!kpiOptions.length) {
      setAnnualOverview([])
      setAllTrackerData([])
      setSwitchingYear(false) // end cue even if no KPIs exist for that year
      return
    }

    const key = JSON.stringify({
      year,
      kpis: kpiOptions
        .map((k) => ({
          id: k.value,
          annual_target: k.annual_target,
          weightage: k.weightage,
        }))
        .sort((a, b) => String(a.id).localeCompare(String(b.id))),
    })

    // If we've successfully built this exact overview before, skip
    if (lastOverviewKeyRef.current === key) {
      setLoadingAnnual(false)
      setSwitchingYear(false)
      return
    }

    const cached = overviewCacheRef.current.get(key)
    if (cached) {
      setAllTrackerData(cached.allTrackerData)
      setAnnualOverview(cached.annualOverview)
      setNoData(false)
      lastOverviewKeyRef.current = key
      setLoadingAnnual(false)
      setSwitchingYear(false)
      return
    }

    const runId = ++overviewRunIdRef.current
    setLoadingAnnual(true)
    setErrorAnnual('')

    Promise.all(
      kpiOptions.map((kpi) =>
        getKpiTracker(kpi.value, year).then((rows) =>
          rows.map((r) => ({ ...r, kpi_id: r.kpi_id ?? kpi.value, label: kpi.label })),
        ),
      ),
    )
      .then((nestedRows) => {
        if (runId !== overviewRunIdRef.current) return

        const flat = nestedRows.flat()
        const overview = nestedRows.map((rows, idx) => {
          const kpi = kpiOptions[idx]
          const sum = rows.reduce((acc, r) => acc + Number(r.actual_value || 0), 0)
          return {
            id: kpi.value,
            label: kpi.label,
            current: sum,
            annual_target: kpi.annual_target,
            unit: kpi.unit,
            color: kpi.color,
            weightage: kpi.weightage,
          }
        })

        overviewCacheRef.current.set(key, {
          allTrackerData: flat,
          annualOverview: overview,
        })

        setAllTrackerData(flat)
        setNoData(false)
        setAnnualOverview(overview)

        // IMPORTANT: mark the dedupe key only after a successful state update
        lastOverviewKeyRef.current = key
      })
      .catch((err) => {
        if (runId === overviewRunIdRef.current) {
          setErrorAnnual(err?.message || 'Failed to build annual overview')
        }
      })
      .finally(() => {
        if (runId === overviewRunIdRef.current) {
          setLoadingAnnual(false)
          setSwitchingYear(false)
        }
      })
  }, [kpiOptions, year])

  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]

  const weightedSummary = useMemo(() => buildWeightedScoreSummary(annualOverview), [annualOverview])
  const loadingYearData = loadingYears || switchingYear || loadingAnnual
  const visibleYearCards = useMemo(() => {
    const selectedYear = Number(year)
    const selected = yearOptions.find((option) => Number(option) === selectedYear)
    const others = yearOptions.filter((option) => Number(option) !== selectedYear)

    return [selected ?? selectedYear, ...others].slice(0, 3)
  }, [year, yearOptions])

  return (
    <>
      {/* Year Selector with switching cue */}
      <CRow className="mb-3 align-items-end">
        <CCol xs={12}>
          <div className="kpi-year-card-panel">
            <div className="kpi-year-card-group" role="list" aria-label="Select KPI year">
              {visibleYearCards.map((y) => {
                const isActive = Number(year) === Number(y)
                const isCurrentYear = Number(y) === Number(currentYear)

                return (
                  <button
                    key={y}
                    type="button"
                    className={`kpi-year-card${isActive ? ' is-active' : ''}`}
                    onClick={() => setYear(Number(y))}
                    disabled={isActive || loadingYearData}
                    aria-pressed={isActive}
                  >
                    <span className="kpi-year-card-value">{y}</span>
                    {isCurrentYear && <span className="kpi-year-card-meta">Current</span>}
                  </button>
                )
              })}
            </div>
          </div>
        </CCol>
      </CRow>

      {loadingYearData ? (
        <DataTableLoadingState message="Loading KPI data..." />
      ) : (
        <>
          {weightedSummary.totalWeight > 0 && (
            <CRow className="mb-3">
              <CCol xs={12}>
                <WeightedScoreBar summary={weightedSummary} />
              </CCol>
            </CRow>
          )}

          <ProgressSection
            year={year}
            monthNames={monthNames}
            annualOverview={annualOverview}
            loadingAnnual={loadingAnnual}
            errorAnnual={errorAnnual}
            allTrackerData={allTrackerData}
            noData={noData}
            onCreateKpi={onCreateKpi}
          />
        </>
      )}
    </>
  )
}

export default KpiOverview
