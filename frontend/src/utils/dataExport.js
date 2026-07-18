const fields = {
  user: [
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

function selectFields(record, names) {
  return Object.fromEntries(
    names
      .filter(name => record?.[name] !== undefined)
      .map(name => [name, record[name]])
  )
}

export function buildDataExportPayload(data, exportedAt = new Date().toISOString()) {
  const payload = {
    export_version: 2,
    exported_at: exportedAt,
    user: selectFields(data.user, fields.user),
  }

  for (const category of Object.keys(fields).filter(name => name !== 'user')) {
    payload[category] = (data[category] || []).map(record =>
      selectFields(record, fields[category])
    )
  }

  return payload
}
