// 邮箱大小写不敏感辅助接口
// 根据用户输入的邮箱（任意大小写），返回数据库中存储的原始大小写邮箱。
// 前端拿到后再调用标准 PocketBase authWithPassword，保证存储格式不变。

routerAdd('POST', '/api/custom/users/resolve-email', function(e) {
  var body = { email: '' }
  e.bindBody(body)

  var email = (body.email || '').trim()
  if (!email) {
    return e.json(200, { email: null })
  }

  var record
  try {
    record = $app.dao().findFirstRecordByFilter(
      'users',
      'LOWER(email) = {:email}',
      { email: email.toLowerCase() }
    )
  } catch (_) {
    return e.json(200, { email: null })
  }

  return e.json(200, { email: record ? record.email() : null })
})
