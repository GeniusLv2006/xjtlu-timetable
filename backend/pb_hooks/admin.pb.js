// Block banned users from logging in.
// The is_banned field is added via migration 1773553584_updated_users.js.

onRecordBeforeAuthWithPasswordRequest(function(e) {
  var record = e.record
  if (!record) return

  if (record.getBool('is_banned')) {
    throw new BadRequestError('账户已被停用，请联系管理员。')
  }
}, 'users')
