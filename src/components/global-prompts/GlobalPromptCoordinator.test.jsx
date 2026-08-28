import React, { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { GlobalPromptProvider, useGlobalPrompt } from './GlobalPromptCoordinator'

const Prompt = ({ id, priority, label }) => {
  const [requested, setRequested] = useState(true)
  const active = useGlobalPrompt(id, priority, requested)

  if (!active) return null

  return (
    <button type="button" onClick={() => setRequested(false)}>
      {label}
    </button>
  )
}

describe('GlobalPromptCoordinator', () => {
  afterEach(cleanup)

  it('shows only the highest-priority prompt and then advances the queue', async () => {
    render(
      <GlobalPromptProvider>
        <Prompt id="whats-new" priority={10} label="What's New" />
        <Prompt id="handbook" priority={100} label="Handbook required" />
      </GlobalPromptProvider>,
    )

    expect(await screen.findByRole('button', { name: 'Handbook required' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: "What's New" })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Handbook required' }))

    expect(await screen.findByRole('button', { name: "What's New" })).toBeInTheDocument()
  })
})
