/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "changelogs000001",
    "name": "changelogs",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "chl_ver",
        "name": "version",
        "type": "text",
        "required": true,
        "options": { "min": 1, "max": 20, "pattern": "" }
      },
      {
        "system": false,
        "id": "chl_ttl",
        "name": "title",
        "type": "text",
        "required": true,
        "options": { "min": 1, "max": 200, "pattern": "" }
      },
      {
        "system": false,
        "id": "chl_con",
        "name": "content",
        "type": "text",
        "required": false,
        "options": { "min": null, "max": 100000, "pattern": "" }
      },
      {
        "system": false,
        "id": "chl_pub",
        "name": "published_at",
        "type": "date",
        "required": true,
        "options": { "min": "", "max": "" }
      }
    ],
    "indexes": [
      "CREATE INDEX `idx_changelogs_published` ON `changelogs` (`published_at` DESC)"
    ],
    "listRule": "",
    "viewRule": "",
    "createRule": null,
    "updateRule": null,
    "deleteRule": null,
    "options": {}
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("changelogs000001");
  return dao.deleteCollection(collection);
})
