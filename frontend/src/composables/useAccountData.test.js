import { describe, expect, it, vi } from 'vitest'

const { collection, send } = vi.hoisted(() => ({
  collection: vi.fn(),
  send: vi.fn(),
}))

vi.mock('../lib/pocketbase', () => ({
  default: { collection, send },
}))

vi.mock('../stores/instanceConfig', () => ({
  instanceConfig: {},
}))

import { useAccountData } from './useAccountData'

function accountData(store = {}) {
  return useAccountData({
    model: { id: 'user1', email: 'user@example.invalid' },
    logout: vi.fn(),
    ...store,
  })
}

describe('useAccountData export rate limit', () => {
  it('loads the server status and exposes the local next-export label', async () => {
    send.mockResolvedValueOnce({
      can_export: false,
      next_allowed_at: '2026-07-21T12:34:55.000Z',
    })
    const api = accountData()

    await api.loadExportStatus()

    expect(send).toHaveBeenCalledWith('/api/user-data-export/status', {
      method: 'GET',
      requestKey: null,
    })
    expect(api.exportStatusKnown.value).toBe(true)
    expect(api.exportCanExport.value).toBe(false)
    expect(api.exportNextAllowedLabel.value).not.toBe('')
  })

  it('uses the server response when authorization is rate limited', async () => {
    send.mockRejectedValueOnce({
      status: 429,
      response: {
        can_export: false,
        next_allowed_at: '2026-07-21T12:34:55.000Z',
      },
    })
    const api = accountData()

    await api.exportData()

    expect(api.exportCanExport.value).toBe(false)
    expect(api.exportError.value).toContain('每 24 小时只能申请一次')
  })

  it('reports that an authorized request was counted when data collection fails', async () => {
    send.mockResolvedValueOnce({
      authorized_at: '2026-07-20T12:34:55.000Z',
      next_allowed_at: '2026-07-21T12:34:55.000Z',
      cooldown_seconds: 86400,
    })
    collection.mockReturnValue({
      getOne: vi.fn().mockRejectedValue(new Error('read failed')),
      getFullList: vi.fn().mockRejectedValue(new Error('read failed')),
    })
    const api = accountData()

    await api.exportData()

    expect(api.exportError.value).toContain('本次申请已计入限额')
    expect(api.exportCanExport.value).toBe(false)
  })

  it('requires the current password and deletes through the dedicated endpoint', async () => {
    const logout = vi.fn()
    const api = accountData({ logout })

    await api.deleteAccount()
    expect(api.deleteError.value).toContain('请输入当前密码')
    expect(send).not.toHaveBeenCalledWith('/api/account/delete', expect.anything())

    send.mockResolvedValueOnce({ deleted: true })
    api.deletePassword.value = 'current-password'
    await api.deleteAccount()

    expect(send).toHaveBeenCalledWith('/api/account/delete', {
      method: 'POST',
      body: { password: 'current-password' },
      requestKey: null,
    })
    expect(logout).toHaveBeenCalledOnce()
  })
})
