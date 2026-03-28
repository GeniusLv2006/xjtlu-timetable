// ── 邀请码系统（PocketBase 0.23+）────────────────────────────────────────
//
// v0.23+ 变更：
//   - onRecordBeforeCreateRequest → onRecordCreateRequest（需调用 e.next()）
//   - e.httpContext.get('requestInfo').data → e.requestInfo().body
//   - e.httpContext.get('admin') → 检查 auth 是否属于 _superusers 集合
//   - e.httpContext.get('authRecord') → e.requestInfo().auth
//   - $app.dao().* → $app.*
//
// 1. onRecordCreateRequest (users)        — 注册时验证邀请码并 +1 计数
// 2. onRecordCreateRequest (invite_codes) — 用户创建邀请码时检查权限

// ── 注册：验证邀请码 ───────────────────────────────────────────────────────
onRecordCreateRequest(function(e) {
  // ── 全局注册配置检查 ──────────────────────────────────────────────────
  var configs
  try {
    configs = $app.findRecordsByFilter('site_config', 'id != ""', '', 1, 0)
  } catch(_) { configs = [] }

  if (configs.length > 0) {
    var cfg = configs[0]

    // 注册开关
    if (!cfg.getBool('registration_open')) {
      throw new BadRequestError('注册暂未开放，请联系管理员')
    }

    // 邮箱后缀白名单
    var suffixes = cfg.getString('allowed_email_suffixes').trim()
    if (suffixes) {
      var body0 = e.requestInfo().body || {}
      var email = (body0['email'] || '').toLowerCase()
      var allowed = suffixes.split(',').map(function(s) { return s.trim().replace(/^@/, '').toLowerCase() })
      var ok = allowed.some(function(s) { return email.endsWith('@' + s) })
      if (!ok) {
        throw new BadRequestError('仅限以下邮箱后缀注册：@' + allowed.join('、@'))
      }
    }
  }

  // 是否需要邀请码
  var requireInvite = configs.length === 0 || configs[0].getBool('require_invite')
  if (!requireInvite) {
    e.next()
    return
  }

  var body = e.requestInfo().body || {}
  var code = (body['invite_code'] || '').trim()

  if (!code) {
    throw new BadRequestError('请填写邀请码')
  }

  var safeCode = code.replace(/["'\\]/g, '')

  var invites
  try {
    invites = $app.findRecordsByFilter(
      'invite_codes',
      'code = "' + safeCode + '"',
      '-created', 1, 0
    )
  } catch (err) {
    throw new BadRequestError('邀请码无效')
  }

  if (!invites || invites.length === 0) {
    throw new BadRequestError('邀请码不存在')
  }

  var invite = invites[0]

  if (!invite.getBool('is_active')) {
    throw new BadRequestError('邀请码已停用')
  }

  var expiresAt = invite.getString('expires_at')
  if (expiresAt && new Date(expiresAt) < new Date()) {
    throw new BadRequestError('邀请码已过期')
  }

  var maxUses = invite.getInt('max_uses')
  var uses    = invite.getInt('uses')
  if (maxUses > 0 && uses >= maxUses) {
    throw new BadRequestError('邀请码已达使用上限')
  }

  // 验证通过：立即 +1
  var newUses = uses + 1
  invite.set('uses', newUses)
  if (maxUses > 0 && newUses >= maxUses) {
    invite.set('is_active', false)
  }
  try {
    $app.save(invite)
  } catch (err) {
    console.error('invite_hook: failed to update invite uses:', err)
  }

  e.next()
}, 'users')

// ── 用户创建邀请码：权限 & 配额检查 ──────────────────────────────────────
onRecordCreateRequest(function(e) {
  var authRecord = e.requestInfo().auth
  var isAdmin = false
  try {
    isAdmin = authRecord && authRecord.collection().name === '_superusers'
  } catch(_) {}
  var authUser = (authRecord && !isAdmin) ? authRecord : null

  // 管理员直接放行
  if (isAdmin) {
    e.record.set('uses', 0)
    e.record.set('is_active', true)
    e.next()
    return
  }

  if (!authUser) {
    throw new BadRequestError('请先登录')
  }

  if (!authUser.getBool('can_invite')) {
    throw new BadRequestError('您没有创建邀请码的权限')
  }

  // 检查配额
  var quota = authUser.getInt('invite_quota')
  if (quota > 0) {
    var userId = authUser.id
    var existing
    try {
      existing = $app.findRecordsByFilter(
        'invite_codes',
        'created_by = "' + userId + '"',
        '', 500, 0
      )
    } catch (err) {
      existing = []
    }
    if (existing.length >= quota) {
      throw new BadRequestError('邀请码数量已达上限（' + quota + ' 个）')
    }
  }

  // 强制使用管理员设定的默认参数
  var maxUses      = authUser.getInt('invite_max_uses')
  var validityDays = authUser.getInt('invite_validity_days')

  if (maxUses > 0) {
    e.record.set('max_uses', maxUses)
  }
  if (validityDays > 0) {
    var expires = new Date()
    expires.setDate(expires.getDate() + validityDays)
    e.record.set('expires_at', expires.toISOString().slice(0, 19).replace('T', ' '))
  }

  e.record.set('created_by', authUser.id)
  e.record.set('uses', 0)
  e.record.set('is_active', true)

  e.next()
}, 'invite_codes')
