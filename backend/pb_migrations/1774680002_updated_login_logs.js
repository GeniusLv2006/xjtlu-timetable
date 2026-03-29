/// <reference path="../pb_data/types.d.ts" />
// 为 login_logs 增加 city 字段
migrate((app) => {
  app.db()
    .newQuery("ALTER TABLE login_logs ADD COLUMN city TEXT NOT NULL DEFAULT ''")
    .execute()
}, (app) => {
  // SQLite 不支持 DROP COLUMN，忽略回滚
})
