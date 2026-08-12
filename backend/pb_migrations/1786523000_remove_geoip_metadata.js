/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const removeFields = (collectionName, fieldNames) => {
    const collection = app.findCollectionByNameOrId(collectionName)
    let changed = false
    for (const fieldName of fieldNames) {
      const field = collection.fields.getByName(fieldName)
      if (!field) continue
      collection.fields.removeById(field.id)
      changed = true
    }
    if (changed) app.save(collection)
  }

  removeFields("login_logs", ["city", "isp"])
  removeFields("ical_access_logs", ["city", "isp", "geo_source"])

  app.db().newQuery("DROP TABLE IF EXISTS ip_geo_cache").execute()
}, () => {
  // Restoring deleted metadata requires the matching pre-upgrade database
  // backup; a down migration cannot reconstruct discarded personal data.
})
