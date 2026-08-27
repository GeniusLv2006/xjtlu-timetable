/// <reference path="../pb_data/types.d.ts" />

routerAdd('GET', '/api/timetables/active', function(e) {
  var auth = e.requestInfo().auth
  if (!auth || auth.collection().name !== 'users' || auth.getBool('is_banned')) {
    throw new ForbiddenError('Please sign in to manage your active timetable')
  }

  var user = $app.findRecordById('users', auth.id)
  var active = null
  var activeId = user.getString('active_timetable')
  if (activeId) try {
    var selected = $app.findRecordById('timetables', activeId)
    if (selected.getString('user') === auth.id) active = selected
  } catch (_) {}

  if (!active) {
    var records = $app.findRecordsByFilter(
      'timetables',
      'user = {:userId}',
      '-created',
      1,
      0,
      { userId: auth.id },
    )
    active = records.length > 0 ? records[0] : null
    user.set('active_timetable', active ? active.id : '')
    $app.save(user)
  }

  return e.json(200, { timetable_id: active ? active.id : null })
}, $apis.requireAuth('users'))

routerAdd('PUT', '/api/timetables/active', function(e) {
  var auth = e.requestInfo().auth
  if (!auth || auth.collection().name !== 'users' || auth.getBool('is_banned')) {
    throw new ForbiddenError('Please sign in to manage your active timetable')
  }

  var timetableId = String((e.requestInfo().body || {})['timetable_id'] || '').trim()
  var timetable = null
  if (timetableId) try {
    var selected = $app.findRecordById('timetables', timetableId)
    if (selected.getString('user') === auth.id) timetable = selected
  } catch (_) {}
  if (!timetable) throw new BadRequestError('Timetable not found for this account')

  var user = $app.findRecordById('users', auth.id)
  user.set('active_timetable', timetable.id)
  $app.save(user)
  return e.json(200, { timetable_id: timetable.id })
}, $apis.requireAuth('users'))

// Keep non-browser writes consistent: the first timetable becomes active and
// deleting the active timetable selects the newest remaining timetable.
onRecordCreateRequest(function(e) {
  e.next()
  try {
    var userId = e.record.getString('user')
    var user = $app.findRecordById('users', userId)
    if (!user.getString('active_timetable')) {
      user.set('active_timetable', e.record.id)
      $app.save(user)
    }
  } catch (_) {}
}, 'timetables')

onRecordDeleteRequest(function(e) {
  var userId = e.record.getString('user')
  var wasActive = false
  try {
    var user = $app.findRecordById('users', userId)
    wasActive = user.getString('active_timetable') === e.record.id
  } catch (_) {}

  e.next()

  if (!wasActive) return
  try {
    var records = $app.findRecordsByFilter(
      'timetables',
      'user = {:userId}',
      '-created',
      1,
      0,
      { userId: userId },
    )
    var fallback = records.length > 0 ? records[0] : null
    var freshUser = $app.findRecordById('users', userId)
    freshUser.set('active_timetable', fallback ? fallback.id : '')
    $app.save(freshUser)
  } catch (_) {}
}, 'timetables')
