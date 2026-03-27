/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "91z6yibk2qiu4rk",
    "created": "2026-03-15 10:57:12.366Z",
    "updated": "2026-03-15 10:57:12.366Z",
    "name": "site_config",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "riecthxp",
        "name": "registration_open",
        "type": "bool",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "49xpjl9s",
        "name": "allowed_email_suffixes",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "ldpt5ap0",
        "name": "site_notice",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      }
    ],
    "indexes": [],
    "listRule": "@request.auth.id != \"\"",
    "viewRule": "@request.auth.id != \"\"",
    "createRule": null,
    "updateRule": null,
    "deleteRule": null,
    "options": {}
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("91z6yibk2qiu4rk");

  return dao.deleteCollection(collection);
})
