/// <reference path="../pb_data/types.d.ts" />

routerAdd('GET', '/api/user-data-export/status', function(e) {
  var cooldownSecondsTotal = 24 * 60 * 60
  var auth = e.requestInfo().auth
  if (!auth || auth.collection().name !== 'users') {
    throw new ForbiddenError('Please sign in to export your data')
  }
  if (auth.getBool('is_banned')) {
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
    ? new Date(requestedAt.getTime() + cooldownSecondsTotal * 1000)
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
  var cooldownSecondsTotal = 24 * 60 * 60
  var auth = e.requestInfo().auth
  if (!auth || auth.collection().name !== 'users') {
    throw new ForbiddenError('Please sign in to export your data')
  }
  if (auth.getBool('is_banned')) {
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

  var record = $app.findFirstRecordByFilter(
    'data_export_requests',
    'user = {:userId}',
    { userId: auth.id },
  )
  var requestedAt = new Date(record.getString('requested_at'))
  var nextAllowedAt = new Date(
    requestedAt.getTime() + cooldownSecondsTotal * 1000,
  )
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

  return e.json(200, {
    authorized_at: requestedAt.toISOString(),
    next_allowed_at: nextAllowedAt.toISOString(),
    cooldown_seconds: cooldownSecondsTotal,
  })
}, $apis.requireAuth('users'))
