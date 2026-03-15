/**
 * weekPattern.js
 * 解析周次字符串 → 周次数字数组
 */

/**
 * 解析各种周次格式，返回有序、去重的周次数组。
 *
 * 支持格式：
 *   "1-13"          → [1,2,...,13]
 *   "1, 3, 5-12"    → [1,3,5,6,7,8,9,10,11,12]
 *   "Week: 2-12"    → [2,3,...,12]（兼容带前缀格式）
 *
 * @param {string} str
 * @returns {number[]}
 */
export function parseWeekPattern(str) {
  if (!str || typeof str !== 'string') return []

  // 去掉 "Week: " / "Weeks: " 等非数字前缀
  const cleaned = str.replace(/^[^0-9]+/, '').trim()
  if (!cleaned) return []

  const weeks = new Set()

  for (const part of cleaned.split(/[\s,]+/)) {
    const trimmed = part.trim()
    if (!trimmed) continue

    const rangeMatch = trimmed.match(/^(\d+)-(\d+)$/)
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10)
      const end   = parseInt(rangeMatch[2], 10)
      for (let i = start; i <= end; i++) weeks.add(i)
    } else if (/^\d+$/.test(trimmed)) {
      weeks.add(parseInt(trimmed, 10))
    }
  }

  return [...weeks].sort((a, b) => a - b)
}
