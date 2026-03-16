// Block banned users from logging in.
// The is_banned field is added via migration 1773553584_updated_users.js.

onRecordBeforeAuthWithPasswordRequest(function(e) {
  var record = e.record
  if (!record) return

  if (record.getBool('is_banned')) {
    throw new BadRequestError('Account suspended. Please contact the administrator')
  }
}, 'users')

// Block banned users from refreshing their token.
// This invalidates existing sessions when a user is suspended —
// the frontend calls authRefresh on startup and tab focus, so they get kicked out promptly.
onRecordBeforeAuthRefreshRequest(function(e) {
  if (e.record && e.record.getBool('is_banned')) {
    throw new BadRequestError('Account suspended. Please contact the administrator')
  }
}, 'users')
