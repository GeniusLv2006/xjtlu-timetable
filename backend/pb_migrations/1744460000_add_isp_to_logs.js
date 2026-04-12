/// <reference path="../pb_data/types.d.ts" />
// 为 login_logs 和 ical_access_logs 添加 isp 字段，
// 记录访问者的网络运营商信息（由 ip.sb GeoIP API 提供）。
migrate((app) => {
  for (var name of ['login_logs', 'ical_access_logs']) {
    var col = app.findCollectionByNameOrId(name)
    col.fields.add(new TextField({ name: 'isp', required: false, max: 200 }))
    app.save(col)
  }
}, (app) => {
  for (var name of ['login_logs', 'ical_access_logs']) {
    var col = app.findCollectionByNameOrId(name)
    col.fields.removeByName('isp')
    app.save(col)
  }
})
