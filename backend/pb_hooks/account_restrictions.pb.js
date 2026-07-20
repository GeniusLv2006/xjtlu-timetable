/// <reference path="../pb_data/types.d.ts" />

onRecordDeleteRequest(function(e) {
  var createdId = null
  if (e.record && e.record.getBool('is_banned')) {
    var retentionDays = 365
    try {
      var configs = $app.findRecordsByFilter('site_config', 'id != ""', 'created', 1, 0)
      if (configs.length) retentionDays = configs[0].getInt('blocked_registration_retention_days')
    } catch (_) {}
    if (retentionDays > 0) {
      var keys = ($os.getenv('ACCOUNT_BLOCK_HMAC_KEYS') || '')
        .split(',')
        .map(function(value) { return value.trim() })
        .filter(function(value) { return value.length >= 32 })
      if (!keys.length) {
        throw new BadRequestError('Account protection is temporarily unavailable. Please contact the administrator')
      }
      var email = String(e.record.email() || '').trim().toLowerCase()
      if (!email) throw new BadRequestError('Account email is unavailable')
      var digest = $security.hs256(email, keys[0])
      var existing = null
      try {
        existing = $app.findFirstRecordByFilter(
          'blocked_registration_identifiers',
          'identifier_hash = {:digest}',
          { digest: digest },
        )
      } catch (_) {}
      var expiresAt = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000).toISOString()
      if (existing) {
        existing.set('expires_at', expiresAt)
        existing.set('algorithm', 'hmac-sha256-v1')
        $app.save(existing)
      } else {
        var collection = $app.findCollectionByNameOrId('blocked_registration_identifiers')
        var created = new Record(collection)
        created.set('identifier_hash', digest)
        created.set('algorithm', 'hmac-sha256-v1')
        created.set('expires_at', expiresAt)
        $app.save(created)
        createdId = created.id
      }
    }
  }
  try {
    e.next()
  } catch (err) {
    if (createdId) {
      try {
        var created = $app.findRecordById('blocked_registration_identifiers', createdId)
        $app.delete(created)
      } catch (_) {}
    }
    throw err
  }
}, 'users')

onRecordUpdateRequest(function(e) {
  var auth = e.requestInfo().auth
  var body = e.requestInfo().body || {}
  var isUser = false
  try { isUser = auth && auth.collection().name === 'users' } catch (_) {}
  if (isUser) {
    for (var field of [
      'is_banned',
      'restricted_login_allowed',
      'must_change_pwd',
      'can_invite',
      'invite_quota',
      'invite_max_uses',
      'invite_validity_days',
    ]) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        throw new ForbiddenError('This account setting can only be changed by an administrator')
      }
    }
  }
  if (!e.record.getBool('is_banned')) e.record.set('restricted_login_allowed', false)
  e.next()
}, 'users')

onRecordUpdateRequest(function(e) {
  e.next()
  var nextDays = e.record.getInt('blocked_registration_retention_days')
  try {
    if (nextDays === 0) {
      $app.db().newQuery('DELETE FROM blocked_registration_identifiers').execute()
      return
    }
    $app.db().newQuery([
      'UPDATE blocked_registration_identifiers',
      'SET expires_at = datetime(created, {:modifier})',
      'WHERE datetime(expires_at) > datetime(created, {:modifier})',
    ].join(' ')).bind({ modifier: '+' + nextDays + ' days' }).execute()
    $app.db().newQuery(
      "DELETE FROM blocked_registration_identifiers WHERE datetime(expires_at) <= datetime('now')",
    ).execute()
  } catch (err) {
    console.error('account_restrictions: failed to shorten retention:', err)
  }
}, 'site_config')

routerAdd('POST', '/api/account/delete', function(e) {
  var auth = e.requestInfo().auth
  if (!auth || auth.collection().name !== 'users') throw new ForbiddenError('Please sign in')
  if (auth.getBool('is_banned') && !auth.getBool('restricted_login_allowed')) {
    throw new ForbiddenError('Account access is suspended')
  }
  var password = String((e.requestInfo().body || {})['password'] || '')
  if (!password || !auth.validatePassword(password)) {
    throw new BadRequestError('当前密码不正确')
  }
  var createdId = null
  if (auth.getBool('is_banned')) {
    var retentionDays = 365
    try {
      var configs = $app.findRecordsByFilter('site_config', 'id != ""', 'created', 1, 0)
      if (configs.length) retentionDays = configs[0].getInt('blocked_registration_retention_days')
    } catch (_) {}
    if (retentionDays > 0) {
      var keys = ($os.getenv('ACCOUNT_BLOCK_HMAC_KEYS') || '')
        .split(',')
        .map(function(value) { return value.trim() })
        .filter(function(value) { return value.length >= 32 })
      if (!keys.length) {
        throw new BadRequestError('Account protection is temporarily unavailable. Please contact the administrator')
      }
      var email = String(auth.email() || '').trim().toLowerCase()
      var digest = $security.hs256(email, keys[0])
      var existing = null
      try {
        existing = $app.findFirstRecordByFilter(
          'blocked_registration_identifiers',
          'identifier_hash = {:digest}',
          { digest: digest },
        )
      } catch (_) {}
      var expiresAt = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000).toISOString()
      if (existing) {
        existing.set('expires_at', expiresAt)
        existing.set('algorithm', 'hmac-sha256-v1')
        $app.save(existing)
      } else {
        var collection = $app.findCollectionByNameOrId('blocked_registration_identifiers')
        var created = new Record(collection)
        created.set('identifier_hash', digest)
        created.set('algorithm', 'hmac-sha256-v1')
        created.set('expires_at', expiresAt)
        $app.save(created)
        createdId = created.id
      }
    }
  }
  try {
    $app.delete(auth)
  } catch (err) {
    if (createdId) {
      try {
        var createdRecord = $app.findRecordById('blocked_registration_identifiers', createdId)
        $app.delete(createdRecord)
      } catch (_) {}
    }
    throw err
  }
  return e.json(200, { deleted: true })
}, $apis.requireAuth('users'))

routerAdd('POST', '/api/admin/registration-block/remove', function(e) {
  var auth = e.requestInfo().auth
  if (!auth || auth.collection().name !== '_superusers') throw new ForbiddenError('Administrator access required')
  var email = String((e.requestInfo().body || {})['email'] || '').trim().toLowerCase()
  if (!email || email.indexOf('@') < 1) throw new BadRequestError('请输入有效的邮箱地址')
  var keys = ($os.getenv('ACCOUNT_BLOCK_HMAC_KEYS') || '')
    .split(',')
    .map(function(value) { return value.trim() })
    .filter(function(value) { return value.length >= 32 })
  if (!keys.length) {
    throw new BadRequestError('Account protection is temporarily unavailable. Please contact the administrator')
  }
  var removed = 0
  for (var key of keys) {
    var digest = $security.hs256(email, key)
    try {
      var record = $app.findFirstRecordByFilter(
        'blocked_registration_identifiers',
        'identifier_hash = {:digest}',
        { digest: digest },
      )
      $app.delete(record)
      removed += 1
    } catch (_) {}
  }
  return e.json(200, { removed: removed > 0 })
}, $apis.requireAuth('_superusers'))
