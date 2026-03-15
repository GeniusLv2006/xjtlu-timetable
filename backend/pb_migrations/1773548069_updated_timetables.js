/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("j8z143ja052j4y7")

  collection.listRule = "@request.auth.id = user.id || visibility = \"public\" || (visibility = \"friends\" && ((@collection.friendships.from_user.id ?= @request.auth.id && @collection.friendships.to_user.id ?= user.id && @collection.friendships.status ?= \"accepted\") || (@collection.friendships.to_user.id ?= @request.auth.id && @collection.friendships.from_user.id ?= user.id && @collection.friendships.status ?= \"accepted\")))"
  collection.viewRule = "@request.auth.id = user.id || visibility = \"public\" || (visibility = \"friends\" && ((@collection.friendships.from_user.id ?= @request.auth.id && @collection.friendships.to_user.id ?= user.id && @collection.friendships.status ?= \"accepted\") || (@collection.friendships.to_user.id ?= @request.auth.id && @collection.friendships.from_user.id ?= user.id && @collection.friendships.status ?= \"accepted\")))"

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("j8z143ja052j4y7")

  collection.listRule = "@request.auth.id = user.id || visibility = \"public\" || (visibility = \"friends\" && @collection.friendships.from_user.id ?= @request.auth.id && @collection.friendships.to_user.id ?= user.id && @collection.friendships.status = \"accepted\")"
  collection.viewRule = "@request.auth.id = user.id || visibility = \"public\" || (visibility = \"friends\" && @collection.friendships.from_user.id ?= @request.auth.id && @collection.friendships.to_user.id ?= user.id && @collection.friendships.status = \"accepted\")"

  return dao.saveCollection(collection)
})
