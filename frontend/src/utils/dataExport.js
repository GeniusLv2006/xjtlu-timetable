import JSZip from 'jszip'

export const DATA_EXPORT_FORMAT_VERSION = 3

const fields = {
  account: [
    'id',
    'email',
    'username',
    'name',
    'nickname',
    'verified',
    'emailVisibility',
    'is_banned',
    'must_change_pwd',
    'can_invite',
    'invite_quota',
    'invite_max_uses',
    'invite_validity_days',
    'created',
    'updated',
  ],
  timetables: [
    'id',
    'user',
    'label',
    'hash',
    'visibility',
    'last_synced',
    'created',
    'updated',
  ],
  courses: [
    'id',
    'timetable',
    'code',
    'activity_type',
    'section',
    'day',
    'start_time',
    'end_time',
    'location',
    'staff',
    'weeks',
    'identity',
    'created',
    'updated',
  ],
  friendships: [
    'id',
    'from_user',
    'to_user',
    'status',
    'created',
    'updated',
  ],
  ical_tokens: [
    'id',
    'user',
    'token',
    'is_suspicious',
    'is_revoked',
    'suspicious_at',
    'revoked_at',
    'ban_empty_served_at',
    'revoke_empty_served_at',
    'created',
    'updated',
  ],
  invite_codes: [
    'id',
    'code',
    'created_by',
    'max_uses',
    'uses',
    'expires_at',
    'is_active',
    'note',
    'created',
    'updated',
  ],
  login_logs: [
    'id',
    'user_id',
    'email',
    'ip_full',
    'ip_prefix',
    'country',
    'city',
    'isp',
    'user_agent',
    'created',
    'updated',
  ],
  ical_access_logs: [
    'id',
    'user_id',
    'email',
    'ip_full',
    'ip_prefix',
    'country',
    'city',
    'isp',
    'geo_source',
    'user_agent',
    'created',
    'updated',
  ],
  legal_acceptances: [
    'id',
    'user',
    'legal_notice_version',
    'legal_notice_accepted',
    'minimum_age',
    'minimum_age_confirmed',
    'created',
    'updated',
  ],
}

const categoryFiles = [
  ['account', 'account.json', 'Account profile and administrative settings'],
  ['timetables', 'timetables.json', 'Timetable records and source HASH credentials'],
  ['courses', 'courses.json', 'Course, schedule, location and teaching staff data'],
  ['friendships', 'friendships.json', 'Friend requests and accepted relationships'],
  ['ical_tokens', 'ical-tokens.json', 'Calendar subscription bearer tokens and risk state'],
  ['invite_codes', 'invite-codes.json', 'Invitation codes created by this account'],
  ['login_logs', 'login-logs.json', 'Application login security records'],
  ['ical_access_logs', 'ical-access-logs.json', 'Calendar subscription access records'],
  ['legal_acceptances', 'legal-acceptances.json', 'Recorded legal notice and age confirmations'],
]

function selectFields(record, names) {
  return Object.fromEntries(
    names
      .filter(name => record?.[name] !== undefined)
      .map(name => [name, record[name]])
  )
}

function singleLine(value, fallback) {
  const normalized = String(value || '').replace(/[\r\n]+/g, ' ').trim()
  return normalized || fallback
}

function json(value) {
  return `${JSON.stringify(value, null, 2)}\n`
}

