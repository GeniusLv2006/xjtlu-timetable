/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "icallog00000001",
    "name": "ical_access_logs",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "ialg_uid",
        "name": "user_id",
        "type": "text",
        "required": true,
        "options": { "min": 1, "max": 30, "pattern": "" }
      },
      {
        "system": false,
        "id": "ialg_eml",
        "name": "email",
        "type": "text",
        "required": false,
        "options": { "min": null, "max": 200, "pattern": "" }
      },
      {
        "system": false,
        "id": "ialg_pfx",
        "name": "ip_prefix",
        "type": "text",
        "required": false,
        "options": { "min": null, "max": 60, "pattern": "" }
      },
      {
        "system": false,
        "id": "ialg_ful",
        "name": "ip_full",
        "type": "text",
        "required": false,
        "options": { "min": null, "max": 60, "pattern": "" }
      },
      {
        "system": false,
        "id": "ialg_cty",
        "name": "country",
        "type": "text",
        "required": false,
        "options": { "min": null, "max": 10, "pattern": "" }
      }
    ],
    "indexes": [],
    "listRule": "user_id = @request.auth.id",
    "viewRule": "user_id = @request.auth.id",
    "createRule": null,
    "updateRule": null,
    "deleteRule": null,
    "options": {}
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("icallog00000001");
  return dao.deleteCollection(collection);
})
