// Block banned users from logging in + record login log on success.
// v0.23+: Before/After hooks merged into single hook with e.next().

onRecordAuthWithPasswordRequest(function(e) {
  var record = e.record
  if (record && record.getBool('is_banned')) {
    throw new BadRequestError('Account suspended. Please contact the administrator')
  }

  // 调试日志：输出所有可用方式的结果，用于诊断 header 读取失败原因
  var rawIp = '', country = ''
  try {
    var h = e.request.header
    var cfMap = h['Cf-Connecting-Ip']
    var xrMap = h['X-Real-Ip']
    var xffMap = h['X-Forwarded-For']
    console.log('[login-debug] map cf=' + JSON.stringify(cfMap) + ' xr=' + JSON.stringify(xrMap) + ' xff=' + JSON.stringify(xffMap))
    rawIp = (
      ((cfMap || [])[0]) || ((xrMap || [])[0]) ||
      (((xffMap || [])[0]) || '').split(',')[0]
    ).trim()
    country = ((h['Cf-Ipcountry'] || [])[0] || '').trim()
  } catch (err) {
    console.log('[login-debug] map error: ' + String(err))
  }

  if (!rawIp) {
    try {
      var hi = e.requestInfo().headers
      console.log('[login-debug] requestInfo keys=' + JSON.stringify(Object.keys(hi)) + ' cf=' + hi['cf-connecting-ip'] + ' xr=' + hi['x-real-ip'])
      rawIp = (hi['cf-connecting-ip'] || hi['x-real-ip'] || (hi['x-forwarded-for'] || '').split(',')[0]).trim()
      if (!country) country = (hi['cf-ipcountry'] || '').trim()
    } catch (err) {
      console.log('[login-debug] requestInfo error: ' + String(err))
    }
  }

  console.log('[login-debug] final rawIp=' + rawIp + ' country=' + country)

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
