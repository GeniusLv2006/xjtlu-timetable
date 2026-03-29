// Block banned users from logging in + record login log on success.
// v0.23+: Before/After hooks merged into single hook with e.next().

onRecordAuthWithPasswordRequest(function(e) {
  var record = e.record
  if (record && record.getBool('is_banned')) {
    throw new BadRequestError('Account suspended. Please contact the administrator')
  }

  // Capture request headers before e.next() — request object may be unavailable after.
  var rawIp = '', country = ''
  try {
    rawIp = (e.request.header.get('CF-Connecting-IP') ||
             e.request.header.get('X-Real-IP') ||
             e.request.header.get('X-Forwarded-For') || '').split(',')[0].trim()
    country = e.request.header.get('CF-IPCountry') || ''
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
    rec.set('city', city)
    $app.save(rec)
  } catch (_) {}
}, 'users')

// Block banned users from refreshing their token.
// This invalidates existing sessions when a user is suspended —
// the frontend calls authRefresh on startup and tab focus, so they get kicked out promptly.
onRecordAuthRefreshRequest(function(e) {
  if (e.record && e.record.getBool('is_banned')) {
    throw new BadRequestError('Account suspended. Please contact the administrator')
  }
  e.next()
}, 'users')
