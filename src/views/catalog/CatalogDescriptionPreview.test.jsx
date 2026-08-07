import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import CatalogDescriptionPreview from './CatalogDescriptionPreview'

describe('CatalogDescriptionPreview', () => {
  it('shows the compact quotation wording without bullet glyphs', () => {
    render(<CatalogDescriptionPreview value={'Includes:\n• pump\n• charging dock'} />)

    expect(screen.getByTestId('catalog-pdf-preview')).toHaveTextContent(
      'Quotation preview: Includes: pump; charging dock',
    )
    expect(screen.getByTestId('catalog-pdf-preview')).not.toHaveTextContent('•')
  })
})
