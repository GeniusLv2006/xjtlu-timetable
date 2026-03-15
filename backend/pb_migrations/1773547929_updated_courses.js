/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("vh31p1bjjivn8ji")

  collection.listRule = "@request.auth.id = timetable.user.id || timetable.visibility = \"public\" || (timetable.visibility = \"friends\" && @collection.friendships.from_user.id ?= @request.auth.id && @collection.friendships.to_user.id ?= timetable.user.id && @collection.friendships.status = \"accepted\")"
  collection.viewRule = "@request.auth.id = timetable.user.id || timetable.visibility = \"public\" || (timetable.visibility = \"friends\" && @collection.friendships.from_user.id ?= @request.auth.id && @collection.friendships.to_user.id ?= timetable.user.id && @collection.friendships.status = \"accepted\")"
  collection.createRule = "@request.auth.id = timetable.user.id"
  collection.updateRule = "@request.auth.id = timetable.user.id"
  collection.deleteRule = "@request.auth.id = timetable.user.id"

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("vh31p1bjjivn8ji")

  collection.listRule = "@request.auth.id != \"\""
  collection.viewRule = "@request.auth.id != \"\""
  collection.createRule = "@request.auth.id != \"\""
  collection.updateRule = "@request.auth.id != \"\""
  collection.deleteRule = "@request.auth.id != \"\""

  return dao.saveCollection(collection)
})
