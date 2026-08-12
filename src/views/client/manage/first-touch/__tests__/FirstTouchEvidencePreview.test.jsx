import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FirstTouchEvidenceGalleryModal } from '../components/FirstTouchEvidencePreview'

afterEach(cleanup)

describe('FirstTouchEvidenceGalleryModal', () => {
  it('offers an authorized editor a direct recovery action for legacy records without evidence', () => {
    const onEdit = vi.fn()
    render(<FirstTouchEvidenceGalleryModal visible proofs={[]} onEdit={onEdit} onClose={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Edit evidence' }))

    expect(onEdit).toHaveBeenCalledOnce()
  })
})
