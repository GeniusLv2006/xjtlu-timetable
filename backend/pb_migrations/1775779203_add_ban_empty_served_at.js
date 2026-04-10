/// <reference path="../pb_data/types.d.ts" />
// 将 ical_tokens 的封禁清缓存机制从布尔标志改为时间戳。
// ban_empty_served_at 记录首次返回空日历的时间，48 小时窗口内所有设备
// 均可收到空日历，窗口到期后切换为 403。
migrate((app) => {
  app.db()
    .newQuery("ALTER TABLE ical_tokens ADD COLUMN ban_empty_served_at TEXT NOT NULL DEFAULT ''")
    .execute()
}, (app) => {
  // SQLite 不支持 DROP COLUMN，忽略回滚
})
