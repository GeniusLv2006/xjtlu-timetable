// Block banned users from logging in.
// The is_banned field is added via migration 1773553584_updated_users.js.

onRecordBeforeAuthWithPasswordRequest(function(e) {
  var record = e.record
  if (!record) return

  if (record.getBool('is_banned')) {
    throw new BadRequestError('Account suspended. Please contact the administrator')
  }
}, 'users')
