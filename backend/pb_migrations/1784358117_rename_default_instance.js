/// <reference path="../pb_data/types.d.ts" />

const OLD_DEFAULT_NAME = "XJTLU Timetable"
const NEW_DEFAULT_NAME = "Timetable Toolkit for XJTLU Students"

const renameDefaultInstance = (app, from, to) => {
  const records = app.findRecordsByFilter(
    "site_config",
    'instance_name = {:name}',
    "created",
    1,
    0,
    { name: from },
  )

  if (records.length === 0) return
  records[0].set("instance_name", to)
  app.save(records[0])
}

migrate((app) => {
  renameDefaultInstance(app, OLD_DEFAULT_NAME, NEW_DEFAULT_NAME)
}, (app) => {
  renameDefaultInstance(app, NEW_DEFAULT_NAME, OLD_DEFAULT_NAME)
})
