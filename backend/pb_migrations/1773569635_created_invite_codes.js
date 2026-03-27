/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "4jrxky2a809meyl",
    "created": "2026-03-15 10:13:55.903Z",
    "updated": "2026-03-15 10:13:55.903Z",
    "name": "invite_codes",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "tunccg4g",
        "name": "code",
        "type": "text",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": 4,
          "max": 32,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "zhxavtg4",
        "name": "created_by",
        "type": "relation",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": "_pb_users_auth_",
          "cascadeDelete": false,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": []
        }
      },
      {
        "system": false,
        "id": "wh9egfhj",
        "name": "max_uses",
        "type": "number",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": 0,
          "max": null,
          "noDecimal": true
        }
      },
      {
        "system": false,
        "id": "2rvzbmgo",
        "name": "uses",
        "type": "number",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": 0,
          "max": null,
          "noDecimal": true
        }
      },
      {
        "system": false,
        "id": "hzvzs8s9",
        "name": "expires_at",
        "type": "date",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": "",
          "max": ""
        }
      },
      {
        "system": false,
        "id": "4eqyl3xo",
        "name": "is_active",
        "type": "bool",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "l4yvjy9k",
        "name": "note",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": 200,
          "pattern": ""
        }
      }
    ],
    "indexes": [
      "CREATE UNIQUE INDEX `idx_invite_code` ON `invite_codes` (`code`)"
    ],
    "listRule": "created_by = @request.auth.id",
    "viewRule": "created_by = @request.auth.id",
    "createRule": "@request.auth.id != \"\"",
    "updateRule": null,
    "deleteRule": "created_by = @request.auth.id",
    "options": {}
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("4jrxky2a809meyl");

  return dao.deleteCollection(collection);
})
