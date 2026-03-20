// 邮箱大小写不敏感辅助接口
// GET /api/custom/users/resolve-email?email=xxx
// 根据用户输入的邮箱（任意大小写），返回数据库中存储的原始大小写邮箱。

routerAdd('GET', '/api/custom/users/resolve-email', function(e) {
  var email = (e.queryParam('email') || '').trim()
  if (!email) {
    return e.json(200, { email: null })
  }

  // PocketBase filter 语言不支持 LOWER()，改用 arrayOf+DynamicModel 接收原始 SQL 结果
  var rows = arrayOf(new DynamicModel({ email: '' }))
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
