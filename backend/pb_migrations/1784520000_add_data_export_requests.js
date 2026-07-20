/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const users = app.findCollectionByNameOrId("users")
  const requests = new Collection({
    id: "dataexportreq01",
    name: "data_export_requests",
    type: "base",
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    indexes: [],
  })

  requests.fields.add(new RelationField({
    name: "user",
    collectionId: users.id,
    cascadeDelete: true,
    maxSelect: 1,
    required: true,
  }))
  requests.fields.add(new DateField({
    name: "requested_at",
    required: true,
  }))
  requests.fields.add(new AutodateField({
    name: "created",
    onCreate: true,
    onUpdate: false,
  }))
  requests.fields.add(new AutodateField({
    name: "updated",
    onCreate: true,
    onUpdate: true,
  }))
  requests.indexes = [
    "CREATE UNIQUE INDEX `idx_data_export_requests_user` ON `data_export_requests` (`user`)",
  ]
  app.save(requests)
}, (app) => {
  const requests = app.findCollectionByNameOrId("data_export_requests")
  app.delete(requests)
})
