import { describe, expect, it, vi } from 'vitest'
import { getQuoteService, normalizeQuoteServiceKey, serviceConfig } from './quoteMainServices'
import {
  QUOTE_INQUIRY_SOURCE_KEY,
  getMatchingInquiryId,
  readQuoteInquirySource,
  writeQuoteInquirySource,
} from './quoteInquirySource'

const storageWith = (initial = {}) => {
  const store = { ...initial }
  return {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, value) => {
      store[key] = value
    }),
    removeItem: vi.fn((key) => {
      delete store[key]
    }),
    store,
  }
}

describe('quote service registry', () => {
  it('normalizes canonical keys, display names, record tabs, and slugs', () => {
    expect(normalizeQuoteServiceKey('training')).toBe('training')
    expect(normalizeQuoteServiceKey('Industrial Hygiene')).toBe('ih')
    expect(normalizeQuoteServiceKey('manpower-tab')).toBe('manpower')
    expect(normalizeQuoteServiceKey('equipment-supply')).toBe('equipment')
    expect(normalizeQuoteServiceKey('Special Service')).toBe('special')
  })

  it('returns an empty key and null service for unknown service aliases', () => {
    expect(normalizeQuoteServiceKey('unknown-service')).toBe('')
    expect(getQuoteService('unknown-service')).toBeNull()
  })

  it('returns configured quote services for aliases', () => {
    expect(getQuoteService('training-tab')).toBe(serviceConfig.training)
    expect(getQuoteService('industrial-hygiene')).toBe(serviceConfig.ih)
  })
})

describe('quote inquiry source storage', () => {
  it('loads valid legacy inquiry source payloads as versioned normalized payloads', () => {
    const storage = storageWith({
      [QUOTE_INQUIRY_SOURCE_KEY]: JSON.stringify({
        clientId: 7,
        service: 'Training',
        source: 'Email Info Admin',
        remarks: 'Existing inquiry',
        inquiryId: 15,
        timestamp: '2026-05-17T00:00:00.000Z',
      }),
    })

    expect(
      readQuoteInquirySource(storage, { now: new Date('2026-05-17T01:00:00Z').getTime() }),
    ).toMatchObject({
      version: 1,
      clientId: 7,
      service: 'Training',
      serviceKey: 'training',
      source: 'Email Info Admin',
      remarks: 'Existing inquiry',
      inquiryId: 15,
    })
    expect(storage.removeItem).not.toHaveBeenCalled()
  })

  it('removes corrupt inquiry source payloads and falls back to null', () => {
    const storage = storageWith({ [QUOTE_INQUIRY_SOURCE_KEY]: '{bad-json' })

    expect(readQuoteInquirySource(storage)).toBeNull()
    expect(storage.removeItem).toHaveBeenCalledWith(QUOTE_INQUIRY_SOURCE_KEY)
  })

  it('does not carry an inquiry id across service or client mismatches', () => {
    const currentInquirySource = {
      clientId: 7,
      serviceKey: 'training',
      inquiryId: 15,
    }

    expect(
      getMatchingInquiryId({
        currentInquirySource,
        selectedClient: { company_id: 7 },
        selectedService: 'training',
      }),
    ).toBe(15)
    expect(
      getMatchingInquiryId({
        currentInquirySource,
        selectedClient: { company_id: 7 },
        selectedService: 'equipment',
      }),
    ).toBeUndefined()
    expect(
      getMatchingInquiryId({
        currentInquirySource,
        selectedClient: { company_id: 8 },
        selectedService: 'training',
      }),
    ).toBeUndefined()
    expect(
      getMatchingInquiryId({
        currentInquirySource,
        selectedClient: {},
        selectedService: 'training',
      }),
    ).toBeUndefined()
  })

  it('does not persist inquiry source payloads without a source', () => {
    const storage = storageWith({
      [QUOTE_INQUIRY_SOURCE_KEY]: JSON.stringify({
        clientId: 7,
        serviceKey: 'training',
        source: 'Email Info Admin',
      }),
    })

    expect(
      writeQuoteInquirySource(
        {
          clientId: 7,
          serviceKey: 'training',
          source: '',
        },
        storage,
      ),
    ).toBe(false)
    expect(storage.removeItem).toHaveBeenCalledWith(QUOTE_INQUIRY_SOURCE_KEY)
    expect(storage.setItem).not.toHaveBeenCalled()
  })
})
