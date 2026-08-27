import { describe, expect, it } from 'vitest'
import {
  buildTimetableActivityUrl,
  extractActivityList,
  extractTimetableHash,
} from './timetableImport'

const HASH = '576e154aacf9c08b61d87b83dfaa987d26a3d84ef81db0f9cf2909b042f3eb23'

describe('timetable manual import helpers', () => {
  it('normalizes a raw hash or extracts it from the school URL', () => {
    expect(extractTimetableHash(HASH)).toBe(HASH.toUpperCase())
    expect(extractTimetableHash(`https://example.test/hash/${HASH}/activity`)).toBe(HASH.toUpperCase())
    expect(extractTimetableHash('not-a-hash')).toBeNull()
  })

  it('builds the complete activity endpoint used for top-level navigation', () => {
    expect(buildTimetableActivityUrl(HASH)).toBe(
      `https://timetableplus.xjtlu.edu.cn/ptapi/api/enrollment/hash/${HASH.toUpperCase()}/activity`,
    )
    expect(buildTimetableActivityUrl('invalid')).toBe('')
  })

  it('accepts supported upstream response wrappers', () => {
    const activities = [{ identity: 'activity-1' }]
    expect(extractActivityList(activities)).toBe(activities)
    expect(extractActivityList({ data: activities })).toBe(activities)
    expect(extractActivityList({ activities })).toBe(activities)
    expect(extractActivityList({ result: activities })).toBe(activities)
    expect(extractActivityList({})).toEqual([])
  })
})
