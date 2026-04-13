/// <reference path="../pb_data/types.d.ts" />
// 为 ical_access_logs 添加 geo_source 字段，
// 记录本次 GeoIP 查询中实际贡献了数据的供应商（+ 分隔），
// 例如 "ip2location"、"ipsb+ipapi"。
migrate((app) => {
  var col = app.findCollectionByNameOrId('ical_access_logs')
  col.fields.add(new TextField({ name: 'geo_source', required: false, max: 100 }))
  app.save(col)
}, (app) => {
  var col = app.findCollectionByNameOrId('ical_access_logs')
  col.fields.removeByName('geo_source')
  app.save(col)
})
