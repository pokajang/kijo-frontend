import { describe, expect, it } from 'vitest'

import {
  getEquipmentDeliveryDescription,
  getEquipmentDeliveryRemarks,
} from './equipmentDeliveryUtils'

describe('getEquipmentDeliveryDescription', () => {
  it('adds accepted item specifications without changing the catalogue description', () => {
    expect(
      getEquipmentDeliveryDescription({
        description: 'Portable detector',
        item_remarks: 'Colour: navy blue',
      }),
    ).toBe('Portable detector')
    expect(getEquipmentDeliveryRemarks({ item_remarks: 'Colour: navy blue' })).toBe(
      'Colour: navy blue',
    )
  })

  it('does not add an empty specifications label', () => {
    expect(getEquipmentDeliveryDescription({ description: 'Portable detector' })).toBe(
      'Portable detector',
    )
  })
})
