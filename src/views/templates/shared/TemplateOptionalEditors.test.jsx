import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TemplateOptionalEditors from './TemplateOptionalEditors'

vi.mock('../components/EditorInput', () => ({
  default: ({ field }) => <div>{field} editor</div>,
}))

describe('TemplateOptionalEditors', () => {
  afterEach(cleanup)

  it('starts empty optional sections collapsed and lets users reveal them', () => {
    render(
      <TemplateOptionalEditors
        onChange={vi.fn()}
        items={[{ label: 'Objectives', field: 'objectives', value: '' }]}
      />,
    )

    const toggle = screen.getByRole('button', { name: 'Objectives' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('objectives editor')).toBeInTheDocument()
  })

  it('keeps populated optional sections open for editing', () => {
    render(
      <TemplateOptionalEditors
        onChange={vi.fn()}
        items={[{ label: 'Objectives', field: 'objectives', value: '<p>Existing content</p>' }]}
      />,
    )

    expect(screen.getByRole('button', { name: 'Objectives' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })
})
