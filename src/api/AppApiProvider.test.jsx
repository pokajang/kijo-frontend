import React from 'react'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import AppApiProvider, { useApiUi } from './AppApiProvider'
import { apiClientEvents } from './apiClient'

const ApiState = () => {
  const { busy } = useApiUi()
  return <span data-testid="api-state">{busy ? 'busy' : 'idle'}</span>
}

const emitBusyCount = (count) => {
  act(() => {
    window.dispatchEvent(new CustomEvent(apiClientEvents.name, { detail: { type: 'busy', count } }))
  })
}

afterEach(cleanup)

describe('AppApiProvider', () => {
  it('reports network activity without disabling unrelated controls', () => {
    render(
      <AppApiProvider>
        <ApiState />
        <button type="button">Open record</button>
        <input type="submit" value="Save record" />
      </AppApiProvider>,
    )

    const button = screen.getByRole('button', { name: 'Open record' })
    const submit = screen.getByRole('button', { name: 'Save record' })

    emitBusyCount(2)
    expect(screen.getByTestId('api-state')).toHaveTextContent('busy')
    expect(button).toBeEnabled()
    expect(submit).toBeEnabled()

    emitBusyCount(1)
    expect(button).toBeEnabled()

    emitBusyCount(0)
    expect(screen.getByTestId('api-state')).toHaveTextContent('idle')
    expect(button).toBeEnabled()
    expect(submit).toBeEnabled()
  })

  it('preserves controls intentionally disabled by their owning component', () => {
    render(
      <AppApiProvider>
        <ApiState />
        <button type="button" disabled>
          Submit payment
        </button>
      </AppApiProvider>,
    )

    const button = screen.getByRole('button', { name: 'Submit payment' })

    emitBusyCount(1)
    expect(button).toBeDisabled()

    emitBusyCount(0)
    expect(button).toBeDisabled()
  })
})
