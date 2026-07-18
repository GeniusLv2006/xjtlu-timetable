/// <reference path="../pb_data/types.d.ts" />

const timetableReadRule = [
  '@request.auth.is_banned != true',
  '&&',
  '(',
  '@request.auth.id = user.id',
  '||',
  '(',
  'visibility = "friends"',
  '&&',
  '(',
  '(@collection.friendships.from_user.id ?= @request.auth.id',
  '&& @collection.friendships.to_user.id ?= user.id',
  '&& @collection.friendships.status ?= "accepted")',
  '||',
  '(@collection.friendships.to_user.id ?= @request.auth.id',
  '&& @collection.friendships.from_user.id ?= user.id',
  '&& @collection.friendships.status ?= "accepted")',
  ')',
  ')',
  ')',
].join(" ")

const courseReadRule = [
  '@request.auth.is_banned != true',
  '&&',
  '(',
  '@request.auth.id = timetable.user.id',
  '||',
  '(',
  'timetable.visibility = "friends"',
  '&&',
  '(',
  '(@collection.friendships.from_user.id ?= @request.auth.id',
  '&& @collection.friendships.to_user.id ?= timetable.user.id',
  '&& @collection.friendships.status ?= "accepted")',
  '||',
  '(@collection.friendships.to_user.id ?= @request.auth.id',
  '&& @collection.friendships.from_user.id ?= timetable.user.id',
  '&& @collection.friendships.status ?= "accepted")',
  ')',
  ')',
  ')',
].join(" ")

migrate((app) => {
  app.db()
    .newQuery('UPDATE timetables SET visibility = "private" WHERE visibility = "public"')
    .execute()

  const timetables = app.findCollectionByNameOrId("timetables")
  const visibility = timetables.fields.getByName("visibility")
  visibility.values = ["private", "friends"]
  timetables.listRule = timetableReadRule
  timetables.viewRule = timetableReadRule
  app.save(timetables)

  const courses = app.findCollectionByNameOrId("courses")
  courses.listRule = courseReadRule
  courses.viewRule = courseReadRule
  app.save(courses)
}, (app) => {
  // Privacy migrations intentionally do not restore public timetable access.
})
