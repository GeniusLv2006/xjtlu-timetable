routerAdd('GET', '/api/ical/{token}/timetable.ics', function(e) {

  // ── 辅助函数 ──────────────────────────────────────────────────────────────

  var DAY_OFFSET = { MON: 0, TUE: 1, WED: 2, THU: 3, FRI: 4, SAT: 5, SUN: 6 }

  var parseWeeks = function(str) {
    if (!str) return []
    var cleaned = str.replace(/^[^0-9]+/, '').trim()
    var result = [], seen = {}
    var parts = cleaned.split(/[\s,]+/)
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i]
      var m = part.match(/^(\d+)-(\d+)$/)
      if (m) {
        for (var w = parseInt(m[1]); w <= parseInt(m[2]); w++) {
          if (!seen[w]) { seen[w] = true; result.push(w) }
        }
      } else if (/^\d+$/.test(part)) {
        var n = parseInt(part)
        if (!seen[n]) { seen[n] = true; result.push(n) }
      }
    }
    return result.sort(function(a, b) { return a - b })
  }

  var courseDate = function(startDate, week, day) {
    var offset = (week - 1) * 7 + (DAY_OFFSET[day] || 0)
    var d = new Date(startDate.getTime() + offset * 86400000)
    var y  = d.getUTCFullYear()
    var mo = String(d.getUTCMonth() + 1).padStart(2, '0')
    var dd = String(d.getUTCDate()).padStart(2, '0')
    return '' + y + mo + dd
  }

  var timeToIcal = function(hhmm) { return hhmm.replace(':', '') + '00' }

  var escVal = function(str) {
    if (!str) return ''
    return String(str)
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r?\n/g, '\\n')
  }

  // RFC 5545 行折叠：每行 ≤ 75 字节，续行以空格开头
  var fold = function(str) {
    var blen = function(ch) {
      var code = ch.charCodeAt(0)
      return code < 0x80 ? 1 : code < 0x800 ? 2 : 3
    }
    var totalBytes = 0
    for (var i = 0; i < str.length; i++) totalBytes += blen(str[i])
    if (totalBytes <= 75) return str + '\r\n'

    var out = '', buf = '', bufBytes = 0, first = true
    for (var j = 0; j < str.length; j++) {
      var ch = str[j], cb = blen(ch), limit = first ? 75 : 74
      if (bufBytes + cb > limit) {
        out += (first ? '' : ' ') + buf + '\r\n'
        buf = ch; bufBytes = cb; first = false
      } else { buf += ch; bufBytes += cb }
    }
    if (buf) out += (first ? '' : ' ') + buf + '\r\n'
    return out
  }

  var buildIcs = function(courses, startDate) {
    var CRLF = '\r\n', out = ''

    out += 'BEGIN:VCALENDAR' + CRLF
    out += 'VERSION:2.0' + CRLF
    out += 'PRODID:-//XJTLU Timetable//timetable.xjtlu.uk//EN' + CRLF
    out += 'CALSCALE:GREGORIAN' + CRLF
    out += 'METHOD:PUBLISH' + CRLF
    out += 'X-WR-CALNAME:XJTLU Timetable' + CRLF
    out += 'X-WR-TIMEZONE:Asia/Shanghai' + CRLF

    out += 'BEGIN:VTIMEZONE' + CRLF
    out += 'TZID:Asia/Shanghai' + CRLF
    out += 'BEGIN:STANDARD' + CRLF
    out += 'TZOFFSETFROM:+0800' + CRLF
    out += 'TZOFFSETTO:+0800' + CRLF
    out += 'TZNAME:CST' + CRLF
    out += 'DTSTART:19700101T000000' + CRLF
    out += 'END:STANDARD' + CRLF
    out += 'END:VTIMEZONE' + CRLF

    var now = new Date()
    var dtstamp =
      now.getUTCFullYear() +
      String(now.getUTCMonth() + 1).padStart(2, '0') +
      String(now.getUTCDate()).padStart(2, '0') + 'T' +
      String(now.getUTCHours()).padStart(2, '0') +
      String(now.getUTCMinutes()).padStart(2, '0') +
      String(now.getUTCSeconds()).padStart(2, '0') + 'Z'

    for (var ci = 0; ci < courses.length; ci++) {
      var course    = courses[ci]
      var identity  = course.getString('identity') || course.id
      var code      = course.getString('code')
      var actType   = course.getString('activity_type')
      var day       = course.getString('day')
      var startTime = course.getString('start_time')
      var endTime   = course.getString('end_time')
      var location  = course.getString('location')
      var staff     = course.getString('staff')
      var section   = course.getString('section')
      var weeksStr  = course.getString('weeks')

      if (!day || !startTime || !endTime) continue

      var weeks = parseWeeks(weeksStr)
      if (weeks.length === 0) continue

      var summary     = escVal(code + ' ' + actType)
      var locationVal = escVal(location)
      var desc        = escVal(
        'Staff: ' + (staff || '') +
        '\nSection: ' + (section || '') +
        '\nWeeks: ' + (weeksStr || '')
      )

      for (var wi = 0; wi < weeks.length; wi++) {
        var week    = weeks[wi]
        var date    = courseDate(startDate, week, day)
        var dtStart = date + 'T' + timeToIcal(startTime)
        var dtEnd   = date + 'T' + timeToIcal(endTime)
        var uid     = identity + '-week' + week + '@timetable.xjtlu.uk'

        out += 'BEGIN:VEVENT' + CRLF
        out += fold('UID:' + uid)
        out += fold('DTSTAMP:' + dtstamp)
        out += fold('DTSTART;TZID=Asia/Shanghai:' + dtStart)
        out += fold('DTEND;TZID=Asia/Shanghai:'   + dtEnd)
        out += fold('SUMMARY:'  + summary)
        if (locationVal) out += fold('LOCATION:' + locationVal)
        out += fold('DESCRIPTION:' + desc)
        out += 'END:VEVENT' + CRLF
      }
    }

    out += 'END:VCALENDAR' + CRLF
    return out
  }

  // ── 请求处理 ──────────────────────────────────────────────────────────────

  var token = e.request.pathValue('token')

  if (!/^[0-9a-f]{32,64}$/.test(token)) {
    return e.json(400, { error: 'Invalid token format' })
  }

  // 1. 查 ical_token 记录
  var tokenRecord
  try {
    tokenRecord = $app.findFirstRecordByFilter(
      'ical_tokens', 'token = "' + token + '"'
    )
  } catch (err) {
    return e.json(404, { error: 'Token not found' })
  }

  var userId = tokenRecord.getString('user')

  // 1b. 验证用户未被停用
  var userRecord
  try {
    userRecord = $app.findRecordById('users', userId)
  } catch (err) {
    return e.json(404, { error: 'User not found' })
  }

  if (userRecord.getBool('is_banned')) {
    // 查询首次返回空日历的时间戳（48 小时窗口内持续返回空日历，覆盖多设备同步）
    var bRows = arrayOf(new DynamicModel({ ban_empty_served_at: '' }))
    try {
      $app.db()
        .newQuery('SELECT ban_empty_served_at FROM ical_tokens WHERE id = {:id}')
        .bind({ id: tokenRecord.id })
        .all(bRows)
    } catch (_) {}

    var servedAt = bRows.length > 0 ? bRows[0].ban_empty_served_at : ''
    var BAN_WINDOW_MS = 48 * 60 * 60 * 1000  // 48 小时，覆盖所有设备的同步周期

    if (servedAt) {
      var elapsed = Date.now() - new Date(servedAt).getTime()
      if (elapsed > BAN_WINDOW_MS) {
        // 窗口已过期，所有设备应已完成同步，切换为 403
        return e.json(403, { error: 'Account suspended' })
      }
      // 仍在窗口内：继续返回空日历（供其他设备同步）
    } else {
      // 首次请求：记录时间戳，开启 48 小时窗口
      try {
        $app.db()
          .newQuery("UPDATE ical_tokens SET ban_empty_served_at = {:ts} WHERE id = {:id}")
          .bind({ ts: new Date().toISOString(), id: tokenRecord.id })
          .execute()
      } catch (_) {}
    }

    var emptyIcs =
      'BEGIN:VCALENDAR\r\n' +
      'VERSION:2.0\r\n' +
      'PRODID:-//XJTLU Timetable//timetable.xjtlu.uk//EN\r\n' +
      'CALSCALE:GREGORIAN\r\n' +
      'METHOD:PUBLISH\r\n' +
      'X-WR-CALNAME:XJTLU Timetable\r\n' +
      'X-WR-TIMEZONE:Asia/Shanghai\r\n' +
      'END:VCALENDAR\r\n'
    e.response.header().set('Content-Type', 'text/calendar; charset=utf-8')
    e.response.header().set('Content-Disposition', 'attachment; filename="timetable.ics"')
    return e.string(200, emptyIcs)
  }

  // 1c. 记录 iCal 访问日志
  var logIp = (e.request.header.get('CF-Connecting-IP') ||
               e.request.header.get('X-Real-IP') ||
               e.request.header.get('X-Forwarded-For') || '').split(',')[0].trim()
  var logCountry = e.request.header.get('CF-IPCountry') || ''
  var logUserAgent = (e.request.header.get('User-Agent') || '').trim()
  var logPrefix = logIp
  var v4m = logIp.match(/^(\d+\.\d+\.\d+)\.\d+$/)
  if (v4m) { logPrefix = v4m[1] + '.x' }
  else if (logIp.indexOf(':') !== -1) { logPrefix = logIp.split(':').slice(0, 4).join(':') + ':...' }

  // 用 ip-api.com 查询城市（CF 免费计划不提供 CF-IPCity）
  var logCity = ''
  var isPrivateIp = !logIp || /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|::1$)/.test(logIp)
  if (!isPrivateIp) {
    try {
      var geoRes = $http.send({
        url: 'http://ip-api.com/json/' + logIp + '?fields=status,countryCode,city',
        method: 'GET',
        timeout: 3,
      })
      if (geoRes.statusCode === 200 && geoRes.raw) {
        var geoData = JSON.parse(geoRes.raw)
        if (geoData.status === 'success') {
          logCity = geoData.city || ''
          if (!logCountry && geoData.countryCode) logCountry = geoData.countryCode
        }
      }
    } catch (_) {}

  }

  try {
    var logCol = $app.findCollectionByNameOrId('ical_access_logs')
    var logRec = new Record(logCol)
    logRec.set('user_id', userId)
    logRec.set('email', userRecord.email())
    logRec.set('ip_full', logIp)
    logRec.set('ip_prefix', logPrefix)
    logRec.set('country', logCountry)
    logRec.set('user_agent', logUserAgent)
    $app.save(logRec)
    // city 字段不在 PB schema 中，需通过原始 SQL 写入
    $app.db()
      .newQuery("UPDATE ical_access_logs SET city = {:city} WHERE id = {:id}")
      .bind({ city: logCity, id: logRec.id })
      .execute()
  } catch (_) {}

  // 2. 查当前学期
  var semester
  try {
    semester = $app.findFirstRecordByFilter('semesters', 'is_current = true')
  } catch (err) {
    return e.json(503, { error: '学期未配置，请联系管理员' })
  }

  var startDateStr = semester.getString('start_date').replace(' ', 'T')
  var startDate = new Date(startDateStr)
  if (isNaN(startDate.getTime())) {
    return e.json(503, { error: '学期日期格式错误' })
  }

  // 3. 查该用户所有课表（ical_token 是用户自己的凭证，不受 visibility 限制）
  var timetables
  try {
    timetables = $app.findRecordsByFilter(
      'timetables',
      'user = "' + userId + '"',
      '-created', 0, 0
    )
  } catch (err) { timetables = [] }

  // 4. 查所有课程
  var allCourses = []
  for (var i = 0; i < timetables.length; i++) {
    var tt = timetables[i]
    var courses
    try {
      courses = $app.findRecordsByFilter(
        'courses', 'timetable = "' + tt.id + '"', '', 0, 0
      )
    } catch (err) { continue }
    for (var j = 0; j < courses.length; j++) allCourses.push(courses[j])
  }

  // 5. 生成并返回 iCal
  var ics = buildIcs(allCourses, startDate)

  e.response.header().set('Content-Type', 'text/calendar; charset=utf-8')
  e.response.header().set('Content-Disposition', 'attachment; filename="timetable.ics"')
  e.response.header().set('Cache-Control', 'private, max-age=300')
  return e.string(200, ics)
})
