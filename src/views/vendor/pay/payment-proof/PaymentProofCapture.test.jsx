import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import PaymentProofCapture from './PaymentProofCapture'

const Harness = ({ enabled = true, maxFiles }) => {
  const [files, setFiles] = useState([])
  return (
    <>
      <textarea aria-label="Remarks" />
      <PaymentProofCapture
        files={files}
        onChange={setFiles}
        enabled={enabled}
        maxFiles={maxFiles}
      />
    </>
  )
}

Harness.propTypes = { enabled: PropTypes.bool, maxFiles: PropTypes.number }

describe('PaymentProofCapture', () => {
  afterEach(cleanup)

  it('captures clipboard screenshots when focus is outside a text field', () => {
    render(<Harness />)
    fireEvent.paste(document.body, {
      clipboardData: { files: [new File(['image'], 'clipboard.png', { type: 'image/png' })] },
    })

    expect(screen.getByText(/Pasted screenshot/)).toBeInTheDocument()
    expect(screen.getByText(/payment-proof-/)).toBeInTheDocument()
  })

  it('does not intercept a normal paste into a text field', () => {
    render(<Harness />)
    fireEvent.paste(screen.getByLabelText('Remarks'), {
      clipboardData: { files: [new File(['image'], 'clipboard.png', { type: 'image/png' })] },
    })

    expect(screen.queryByText(/Pasted screenshot/)).not.toBeInTheDocument()
  })

  it('does not listen for screenshots while its dialog is closed', () => {
    render(<Harness enabled={false} />)
    fireEvent.paste(document.body, {
      clipboardData: { files: [new File(['image'], 'clipboard.png', { type: 'image/png' })] },
    })

    expect(screen.queryByText(/Pasted screenshot/)).not.toBeInTheDocument()
  })

  it('enforces the remaining evidence capacity in add mode', () => {
    render(<Harness maxFiles={1} />)
    fireEvent.paste(document.body, {
      clipboardData: {
        files: [
          new File(['first'], 'first.png', { type: 'image/png' }),
          new File(['second'], 'second.png', { type: 'image/png' }),
        ],
      },
    })

    expect(screen.getByText('Only the first 1 evidence file(s) were added.')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Remove/ })).toHaveLength(1)
  })
})
