import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const importView = readFileSync(new URL('./ImportView.vue', import.meta.url), 'utf8')
const timetablesView = readFileSync(new URL('./TimetablesView.vue', import.meta.url), 'utf8')
const homeView = readFileSync(new URL('./HomeView.vue', import.meta.url), 'utf8')
const router = readFileSync(new URL('../router/index.js', import.meta.url), 'utf8')

describe('manual timetable import presentation', () => {
  it('attributes the limitation to the school server and exposes a complete activity link', () => {
    expect(importView).toContain('该限制来自学校服务器和浏览器安全策略，本站无法绕过')
    expect(importView).toContain(':href="activityUrl"')
    expect(importView).toContain('打开学校 JSON 接口')
    expect(importView).toContain('Firefox 点击页面顶部的<strong>“复制”</strong>')
    expect(importView).not.toContain('JSON_BOOKMARKLET')
  })

  it('turns blocked automatic requests into manual-import guidance', () => {
    expect(importView).toContain('manualImportNeeded.value = true')
    expect(importView).toContain('学校服务器阻止了自动获取')
  })
})

describe('timetable management presentation', () => {
  it('provides authenticated management routing and all requested actions', () => {
    expect(router).toContain("path: '/timetables'")
    expect(timetablesView).toContain('课表管理')
    expect(timetablesView).toContain('设为当前并查看')
    expect(timetablesView).toContain('重命名')
    expect(timetablesView).toContain('确认删除')
    expect(timetablesView).toContain('当前课表 · iCal 同步中')
  })

  it('persists the account selection on the server and lets Home honor it', () => {
    expect(timetablesView).toContain('writeActiveTimetableId(pb, id)')
    expect(homeView).toContain('readActiveTimetableId(pb)')
    expect(homeView).toContain('writeActiveTimetableId(pb, requestedId)')
    expect(homeView).not.toContain('localStorage, userId')
  })
})
