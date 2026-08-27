import { describe, expect, it, vi } from 'vitest'
import {
  readActiveTimetableId,
  validateTimetableLabel,
  writeActiveTimetableId,
} from './timetableSelection'

describe('active timetable selection', () => {
  it('reads and updates the account-level selection through the authenticated API', async () => {
    const pb = {
      send: vi.fn()
        .mockResolvedValueOnce({ timetable_id: 'tt-1' })
        .mockResolvedValueOnce({ timetable_id: 'tt-2' }),
    }

    await expect(readActiveTimetableId(pb)).resolves.toBe('tt-1')
    await expect(writeActiveTimetableId(pb, 'tt-2')).resolves.toBe('tt-2')
    expect(pb.send).toHaveBeenNthCalledWith(1, '/api/timetables/active', {
      method: 'GET',
      requestKey: null,
    })
    expect(pb.send).toHaveBeenNthCalledWith(2, '/api/timetables/active', {
      method: 'PUT',
      body: { timetable_id: 'tt-2' },
      requestKey: null,
    })
  })

  it('validates names before renaming a timetable', () => {
    expect(validateTimetableLabel('  ')).toBe('课表名称不能为空')
    expect(validateTimetableLabel('a'.repeat(81))).toBe('课表名称不能超过 80 个字符')
    expect(validateTimetableLabel('大二上学期')).toBe('')
  })
})
