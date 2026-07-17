/// <reference path="../pb_data/types.d.ts" />
// Add indexes for the relation filters, audit-log rate checks, and retention
// cleanup paths used by the application.
migrate((app) => {
  const addIndex = (collectionName, indexName, definition) => {
    const collection = app.findCollectionByNameOrId(collectionName)
    const exists = collection.indexes.some((index) => index.includes(indexName))
    if (exists) return

    collection.indexes.push(definition)
    app.save(collection)
  }

  addIndex(
    "timetables",
    "idx_timetables_user_hash",
    "CREATE INDEX `idx_timetables_user_hash` ON `timetables` (`user`, `hash`)",
  )
  addIndex(
    "courses",
    "idx_courses_timetable",
    "CREATE INDEX `idx_courses_timetable` ON `courses` (`timetable`)",
  )
  addIndex(
    "friendships",
    "idx_friendships_from_status",
    "CREATE INDEX `idx_friendships_from_status` ON `friendships` (`from_user`, `status`)",
  )
  addIndex(
    "friendships",
    "idx_friendships_to_status",
    "CREATE INDEX `idx_friendships_to_status` ON `friendships` (`to_user`, `status`)",
  )
  addIndex(
    "ical_access_logs",
    "idx_ical_access_user_created",
    "CREATE INDEX `idx_ical_access_user_created` ON `ical_access_logs` (`user_id`, `created` DESC)",
  )
  addIndex(
    "ical_access_logs",
    "idx_ical_access_created",
    "CREATE INDEX `idx_ical_access_created` ON `ical_access_logs` (`created` DESC)",
  )
  addIndex(
    "login_logs",
    "idx_login_logs_created",
    "CREATE INDEX `idx_login_logs_created` ON `login_logs` (`created` DESC)",
  )

  app.db()
    .newQuery("CREATE INDEX IF NOT EXISTS `idx_ip_geo_cache_expires` ON `ip_geo_cache` (`expires_at`)")
    .execute()
}, (app) => {
  const removeIndex = (collectionName, indexName) => {
    const collection = app.findCollectionByNameOrId(collectionName)
    collection.indexes = collection.indexes.filter(
      (index) => !index.includes(indexName),
    )
    app.save(collection)
  }

  removeIndex("timetables", "idx_timetables_user_hash")
  removeIndex("courses", "idx_courses_timetable")
  removeIndex("friendships", "idx_friendships_from_status")
  removeIndex("friendships", "idx_friendships_to_status")
  removeIndex("ical_access_logs", "idx_ical_access_user_created")
  removeIndex("ical_access_logs", "idx_ical_access_created")
  removeIndex("login_logs", "idx_login_logs_created")
  app.db()
    .newQuery("DROP INDEX IF EXISTS `idx_ip_geo_cache_expires`")
    .execute()
})
