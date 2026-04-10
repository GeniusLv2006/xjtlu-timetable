/// <reference path="../pb_data/types.d.ts" />
// 安全修复：ical_tokens createRule 过于宽松，任何已登录用户可为任意用户创建 token
// 并从响应中获得 token 值，从而订阅他人课表。
// 修复内容：
//   1. 清理同一用户下的重复 token（保留最新一条）
//   2. 对 user 字段加唯一约束（每用户只允许一个 token）
//   3. 将 createRule 恢复为 "@request.auth.id = user.id"

migrate((app) => {
  // 1. 清理重复：每个用户只保留 rowid 最大（最新插入）的一条
  app.db()
    .newQuery(`
      DELETE FROM ical_tokens
      WHERE rowid NOT IN (
        SELECT MAX(rowid) FROM ical_tokens GROUP BY "user"
      )
    `)
    .execute()

  // 2. 添加唯一约束
  app.db()
    .newQuery('CREATE UNIQUE INDEX IF NOT EXISTS idx_ical_tokens_user ON ical_tokens ("user")')
    .execute()

  // 3. 修复 createRule
  const collection = app.findCollectionByNameOrId('olxbq7saoalm028')
  collection.createRule = '@request.auth.id = user.id'
  app.save(collection)

}, (app) => {
  // 回滚：移除唯一约束，放宽 createRule
  try {
    app.db()
      .newQuery('DROP INDEX IF EXISTS idx_ical_tokens_user')
      .execute()
  } catch (_) {}

  const collection = app.findCollectionByNameOrId('olxbq7saoalm028')
  collection.createRule = '@request.auth.id != ""'
  app.save(collection)
})
