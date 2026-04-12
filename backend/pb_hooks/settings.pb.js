// 在服务启动前将 record auth token 有效期设为 48 小时（172800 秒）。
// PocketBase 默认为 14 天，此处收紧以增强账户安全性。
onBeforeServe(function(e) {
  try {
    var s = $app.settings()
    if (s && s.recordAuthToken && s.recordAuthToken.duration !== 172800) {
      s.recordAuthToken.duration = 172800
      $app.saveSettings(s)
    }
  } catch (_) {}
  e.next()
})
