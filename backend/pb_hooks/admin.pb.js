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

// Record a login log entry on every successful password auth.
onRecordAfterAuthWithPasswordRequest(function(e) {
  if (!e.record) return
  var ctx = e.httpContext
  var rawIp = (ctx.request().header.get('CF-Connecting-IP') ||
               ctx.request().header.get('X-Real-IP') ||
               ctx.request().header.get('X-Forwarded-For') || '').split(',')[0].trim()
  var country = ctx.request().header.get('CF-IPCountry') || ''
  var prefix = rawIp
  var v4m = rawIp.match(/^(\d+\.\d+\.\d+)\.\d+$/)
  if (v4m) { prefix = v4m[1] + '.x' }
  else if (rawIp.indexOf(':') !== -1) { prefix = rawIp.split(':').slice(0, 4).join(':') + ':...' }
  try {
    var col = $app.dao().findCollectionByNameOrId('login_logs')
    var rec = new Record(col)
    rec.set('user_id', e.record.id)
    rec.set('email', e.record.email())
    rec.set('ip_full', rawIp)
    rec.set('ip_prefix', prefix)
    rec.set('country', country)
    $app.dao().saveRecord(rec)
  } catch (_) {}
}, 'users')
