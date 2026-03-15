import { describe, it, expect } from 'vitest'
import { findCommonCourses, findFreeSlots } from './compareSchedules.js'

// ── 测试数据工厂 ──────────────────────────────────────────────────────────

function course(overrides) {
  return {
    identity: Math.random().toString(36).slice(2),
    code: 'IOM103',
    activity_type: 'Lecture',
    section: 'D1/1',
    day: 'MON',
    start_time: '09:00',
    end_time: '10:50',
    location: 'SA101',
    staff: 'Dr. Smith',
    weeks: '1-13',
    ...overrides,
  }
}

// ── findCommonCourses ─────────────────────────────────────────────────────

describe('findCommonCourses', () => {
  // ── 旧签名（两人）────────────────────────────────────────────────────────
  describe('旧签名（两人）', () => {
    it('code + section 相同即为共同课', () => {
      const a = [course({ code: 'IOM103', section: 'D1/1' })]
      const b = [course({ code: 'IOM103', section: 'D1/1' })]
      const result = findCommonCourses(a, b)
      expect(result).toHaveLength(1)
      expect(result[0].code).toBe('IOM103')
      expect(result[0].courses).toHaveLength(2)
    })

    it('section 不同则不算共同课', () => {
      const a = [course({ code: 'IOM103', section: 'D1/1' })]
      const b = [course({ code: 'IOM103', section: 'D1/2' })]
      expect(findCommonCourses(a, b)).toHaveLength(0)
    })

    it('code 不同则不匹配', () => {
      const a = [course({ code: 'IOM103' })]
      const b = [course({ code: 'IOM201' })]
      expect(findCommonCourses(a, b)).toHaveLength(0)
    })

    it('同一 section 在一周多次出现时去重，只返回一条', () => {
      // ECO104 Tutorial D1/1 周四一次、周五一次
      const a = [
        course({ code: 'ECO104', section: 'D1/1', day: 'THU', start_time: '14:00' }),
        course({ code: 'ECO104', section: 'D1/1', day: 'FRI', start_time: '13:00' }),
      ]
      const b = [
        course({ code: 'ECO104', section: 'D1/1', day: 'THU', start_time: '14:00' }),
        course({ code: 'ECO104', section: 'D1/1', day: 'FRI', start_time: '13:00' }),
      ]
      expect(findCommonCourses(a, b)).toHaveLength(1)
    })

    it('多门课中只返回共同的', () => {
      const a = [course({ code: 'IOM103', section: 'D1/1' }), course({ code: 'EAP001', section: 'T1' })]
      const b = [course({ code: 'IOM103', section: 'D1/1' }), course({ code: 'MTH101', section: 'L1' })]
      const result = findCommonCourses(a, b)
      expect(result).toHaveLength(1)
      expect(result[0].code).toBe('IOM103')
    })

    it('两人课表均为空时返回空数组', () => {
      expect(findCommonCourses([], [])).toHaveLength(0)
    })
  })

  // ── 新签名（多人）────────────────────────────────────────────────────────
  describe('新签名（多人）', () => {
    it('三人都在同一 section 才返回', () => {
      const a = [course({ code: 'IOM103', section: 'D1/1' })]
      const b = [course({ code: 'IOM103', section: 'D1/1' })]
      const c = [course({ code: 'IOM103', section: 'D1/1' })]
      const result = findCommonCourses([a, b, c])
      expect(result).toHaveLength(1)
      expect(result[0].courses).toHaveLength(3)
    })

    it('三人中只有两人有的课不返回', () => {
      const a = [course({ code: 'IOM103', section: 'D1/1' })]
      const b = [course({ code: 'IOM103', section: 'D1/1' })]
      const c = [course({ code: 'MTH101', section: 'L1' })]
      expect(findCommonCourses([a, b, c])).toHaveLength(0)
    })

    it('三人中两门课都共同选了，都返回', () => {
      const mkUser = () => [
        course({ code: 'IOM103', section: 'D1/1' }),
        course({ code: 'EAP001', section: 'T1' }),
      ]
      const result = findCommonCourses([mkUser(), mkUser(), mkUser()])
      expect(result).toHaveLength(2)
      expect(result.map((r) => r.code).sort()).toEqual(['EAP001', 'IOM103'])
    })

    it('section 不同时三人不算共同', () => {
      const lists = [
        [course({ code: 'IOM103', section: 'D1/1' })],
        [course({ code: 'IOM103', section: 'D1/2' })],
        [course({ code: 'IOM103', section: 'D1/3' })],
      ]
      expect(findCommonCourses(lists)).toHaveLength(0)
    })

    it('单人列表直接返回该人所有课程', () => {
      const a = [
        course({ code: 'IOM103', activity_type: 'Lecture' }),
        course({ code: 'EAP001', activity_type: 'Tutorial' }),
      ]
      const result = findCommonCourses([a])
      expect(result).toHaveLength(2)
    })

    it('coursesList 包含空数组时返回空', () => {
      const a = [course({ code: 'IOM103', activity_type: 'Lecture' })]
      const b = [] // 第二人没有任何课
      expect(findCommonCourses([a, b])).toHaveLength(0)
    })
  })
})

