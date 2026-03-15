/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("_pb_users_auth_")

  // Add is_banned boolean field
  collection.schema.addField(new SchemaField({
    "id":       "users_is_banned",
    "name":     "is_banned",
    "type":     "bool",
    "required": false,
    "options":  {}
  }))

  // Disable public self-registration (null = admin only)
  collection.createRule = null

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("_pb_users_auth_")

  // Revert createRule to allow authenticated users to register
  collection.createRule = ""

  return dao.saveCollection(collection)
})
