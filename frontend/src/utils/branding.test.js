import { describe, expect, it } from 'vitest'
import {
  DEFAULT_INSTANCE_NAME,
  LEGACY_DEFAULT_INSTANCE_NAME,
  compactInstanceName,
} from './branding.js'

describe('compactInstanceName', () => {
  it('uses the compact product name for current and legacy defaults', () => {
    expect(compactInstanceName(DEFAULT_INSTANCE_NAME)).toBe('Timetable Toolkit')
    expect(compactInstanceName(LEGACY_DEFAULT_INSTANCE_NAME))
      .toBe('Timetable Toolkit')
  })

  it('preserves names customized by self-hosters', () => {
    expect(compactInstanceName('My Campus Calendar')).toBe('My Campus Calendar')
  })
})