// ── findFreeSlots ─────────────────────────────────────────────────────────

describe('findFreeSlots', () => {
  // ── 旧签名（两人）────────────────────────────────────────────────────────
  describe('旧签名（两人）', () => {
    it('正常情况：两人各有课，中间有足够空闲', () => {
      const a = [course({ day: 'MON', start_time: '09:00', end_time: '10:50' })]
      const b = [course({ day: 'MON', start_time: '13:00', end_time: '14:50' })]
      const slots = findFreeSlots(a, b, { days: ['MON'], startHour: 9, endHour: 18, minDuration: 60 })
      const free = slots.find((s) => s.day === 'MON' && s.start === '10:50')
      expect(free).toBeDefined()
      expect(free.end).toBe('13:00')
      expect(free.duration).toBe(130)
    })

    it('边界：相邻课程中间只有 10 分钟，minDuration=60 时被过滤', () => {
      const a = [course({ day: 'TUE', start_time: '09:00', end_time: '10:50' })]
      const b = [course({ day: 'TUE', start_time: '11:00', end_time: '12:50' })]
      const slots = findFreeSlots(a, b, { days: ['TUE'], minDuration: 60 })
      expect(slots.find((s) => s.day === 'TUE' && s.duration === 10)).toBeUndefined()
    })

    it('边界：10 分钟间隔当 minDuration=10 时应被返回', () => {
      const a = [course({ day: 'TUE', start_time: '09:00', end_time: '10:50' })]
      const b = [course({ day: 'TUE', start_time: '11:00', end_time: '12:50' })]
      const slots = findFreeSlots(a, b, { days: ['TUE'], minDuration: 10 })
      const gap = slots.find((s) => s.start === '10:50' && s.end === '11:00')
      expect(gap).toBeDefined()
      expect(gap.duration).toBe(10)
    })

    it('全天无空闲：两人的课连续覆盖整天', () => {
      const a = [
        course({ day: 'WED', start_time: '09:00', end_time: '12:00' }),
        course({ day: 'WED', start_time: '14:00', end_time: '18:00' }),
      ]
      const b = [course({ day: 'WED', start_time: '12:00', end_time: '14:00' })]
      const slots = findFreeSlots(a, b, { days: ['WED'], startHour: 9, endHour: 18, minDuration: 1 })
      expect(slots.filter((s) => s.day === 'WED')).toHaveLength(0)
    })

    it('课程时间完全重叠：合并后不产生额外空闲', () => {
      const same = { day: 'THU', start_time: '10:00', end_time: '12:00' }
      const slots = findFreeSlots([course(same)], [course(same)], {
        days: ['THU'], startHour: 9, endHour: 14, minDuration: 1,
      })
      expect(slots).toHaveLength(2)
      expect(slots[0]).toMatchObject({ start: '09:00', end: '10:00', duration: 60 })
      expect(slots[1]).toMatchObject({ start: '12:00', end: '14:00', duration: 120 })
    })

    it('weeks 字段不影响时间段计算', () => {
      const a = [course({ day: 'FRI', start_time: '09:00', end_time: '10:50', weeks: '1,3,5-12' })]
      const b = [course({ day: 'FRI', start_time: '13:00', end_time: '14:50', weeks: '2,4,6-13' })]
      const slots = findFreeSlots(a, b, { days: ['FRI'], startHour: 9, endHour: 18, minDuration: 60 })
      const mid = slots.find((s) => s.start === '10:50' && s.end === '13:00')
      expect(mid).toBeDefined()
      expect(mid.duration).toBe(130)
    })

    it('只看指定的 days，不在列表内的天不返回', () => {
      const a = [course({ day: 'SAT', start_time: '10:00', end_time: '12:00' })]
      const slots = findFreeSlots(a, [], { days: ['MON', 'TUE'], minDuration: 30 })
      expect(slots.every((s) => s.day !== 'SAT')).toBe(true)
    })

    it('两人课表均为空时返回完整的 [startHour, endHour] 区间', () => {
      const slots = findFreeSlots([], [], { days: ['MON'], startHour: 9, endHour: 18, minDuration: 60 })
      expect(slots).toHaveLength(1)
      expect(slots[0]).toMatchObject({ day: 'MON', start: '09:00', end: '18:00', duration: 540 })
    })

    it('课程跨越 startHour 边界时，空闲从 startHour 开始计算', () => {
      const a = [course({ day: 'MON', start_time: '08:00', end_time: '10:00' })]
      const slots = findFreeSlots(a, [], { days: ['MON'], startHour: 9, endHour: 12, minDuration: 1 })
      expect(slots).toHaveLength(1)
      expect(slots[0]).toMatchObject({ start: '10:00', end: '12:00', duration: 120 })
    })
  })

  // ── 新签名（多人）────────────────────────────────────────────────────────
  describe('新签名（多人）', () => {
    it('三人：合并三人占用后求空闲', () => {
      // A: 09:00–10:00, B: 11:00–12:00, C: 13:00–14:00
      // 空闲：10:00–11:00(60)，12:00–13:00(60)，14:00–18:00(240)
      const a = [course({ day: 'MON', start_time: '09:00', end_time: '10:00' })]
      const b = [course({ day: 'MON', start_time: '11:00', end_time: '12:00' })]
      const c = [course({ day: 'MON', start_time: '13:00', end_time: '14:00' })]
      const slots = findFreeSlots([a, b, c], { days: ['MON'], startHour: 9, endHour: 18, minDuration: 60 })
      expect(slots).toHaveLength(3)
      expect(slots[0]).toMatchObject({ start: '10:00', end: '11:00', duration: 60 })
      expect(slots[1]).toMatchObject({ start: '12:00', end: '13:00', duration: 60 })
      expect(slots[2]).toMatchObject({ start: '14:00', end: '18:00', duration: 240 })
    })

    it('三人中一人整天有课，则整天无共同空闲', () => {
      const busy = [
        course({ day: 'TUE', start_time: '09:00', end_time: '21:00' }),
      ]
      const free1 = []
      const free2 = []
      const slots = findFreeSlots([busy, free1, free2], {
        days: ['TUE'], startHour: 9, endHour: 21, minDuration: 1,
      })
      expect(slots.filter((s) => s.day === 'TUE')).toHaveLength(0)
    })

    it('三人课程时间段有交叉时，正确合并再求差集', () => {
      // A: 10:00–12:00, B: 11:00–13:00, C: 09:30–11:30
      // 合并后占用：09:30–13:00，空闲：09:00–09:30(30min) + 13:00–18:00(300min)
      const a = [course({ day: 'WED', start_time: '10:00', end_time: '12:00' })]
      const b = [course({ day: 'WED', start_time: '11:00', end_time: '13:00' })]
      const c = [course({ day: 'WED', start_time: '09:30', end_time: '11:30' })]
      const slots = findFreeSlots([a, b, c], {
        days: ['WED'], startHour: 9, endHour: 18, minDuration: 1,
      })
      expect(slots.find((s) => s.start === '09:00' && s.end === '09:30')).toBeDefined()
      expect(slots.find((s) => s.start === '13:00' && s.end === '18:00')).toBeDefined()
      expect(slots.find((s) => s.start >= '09:30' && s.end <= '13:00')).toBeUndefined()
    })

    it('空 coursesList 时返回完整区间', () => {
      const slots = findFreeSlots([], { days: ['MON'], startHour: 9, endHour: 18, minDuration: 60 })
      expect(slots).toHaveLength(1)
      expect(slots[0]).toMatchObject({ start: '09:00', end: '18:00', duration: 540 })
    })

    it('coursesList 中含空数组时不影响计算', () => {
      const a = [course({ day: 'THU', start_time: '10:00', end_time: '12:00' })]
      const slots = findFreeSlots([a, [], []], {
        days: ['THU'], startHour: 9, endHour: 14, minDuration: 1,
      })
      expect(slots).toHaveLength(2)
      expect(slots[0]).toMatchObject({ start: '09:00', end: '10:00' })
      expect(slots[1]).toMatchObject({ start: '12:00', end: '14:00' })
    })
  })
})
