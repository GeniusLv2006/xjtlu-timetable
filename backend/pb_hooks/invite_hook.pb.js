// ── 邀请码系统（PocketBase 0.22，使用 $app.dao() API）────────────────────
//
// 1. onRecordBeforeCreateRequest (users)        — 注册时验证邀请码，并立即 +1 计数
// 2. onRecordBeforeCreateRequest (invite_codes) — 用户创建邀请码时检查权限

// ── 注册：验证邀请码 ───────────────────────────────────────────────────────
onRecordBeforeCreateRequest(function(e) {
  var data = e.requestInfo.data || {}
  var code = (data['invite_code'] || '').trim()

  if (!code) {
    throw new BadRequestError('请填写邀请码')
  }

  var safeCode = code.replace(/["'\\]/g, '')

  var invites
  try {
    invites = $app.dao().findRecordsByFilter(
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

  // 验证通过：立即 +1（若后续用户创建失败计数会略有偏差，可接受）
  var newUses = uses + 1
  invite.set('uses', newUses)
  if (maxUses > 0 && newUses >= maxUses) {
    invite.set('is_active', false)
  }
  try {
    $app.dao().saveRecord(invite)
  } catch (err) {
    console.error('invite_hook: failed to update invite uses:', err)
  }
}, 'users')

// ── 用户创建邀请码：权限 & 配额检查 ──────────────────────────────────────
onRecordBeforeCreateRequest(function(e) {
  // 管理员直接放行
  if (e.requestInfo.admin) {
    e.record.set('uses', 0)
    e.record.set('is_active', true)
    return
  }

  var authUser = e.requestInfo.authRecord
  if (!authUser) {
    throw new BadRequestError('请先登录')
  }

  if (!authUser.getBool('can_invite')) {
    throw new BadRequestError('您没有创建邀请码的权限')
  }

  // 检查配额
  var quota = authUser.getInt('invite_quota')
  if (quota > 0) {
    var userId = authUser.getString('id')
    var existing
    try {
      existing = $app.dao().findRecordsByFilter(
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

  e.record.set('created_by', authUser.getString('id'))
  e.record.set('uses', 0)
  e.record.set('is_active', true)
}, 'invite_codes')
