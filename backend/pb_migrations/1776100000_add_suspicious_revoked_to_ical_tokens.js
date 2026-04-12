/// <reference path="../pb_data/types.d.ts" />
// 为 ical_tokens 添加 iCal 风控字段：
//   is_suspicious  — Token 被标记为可疑（多 IP 来源），前端用于显示告警横幅
//   is_revoked     — Token 已被自动吊销，前端可读，管理员可清除
//   suspicious_at  — 首次标记可疑的时间，用于判断是否持续超过 48h 自动吊销
//   revoked_at     — 吊销时间，用于 48h 空日历过渡窗口计算
//
// 触发条件（在 ical.pb.js 的异常检测块中判断）：
//   24h 内 ≥3 个不同 IP 前缀 → is_suspicious = true（用户设置页显示横幅）
//   24h 内 ≥6 个不同 IP 前缀 → 立即吊销
//   is_suspicious 已标记 >48h 且仍 ≥3 个不同 IP 前缀 → 吊销（持续未处理）
//
// 吊销后行为（与账户暂停策略一致）：
//   48h 内 → 返回空日历（让各设备完成同步清缓存）
//   48h 后 → 返回 403 "Token revoked"
migrate((app) => {
  const col = app.findCollectionByNameOrId('ical_tokens')
  col.fields.add(new BoolField({ id: 'ical_is_suspicious', name: 'is_suspicious' }))
  col.fields.add(new BoolField({ id: 'ical_is_revoked',    name: 'is_revoked'   }))
  col.fields.add(new TextField({ id: 'ical_suspicious_at', name: 'suspicious_at' }))
  col.fields.add(new TextField({ id: 'ical_revoked_at',    name: 'revoked_at'   }))
  app.save(col)
  // app.save() 会自动创建对应 SQLite 列，无需手动 ALTER TABLE
}, (app) => {
  // SQLite 不支持 DROP COLUMN，仅回滚 schema 定义
  const col = app.findCollectionByNameOrId('ical_tokens')
  col.fields.removeById('ical_is_suspicious')
  col.fields.removeById('ical_is_revoked')
  col.fields.removeById('ical_suspicious_at')
  col.fields.removeById('ical_revoked_at')
  app.save(col)
})
