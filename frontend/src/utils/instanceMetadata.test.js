import { describe, expect, it } from 'vitest'
import { isSafeEmail, legalNoticeTarget, safeWebUrl } from './instanceMetadata.js'

describe('safeWebUrl', () => {
  it('accepts HTTPS source and legal notice URLs', () => {
    expect(safeWebUrl('https://example.com/source')).toBe('https://example.com/source')
  })

  it('rejects executable and non-Web protocols', () => {
    expect(safeWebUrl('javascript:alert(1)', 'fallback')).toBe('fallback')
    expect(safeWebUrl('data:text/html,test', 'fallback')).toBe('fallback')
    expect(safeWebUrl('mailto:operator@example.com', 'fallback')).toBe('fallback')
  })

  it('uses the fallback for malformed or empty values', () => {
    expect(safeWebUrl('not a URL', 'fallback')).toBe('fallback')
    expect(safeWebUrl('', 'fallback')).toBe('fallback')
  })
})

describe('legalNoticeTarget', () => {
  it('uses any valid HTTP(S) notice configured by the instance operator', () => {
    expect(legalNoticeTarget('https://legal.example.org/notice')).toBe(
      'https://legal.example.org/notice',
    )
    expect(legalNoticeTarget('http://intranet.example.test/terms')).toBe(
      'http://intranet.example.test/terms',
    )
  })

  it('falls back to the bundled reference template', () => {
    expect(legalNoticeTarget('')).toBe('/terms')
    expect(legalNoticeTarget('javascript:alert(1)')).toBe('/terms')
  })
})

describe('isSafeEmail', () => {
  it('accepts an empty optional contact or a conventional email', () => {
    expect(isSafeEmail('')).toBe(true)
    expect(isSafeEmail('operator@example.com')).toBe(true)
  })

  it('rejects values that could produce an unsafe mail link', () => {
    expect(isSafeEmail('operator@example.com?subject=injected')).toBe(false)
    expect(isSafeEmail('invalid')).toBe(false)
  })
})
