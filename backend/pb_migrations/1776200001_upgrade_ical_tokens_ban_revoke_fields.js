/// <reference path="../pb_data/types.d.ts" />
// 1. 将 ban_empty_served_at 从裸 ALTER TABLE 列升级为正式 PocketBase 字段
//    （此前通过原始 SQL 读写，Admin UI 不可见）
// 2. 同时清理已废弃的 ban_empty_served 整型列
//    （被 ban_empty_served_at 时间戳方案取代后未删除）
// 3. 添加 revoke_empty_served_at 正式字段
//    用于 is_revoked 懒加载 48h 过渡窗口（与 ban_empty_served_at 机制一致）
migrate((app) => {
  // ── Step 1：备份现有 ban_empty_served_at 数据 ─────────────────────────────
  const backup = arrayOf(new DynamicModel({ id: '', ban_empty_served_at: '' }))
  try {
    app.db()
      .newQuery("SELECT id, ban_empty_served_at FROM ical_tokens WHERE ban_empty_served_at != ''")
      .all(backup)
  } catch (_) {}

  // ── Step 2：删除裸列（SQLite 3.35+）─────────────────────────────────────
  app.db().newQuery("ALTER TABLE ical_tokens DROP COLUMN ban_empty_served_at").execute()
  app.db().newQuery("ALTER TABLE ical_tokens DROP COLUMN ban_empty_served").execute()

  // ── Step 3：通过 PocketBase API 添加正式字段 ──────────────────────────────
  const col = app.findCollectionByNameOrId('ical_tokens')
  col.fields.add(new TextField({ id: 'ical_ban_empty_served_at',    name: 'ban_empty_served_at'    }))
  col.fields.add(new TextField({ id: 'ical_revoke_empty_served_at', name: 'revoke_empty_served_at' }))
  app.save(col)

  // ── Step 4：恢复备份数据 ──────────────────────────────────────────────────
  for (let i = 0; i < backup.length; i++) {
    const row = backup[i]
    if (row.ban_empty_served_at) {
      try {
        app.db()
          .newQuery("UPDATE ical_tokens SET ban_empty_served_at = {:v} WHERE id = {:id}")
          .bind({ v: row.ban_empty_served_at, id: row.id })
          .execute()
      } catch (_) {}
    }
  }
}, (app) => {
  // 回滚：从 PB schema 中移除字段（SQLite 列保留，不处理）
  const col = app.findCollectionByNameOrId('ical_tokens')
  col.fields.removeById('ical_ban_empty_served_at')
  col.fields.removeById('ical_revoke_empty_served_at')
  app.save(col)
})
