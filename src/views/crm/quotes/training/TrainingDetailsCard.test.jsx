import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import TrainingDetailsCard from './TrainingDetailsCard'
import { TRAINING_HOURLY_UNIT_COST, TRAINING_RATE_TYPES } from './trainingRates'

const baseFormData = {
  trainingId: '1',
  trainingTitle: 'Emergency Response And Preparedness',
  trainingTypeOption: 'Physical',
  paymentMethod: 'HRD Grant',
  selectedDate: null,
  selectedEndDate: null,
  toBeConfirmed: true,
  trainingVenue: 'Training venue',
  targetGroups: '',
  trainingInqRemarks: '',
  trainingDuration: 1,
  durationUnit: 'hour(s)',
  trainingRateType: TRAINING_RATE_TYPES.CLIENT_SITE_SPECIAL_APPROVAL,
  unitPrice: TRAINING_HOURLY_UNIT_COST,
  travelCharge: 1500,
  travelRegion: 'northern',
  mealsProvided: 'Yes',
}

const renderTrainingDetails = ({ formData = baseFormData, setFormData = vi.fn() } = {}) => {
  render(
    <MemoryRouter>
      <TrainingDetailsCard
        formData={formData}
        setFormData={setFormData}
        trainingOptions={[]}
        isEditMode={false}
        presetPaymentMethods={['HRD Grant', 'Self-Payment', 'E-Perolehan']}
      />
    </MemoryRouter>,
  )

  return { setFormData }
}

describe('TrainingDetailsCard', () => {
  afterEach(() => {
    cleanup()
  })

  it('keeps hourly unit pricing when switching training type to online', () => {
    const setFormData = vi.fn()
    renderTrainingDetails({ setFormData })

    fireEvent.click(screen.getByLabelText('Online'))

    expect(setFormData).toHaveBeenCalledTimes(1)
    const updateFormData = setFormData.mock.calls[0][0]
    const nextFormData = updateFormData(baseFormData)

    expect(nextFormData.trainingTypeOption).toBe('Online')
    expect(nextFormData.unitPrice).toBe(TRAINING_HOURLY_UNIT_COST)
    expect(nextFormData.travelCharge).toBe(0)
    expect(nextFormData.travelRegion).toBe('none')
    expect(nextFormData.mealsProvided).toBe('No')
  })
})
