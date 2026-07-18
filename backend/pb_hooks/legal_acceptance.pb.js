// Public registration must confirm the current instance requirements. Accounts
// created by a superuser are prompted on their first interactive login instead.
onRecordCreateRequest(function(e) {
  var auth = e.requestInfo().auth
  var isSuperuser = false
  try {
    isSuperuser = auth && auth.collection().name === '_superusers'
  } catch (_) {}
  if (isSuperuser) {
    e.next()
    return
  }

  var configs
  try {
    configs = $app.findRecordsByFilter('site_config', 'id != ""', 'created', 1, 0)
  } catch (_) {
    configs = []
  }
  var version = configs.length
    ? configs[0].getString('legal_notice_version').trim()
    : ''
  var minimumAge = configs.length
    ? Math.max(0, configs[0].getInt('minimum_age'))
    : 0
  var body = e.requestInfo().body || {}

  if (version && body['legal_notice_version'] !== version) {
    throw new BadRequestError('请阅读并同意当前版本的用户协议与隐私政策')
  }
  if (version && body['legal_notice_accepted'] !== true) {
    throw new BadRequestError('请阅读并同意用户协议与隐私政策')
  }
  if (minimumAge > 0 && body['minimum_age'] !== minimumAge) {
    throw new BadRequestError('最低年龄要求已更新，请刷新页面后重试')
  }
  if (minimumAge > 0 && body['minimum_age_confirmed'] !== true) {
    throw new BadRequestError('请确认你符合本实例的最低年龄要求')
  }

  e.next()

  if (!version && minimumAge === 0) return
  try {
    var collection = $app.findCollectionByNameOrId('legal_acceptances')
    var record = new Record(collection)
    record.set('user', e.record.id)
    record.set('legal_notice_version', version)
    record.set('legal_notice_accepted', !!version)
    record.set('minimum_age', minimumAge)
    record.set('minimum_age_confirmed', minimumAge > 0)
    $app.save(record)
  } catch (err) {
    // The global gate retries the durable record on first login. Do not turn a
    // successfully created account into an ambiguous registration failure.
    console.error('legal_acceptance: failed to save registration acceptance:', err)
  }
}, 'users')

// Re-acceptance records are immutable and always stamped with the authenticated
// user and the server's current legal configuration.
onRecordCreateRequest(function(e) {
  var auth = e.requestInfo().auth
  if (!auth || auth.collection().name !== 'users') {
    throw new ForbiddenError('请先登录')
  }

  var configs
  try {
    configs = $app.findRecordsByFilter('site_config', 'id != ""', 'created', 1, 0)
  } catch (_) {
    configs = []
  }
  var version = configs.length
    ? configs[0].getString('legal_notice_version').trim()
    : ''
  var minimumAge = configs.length
    ? Math.max(0, configs[0].getInt('minimum_age'))
    : 0
  var body = e.requestInfo().body || {}

  if (version && body['legal_notice_version'] !== version) {
    throw new BadRequestError('请阅读并同意当前版本的用户协议与隐私政策')
  }
  if (version && body['legal_notice_accepted'] !== true) {
    throw new BadRequestError('请阅读并同意用户协议与隐私政策')
  }
  if (minimumAge > 0 && body['minimum_age'] !== minimumAge) {
    throw new BadRequestError('最低年龄要求已更新，请刷新页面后重试')
  }
  if (minimumAge > 0 && body['minimum_age_confirmed'] !== true) {
    throw new BadRequestError('请确认你符合本实例的最低年龄要求')
  }

  e.record.set('user', auth.id)
  e.record.set('legal_notice_version', version)
  e.record.set('legal_notice_accepted', !!version)
  e.record.set('minimum_age', minimumAge)
  e.record.set('minimum_age_confirmed', minimumAge > 0)
  e.next()
}, 'legal_acceptances')
