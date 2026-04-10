/// <reference path="../pb_data/types.d.ts" />
// 为 ical_tokens 添加 ban_empty_served 列
// 封禁用户首次请求时返回空日历（使客户端清除缓存），第二次起返回 403。
// 解封时重置该标志，确保下次重新封禁仍能走清空流程。
migrate((app) => {
  app.db()
    .newQuery("ALTER TABLE ical_tokens ADD COLUMN ban_empty_served INTEGER NOT NULL DEFAULT 0")
    .execute()
}, (app) => {
  // SQLite 不支持 DROP COLUMN，忽略回滚
})
