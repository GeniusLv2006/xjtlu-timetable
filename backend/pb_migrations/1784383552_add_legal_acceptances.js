/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const config = app.findCollectionByNameOrId("site_config")

  if (!config.fields.getByName("legal_notice_version")) {
    config.fields.add(new TextField({
      name: "legal_notice_version",
      max: 64,
      required: false,
    }))
  }
  if (!config.fields.getByName("minimum_age")) {
    config.fields.add(new NumberField({
      name: "minimum_age",
      min: 0,
      max: 120,
      onlyInt: true,
      required: false,
    }))
  }
  app.save(config)

  const users = app.findCollectionByNameOrId("users")
  const acceptances = new Collection({
    id: "legalaccept0001",
    name: "legal_acceptances",
    type: "base",
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    indexes: [],
  })

  acceptances.fields.add(new RelationField({
    name: "user",
    collectionId: users.id,
    cascadeDelete: true,
    maxSelect: 1,
    required: true,
  }))
  acceptances.fields.add(new TextField({
    name: "legal_notice_version",
    max: 64,
    required: false,
  }))
  acceptances.fields.add(new BoolField({
    name: "legal_notice_accepted",
    required: false,
  }))
  acceptances.fields.add(new NumberField({
    name: "minimum_age",
    min: 0,
    max: 120,
    onlyInt: true,
    required: false,
  }))
  acceptances.fields.add(new BoolField({
    name: "minimum_age_confirmed",
    required: false,
  }))
  acceptances.fields.add(new AutodateField({
    name: "created",
    onCreate: true,
    onUpdate: false,
  }))
  acceptances.fields.add(new AutodateField({
    name: "updated",
    onCreate: true,
    onUpdate: true,
  }))
  app.save(acceptances)

  acceptances.listRule = "@request.auth.is_banned != true && @request.auth.id = user.id"
  acceptances.viewRule = "@request.auth.is_banned != true && @request.auth.id = user.id"
  acceptances.createRule = "@request.auth.is_banned != true && @request.auth.id = user.id"
  acceptances.indexes = [
    "CREATE UNIQUE INDEX `idx_legal_acceptances_user_version_age` ON `legal_acceptances` (`user`, `legal_notice_version`, `minimum_age`)",
    "CREATE INDEX `idx_legal_acceptances_user_created` ON `legal_acceptances` (`user`, `created` DESC)",
  ]
  app.save(acceptances)
}, (app) => {
  const acceptances = app.findCollectionByNameOrId("legal_acceptances")
  app.delete(acceptances)

  const config = app.findCollectionByNameOrId("site_config")
  for (const name of ["legal_notice_version", "minimum_age"]) {
    const field = config.fields.getByName(name)
    if (field) config.fields.removeById(field.id)
  }
  app.save(config)
})
