/// <reference path="../pb_data/types.d.ts" />
// Add configurable iCal risk controls and enforce banned-user collection rules.
migrate((app) => {
  const siteConfig = app.findCollectionByNameOrId("site_config")

  const addBool = (id, name) => {
    try { siteConfig.fields.add(new BoolField({ id, name, required: false })) } catch (_) {}
  }
  const addNumber = (id, name) => {
    try { siteConfig.fields.add(new NumberField({ id, name, required: false, min: 1, onlyInt: true })) } catch (_) {}
  }

  addBool("icr_enabled", "ical_risk_enabled")
  addBool("icr_rate_en", "ical_rate_limit_enabled")
  addBool("icr_ip_en", "ical_ip_anomaly_enabled")
  addNumber("icr_rate_win", "ical_rate_window_minutes")
  addNumber("icr_rate_max", "ical_rate_max_requests")
  addNumber("icr_susp_ips", "ical_suspicious_ip_prefixes")
  addNumber("icr_revoke_ip", "ical_revoke_ip_prefixes")
  addNumber("icr_grace_hr", "ical_suspicious_grace_hours")
  addNumber("icr_empty_hr", "ical_empty_calendar_hours")
  app.save(siteConfig)

  app.db().newQuery(
    "UPDATE site_config SET " +
    "ical_risk_enabled = 1, " +
    "ical_rate_limit_enabled = 1, " +
    "ical_ip_anomaly_enabled = 1, " +
    "ical_rate_window_minutes = 10, " +
    "ical_rate_max_requests = 5, " +
    "ical_suspicious_ip_prefixes = 4, " +
    "ical_revoke_ip_prefixes = 6, " +
    "ical_suspicious_grace_hours = 48, " +
    "ical_empty_calendar_hours = 48"
  ).execute()

  const timetables = app.findCollectionByNameOrId("timetables")
  const timetableRule = '@request.auth.is_banned != true && (@request.auth.id = user.id || visibility = "public" || (visibility = "friends" && ((@collection.friendships.from_user.id ?= @request.auth.id && @collection.friendships.to_user.id ?= user.id && @collection.friendships.status ?= "accepted") || (@collection.friendships.to_user.id ?= @request.auth.id && @collection.friendships.from_user.id ?= user.id && @collection.friendships.status ?= "accepted"))))'
  timetables.listRule = timetableRule
  timetables.viewRule = timetableRule
  timetables.createRule = '@request.auth.is_banned != true && @request.auth.id != ""'
  timetables.updateRule = '@request.auth.is_banned != true && @request.auth.id = user.id'
  timetables.deleteRule = '@request.auth.is_banned != true && @request.auth.id = user.id'
  app.save(timetables)

  const courses = app.findCollectionByNameOrId("courses")
  const coursesRule = '@request.auth.is_banned != true && (@request.auth.id = timetable.user.id || timetable.visibility = "public" || (timetable.visibility = "friends" && ((@collection.friendships.from_user.id ?= @request.auth.id && @collection.friendships.to_user.id ?= timetable.user.id && @collection.friendships.status ?= "accepted") || (@collection.friendships.to_user.id ?= @request.auth.id && @collection.friendships.from_user.id ?= timetable.user.id && @collection.friendships.status ?= "accepted"))))'
  const coursesWrite = '@request.auth.is_banned != true && @request.auth.id = timetable.user.id'
  courses.listRule = coursesRule
  courses.viewRule = coursesRule
  courses.createRule = coursesWrite
  courses.updateRule = coursesWrite
  courses.deleteRule = coursesWrite
  app.save(courses)

  const friendships = app.findCollectionByNameOrId("friendships")
  friendships.listRule = '@request.auth.is_banned != true && (@request.auth.id = from_user.id || @request.auth.id = to_user.id)'
  friendships.viewRule = '@request.auth.is_banned != true && (@request.auth.id = from_user.id || @request.auth.id = to_user.id)'
  friendships.createRule = '@request.auth.is_banned != true && @request.auth.id = from_user.id'
  friendships.updateRule = '@request.auth.is_banned != true && @request.auth.id = to_user.id'
  friendships.deleteRule = '@request.auth.is_banned != true && (@request.auth.id = from_user.id || @request.auth.id = to_user.id)'
  app.save(friendships)

  const tokens = app.findCollectionByNameOrId("ical_tokens")
  tokens.listRule = '@request.auth.is_banned != true && @request.auth.id = user.id'
  tokens.viewRule = '@request.auth.is_banned != true && @request.auth.id = user.id'
  tokens.createRule = '@request.auth.is_banned != true && @request.auth.id != ""'
  tokens.updateRule = null
  tokens.deleteRule = '@request.auth.is_banned != true && @request.auth.id = user.id'
  app.save(tokens)
}, (app) => {
  const siteConfig = app.findCollectionByNameOrId("site_config")
  for (const id of [
    "icr_enabled",
    "icr_rate_en",
    "icr_ip_en",
    "icr_rate_win",
    "icr_rate_max",
    "icr_susp_ips",
    "icr_revoke_ip",
    "icr_grace_hr",
    "icr_empty_hr",
  ]) {
    try { siteConfig.fields.removeById(id) } catch (_) {}
  }
  app.save(siteConfig)
})
