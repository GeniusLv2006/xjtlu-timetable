import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const adminView = readFileSync(new URL('./AdminView.vue', import.meta.url), 'utf8')
const adminStyles = readFileSync(new URL('../styles/admin-view.css', import.meta.url), 'utf8')

describe('admin user status presentation', () => {
  it('uses distinct restricted and fully banned row states without dimming user actions', () => {
    expect(adminView).toContain("'row-account-restricted'")
    expect(adminView).toContain("'row-account-banned'")
    expect(adminStyles).toContain('.row-account-restricted td')
    expect(adminStyles).toContain('.row-account-banned td')
    expect(adminStyles).not.toMatch(/\.row-account-(?:restricted|banned)[^{]*\{[^}]*opacity/)
  })

  it('exposes the action menu state and menu semantics', () => {
    expect(adminView).toContain('aria-haspopup="menu"')
    expect(adminView).toContain(':aria-expanded="openActionMenu === u.id"')
    expect(adminView).toContain('role="menu"')
    expect(adminView).toContain('role="menuitem"')
    expect(adminView).toContain('@keydown.escape.stop="closeAllMenus"')
  })
})
