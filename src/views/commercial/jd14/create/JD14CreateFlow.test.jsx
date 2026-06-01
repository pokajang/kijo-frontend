import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import JD14CreateFlow from './JD14CreateFlow'
import { createJD14Form } from './jd14CreatePayload'

const navigateMock = vi.hoisted(() => vi.fn())
const createJD14FormMock = vi.hoisted(() => vi.fn())

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

vi.mock('../../../../components/dialog/dialogService', () => ({
  default: {
    alert: vi.fn(),
  },
}))

vi.mock('../../../project/manage/commercialDocsWarning', () => ({
  confirmExistingCommercialDocs: vi.fn(() => true),
  hasProjectCommercialDocGroups: vi.fn(() => false),
  ProjectCommercialDocsNotice: () => null,
  useProjectCommercialDocs: () => ({ groups: [], loading: false, error: '' }),
}))

vi.mock('./JD14EmployerDetailsStep', async () => {
  const ReactModule = await vi.importActual('react')
  const MockEmployerDetails = ({ employerDetails, onChange }) => {
    ReactModule.useEffect(() => {
      if (employerDetails.employerName) return
      onChange('employerName')({ target: { value: 'Employer A' } })
      onChange('approvalNo')({ target: { value: 'EMP_123' } })
    }, [employerDetails.employerName, onChange])
    return <div>Employer details form</div>
  }

  return {
    default: MockEmployerDetails,
  }
})

vi.mock('./JD14TrainingDetailsStep', async () => {
  const ReactModule = await vi.importActual('react')
  const MockTrainingDetails = ({ trainingDetails, onChange }) => {
    ReactModule.useEffect(() => {
      if (trainingDetails.topic) return
      onChange('topic')({ target: { value: 'Training Topic' } })
      onChange('amountClaimed')({ target: { value: '1000' } })
    }, [onChange, trainingDetails.topic])
    return <div>Training details form</div>
  }

  return {
    default: MockTrainingDetails,
  }
})

vi.mock('./jd14CreatePayload', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    createJD14Form: createJD14FormMock,
  }
})

const project = {
  id: 12,
  project_name: 'Training Alpha',
  project_type: 'Training',
  client_name: 'Client A',
}

const renderFlow = (props = {}) =>
  render(
    <MemoryRouter>
      <JD14CreateFlow project={project} onBack={vi.fn()} {...props} />
    </MemoryRouter>,
  )

const clickReviewJD14 = async () => {
  expect(await screen.findByText('Employer details form')).toBeInTheDocument()
  await waitFor(() => expect(screen.getByText('Training details form')).toBeInTheDocument())
  fireEvent.click(screen.getByRole('button', { name: /^review jd14$/i }))
}

describe('JD14CreateFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createJD14Form.mockResolvedValue({ status: 'success', form_number: 'JD14-123' })
  })

  afterEach(() => {
    cleanup()
  })

  it('shows review without posting, then posts from review', async () => {
    renderFlow({ origin: 'jd14-list' })

    await clickReviewJD14()

    expect(await screen.findByRole('heading', { name: /^review jd14$/i })).toBeInTheDocument()
    expect(createJD14Form).not.toHaveBeenCalled()
    expect(screen.getByText('Client A')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /^create jd14$/i }))

    await waitFor(() => expect(createJD14Form).toHaveBeenCalledTimes(1))
    expect(await screen.findByText('JD14 Created')).toBeInTheDocument()
  })

  it('preserves project-origin navigation to JD14 detail after creation', async () => {
    renderFlow()

    await clickReviewJD14()
    await screen.findByRole('heading', { name: /^review jd14$/i })
    fireEvent.click(screen.getByRole('button', { name: /^create jd14$/i }))

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith('/commercial/jd14/JD14-123', {
        state: { fromProjectId: 12 },
      }),
    )
  })
})
