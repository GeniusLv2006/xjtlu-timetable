import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import {
  buildDataExportFiles,
  buildDataExportZip,
  dataExportFilename,
} from './dataExport'

const exportedAt = '2026-07-20T12:34:56.789Z'
const request = {
  authorized_at: '2026-07-20T12:34:55.000Z',
  next_allowed_at: '2026-07-21T12:34:55.000Z',
  cooldown_seconds: 86400,
}
const instance = {
  instance_name: 'Test Timetable',
  operator_name: 'Test Operator',
  operator_contact_email: 'privacy@example.invalid',
  legal_notice_url: 'https://example.invalid/privacy',
  legal_notice_version: '1.0',
  blocked_registration_retention_days: 365,
}

function exportData() {
  return {
    user: {
      id: 'user1',
      email: 'user@example.invalid',
      passwordHash: 'not-for-export',
      tokenKey: 'not-for-export',
      collectionName: 'users',
    },
    timetables: [{ id: 'tt1', hash: 'secret-hash' }],
    courses: [{ id: 'course1', identity: 'source-row', staff: 'Tutor' }],
    friendships: [{ id: 'friend1', to_user: 'user2' }],
    ical_tokens: [{ id: 'token1', token: 'secret-token' }],
    invite_codes: [{ id: 'invite1', code: 'INVITE' }],
    login_logs: [{ id: 'login1', ip_full: '192.0.2.1' }],
    ical_access_logs: [{ id: 'ical1', user_agent: 'Calendar' }],
    legal_acceptances: [{ id: 'legal1', legal_notice_version: '1.0' }],
  }
}

describe('user data export archive', () => {
  it('builds a stable per-category file set and filters authentication secrets', () => {
    const files = buildDataExportFiles(exportData(), instance, request, exportedAt)

    expect(Object.keys(files).sort()).toEqual([
      'account.json',
      'courses.json',
      'data-export-request.json',
      'data-processing-information.md',
      'friendships.json',
      'ical-access-logs.json',
      'ical-tokens.json',
      'invite-codes.json',
      'legal-acceptances.json',
      'login-logs.json',
      'manifest.json',
      'timetables.json',
    ])

    const account = JSON.parse(files['account.json'])
    expect(account).toEqual({ id: 'user1', email: 'user@example.invalid' })
    expect(account).not.toHaveProperty('passwordHash')
    expect(account).not.toHaveProperty('tokenKey')
    expect(account).not.toHaveProperty('collectionName')
    expect(JSON.parse(files['courses.json'])[0].identity).toBe('source-row')

    const manifest = JSON.parse(files['manifest.json'])
    expect(manifest.export_format_version).toBe(4)
    expect(manifest.exported_at).toBe(exportedAt)
    expect(manifest.instance.name).toBe('Test Timetable')
    expect(manifest.instance.blocked_registration_retention_days).toBe(365)
    expect(manifest.files.find(file => file.name === 'courses.json').record_count).toBe(1)
  })

  it('retains empty category files and generates the English processing notice', () => {
    const files = buildDataExportFiles({ user: { id: 'user1' } }, instance, request, exportedAt)

    expect(JSON.parse(files['timetables.json'])).toEqual([])
    expect(JSON.parse(files['legal-acceptances.json'])).toEqual([])
    expect(files['data-processing-information.md']).toContain('Test Operator')
    expect(files['data-processing-information.md']).toContain('UK GDPR Article 15')
    expect(files['data-processing-information.md']).toContain('provided in good faith')
    expect(files['data-processing-information.md']).toContain('does not certify or guarantee full compliance')
    expect(files['data-processing-information.md']).toContain('not legal advice')
    expect(files['data-processing-information.md']).toContain('data controller where applicable')
    expect(files['data-processing-information.md']).toContain('possible rights')
    expect(files['data-processing-information.md']).toContain('keyed, pseudonymous digest')
    expect(files['data-processing-information.md']).toContain('365 days')
    expect(files['data-processing-information.md']).toContain('This ZIP archive is not encrypted')
    expect(files['data-processing-information.md']).toContain('https://ico.org.uk/')
    expect(files['data-processing-information.md']).not.toContain('Instance operator / controller')
  })

  it('creates a readable ZIP containing independently parseable JSON files', async () => {
    const files = buildDataExportFiles(exportData(), instance, request, exportedAt)
    const bytes = await buildDataExportZip(files)
    const zip = await JSZip.loadAsync(bytes)

    expect(Object.keys(zip.files).sort()).toEqual(Object.keys(files).sort())
    for (const filename of Object.keys(files).filter(name => name.endsWith('.json'))) {
      const contents = await zip.file(filename).async('string')
      expect(() => JSON.parse(contents)).not.toThrow()
    }
  })

  it('uses a portable UTC timestamp in the archive filename', () => {
    expect(dataExportFilename(exportedAt)).toBe(
      'timetable-toolkit-data-export-2026-07-20T12-34-56Z.zip',
    )
  })
})
