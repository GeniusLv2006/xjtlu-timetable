/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("olxbq7saoalm028")

  collection.createRule = "@request.auth.id != \"\""

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("olxbq7saoalm028")

  collection.createRule = "@request.auth.id = user.id"

  return dao.saveCollection(collection)
})
