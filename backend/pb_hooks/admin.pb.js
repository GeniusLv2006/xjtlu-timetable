// Block banned users from logging in + record login log on success.

onRecordAuthWithPasswordRequest(function(e) {
  var record = e.record
  if (record && record.getBool('is_banned')) {
    throw new BadRequestError('Account suspended. Please contact the administrator')
  }
  e.next()
}, 'users')

// 用 routerAdd 拦截登录请求记录 IP（在此上下文中 e.request.header.get() 可正常访问）。
// hook 上下文中 e.request 因多层 Go struct embedding 在 goja 中无法正常提升字段，
// 故改用与 ical_access_logs 相同的 routerAdd 方式。
routerAdd('POST', '/api/collections/users/auth-with-password', function(e) {
  // 1. 读取真实客户端 IP（routerAdd 上下文，与 ical 相同）
  var rawIp = (e.request.header.get('CF-Connecting-IP') ||
               e.request.header.get('X-Real-IP') ||
               e.request.header.get('X-Forwarded-For') || '').split(',')[0].trim()
  var country = e.request.header.get('CF-IPCountry') || ''

  // 2. 读取登录身份（email 或 username），用于事后查找用户
  var identity = ''
  try { identity = (e.requestInfo().body['identity'] || '').trim() } catch (_) {}

  // 3. 执行真正的认证（ban check hook 在此 next() 链中运行）
  //    认证失败或被 ban 时会抛出异常，后续代码不会执行 → 不记录日志，符合预期
  e.next()

  // 4. 到达此处说明认证成功，查找对应用户
  var user = null
  if (identity) {
    try { user = $app.findAuthRecordByEmail('users', identity) } catch (_) {}
    if (!user) {
      try {
        user = $app.findFirstRecordByFilter('users', 'username = {:u}', { u: identity })
      } catch (_) {}
    }
  }
  if (!user) return

  // 5. IP 前缀
  var prefix = rawIp
  var v4m = rawIp.match(/^(\d+\.\d+\.\d+)\.\d+$/)
  if (v4m) { prefix = v4m[1] + '.x' }
  else if (rawIp.indexOf(':') !== -1) { prefix = rawIp.split(':').slice(0, 4).join(':') + ':...' }

  // 6. 城市查询（ip-api.com，CF 免费计划不提供 CF-IPCity）
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

  // 7. 写入登录日志
  try {
    var col = $app.findCollectionByNameOrId('login_logs')
    var rec = new Record(col)
    rec.set('user_id', user.id)
    rec.set('email', user.email())
    rec.set('ip_full', rawIp)
    rec.set('ip_prefix', prefix)
    rec.set('country', country)
    $app.save(rec)
    // city 通过原始 SQL 写入（绕过 PB schema 注册顺序问题）
    $app.db()
      .newQuery("UPDATE login_logs SET city = {:city} WHERE id = {:id}")
      .bind({ city: city, id: rec.id })
      .execute()
  } catch (_) {}
})

// Block banned users from refreshing their token.
onRecordAuthRefreshRequest(function(e) {
  if (e.record && e.record.getBool('is_banned')) {
    throw new BadRequestError('Account suspended. Please contact the administrator')
  }
  e.next()
}, 'users')
