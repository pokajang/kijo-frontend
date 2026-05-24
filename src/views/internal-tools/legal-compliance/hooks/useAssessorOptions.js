import { useEffect, useMemo, useRef, useState } from 'react'
import { listStaff } from '../api/legalComplianceApi'
import { createStaffOption, getAssessorEmails, getAssessorNames } from '../utils/assessmentMappers'

const compactAssessorSelectStyles = {
  control: (base) => ({
    ...base,
    minHeight: 'calc(1.5em + 0.75rem + 2px)',
  }),
  valueContainer: (base) => ({
    ...base,
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    padding: '0.375rem 0.75rem',
  }),
  multiValue: (base) => ({
    ...base,
    maxWidth: 'calc(100% - 0.5rem)',
    margin: '0 0.25rem 0.25rem 0',
  }),
  multiValueLabel: (base) => ({
    ...base,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }),
  input: (base) => ({
    ...base,
    minWidth: 0,
  }),
}

export const getAssessorFieldRows = (assessorCount) => Math.max(1, assessorCount)

export const getAssessorFieldHeight = (assessorCount) =>
  `calc(${getAssessorFieldRows(assessorCount)} * (1.5em + 0.625rem) + 0.75rem + 2px)`

const useAssessorOptions = ({
  user,
  selectedAssessors,
  setSelectedAssessors,
  setAssessmentDetails,
}) => {
  const sessionAssessorOption = useMemo(() => createStaffOption(user), [user])
  const staffRequestRef = useRef(null)
  const [staffOptions, setStaffOptions] = useState([])
  const [isLoadingStaff, setIsLoadingStaff] = useState(false)
  const [staffError, setStaffError] = useState('')

  const assessorOptions = useMemo(() => {
    const optionsByValue = new Map()

    ;[sessionAssessorOption, ...staffOptions].filter(Boolean).forEach((option) => {
      optionsByValue.set(String(option.value), option)
    })

    return Array.from(optionsByValue.values())
  }, [sessionAssessorOption, staffOptions])

  const selectedAssessorCount = selectedAssessors.length || 1
  const assessorFieldRows = getAssessorFieldRows(selectedAssessorCount)
  const assessorFieldHeight = getAssessorFieldHeight(selectedAssessorCount)
  const assessorSelectStyles = useMemo(
    () => ({
      ...compactAssessorSelectStyles,
      control: (base, state) => ({
        ...compactAssessorSelectStyles.control(base, state),
        minHeight: assessorFieldHeight,
      }),
    }),
    [assessorFieldHeight],
  )

  const loadStaffOptions = () => {
    if (staffOptions.length > 0 || isLoadingStaff) return

    staffRequestRef.current?.abort()
    const controller = new AbortController()
    staffRequestRef.current = controller
    ;(async () => {
      try {
        setIsLoadingStaff(true)
        setStaffError('')
        const payload = await listStaff({ signal: controller.signal })
        const staff = Array.isArray(payload.staff) ? payload.staff : []
        setStaffOptions(staff.map(createStaffOption).filter(Boolean))
      } catch (error) {
        if (error.name === 'AbortError') return
        setStaffError(error.message || 'Could not load staff list.')
      } finally {
        if (staffRequestRef.current === controller) staffRequestRef.current = null
        if (!controller.signal.aborted) setIsLoadingStaff(false)
      }
    })()
  }

  useEffect(
    () => () => {
      staffRequestRef.current?.abort()
    },
    [],
  )

  const handleAssessorChange = (options) => {
    const nextAssessors = options || []
    setSelectedAssessors(nextAssessors)
    setAssessmentDetails((current) => ({
      ...current,
      assessorName: getAssessorNames(nextAssessors).join(', '),
      assessorEmail: getAssessorEmails(nextAssessors).join('\n'),
    }))
  }

  return {
    sessionAssessorOption,
    assessorOptions,
    assessorFieldRows,
    assessorFieldHeight,
    assessorSelectStyles,
    isLoadingStaff,
    staffError,
    setStaffError,
    loadStaffOptions,
    handleAssessorChange,
  }
}

export default useAssessorOptions
