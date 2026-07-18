import { describe, expect, it } from 'vitest'
import { buildDataExportPayload } from './dataExport'

describe('buildDataExportPayload', () => {
  it('exports every user-facing personal data category', () => {
    const payload = buildDataExportPayload({
      user: { id: 'user1', email: 'user@example.com' },
      timetables: [{ id: 'tt1', hash: 'secret-hash' }],
      courses: [{ id: 'course1', staff: 'Tutor' }],
      friendships: [{ id: 'friend1', to_user: 'user2' }],
      ical_tokens: [{ id: 'token1', token: 'secret-token' }],
      invite_codes: [{ id: 'invite1', code: 'INVITE' }],
      login_logs: [{ id: 'login1', ip_full: '192.0.2.1' }],
      ical_access_logs: [{ id: 'ical1', user_agent: 'Calendar' }],
    }, '2026-07-18T00:00:00.000Z')

    expect(payload.export_version).toBe(1)
    expect(payload.exported_at).toBe('2026-07-18T00:00:00.000Z')
    expect(payload.user.email).toBe('user@example.com')
    expect(payload.timetables[0].hash).toBe('secret-hash')
    expect(payload.courses[0].staff).toBe('Tutor')
    expect(payload.friendships[0].to_user).toBe('user2')
    expect(payload.ical_tokens[0].token).toBe('secret-token')
    expect(payload.invite_codes[0].code).toBe('INVITE')
    expect(payload.login_logs[0].ip_full).toBe('192.0.2.1')
    expect(payload.ical_access_logs[0].user_agent).toBe('Calendar')
  })

  it('excludes PocketBase metadata and authentication secrets', () => {
    const payload = buildDataExportPayload({
      user: {
        id: 'user1',
        email: 'user@example.com',
        passwordHash: 'not-for-export',
        tokenKey: 'not-for-export',
        collectionName: 'users',
      },
      timetables: [],
    })

    expect(payload.user).toEqual({
      id: 'user1',
      email: 'user@example.com',
    })
    expect(payload.user).not.toHaveProperty('passwordHash')
    expect(payload.user).not.toHaveProperty('tokenKey')
    expect(payload.user).not.toHaveProperty('collectionName')
  })
})
