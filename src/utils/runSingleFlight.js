export const runSingleFlight = (inFlightRef, task) => {
  if (inFlightRef.current) return inFlightRef.current

  let taskResult
  try {
    taskResult = task()
  } catch (error) {
    taskResult = Promise.reject(error)
  }

  let trackedPromise
  trackedPromise = Promise.resolve(taskResult).finally(() => {
    if (inFlightRef.current === trackedPromise) {
      inFlightRef.current = null
    }
  })

  inFlightRef.current = trackedPromise
  return trackedPromise
}
