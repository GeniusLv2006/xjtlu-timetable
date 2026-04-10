/// <reference path="../pb_data/types.d.ts" />
// 为 login_logs 和 ical_access_logs 添加 user_agent 字段，
// 记录用户登录时的浏览器信息及订阅 iCal 时的日历应用信息。
migrate((app) => {
  for (var name of ['login_logs', 'ical_access_logs']) {
    var col = app.findCollectionByNameOrId(name)
    col.fields.add(new TextField({ name: 'user_agent', required: false }))
    app.save(col)
  }
}, (app) => {
  for (var name of ['login_logs', 'ical_access_logs']) {
    var col = app.findCollectionByNameOrId(name)
    col.fields.removeByName('user_agent')
    app.save(col)
  }
})
