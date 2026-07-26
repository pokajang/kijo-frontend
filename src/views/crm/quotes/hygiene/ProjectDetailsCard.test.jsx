import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ProjectDetailsCard from './ProjectDetailsCard'

const confirm = vi.hoisted(() => vi.fn())

vi.mock('../../../../components/dialog/dialogService', () => ({
  default: { confirm },
}))

describe('ProjectDetailsCard historical pricing upgrade', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('requires confirmation before explicitly upgrading an intermediate quote', async () => {
    confirm.mockResolvedValue(true)
    const setFormData = vi.fn()

    render(
      <ProjectDetailsCard
        formData={{
          sampleCounts: 120,
          sampleUnit: 'sample(s)',
          numWorkUnits: 1,
          pricingRuleVersion: 'ih_standard_v1',
          complexityRating: 4,
          hygieneItems: [],
          estimatedTotalCost: null,
        }}
        setFormData={setFormData}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Upgrade to Current V2 Pricing' }))

    await waitFor(() => expect(confirm).toHaveBeenCalledOnce())
    const updater = setFormData.mock.calls[0][0]
    expect(
      updater({
        pricingRuleVersion: 'ih_standard_v1',
        complexityRating: 4,
        hygieneItems: [],
      }),
    ).toMatchObject({
      pricingRuleVersion: 'ih_standard_v2',
      complexityRating: 4,
      upgradePricingRule: true,
      hygieneItems: [],
      estimatedTotalCost: '',
    })
  })
})
