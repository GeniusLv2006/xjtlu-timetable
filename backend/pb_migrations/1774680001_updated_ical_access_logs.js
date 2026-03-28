/// <reference path="../pb_data/types.d.ts" />
// 为 ical_access_logs 增加 city 字段（v0.23+ API）
migrate((app) => {
  app.db()
    .newQuery("ALTER TABLE ical_access_logs ADD COLUMN city TEXT NOT NULL DEFAULT ''")
    .execute()
}, (app) => {
  // SQLite 不支持 DROP COLUMN，忽略回滚
})
