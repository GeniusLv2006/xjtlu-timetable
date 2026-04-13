/// <reference path="../pb_data/types.d.ts" />
// 创建 ip_geo_cache 原生 SQLite 表，持久化存储 GeoIP 查询结果。
// 以 IP 为主键，记录 country/city/isp/source 及过期时间（30 天），
// 跨容器重启保持有效，避免对同一 IP 重复调用外部 GeoIP API。
migrate((app) => {
  app.db().newQuery(`
    CREATE TABLE IF NOT EXISTS ip_geo_cache (
      ip         TEXT PRIMARY KEY,
      country    TEXT NOT NULL DEFAULT '',
      city       TEXT NOT NULL DEFAULT '',
      isp        TEXT NOT NULL DEFAULT '',
      source     TEXT NOT NULL DEFAULT '',
      expires_at TEXT NOT NULL DEFAULT (datetime('now', '+30 days'))
    )
  `).execute()
}, (app) => {
  app.db().newQuery("DROP TABLE IF EXISTS ip_geo_cache").execute()
})
