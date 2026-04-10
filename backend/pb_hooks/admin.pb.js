// Block banned users from logging in + record login log on success.
// v0.23+: Before/After hooks merged into single hook with e.next().

onRecordAuthWithPasswordRequest(function(e) {
  var record = e.record
  if (record && record.getBool('is_banned')) {
    throw new BadRequestError('Account suspended. Please contact the administrator')
  }

  // 在 hook 上下文中 e.request 为 undefined，必须用 e.requestInfo().headers。
  // PocketBase 将 header key 转为小写下划线格式（CF-Connecting-IP → cf_connecting_ip）。
  var rawIp = '', country = ''
  try {
    var hi = e.requestInfo().headers
    rawIp = (
      hi['cf_connecting_ip'] ||
      hi['x_real_ip'] ||
      (hi['x_forwarded_for'] || '').split(',')[0]
    ).trim()
    country = (hi['cf_ipcountry'] || '').trim()
  } catch (_) {}

  e.next()

  // Record a login log entry on every successful password auth.
  if (!e.record) return
  var prefix = rawIp
  var v4m = rawIp.match(/^(\d+\.\d+\.\d+)\.\d+$/)
  if (v4m) { prefix = v4m[1] + '.x' }
  else if (rawIp.indexOf(':') !== -1) { prefix = rawIp.split(':').slice(0, 4).join(':') + ':...' }

  // 用 ip-api.com 查询城市（CF 免费计划不提供 CF-IPCity）
  var city = ''
  var isPrivate = !rawIp || /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|::1$)/.test(rawIp)
  if (!isPrivate) {
    try {
      var geoRes = $http.send({
        url: 'http://ip-api.com/json/' + rawIp + '?fields=status,countryCode,city',
        method: 'GET',
        timeout: 3,
      })
      if (geoRes.statusCode === 200 && geoRes.raw) {
        var geoData = JSON.parse(geoRes.raw)
        if (geoData.status === 'success') {
          city = geoData.city || ''
          if (!country && geoData.countryCode) country = geoData.countryCode
        }
      }
    } catch (_) {}
  }

  try {
    var col = $app.findCollectionByNameOrId('login_logs')
    var rec = new Record(col)
    rec.set('user_id', e.record.id)
    rec.set('email', e.record.email())
    rec.set('ip_full', rawIp)
    rec.set('ip_prefix', prefix)
    rec.set('country', country)
    $app.save(rec)
    $app.db()
      .newQuery("UPDATE login_logs SET city = {:city} WHERE id = {:id}")
      .bind({ city: city, id: rec.id })
      .execute()
  } catch (_) {}
}, 'users')

// Block banned users from refreshing their token.
onRecordAuthRefreshRequest(function(e) {
  if (e.record && e.record.getBool('is_banned')) {
    throw new BadRequestError('Account suspended. Please contact the administrator')
  }
  e.next()
}, 'users')

// 解封用户时重置 ban_empty_served，确保下次重新封禁仍能走空日历清缓存流程。
onRecordUpdateRequest(function(e) {
  e.next()
  if (e.record && !e.record.getBool('is_banned')) {
    try {
      $app.db()
        .newQuery('UPDATE ical_tokens SET ban_empty_served = 0 WHERE "user" = {:userId}')
        .bind({ userId: e.record.id })
        .execute()
    } catch (_) {}
  }
}, 'users')
