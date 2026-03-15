/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "8cyg6x4tftoh0by",
    "created": "2026-03-15 03:24:35.157Z",
    "updated": "2026-03-15 03:24:35.157Z",
    "name": "friendships",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "jcncwk1j",
        "name": "from_user",
        "type": "relation",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": "_pb_users_auth_",
          "cascadeDelete": true,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": null
        }
      },
      {
        "system": false,
        "id": "knm7qnbs",
        "name": "to_user",
        "type": "relation",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": "_pb_users_auth_",
          "cascadeDelete": true,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": null
        }
      },
      {
        "system": false,
        "id": "j9bushtn",
        "name": "status",
        "type": "select",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSelect": 1,
          "values": [
            "pending",
            "accepted"
          ]
        }
      }
    ],
    "indexes": [],
    "listRule": "@request.auth.id = from_user.id || @request.auth.id = to_user.id",
    "viewRule": "@request.auth.id = from_user.id || @request.auth.id = to_user.id",
    "createRule": "@request.auth.id = from_user.id",
    "updateRule": "@request.auth.id = to_user.id",
    "deleteRule": "@request.auth.id = from_user.id || @request.auth.id = to_user.id",
    "options": {}
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("8cyg6x4tftoh0by");

  return dao.deleteCollection(collection);
})
