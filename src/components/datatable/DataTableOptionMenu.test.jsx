import React, { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import DataTableOptionMenu from './DataTableOptionMenu'

const originalResizeObserver = global.ResizeObserver

afterEach(() => {
  cleanup()
  global.ResizeObserver = originalResizeObserver
})

describe('DataTableOptionMenu', () => {
  it('selects an option through the shared context-menu surface', async () => {
    const onChange = vi.fn()
    let resizeObserverCallback

    global.ResizeObserver = class {
      constructor(callback) {
        resizeObserverCallback = callback
      }

      disconnect() {}

      observe() {}
    }

    const Harness = () => {
      const [value, setValue] = useState('Annual')

      return (
        <DataTableOptionMenu
          value={value}
          ariaLabel="Leave balance type"
          options={[
            { value: 'Annual', label: 'Annual' },
            { value: 'Medical', label: 'Medical' },
          ]}
          onChange={(nextValue, option) => {
            setValue(nextValue)
            onChange(nextValue, option)
          }}
        />
      )
    }

    render(<Harness />)

    const toggle = screen.getByRole('button', { name: 'Leave balance type: Annual' })
    Object.defineProperty(toggle, 'getBoundingClientRect', {
      value: () => ({ width: 184 }),
    })
    fireEvent.mouseDown(toggle)
    fireEvent.click(toggle)
    const selectedItem = await screen.findByRole('menuitemradio', { name: 'Annual' })
    await waitFor(() => expect(resizeObserverCallback).toBeTypeOf('function'))
    expect(() => resizeObserverCallback([{ target: toggle }])).not.toThrow()
    expect(selectedItem).toHaveAttribute('aria-checked', 'true')
    expect(selectedItem.closest('.dropdown-menu')).toHaveClass('record-action-menu')
    expect(selectedItem.closest('.dropdown-menu')).toHaveStyle({ width: '184px' })
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Medical' }))

    expect(onChange).toHaveBeenCalledWith('Medical', {
      value: 'Medical',
      label: 'Medical',
    })
    expect(screen.getByRole('button', { name: 'Leave balance type: Medical' })).toBeInTheDocument()
  })

  it('disables the trigger when there are no options', () => {
    render(
      <DataTableOptionMenu
        options={[]}
        value=""
        ariaLabel="Leave balance type"
        placeholder="No leave types"
      />,
    )

    expect(
      screen.getByRole('button', { name: 'Leave balance type: No leave types' }),
    ).toBeDisabled()
  })

  it('renders a single available option as read-only instead of a no-op menu', () => {
    render(
      <DataTableOptionMenu
        options={[{ value: 'Annual', label: 'Annual' }]}
        value="Annual"
        ariaLabel="Leave balance type"
      />,
    )

    const toggle = screen.getByRole('button', { name: 'Leave balance type: Annual' })
    expect(toggle).toBeDisabled()
    expect(toggle).not.toHaveClass('dropdown-toggle')
    expect(toggle.closest('.data-table-option-menu')).toHaveClass(
      'data-table-option-menu--read-only',
    )
    expect(screen.queryByRole('menuitemradio')).not.toBeInTheDocument()
  })
})
