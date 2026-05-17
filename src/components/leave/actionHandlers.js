import { useCallback, useState } from 'react'
import dialog from '../dialog/dialogService'

const formatMalaysiaDate = (dateInput) =>
  new Date(dateInput).toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' })

const fetchLeaveJson = async (url, options = {}) => {
  const res = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}: ${text || 'Request failed'}`)
  }

  let result
  try {
    result = await res.json()
  } catch {
    throw new Error('Invalid JSON response')
  }

  if (result.status !== 'success') {
    throw new Error(result.message || 'Request failed')
  }

  return result
}

/**
 * Convert any date input to Malaysia timezone midnight.
 * This ensures date-only comparisons work without timezone shift errors.
 */
const toMalaysiaMidnight = (dateInput) => {
  const date = new Date(dateInput)
  if (Number.isNaN(date.getTime())) return new Date(NaN)

  const [year, month, day] = formatMalaysiaDate(date).split('-').map(Number)
  return new Date(year, month - 1, day)
}

export const useApplyLeaveHandlers = ({ onNotify, onSubmitted } = {}) => {
  const initialDate = toMalaysiaMidnight(new Date())

  const [leaveFormData, setLeaveFormData] = useState({
    startDate: initialDate,
    endDate: initialDate,
    startTime: '08:30',
    endTime: '17:30',
    typeOfLeave: '',
    reason: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const notify = (type, message, options = {}) => {
    if (typeof onNotify === 'function') {
      onNotify(type, message, options)
      return
    }
    dialog.alert(message)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setLeaveFormData((prev) => ({ ...prev, [name]: value }))
  }

  const setTypeOfLeave = useCallback((value) => {
    setLeaveFormData((prev) => ({ ...prev, typeOfLeave: value }))
  }, [])

  const handleStartDateChange = (e) => {
    const newDate = toMalaysiaMidnight(e.target.value)
    setLeaveFormData((prev) => ({ ...prev, startDate: newDate }))
  }

  const handleEndDateChange = (e) => {
    const newDate = toMalaysiaMidnight(e.target.value)
    setLeaveFormData((prev) => ({ ...prev, endDate: newDate }))
  }

  const countCalendarDays = (start, end) => {
    const startDate = toMalaysiaMidnight(start)
    const endDate = toMalaysiaMidnight(end)
    if (startDate > endDate) return 0
    const dayMs = 24 * 60 * 60 * 1000
    return Math.floor((endDate - startDate) / dayMs) + 1
  }

  const calculateLeaveDuration = (data) => {
    const { startDate, endDate, startTime, endTime } = data
    const totalDays = countCalendarDays(startDate, endDate)
    if (totalDays <= 0) return 0

    if (totalDays === 1) {
      if (startTime === '14:00' || endTime === '13:00') {
        return 0.5
      }
      return 1
    }

    let total = totalDays
    if (startTime === '14:00') total -= 0.5
    if (endTime === '13:00') total -= 0.5
    return total
  }

  const duration = Math.round(calculateLeaveDuration(leaveFormData) * 10) / 10

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isSubmitting) return

    if (!leaveFormData.typeOfLeave) {
      notify('warning', 'Please select a leave type.', {
        scope: 'validation',
      })
      return
    }

    if (leaveFormData.startDate > leaveFormData.endDate) {
      notify('warning', 'End date cannot be earlier than start date.', {
        scope: 'validation',
      })
      return
    }

    if (duration <= 0) {
      notify('warning', 'Invalid leave time range. Please check start/end date and time.', {
        scope: 'validation',
      })
      return
    }

    const payload = {
      type: leaveFormData.typeOfLeave,
      reason: leaveFormData.reason,
      start_date: leaveFormData.startDate.toLocaleDateString('en-CA', {
        timeZone: 'Asia/Kuala_Lumpur',
      }),
      start_time: leaveFormData.startTime,
      end_date: leaveFormData.endDate.toLocaleDateString('en-CA', {
        timeZone: 'Asia/Kuala_Lumpur',
      }),
      end_time: leaveFormData.endTime,
      duration_days: duration,
      status: 'Pending',
    }

    try {
      setIsSubmitting(true)
      const result = await fetchLeaveJson(`${import.meta.env.VITE_API_BASE}hr/leaves`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      if (result.mail_sent === true) {
        notify('success', 'Your leave application was submitted and recipients were notified.', {
          scope: 'submission',
        })
      } else {
        notify(
          'warning',
          result.message ||
            'Leave was submitted, but email notification to recipients could not be confirmed.',
          { scope: 'submission' },
        )
      }

      const resetDate = toMalaysiaMidnight(new Date())
      setLeaveFormData({
        startDate: resetDate,
        endDate: resetDate,
        startTime: '08:30',
        endTime: '17:30',
        typeOfLeave: '',
        reason: '',
      })
      await onSubmitted?.()
    } catch (err) {
      console.error('Error submitting leave application:', err)
      notify('error', err?.message || 'Server error. Please try again later.', {
        scope: 'submission',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    leaveFormData,
    duration,
    isSubmitting,
    handleChange,
    setTypeOfLeave,
    handleStartDateChange,
    handleEndDateChange,
    handleSubmit,
  }
}

/**
 * Fetch logged-in staff leave allocations.
 */
export async function getMyEntitlements() {
  const result = await fetchLeaveJson(`${import.meta.env.VITE_API_BASE}hr/leaves/entitlements/mine`)
  return result.entitlements || []
}
