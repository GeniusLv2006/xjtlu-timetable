import { describe, it, expect } from 'vitest'
import { parseWeekPattern } from './weekPattern.js'

describe('parseWeekPattern', () => {
  // ── 基本格式 ─────────────────────────────────────────────────────────────

  it('连续范围 "1-13"', () => {
    const result = parseWeekPattern('1-13')
    expect(result).toHaveLength(13)
    expect(result[0]).toBe(1)
    expect(result[12]).toBe(13)
  })

  it('不连续混合 "1, 3, 5-12"', () => {
    expect(parseWeekPattern('1, 3, 5-12')).toEqual([1, 3, 5, 6, 7, 8, 9, 10, 11, 12])
  })

  it('带前缀 "Week: 2-12"', () => {
    expect(parseWeekPattern('Week: 2-12')).toEqual(
      Array.from({ length: 11 }, (_, i) => i + 2),
    )
  })

  // ── 前缀变体 ─────────────────────────────────────────────────────────────

  it('带前缀 "Weeks: 1-5"', () => {
    expect(parseWeekPattern('Weeks: 1-5')).toEqual([1, 2, 3, 4, 5])
  })

  it('全大写前缀 "WEEK: 1-3"', () => {
    expect(parseWeekPattern('WEEK: 1-3')).toEqual([1, 2, 3])
  })

  // ── 分隔符变体 ────────────────────────────────────────────────────────────

  it('逗号无空格 "2,4,6"', () => {
    expect(parseWeekPattern('2,4,6')).toEqual([2, 4, 6])
  })

  it('空格分隔 "1 3 5"', () => {
    expect(parseWeekPattern('1 3 5')).toEqual([1, 3, 5])
  })

  it('混合分隔符 "1,3 5-7"', () => {
    expect(parseWeekPattern('1,3 5-7')).toEqual([1, 3, 5, 6, 7])
  })

  // ── 去重与排序 ────────────────────────────────────────────────────────────

  it('重复项去重 "1-3, 2-4"', () => {
    expect(parseWeekPattern('1-3, 2-4')).toEqual([1, 2, 3, 4])
  })

  it('乱序单值去重 "5,2,5,1"', () => {
    expect(parseWeekPattern('5,2,5,1')).toEqual([1, 2, 5])
  })

  // ── 单值 ──────────────────────────────────────────────────────────────────

  it('单个数字 "7"', () => {
    expect(parseWeekPattern('7')).toEqual([7])
  })

  // ── 边界：空输入 ──────────────────────────────────────────────────────────

  it('空字符串返回空数组', () => {
    expect(parseWeekPattern('')).toEqual([])
  })

  it('null 返回空数组', () => {
    expect(parseWeekPattern(null)).toEqual([])
  })

  it('undefined 返回空数组', () => {
    expect(parseWeekPattern(undefined)).toEqual([])
  })

  it('纯前缀无数字 "Week: " 返回空数组', () => {
    expect(parseWeekPattern('Week: ')).toEqual([])
  })

  // ── timetableplus 实际输出格式 ────────────────────────────────────────────

  it('实际格式 "1-13"', () => {
    expect(parseWeekPattern('1-13')).toHaveLength(13)
  })

  it('实际格式 "1, 3, 5-12"（含不规则周）', () => {
    const result = parseWeekPattern('1, 3, 5-12')
    expect(result).toContain(1)
    expect(result).toContain(3)
    expect(result).not.toContain(2)
    expect(result).not.toContain(4)
    expect(result).toContain(12)
  })
})
