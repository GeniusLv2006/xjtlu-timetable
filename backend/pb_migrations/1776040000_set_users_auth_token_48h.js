/// <reference path="../pb_data/types.d.ts" />
// 将 users collection 的 auth token 有效期从 14 天（1209600s）缩短至 48 小时（172800s）。
// PocketBase v0.23+ 将 token 配置存储在各 collection 的 options JSON 中。
migrate((app) => {
  app.db()
    .newQuery("UPDATE _collections SET options = json_set(options, '$.authToken.duration', 172800) WHERE name = 'users'")
    .execute()
}, (app) => {
  app.db()
    .newQuery("UPDATE _collections SET options = json_set(options, '$.authToken.duration', 1209600) WHERE name = 'users'")
    .execute()
})
