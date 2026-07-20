/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const users = app.findCollectionByNameOrId("users")
  if (!users.fields.getByName("restricted_login_allowed")) {
    users.fields.add(new BoolField({
      name: "restricted_login_allowed",
      required: false,
    }))
  }
  users.updateRule = "@request.auth.is_banned != true && id = @request.auth.id"
  users.deleteRule = null
  app.save(users)

  const config = app.findCollectionByNameOrId("site_config")
  if (!config.fields.getByName("blocked_registration_retention_days")) {
    config.fields.add(new NumberField({
      name: "blocked_registration_retention_days",
      min: 0,
      max: 3650,
      onlyInt: true,
      required: false,
    }))
  }
  app.save(config)
  app.db()
    .newQuery(
      "UPDATE site_config SET blocked_registration_retention_days = 365 " +
      "WHERE blocked_registration_retention_days IS NULL OR blocked_registration_retention_days = 0",
    )
    .execute()

  const blocked = new Collection({
    id: "blockregident01",
    name: "blocked_registration_identifiers",
    type: "base",
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    indexes: [],
  })
  blocked.fields.add(new TextField({
    name: "identifier_hash",
    max: 128,
    required: true,
  }))
  blocked.fields.add(new TextField({
    name: "algorithm",
    max: 32,
    required: true,
  }))
  blocked.fields.add(new DateField({
    name: "expires_at",
    required: true,
  }))
  blocked.fields.add(new AutodateField({
    name: "created",
    onCreate: true,
    onUpdate: false,
  }))
  blocked.fields.add(new AutodateField({
    name: "updated",
    onCreate: true,
    onUpdate: true,
  }))
  blocked.indexes = [
    "CREATE UNIQUE INDEX `idx_blocked_registration_hash` ON `blocked_registration_identifiers` (`identifier_hash`)",
    "CREATE INDEX `idx_blocked_registration_expiry` ON `blocked_registration_identifiers` (`expires_at`)",
  ]
  app.save(blocked)

  for (const name of ["login_logs", "ical_access_logs"]) {
    const collection = app.findCollectionByNameOrId(name)
    collection.listRule = "@request.auth.is_banned != true && user_id = @request.auth.id"
    collection.viewRule = "@request.auth.is_banned != true && user_id = @request.auth.id"
    app.save(collection)
  }
}, (app) => {
  const blocked = app.findCollectionByNameOrId("blocked_registration_identifiers")
  app.delete(blocked)

  const config = app.findCollectionByNameOrId("site_config")
  const retention = config.fields.getByName("blocked_registration_retention_days")
  if (retention) config.fields.removeById(retention.id)
  app.save(config)

  const users = app.findCollectionByNameOrId("users")
  const restricted = users.fields.getByName("restricted_login_allowed")
  if (restricted) users.fields.removeById(restricted.id)
  app.save(users)
})
