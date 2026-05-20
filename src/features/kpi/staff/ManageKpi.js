import React, { useEffect, useMemo, useRef, useState } from 'react'
import StaffSelector from './StaffSelector'
import ProgressSection from '../components/ProgressSection'
import WeightedScoreBar from '../components/WeightedScoreBar'
import {
  getAllKpiParameters,
  getAllKpiParametersWithYears,
  getAllKpiTracker,
} from '../api/staffKpiApi'
import { buildWeightedScoreSummary } from '../utils/kpiScore'
import { CCol, CRow } from '@coreui/react'
import { DataTableLoadingState } from '../../../components/datatable'
import ModuleNavStrip from '../../../components/navigation/ModuleNavStrip'
import { staffModuleTabs } from '../../../components/navigation/moduleNavConfigs'

const getVisibleKpiYears = (currentYear, dataYears = []) =>
  Array.from(
    new Set([currentYear, currentYear - 1, currentYear - 2, currentYear - 3, ...dataYears]),
  )
    .filter((optionYear) => Number.isFinite(Number(optionYear)))
    .map((optionYear) => Number(optionYear))
    .sort((a, b) => b - a)

const ManageKpi = () => {
  const [staffId, setStaffId] = useState(null)

  // year controls
  const [year, setYear] = useState(null)
  const [yearOptions, setYearOptions] = useState([])
  const [loadingYears, setLoadingYears] = useState(false)
  const [switchingYear, setSwitchingYear] = useState(false)

  // data
  const [kpiOptions, setKpiOptions] = useState([])
  const [annualOverview, setAnnualOverview] = useState([])
  const [allTrackerData, setAllTrackerData] = useState([])

  // loading/errors
  const [loadingAnnual, setLoadingAnnual] = useState(false)
  const [errorAnnual, setErrorAnnual] = useState('')

  const currentYear = new Date().getFullYear()
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
  const lastParamsKeyRef = useRef('')
  const loadingParamsKeyRef = useRef('')
  const bootstrappingStaffIdRef = useRef(null)
  const overviewRunIdRef = useRef(0)

  // ==== RESET WHEN STAFF CHANGES ====
  useEffect(() => {
    bootstrappingStaffIdRef.current = staffId || null
    setYear(null)
    setYearOptions([])
    setLoadingYears(false)
    setSwitchingYear(false)
    setLoadingAnnual(false)

    setKpiOptions([])
    setAnnualOverview([])
    setAllTrackerData([])
    setErrorAnnual('')
    lastParamsKeyRef.current = ''
    loadingParamsKeyRef.current = ''
    overviewRunIdRef.current += 1
  }, [staffId])

  // 1) After staff is selected: fetch ALL params once to derive available years; pick default year; seed KPIs
  useEffect(() => {
    if (!staffId) return
    let cancelled = false
    bootstrappingStaffIdRef.current = staffId
    ;(async () => {
      try {
        setLoadingYears(true)
        setErrorAnnual('')
        const { items, years } = await getAllKpiParametersWithYears(staffId)
        if (cancelled) return

        const sortedYears =
          years && years.length
            ? years
            : Array.from(new Set(items.map((i) => Number(i.year)).filter(Number.isFinite))).sort(
                (a, b) => b - a,
              )

        setYearOptions(getVisibleKpiYears(currentYear, sortedYears))
        const defaultYear = sortedYears[0] ?? currentYear
        setYear(defaultYear)

        // seed KPI list for that year (avoids extra round trip before year-effect below)
        lastParamsKeyRef.current = `${staffId}-${defaultYear}`
        setKpiOptions(items.filter((i) => Number(i.year) === Number(defaultYear)))
      } catch (err) {
        if (!cancelled) setErrorAnnual(err.message)
      } finally {
        if (!cancelled) {
          if (bootstrappingStaffIdRef.current === staffId) {
            bootstrappingStaffIdRef.current = null
          }
          setLoadingYears(false)
          setSwitchingYear(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffId])

  // 2) When year changes, load KPI parameters for that (staff, year)
  useEffect(() => {
    if (!staffId || !year) return
    if (bootstrappingStaffIdRef.current === staffId) return
    const key = `${staffId}-${year}`
    // if list already matches requested year, skip fetch
    if (
      lastParamsKeyRef.current === key &&
      kpiOptions.length > 0 &&
      kpiOptions.every((k) => Number(k.year) === Number(year))
    ) {
      loadingParamsKeyRef.current = ''
      setSwitchingYear(false)
      return
    }

    loadingParamsKeyRef.current = key
    setSwitchingYear(true)
    setAnnualOverview([])
    setAllTrackerData([])
    setErrorAnnual('')
    let cancelled = false
    ;(async () => {
      try {
        const items = await getAllKpiParameters(staffId, year)
        if (cancelled) return
        lastParamsKeyRef.current = key
        setKpiOptions(items)
      } catch (err) {
        if (!cancelled) setErrorAnnual(err.message)
      } finally {
        if (!cancelled) {
          if (loadingParamsKeyRef.current === key) {
            loadingParamsKeyRef.current = ''
          }
          setSwitchingYear(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffId, year])

  // 3) Build annual overview & collect trackers for (staff, year)
  useEffect(() => {
    const paramsKey = staffId && year ? `${staffId}-${year}` : ''
    const isLoadingParams = loadingParamsKeyRef.current === paramsKey
    const isBootstrappingStaff = bootstrappingStaffIdRef.current === staffId

    if (!staffId || !year || isLoadingParams || isBootstrappingStaff || !kpiOptions.length) {
      setAnnualOverview([])
      setAllTrackerData([])
      setLoadingAnnual(false)
      if (!isLoadingParams && !isBootstrappingStaff) {
        setSwitchingYear(false)
      }
      return
    }

    const runId = ++overviewRunIdRef.current
    setLoadingAnnual(true)
    setErrorAnnual('')

    Promise.all(
      kpiOptions.map((kpi) =>
        getAllKpiTracker(staffId, kpi.value, year).then((rows) =>
          rows.map((r) => ({ ...r, kpi_id: r.kpi_id ?? kpi.value, label: kpi.label })),
        ),
      ),
    )
      .then((nestedRows) => {
        if (runId !== overviewRunIdRef.current) return
        const flat = nestedRows.flat()
        setAllTrackerData(flat)

        const overview = nestedRows.map((rows, idx) => {
          const k = kpiOptions[idx]
          const sum = rows.reduce((acc, r) => acc + Number(r.actual_value || 0), 0)
          return {
            id: k.value,
            label: k.label,
            current: sum,
            annual_target: k.annual_target,
            unit: k.unit,
            weightage: k.weightage,
            color: k.color,
          }
        })
        setAnnualOverview(overview)
      })
      .catch((err) => {
        if (runId === overviewRunIdRef.current) setErrorAnnual(err.message)
      })
      .finally(() => {
        if (runId === overviewRunIdRef.current) setLoadingAnnual(false)
      })
  }, [staffId, year, kpiOptions])

  const visibleYearCards = useMemo(() => {
    const availableYears = yearOptions.length ? yearOptions : [currentYear]
    const selectedYear = Number(year)
    const selected = availableYears.find((optionYear) => Number(optionYear) === selectedYear)
    const orderedYears = [selected ?? year ?? currentYear, ...availableYears]

    return Array.from(
      new Set(
        orderedYears
          .filter((optionYear) => optionYear != null)
          .map((optionYear) => Number(optionYear))
          .filter(Number.isFinite),
      ),
    ).slice(0, 3)
  }, [currentYear, year, yearOptions])
  const weightedSummary = useMemo(() => buildWeightedScoreSummary(annualOverview), [annualOverview])
  const isYearLoading = loadingYears || switchingYear || loadingAnnual
  const noData = !isYearLoading && !errorAnnual && Boolean(year) && kpiOptions.length === 0

  return (
    <>
      <ModuleNavStrip tabs={staffModuleTabs} ariaLabel="Staff sections" />
      <StaffSelector onChange={setStaffId}>
        {staffId && (
          <>
            <div className="kpi-year-card-panel mb-3">
              <div className="kpi-year-card-group kpi-staff-year-card-group">
                {visibleYearCards.map((optionYear) => {
                  const isActive = Number(optionYear) === Number(year)

                  return (
                    <button
                      key={optionYear}
                      type="button"
                      className={`kpi-year-card${isActive ? ' is-active' : ''}`}
                      onClick={() => setYear(Number(optionYear))}
                      disabled={isYearLoading || !yearOptions.length}
                      aria-pressed={isActive}
                    >
                      <span className="kpi-year-card-value">{optionYear}</span>
                      {Number(optionYear) === currentYear && (
                        <span className="kpi-year-card-meta">Current</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {!year || isYearLoading ? (
              <div className="text-center py-4 text-muted">
                {!year && errorAnnual ? (
                  <p className="text-danger mb-0">{errorAnnual}</p>
                ) : (
                  <DataTableLoadingState
                    message={year ? 'Loading KPI data...' : 'Loading KPI years...'}
                  />
                )}
              </div>
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
                  loadingAnnual={false}
                  errorAnnual={errorAnnual}
                  allTrackerData={allTrackerData}
                  noData={noData}
                />
              </>
            )}
          </>
        )}
      </StaffSelector>
    </>
  )
}

export default ManageKpi
