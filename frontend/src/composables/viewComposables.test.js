import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { useAccountData } from './useAccountData'
import { useAdminChangelogs } from './useAdminChangelogs'
import { useAdminInvites } from './useAdminInvites'
import { useAdminLogs } from './useAdminLogs'
import { useAdminSemesters } from './useAdminSemesters'
import { useAdminSiteConfig } from './useAdminSiteConfig'
import { useAdminUsers } from './useAdminUsers'
import { useIcalSubscription } from './useIcalSubscription'
import { useSettingsAccount } from './useSettingsAccount'
import { useSettingsInvites } from './useSettingsInvites'

function expectDefinedBindings(api) {
  for (const [name, binding] of Object.entries(api)) {
    expect(binding, `${name} should be defined`).not.toBeUndefined()
  }
}

describe('view composables', () => {
  it('exposes complete admin module contracts', () => {
    const semesters = useAdminSemesters()
    const modules = [
      useAdminUsers(),
      semesters,
      useAdminInvites(),
      useAdminSiteConfig(semesters.semesters),
      useAdminLogs(ref('users')),
      useAdminChangelogs(),
    ]

    modules.forEach(expectDefinedBindings)
  })

  it('exposes complete settings module contracts', () => {
    const authStore = {
      model: {
        id: 'test-user',
        email: 'user@example.invalid',
        can_invite: true,
      },
      logout: vi.fn(),
    }
    const modules = [
      useSettingsInvites(authStore),
      useSettingsAccount(authStore),
      useIcalSubscription(authStore),
      useAccountData(authStore),
    ]

    modules.forEach(expectDefinedBindings)
  })
})
