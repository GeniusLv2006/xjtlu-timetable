// 大小写不敏感的用户登录路由
// PocketBase 原生 authWithPassword 使用 SQLite = 精确匹配（区分大小写）。
// 本路由改用 LOWER(email) 查找，密码验证通过后返回标准 auth 响应，
// 同时保留原始邮箱的存储格式不变。

routerAdd('POST', '/api/custom/users/auth', function(e) {
  var data = new DynamicModel({ identity: '', password: '' })
  e.bindBody(data)

  var email    = (data.identity || '').trim()
  var password = data.password || ''

  if (!email || !password) {
    throw new BadRequestError('请填写邮箱和密码')
  }

  // 大小写不敏感查询
  var record
  try {
    record = $app.dao().findFirstRecordByFilter(
      'users',
      'LOWER(email) = {:email}',
      { email: email.toLowerCase() }
    )
  } catch (_) {
    throw new UnauthorizedError('邮箱或密码不正确')
  }

  if (!record || !record.validatePassword(password)) {
    throw new UnauthorizedError('邮箱或密码不正确')
  }

  // 封禁检测（与 admin.pb.js onRecordBeforeAuthWithPasswordRequest 保持一致）
  if (record.getBool('is_banned')) {
    throw new BadRequestError('Account suspended. Please contact the administrator')
  }

  // 登录日志（与 admin.pb.js onRecordAfterAuthWithPasswordRequest 保持一致）
  try {
    var ctx     = e.httpContext
    var rawIp   = (ctx.request().header.get('CF-Connecting-IP') ||
                   ctx.request().header.get('X-Real-IP') ||
                   ctx.request().header.get('X-Forwarded-For') || '').split(',')[0].trim()
    var country = ctx.request().header.get('CF-IPCountry') || ''
    var prefix  = rawIp
    var v4m = rawIp.match(/^(\d+\.\d+\.\d+)\.\d+$/)
    if (v4m) { prefix = v4m[1] + '.x' }
    else if (rawIp.indexOf(':') !== -1) { prefix = rawIp.split(':').slice(0, 4).join(':') + ':...' }

    var col = $app.dao().findCollectionByNameOrId('login_logs')
    var rec = new Record(col)
    rec.set('user_id',   record.id)
    rec.set('email',     record.email())
    rec.set('ip_full',   rawIp)
    rec.set('ip_prefix', prefix)
    rec.set('country',   country)
    $app.dao().saveRecord(rec)
  } catch (_) {}

  return $apis.recordAuthResponse(e, record, null)
})
