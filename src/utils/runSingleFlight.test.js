import { describe, expect, it, vi } from 'vitest'

import { runSingleFlight } from './runSingleFlight'

describe('runSingleFlight', () => {
  it('returns the active promise and starts the task only once', async () => {
    let resolveTask
    const task = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveTask = resolve
        }),
    )
    const inFlightRef = { current: null }

    const first = runSingleFlight(inFlightRef, task)
    const second = runSingleFlight(inFlightRef, task)

    expect(first).toBe(second)
    expect(task).toHaveBeenCalledTimes(1)

    resolveTask('done')
    await expect(first).resolves.toBe('done')
    expect(inFlightRef.current).toBeNull()
  })

  it('clears the active promise after failure so the task can be retried', async () => {
    const task = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce('ok')
    const inFlightRef = { current: null }

    await expect(runSingleFlight(inFlightRef, task)).rejects.toThrow('offline')
    await expect(runSingleFlight(inFlightRef, task)).resolves.toBe('ok')

    expect(task).toHaveBeenCalledTimes(2)
  })
})
