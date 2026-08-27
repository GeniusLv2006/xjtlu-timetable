/// <reference path="../pb_data/types.d.ts" />

// Local-first timetable fetching fallback. The HASH stays in the request body
// so it is not exposed in the proxy URL or ordinary access logs.
routerAdd('POST', '/api/timetable-sync/activity', function(e) {
  var auth = e.requestInfo().auth
  if (!auth || (auth.collection().name !== 'users' && auth.collection().name !== '_superusers')) {
    throw new ForbiddenError('Please sign in')
  }

  var hash = String((e.requestInfo().body || {})['hash'] || '').trim()
  if (!/^[A-Fa-f0-9]{40,128}$/.test(hash)) {
    throw new BadRequestError('Invalid timetable HASH')
  }

  var upstream
  try {
    upstream = $http.send({
      url: 'https://timetableplus.xjtlu.edu.cn/ptapi/api/enrollment/hash/' + hash + '/activity',
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Referer: 'https://timetableplus.xjtlu.edu.cn/',
      },
      timeout: 20,
    })
  } catch (_) {
    return e.json(502, { message: 'Timetable service is temporarily unavailable' })
  }

  if (upstream.statusCode < 200 || upstream.statusCode >= 300) {
    return e.json(502, { message: 'Timetable service returned HTTP ' + upstream.statusCode })
  }
  if (!upstream.json || !Array.isArray(upstream.json)) {
    return e.json(502, { message: 'Timetable service returned a non-JSON response' })
  }

  return e.json(200, upstream.json)
}, $apis.requireAuth())