function processingInformation(instance, request, exportedAt) {
  const instanceName = singleLine(instance.instance_name, 'This service instance')
  const operatorName = singleLine(instance.operator_name, 'the instance operator')
  const contact = singleLine(instance.operator_contact_email, 'not provided')
  const noticeUrl = singleLine(instance.legal_notice_url, 'not provided')
  const noticeVersion = singleLine(instance.legal_notice_version, 'not provided')

  return `# Data Processing Information

Exported at: ${exportedAt}

Service instance: ${instanceName}

Instance operator / controller: ${operatorName}

Privacy contact: ${contact}

Privacy notice: ${noticeUrl}

Privacy notice version: ${noticeVersion}

## Purpose and status of this document

This document is an information snapshot generated with a self-service data export. It explains the files in this archive and supplements, but does not replace, the privacy notice for this service instance. It is not legal advice and does not exclude or limit any responsibility, obligation, remedy or data protection right that cannot lawfully be excluded or limited.

The archive is intended to help you inspect and reuse account-related information held in the application's user-facing database. It is not necessarily a complete response to a formal UK GDPR Article 15 subject access request. Reverse-proxy logs, PocketBase operational logs, backups, third-party service records, correspondence and information held outside the application database may not be included. Contact the controller if you require a formal access request or information about those systems.

## Files and processing purposes

- \`account.json\`: account identification, authentication state and administration settings used to provide and protect the account.
- \`timetables.json\` and \`courses.json\`: information used to display, synchronize and compare timetables. Course records may contain professional information about teaching staff.
- \`friendships.json\`: friend requests and accepted relationships used for timetable sharing and comparison.
- \`ical-tokens.json\`: bearer tokens and security state used to provide calendar subscriptions and respond to suspected misuse.
- \`invite-codes.json\`: invitation records used to operate controlled registration.
- \`login-logs.json\` and \`ical-access-logs.json\`: network and device information used for security monitoring, incident investigation and user-visible access history. Application security logs are normally removed after 30 days.
- \`legal-acceptances.json\`: records used to demonstrate acceptance of the applicable notice and minimum-age confirmation.
- \`data-export-request.json\`: the latest approved export time retained while the account exists so that the service can enforce its rolling 24-hour export limit. The approved time for this archive is ${singleLine(request.authorized_at, exportedAt)}.

Most information comes from you, your browser or your use of the service. Timetable and teaching staff information is obtained when a user imports a timetable. Network and approximate location information may be supplied by the connection or reverse proxy. Where the UK GDPR applies, the instance privacy notice should identify the controller's applicable lawful bases, recipients, processors, international transfers and detailed retention arrangements.

## Your rights

Where the UK GDPR applies, you may have rights to request access, correction or erasure; restrict processing; object to processing based on legitimate interests; receive portable data; and complain to a supervisory authority. These rights depend on the circumstances and may be limited by law. Use the privacy contact above for a formal request. You may also complain to the UK Information Commissioner's Office: https://ico.org.uk/make-a-complaint/data-protection-complaints/

## Security and responsible use

This ZIP archive is not encrypted. It may contain confidential bearer credentials and security data, including timetable HASH credentials, iCal tokens, invitation codes, complete IP addresses and user-agent strings. Anyone who obtains an active bearer credential may be able to use it without your password. Store the archive securely, do not publish it, and revoke exposed credentials where the service provides that option.

Course data may identify teaching staff in their professional capacity. Do not redistribute or use that information for unrelated profiling, evaluation or contact.
`
}

export function buildDataExportFiles(
  data,
  instance = {},
  request = {},
  exportedAt = new Date().toISOString(),
) {
  const files = {}
  const manifestEntries = [
    {
      name: 'manifest.json',
      description: 'Archive format, instance metadata and file inventory',
      record_count: null,
    },
    {
      name: 'data-processing-information.md',
      description: 'English data processing information and archive safety notice',
      record_count: null,
    },
  ]

  for (const [category, filename, description] of categoryFiles) {
    const value = category === 'account'
      ? selectFields(data.user, fields.account)
      : (data[category] || []).map(record => selectFields(record, fields[category]))
    files[filename] = json(value)
    manifestEntries.push({
      name: filename,
      description,
      record_count: Array.isArray(value) ? value.length : (Object.keys(value).length ? 1 : 0),
    })
  }

  const exportRequest = {
    authorized_at: request.authorized_at || null,
    next_allowed_at: request.next_allowed_at || null,
    cooldown_seconds: Number(request.cooldown_seconds) || 0,
  }
  files['data-export-request.json'] = json(exportRequest)
  manifestEntries.push({
    name: 'data-export-request.json',
    description: 'Server-authorized export time and rolling cooldown',
    record_count: request.authorized_at ? 1 : 0,
  })

  const manifest = {
    export_format_version: DATA_EXPORT_FORMAT_VERSION,
    exported_at: exportedAt,
    instance: {
      name: instance.instance_name || null,
      operator: instance.operator_name || null,
      privacy_contact: instance.operator_contact_email || null,
      privacy_notice_url: instance.legal_notice_url || null,
      privacy_notice_version: instance.legal_notice_version || null,
    },
    files: manifestEntries,
  }
  files['manifest.json'] = json(manifest)
  files['data-processing-information.md'] = processingInformation(
    instance,
    exportRequest,
    exportedAt,
  )

  return files
}

export async function buildDataExportZip(files) {
  const zip = new JSZip()
  for (const [filename, contents] of Object.entries(files)) {
    zip.file(filename, contents)
  }
  return zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })
}

export function dataExportFilename(exportedAt = new Date().toISOString()) {
  const timestamp = exportedAt.replace(/\.\d{3}Z$/, 'Z').replaceAll(':', '-')
  return `timetable-toolkit-data-export-${timestamp}.zip`
}
