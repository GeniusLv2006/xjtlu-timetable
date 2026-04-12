// Block banned users from logging in + record login log on success.
// v0.23+: Before/After hooks merged into single hook with e.next().

onRecordAuthWithPasswordRequest(function(e) {
  var record = e.record
  if (record && record.getBool('is_banned')) {
    throw new BadRequestError('Account suspended. Please contact the administrator')
  }

  // 在 hook 上下文中 e.request 为 undefined，必须用 e.requestInfo().headers。
  // PocketBase 将 header key 转为小写下划线格式（CF-Connecting-IP → cf_connecting_ip）。
  var rawIp = '', country = '', userAgent = ''
  try {
    var hi = e.requestInfo().headers
    rawIp = (
      hi['cf_connecting_ip'] ||
      hi['x_real_ip'] ||
      (hi['x_forwarded_for'] || '').split(',')[0]
    ).trim()
    country = (hi['cf_ipcountry'] || '').trim()
    userAgent = (hi['user_agent'] || '').trim()
  } catch (_) {}

  e.next()

  // Record a login log entry on every successful password auth.
  if (!e.record) return
  var prefix = rawIp
  var v4m = rawIp.match(/^(\d+\.\d+\.\d+)\.\d+$/)
  if (v4m) { prefix = v4m[1] + '.x' }
  else if (rawIp.indexOf(':') !== -1) { prefix = rawIp.split(':').slice(0, 4).join(':') + ':...' }

  // 用 ip.sb 查询城市/ISP（优先），ip-api.com 作为备用
  var city = ''
  var isp  = ''
  var isPrivateIp = !rawIp || /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|::1$)/.test(rawIp)
  if (!isPrivateIp) {
    try {
      var gr = $http.send({ url: 'https://api.ip.sb/geoip/' + rawIp, method: 'GET', timeout: 3 })
      if (gr.statusCode === 200 && gr.raw) {
        var gd = JSON.parse(gr.raw)
        city = gd.city || ''
        isp  = gd.isp  || ''
        if (!country && gd.country_code) country = gd.country_code
      }
    } catch (_) {}
    if (!city) {
      try {
        var gr2 = $http.send({
          url: 'http://ip-api.com/json/' + rawIp + '?fields=status,countryCode,city,isp',
          method: 'GET',
          timeout: 3,
        })
        if (gr2.statusCode === 200 && gr2.raw) {
          var gd2 = JSON.parse(gr2.raw)
          if (gd2.status === 'success') {
            city = gd2.city || ''
            if (!isp && gd2.isp) isp = gd2.isp
            if (!country && gd2.countryCode) country = gd2.countryCode
          }
        }
      } catch (_) {}
    }
  }

  try {
    var col = $app.findCollectionByNameOrId('login_logs')
    var rec = new Record(col)
    rec.set('user_id', e.record.id)
    rec.set('email', e.record.email())
    rec.set('ip_full', rawIp)
    rec.set('ip_prefix', prefix)
    rec.set('country', country)
    rec.set('user_agent', userAgent)
    $app.save(rec)
    $app.db()
      .newQuery("UPDATE login_logs SET city = {:city}, isp = {:isp} WHERE id = {:id}")
      .bind({ city: city, isp: isp, id: rec.id })
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
        .newQuery("UPDATE ical_tokens SET ban_empty_served = 0, ban_empty_served_at = '' WHERE \"user\" = {:userId}")
        .bind({ userId: e.record.id })
        .execute()
    } catch (_) {}
  }
}, 'users')
