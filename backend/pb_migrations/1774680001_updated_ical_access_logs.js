/// <reference path="../pb_data/types.d.ts" />
// 为 ical_access_logs 增加 city 字段，记录 Cloudflare CF-IPCity 头信息
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("icallog00000001")

  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ialg_cit",
    "name": "city",
    "type": "text",
    "required": false,
    "options": { "min": null, "max": 100, "pattern": "" }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("icallog00000001")
  collection.schema.removeField("ialg_cit")
  return dao.saveCollection(collection)
})
