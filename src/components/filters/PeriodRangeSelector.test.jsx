import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import PeriodRangeSelector, { getPeriodRangePreset } from './PeriodRangeSelector'

afterEach(() => {
  cleanup()
})

describe('PeriodRangeSelector', () => {
  it('closes the menu after selecting a preset', async () => {
    const onChange = vi.fn()

    render(<PeriodRangeSelector value={getPeriodRangePreset('ytd')} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Year to Date' }))
    expect(screen.getByRole('menu')).toHaveClass('show')

    fireEvent.click(screen.getByText('All Time'))

    expect(onChange).toHaveBeenCalledWith({ preset: 'all', startDate: '', endDate: '' })
    await waitFor(() => expect(screen.getByRole('menu')).not.toHaveClass('show'))
  })

  it('keeps the menu open when switching to custom range', () => {
    const onChange = vi.fn()

    render(<PeriodRangeSelector value={getPeriodRangePreset('ytd')} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Year to Date' }))
    fireEvent.click(screen.getByText('Custom Range'))

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        preset: 'custom',
      }),
    )
    expect(screen.getByRole('menu')).toHaveClass('show')
  })
})
