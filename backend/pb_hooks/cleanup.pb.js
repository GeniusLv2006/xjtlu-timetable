// 每天凌晨 2 点自动清理 30 天前的日志记录
cronAdd('cleanup-logs', '0 2 * * *', function() {
  var cutoff = "datetime('now', '-30 days')"
  try {
    $app.db()
      .newQuery("DELETE FROM ical_access_logs WHERE created < " + cutoff)
      .execute()
  } catch (e) {
    console.error('[cleanup] ical_access_logs:', e)
  }
  try {
    $app.db()
      .newQuery("DELETE FROM login_logs WHERE created < " + cutoff)
      .execute()
  } catch (e) {
    console.error('[cleanup] login_logs:', e)
  }
})
