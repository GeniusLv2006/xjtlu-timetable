import { describe, expect, it } from 'vitest'
import {
  buildLegalAcceptancePayload,
  hasCurrentLegalAcceptance,
  normalizeLegalRequirements,
  requiresLegalAcceptance,
} from './legalAcceptance'

describe('legal acceptance helpers', () => {
  it('normalizes disabled and active instance requirements', () => {
    expect(normalizeLegalRequirements({})).toEqual({
      legal_notice_version: '',
      minimum_age: 0,
    })
    expect(normalizeLegalRequirements({
      legal_notice_version: ' 1.0 ',
      minimum_age: '18',
    })).toEqual({
      legal_notice_version: '1.0',
      minimum_age: 18,
    })
  })

  it('requires a record matching both the current version and age threshold', () => {
    const config = { legal_notice_version: '1.0', minimum_age: 18 }
    const accepted = {
      legal_notice_version: '1.0',
      legal_notice_accepted: true,
      minimum_age: 18,
      minimum_age_confirmed: true,
    }

    expect(requiresLegalAcceptance(config)).toBe(true)
    expect(hasCurrentLegalAcceptance([accepted], config)).toBe(true)
    expect(hasCurrentLegalAcceptance([
      { ...accepted, legal_notice_version: '0.9' },
    ], config)).toBe(false)
    expect(hasCurrentLegalAcceptance([
      { ...accepted, minimum_age: 16 },
    ], config)).toBe(false)
  })

  it('builds the minimal durable acceptance payload without a birth date', () => {
    expect(buildLegalAcceptancePayload('user1', {
      legal_notice_version: '1.0',
      minimum_age: 18,
    })).toEqual({
      user: 'user1',
      legal_notice_version: '1.0',
      legal_notice_accepted: true,
      minimum_age: 18,
      minimum_age_confirmed: true,
    })
  })
})
