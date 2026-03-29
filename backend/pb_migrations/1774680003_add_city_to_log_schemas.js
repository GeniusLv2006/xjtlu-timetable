/// <reference path="../pb_data/types.d.ts" />
// 将 city 字段注册进 PocketBase collection schema
// （之前只做了 ALTER TABLE，API 响应不含未注册字段）

var CITY_FIELD_ICAL = JSON.stringify({
  autogeneratePattern: '', hidden: false, id: 'ialg_city',
  max: 200, min: 0, name: 'city', pattern: '',
  presentable: false, primaryKey: false, required: false, system: false, type: 'text'
})

var CITY_FIELD_LOGIN = JSON.stringify({
  autogeneratePattern: '', hidden: false, id: 'llg_city',
  max: 200, min: 0, name: 'city', pattern: '',
  presentable: false, primaryKey: false, required: false, system: false, type: 'text'
})

migrate((app) => {
  app.db().newQuery(
    "UPDATE _collections SET fields = json_insert(fields, '$[' || json_array_length(fields) || ']', json({:f})) WHERE name = 'ical_access_logs'"
  ).bind({ f: CITY_FIELD_ICAL }).execute()

  app.db().newQuery(
    "UPDATE _collections SET fields = json_insert(fields, '$[' || json_array_length(fields) || ']', json({:f})) WHERE name = 'login_logs'"
  ).bind({ f: CITY_FIELD_LOGIN }).execute()
}, (app) => {
  // 回滚：移除最后一个字段（仅当 city 确实是最后一个时有效）
  app.db().newQuery(
    "UPDATE _collections SET fields = json_remove(fields, '$[' || (json_array_length(fields)-1) || ']') WHERE name = 'ical_access_logs'"
  ).execute()
  app.db().newQuery(
    "UPDATE _collections SET fields = json_remove(fields, '$[' || (json_array_length(fields)-1) || ']') WHERE name = 'login_logs'"
  ).execute()
})
