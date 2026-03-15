/**
 * compareSchedules.js
 * 课表对比工具函数
 */

// ── 内部工具 ──────────────────────────────────────────────────────────────

/** "HH:MM" → 分钟数，如 "09:50" → 590 */
function toMin(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** 分钟数 → "HH:MM" */
function fromMin(min) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * 合并时间段数组（可能重叠/相邻），返回不重叠的有序时间段列表。
 * 输入输出格式：[{ start: number, end: number }]（均为分钟数）
 */
function mergeIntervals(intervals) {
  if (!intervals.length) return []
  const sorted = [...intervals].sort((a, b) => a.start - b.start)
  const merged = [{ ...sorted[0] }]
  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i]
    const last = merged[merged.length - 1]
    if (cur.start <= last.end) {
      last.end = Math.max(last.end, cur.end)
    } else {
      merged.push({ ...cur })
    }
  }
  return merged
}

/**
 * 在 [dayStart, dayEnd] 范围内，求 intervals 的补集（空闲段）。
 */
function invertIntervals(intervals, dayStart, dayEnd) {
  const free = []
  let cursor = dayStart
  for (const { start, end } of intervals) {
    if (start > cursor) free.push({ start: cursor, end: start })
    cursor = Math.max(cursor, end)
  }
  if (cursor < dayEnd) free.push({ start: cursor, end: dayEnd })
  return free
}

// ── 公开 API ──────────────────────────────────────────────────────────────

/**
 * 找出所有人都选了的完全相同的课程段（code + activity_type + day + start_time + end_time + section 六项全部一致）。
 *
 * 新签名：findCommonCourses(coursesList)
 * 旧签名（向后兼容）：findCommonCourses(coursesA, coursesB)
 *
 * 返回格式：
 * [{
 *   code: string,
 *   activityType: string,
 *   courses: object[]   // 每个用户对应的课程对象，顺序与 coursesList 一致
 * }]
 *
 * 旧签名额外保留 courseA / courseB 字段。
 */
export function findCommonCourses(first, second) {
  // 旧签名：second 是课程数组；新签名：second 是 undefined
  const isLegacy = Array.isArray(second)
  const coursesList = isLegacy ? [first, second] : first

  if (coursesList.length === 0) return []

  const [base, ...rest] = coursesList
  const result = []

  for (const candidate of base) {
    // 课程、类型、时间段、班级全部相同才算共同
    const matches = []
    let allMatch = true
    for (const others of rest) {
      const match = others.find(
        (c) =>
          c.code        === candidate.code &&
          c.activity_type === candidate.activity_type &&
          c.day         === candidate.day &&
          c.start_time  === candidate.start_time &&
          c.end_time    === candidate.end_time &&
          c.section     === candidate.section,
      )
      if (!match) { allMatch = false; break }
      matches.push(match)
    }
    if (!allMatch) continue

    const entry = {
      code: candidate.code,
      activityType: candidate.activity_type,
      courses: [candidate, ...matches],
    }
    // 旧签名兼容：保留 courseA / courseB
    if (isLegacy) {
      entry.courseA = candidate
      entry.courseB = matches[0]
    }
    result.push(entry)
  }

  return result
}

/**
 * 找出所有人都空闲的连续时间段。
 * weeks 字段不影响计算，只看 day / start_time / end_time。
 *
 * 新签名：findFreeSlots(coursesList, options)
 * 旧签名（向后兼容）：findFreeSlots(coursesA, coursesB, options)
 *
 * @returns {{ day: string, start: string, end: string, duration: number }[]}
 */
export function findFreeSlots(first, secondOrOptions, legacyOptions) {
  // 参数归一化：
  //   旧签名 findFreeSlots(coursesA, coursesB, options) → secondOrOptions 是 Array
  //   新签名 findFreeSlots(coursesList, options)         → secondOrOptions 是 object 或 undefined
  let coursesList, options
  if (Array.isArray(secondOrOptions)) {
    // 旧签名
    coursesList = [first, secondOrOptions]
    options = legacyOptions ?? {}
  } else {
    // 新签名
    coursesList = first
    options = secondOrOptions ?? {}
  }

  const {
    minDuration = 60,
    days = ['MON', 'TUE', 'WED', 'THU', 'FRI'],
    startHour = 9,
    endHour = 21,
  } = options

  const dayStart = startHour * 60
  const dayEnd = endHour * 60
  const allCourses = coursesList.flat()
  const result = []

  for (const day of days) {
    const occupied = allCourses
      .filter((c) => c.day === day && c.start_time && c.end_time)
      .map((c) => ({ start: toMin(c.start_time), end: toMin(c.end_time) }))
      .filter((iv) => iv.start < iv.end)

    const merged = mergeIntervals(occupied)
    const free = invertIntervals(merged, dayStart, dayEnd)

    for (const { start, end } of free) {
      const duration = end - start
      if (duration >= minDuration) {
        result.push({ day, start: fromMin(start), end: fromMin(end), duration })
      }
    }
  }

  return result
}
