// Block banned users from logging in + record login log on success.
// v0.23+: Before/After hooks merged into single hook with e.next().

onRecordAuthWithPasswordRequest(function(e) {
  var record = e.record
  if (record && record.getBool('is_banned')) {
    throw new BadRequestError('Account suspended. Please contact the administrator')
  }

  e.next()

  // Record a login log entry on every successful password auth.
  if (!e.record) return
  var rawIp = (e.request.header.get('CF-Connecting-IP') ||
               e.request.header.get('X-Real-IP') ||
               e.request.header.get('X-Forwarded-For') || '').split(',')[0].trim()
  var country = e.request.header.get('CF-IPCountry') || ''
  var prefix = rawIp
  var v4m = rawIp.match(/^(\d+\.\d+\.\d+)\.\d+$/)
  if (v4m) { prefix = v4m[1] + '.x' }
  else if (rawIp.indexOf(':') !== -1) { prefix = rawIp.split(':').slice(0, 4).join(':') + ':...' }
  try {
    var col = $app.findCollectionByNameOrId('login_logs')
    var rec = new Record(col)
    rec.set('user_id', e.record.id)
    rec.set('email', e.record.email())
    rec.set('ip_full', rawIp)
    rec.set('ip_prefix', prefix)
    rec.set('country', country)
    $app.save(rec)
  } catch (_) {}
}, 'users')

// Block banned users from refreshing their token.
// This invalidates existing sessions when a user is suspended —
// the frontend calls authRefresh on startup and tab focus, so they get kicked out promptly.
onRecordAuthRefreshRequest(function(e) {
  if (e.record && e.record.getBool('is_banned')) {
    throw new BadRequestError('Account suspended. Please contact the administrator')
  }
  e.next()
}, 'users')
