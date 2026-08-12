/// <reference path="../pb_data/types.d.ts" />

routerAdd('GET', '/api/user-data-export/status', function(e) {
  var auth = e.requestInfo().auth
  if (!auth || auth.collection().name !== 'users') {
    throw new ForbiddenError('Please sign in to export your data')
  }
  if (auth.getBool('is_banned') && !auth.getBool('restricted_login_allowed')) {
    throw new ForbiddenError('Account suspended. Please contact the administrator')
  }

  var record = null
  try {
    record = $app.findFirstRecordByFilter(
      'data_export_requests',
      'user = {:userId}',
      { userId: auth.id },
    )
  } catch (_) {}
  var now = new Date()
  var requestedAt = record ? new Date(record.getString('requested_at')) : null
  if (requestedAt && !Number.isFinite(requestedAt.getTime())) requestedAt = null
  var nextAllowedAt = requestedAt
    ? new Date(requestedAt.getTime() + 24 * 60 * 60 * 1000)
    : null
  var cooldownSeconds = nextAllowedAt
    ? Math.max(0, Math.ceil((nextAllowedAt.getTime() - now.getTime()) / 1000))
    : 0
  return e.json(200, {
    can_export: cooldownSeconds === 0,
    last_requested_at: requestedAt ? requestedAt.toISOString() : null,
    next_allowed_at: nextAllowedAt ? nextAllowedAt.toISOString() : null,
    cooldown_seconds: cooldownSeconds,
  })
}, $apis.requireAuth('users'))

routerAdd('POST', '/api/user-data-export/authorize', function(e) {
  var auth = e.requestInfo().auth
  if (!auth || auth.collection().name !== 'users') {
    throw new ForbiddenError('Please sign in to export your data')
  }
  if (auth.getBool('is_banned') && !auth.getBool('restricted_login_allowed')) {
    throw new ForbiddenError('Account suspended. Please contact the administrator')
  }

  var now = new Date()
  var nowIso = now.toISOString()
  var result = $app.db()
    .newQuery([
      'INSERT INTO data_export_requests',
      '  (id, "user", requested_at, created, updated)',
      'VALUES',
      '  ({:id}, {:userId}, {:now}, {:now}, {:now})',
      'ON CONFLICT("user") DO UPDATE SET',
      '  requested_at = excluded.requested_at,',
      '  updated = excluded.updated',
      'WHERE datetime(data_export_requests.requested_at)',
      '  <= datetime(excluded.requested_at, \'-24 hours\')',
    ].join(' '))
    .bind({
      id: $security.randomString(15).toLowerCase(),
      userId: auth.id,
      now: nowIso,
    })
    .execute()

  var requestRecord = $app.findFirstRecordByFilter(
    'data_export_requests',
    'user = {:userId}',
    { userId: auth.id },
  )
  var requestedAt = new Date(requestRecord.getString('requested_at'))
  var nextAllowedAt = new Date(requestedAt.getTime() + 24 * 60 * 60 * 1000)
  var cooldownSeconds = Math.max(
    0,
    Math.ceil((nextAllowedAt.getTime() - now.getTime()) / 1000),
  )
  if (result.rowsAffected() !== 1) {
    e.response.header().set('Retry-After', String(cooldownSeconds))
    return e.json(429, {
      can_export: false,
      last_requested_at: requestedAt.toISOString(),
      next_allowed_at: nextAllowedAt.toISOString(),
      cooldown_seconds: cooldownSeconds,
    })
  }

  var fields = {
    account: [
      'id', 'email', 'username', 'name', 'nickname', 'verified',
      'emailVisibility', 'is_banned', 'restricted_login_allowed',
      'must_change_pwd', 'can_invite', 'invite_quota', 'invite_max_uses',
      'invite_validity_days', 'created', 'updated',
    ],
    timetables: ['id', 'user', 'label', 'hash', 'visibility', 'last_synced', 'created', 'updated'],
    courses: [
      'id', 'timetable', 'code', 'activity_type', 'section', 'day', 'start_time',
      'end_time', 'location', 'staff', 'weeks', 'identity', 'created', 'updated',
    ],
    friendships: ['id', 'from_user', 'to_user', 'status', 'created', 'updated'],
    ical_tokens: [
      'id', 'user', 'token', 'is_suspicious', 'is_revoked', 'suspicious_at',
      'revoked_at', 'ban_empty_served_at', 'revoke_empty_served_at', 'created', 'updated',
    ],
    invite_codes: [
      'id', 'code', 'created_by', 'max_uses', 'uses', 'expires_at', 'is_active',
      'note', 'created', 'updated',
    ],
    login_logs: [
      'id', 'user_id', 'email', 'ip_full', 'ip_prefix', 'country',
      'user_agent', 'created', 'updated',
    ],
    ical_access_logs: [
      'id', 'user_id', 'email', 'ip_full', 'ip_prefix', 'country',
      'user_agent', 'created', 'updated',
    ],
    legal_acceptances: [
      'id', 'user', 'legal_notice_version', 'legal_notice_accepted', 'minimum_age',
      'minimum_age_confirmed', 'created', 'updated',
    ],
  }
  var serialize = function(record, names) {
    var item = {}
    for (var name of names) item[name] = record.get(name)
    return item
  }
  var find = function(collection, filter, names) {
    var output = []
    var offset = 0
    var pageSize = 1000
    while (true) {
      var batch = $app.findRecordsByFilter(
        collection,
        filter,
        'created',
        pageSize,
        offset,
        { userId: auth.id },
      )
      for (var record of batch) output.push(serialize(record, names))
      if (batch.length < pageSize) break
      offset += batch.length
    }
    return output
  }
  var data = {
    user: serialize(auth, fields.account),
    timetables: find('timetables', 'user = {:userId}', fields.timetables),
    courses: find('courses', 'timetable.user = {:userId}', fields.courses),
    friendships: find(
      'friendships',
      'from_user = {:userId} || to_user = {:userId}',
      fields.friendships,
    ),
    ical_tokens: find('ical_tokens', 'user = {:userId}', fields.ical_tokens),
    invite_codes: find('invite_codes', 'created_by = {:userId}', fields.invite_codes),
    login_logs: find('login_logs', 'user_id = {:userId}', fields.login_logs),
    ical_access_logs: find('ical_access_logs', 'user_id = {:userId}', fields.ical_access_logs),
    legal_acceptances: find('legal_acceptances', 'user = {:userId}', fields.legal_acceptances),
  }

  return e.json(200, {
    authorized_at: requestedAt.toISOString(),
    next_allowed_at: nextAllowedAt.toISOString(),
    cooldown_seconds: 24 * 60 * 60,
    data: data,
  })
}, $apis.requireAuth('users'))
