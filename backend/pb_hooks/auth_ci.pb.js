// 邮箱大小写不敏感辅助接口
// GET /api/custom/users/resolve-email?email=xxx
// 根据用户输入的邮箱（任意大小写），返回数据库中存储的原始大小写邮箱。
// 使用原始 SQL（LOWER 函数）绕过 PocketBase filter 语言不支持 SQL 函数的限制。
// 前端拿到后再调用标准 PocketBase authWithPassword，保证存储格式不变。

routerAdd('GET', '/api/custom/users/resolve-email', function(e) {
  var email = (e.queryParam('email') || '').trim()
  if (!email) {
    return e.json(200, { email: null })
  }

  var rows = []
  try {
    $app.dao().db()
      .newQuery('SELECT email FROM users WHERE LOWER(email) = {:email} LIMIT 1')
      .bind({ email: email.toLowerCase() })
      .all(rows)
  } catch (_) {
    return e.json(200, { email: null })
  }

  return e.json(200, { email: rows.length > 0 ? rows[0].email : null })
})
