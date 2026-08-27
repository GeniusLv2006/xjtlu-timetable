/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const users = app.findCollectionByNameOrId("users")
  const timetables = app.findCollectionByNameOrId("timetables")

  if (!users.fields.getByName("active_timetable")) {
    users.fields.add(new RelationField({
      name: "active_timetable",
      collectionId: timetables.id,
      cascadeDelete: false,
      hidden: true,
      maxSelect: 1,
      required: false,
    }))
  }
  users.updateRule = [
    "@request.auth.is_banned != true",
    "id = @request.auth.id",
    "@request.body.active_timetable:changed = false",
  ].join(" && ")
  app.save(users)

  app.db()
    .newQuery([
      "UPDATE users",
      "SET active_timetable = (",
      "  SELECT id FROM timetables",
      "  WHERE timetables.user = users.id",
      "  ORDER BY datetime(created) DESC, id DESC",
      "  LIMIT 1",
      ")",
      "WHERE active_timetable IS NULL OR active_timetable = ''",
    ].join(" "))
    .execute()
}, (app) => {
  const users = app.findCollectionByNameOrId("users")
  const activeTimetable = users.fields.getByName("active_timetable")
  if (activeTimetable) users.fields.removeById(activeTimetable.id)
  users.updateRule = "@request.auth.is_banned != true && id = @request.auth.id"
  app.save(users)
})
