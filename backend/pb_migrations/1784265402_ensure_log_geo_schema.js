/// <reference path="../pb_data/types.d.ts" />
// Consolidate GeoIP fields after all log collections exist. Earlier GeoIP
// migrations have historical timestamps that sort before those collections on
// a fresh database, so this migration is the authoritative final-state check.
migrate((app) => {
  const ensureTextField = (collectionName, fieldName, max) => {
    const collection = app.findCollectionByNameOrId(collectionName)
    if (collection.fields.getByName(fieldName)) return

    collection.fields.add(new TextField({
      name: fieldName,
      required: false,
      max: max,
    }))
    app.save(collection)
  }

  ensureTextField("login_logs", "city", 200)
  ensureTextField("login_logs", "isp", 200)
  ensureTextField("ical_access_logs", "city", 200)
  ensureTextField("ical_access_logs", "isp", 200)
  ensureTextField("ical_access_logs", "geo_source", 100)

  app.db().newQuery(`
    CREATE TABLE IF NOT EXISTS ip_geo_cache (
      ip         TEXT PRIMARY KEY,
      country    TEXT NOT NULL DEFAULT '',
      city       TEXT NOT NULL DEFAULT '',
      isp        TEXT NOT NULL DEFAULT '',
      source     TEXT NOT NULL DEFAULT '',
      expires_at TEXT NOT NULL DEFAULT (datetime('now', '+30 days'))
    )
  `).execute()
}, (app) => {
  // Schema consolidation is intentionally irreversible.
})
