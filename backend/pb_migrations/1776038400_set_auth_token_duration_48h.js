/// <reference path="../pb_data/types.d.ts" />
// 将用户 auth token 有效期从 PocketBase 默认值（14 天）缩短至 48 小时，增强账户安全性。
migrate((app) => {
  var s = app.settings()
  s.recordAuthToken.duration = 172800  // 48 hours in seconds
  app.saveSettings(s)
}, (app) => {
  var s = app.settings()
  s.recordAuthToken.duration = 1209600  // 14 days (PocketBase default)
  app.saveSettings(s)
})
