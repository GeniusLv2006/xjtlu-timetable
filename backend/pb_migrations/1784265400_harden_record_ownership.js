/// <reference path="../pb_data/types.d.ts" />
// Correct the ownership regression introduced by
// 1776300000_add_ical_risk_config_and_ban_rules.js and prevent relation
// transfers through update requests.
migrate((app) => {
  const timetables = app.findCollectionByNameOrId("timetables")
  timetables.createRule = '@request.auth.is_banned != true && @request.auth.id = user.id'
  timetables.updateRule = '@request.auth.is_banned != true && @request.auth.id = user.id && @request.body.user:changed = false'
  app.save(timetables)

  const courses = app.findCollectionByNameOrId("courses")
  courses.updateRule = '@request.auth.is_banned != true && @request.auth.id = timetable.user.id && @request.body.timetable:changed = false'
  app.save(courses)

  const friendships = app.findCollectionByNameOrId("friendships")
  friendships.createRule = '@request.auth.is_banned != true && @request.auth.id = from_user.id && @request.body.status = "pending"'
  friendships.updateRule = '@request.auth.is_banned != true && @request.auth.id = to_user.id && @request.body.from_user:changed = false && @request.body.to_user:changed = false && @request.body.status = "accepted"'
  app.save(friendships)

  const tokens = app.findCollectionByNameOrId("ical_tokens")
  tokens.createRule = '@request.auth.is_banned != true && @request.auth.id = user.id'
  app.save(tokens)
}, (app) => {
  // Security migrations intentionally do not restore permissive rules.
})
