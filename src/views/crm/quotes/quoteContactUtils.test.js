import { describe, expect, it } from 'vitest'
import { buildPicPayload, contactKey } from './quoteContactUtils'

describe('quoteContactUtils', () => {
  it('uses the PIC id as the stable identity when one is available', () => {
    expect(contactKey({ pic_id: 42, full_name: 'Same Name' }, 0)).toBe('pic-42')
    expect(contactKey({ pic_id: 42, full_name: 'Changed Name' }, 3)).toBe('pic-42')
  })

  it('includes every selected PIC in the quote payload', () => {
    const payload = buildPicPayload({
      selected_pics: [
        {
          pic_id: 1,
          full_name: 'PIC One',
          email: 'one@example.test',
          mobile_number: '6011',
          position: 'Manager',
        },
        {
          pic_id: 3,
          full_name: 'PIC Three',
          email: 'three@example.test',
          mobile_number: '6013',
          position: 'Director',
        },
      ],
    })

    expect(payload.contacts).toHaveLength(2)
    expect(payload.primaryPIC.pic_id).toBe(1)
    expect(payload.pic_name).toBe('PIC One; PIC Three')
    expect(payload.pic_email).toBe('one@example.test; three@example.test')
    expect(payload.pic_phone).toBe('6011; 6013')
    expect(payload.pic_position).toBe('Manager; Director')
  })
})
