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

  // 1b. 查询用户记录，验证账户存在
  var userRecord
  try {
    userRecord = $app.findRecordById('users', userId)
  } catch (err) {
    return e.json(404, { error: 'User not found' })
  }

  // 1c. 记录 iCal 访问日志（在所有状态检查之前写入，确保 banned/revoked 请求也留有记录）
  var logIp = (e.request.header.get('CF-Connecting-IP') ||
               e.request.header.get('X-Real-IP') ||
               e.request.header.get('X-Forwarded-For') || '').split(',')[0].trim()
  var logCountry = e.request.header.get('CF-IPCountry') || ''
  var logUserAgent = (e.request.header.get('User-Agent') || '').trim()
  var logPrefix = logIp
  var v4m = logIp.match(/^(\d+\.\d+\.\d+)\.\d+$/)
  if (v4m) { logPrefix = v4m[1] + '.x' }
  else if (logIp.indexOf(':') !== -1) { logPrefix = logIp.split(':').slice(0, 4).join(':') + ':...' }

  // GeoIP 查询：IP2Location.io（主）→ ip.sb（备）→ ip-api.com（第三备）
  // 字段级轮询：city 或 isp 任一缺失即尝试下一供应商
  // 结果持久化缓存至 SQLite（ip_geo_cache），TTL 30 天，跨重启有效
  var logCity = ''
  var logIsp = ''
  var logGeoSource = ''
  var isPrivateIp = !logIp || /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|::1$)/.test(logIp)
  if (!isPrivateIp) {
    // ── Step 1：查 SQLite 缓存 ────────────────────────────────────────────────
    var _cacheHit = false
    try {
      var _cacheRows = arrayOf(new DynamicModel({ country: '', city: '', isp: '', source: '' }))
      $app.db()
        .newQuery("SELECT country, city, isp, source FROM ip_geo_cache WHERE ip = {:ip} AND expires_at > datetime('now')")
        .bind({ ip: logIp })
        .all(_cacheRows)
      if (_cacheRows.length > 0) {
        _cacheHit = true
        if (!logCountry && _cacheRows[0].country) logCountry = _cacheRows[0].country
        logCity      = _cacheRows[0].city
        logIsp       = _cacheRows[0].isp
        logGeoSource = _cacheRows[0].source
      }
    } catch (_) {}

    if (!_cacheHit) {
      // ── Step 2：查外部 API（字段级三级轮询） ─────────────────────────────────
      var _geoSources = []

      // Provider 1：IP2Location.io（无 Key，1000次/天）
      try {
        var _r1 = $http.send({
          url: 'https://api.ip2location.io/?ip=' + logIp + '&format=json',
          method: 'GET',
          timeout: 5,
        })
        if (_r1.statusCode === 200 && _r1.raw) {
          var _d1 = JSON.parse(_r1.raw)
          var _got1 = false
          if (_d1.city_name && _d1.city_name !== '-') { logCity = _d1.city_name; _got1 = true }
          if (_d1.isp || _d1.as) {
            logIsp = _d1.isp || _d1.as || ''
            if (logIsp) _got1 = true
          }
          if (!logCountry && _d1.country_code) logCountry = _d1.country_code
          if (_got1) _geoSources.push('ip2location')
        }
      } catch (_) {}

      // Provider 2：ip.sb（city 或 isp 任一缺失时）
      if (!logCity || !logIsp) {
        try {
          var _r2 = $http.send({
            url: 'https://api.ip.sb/geoip/' + logIp,
            method: 'GET',
            timeout: 3,
          })
          if (_r2.statusCode === 200 && _r2.raw) {
            var _d2 = JSON.parse(_r2.raw)
            var _got2 = false
            if (!logCity && _d2.city) { logCity = _d2.city; _got2 = true }
            if (!logIsp && _d2.organization) { logIsp = _d2.organization; _got2 = true }
            if (!logCountry && _d2.country_code) logCountry = _d2.country_code
            if (_got2) _geoSources.push('ipsb')
          }
        } catch (_) {}
      }

      // Provider 3：ip-api.com（city 或 isp 仍有缺失时）
      if (!logCity || !logIsp) {
        try {
          var _r3 = $http.send({
            url: 'http://ip-api.com/json/' + logIp + '?fields=status,countryCode,city,org,isp',
            method: 'GET',
            timeout: 3,
          })
          if (_r3.statusCode === 200 && _r3.raw) {
            var _d3 = JSON.parse(_r3.raw)
            if (_d3.status === 'success') {
              var _got3 = false
              if (!logCity && _d3.city) { logCity = _d3.city; _got3 = true }
              if (!logIsp) {
                var _isp3 = _d3.org || _d3.isp || ''
                if (_isp3) { logIsp = _isp3; _got3 = true }
              }
              if (!logCountry && _d3.countryCode) logCountry = _d3.countryCode
              if (_got3) _geoSources.push('ipapi')
            }
          }
        } catch (_) {}
      }

      logGeoSource = _geoSources.join('+')

      // ── Step 3：写入 SQLite 缓存（无论是否查到，都写，避免重复请求） ──────────
      try {
        $app.db()
          .newQuery("INSERT OR REPLACE INTO ip_geo_cache (ip, country, city, isp, source, expires_at) VALUES ({:ip}, {:country}, {:city}, {:isp}, {:source}, datetime('now', '+30 days'))")
          .bind({ ip: logIp, country: logCountry, city: logCity, isp: logIsp, source: logGeoSource })
          .execute()
      } catch (_) {}
    }
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
    // city/isp/geo_source 字段不在 PB schema 中，需通过原始 SQL 写入
    $app.db()
      .newQuery("UPDATE ical_access_logs SET city = {:city}, isp = {:isp}, geo_source = {:source} WHERE id = {:id}")
      .bind({ city: logCity, isp: logIsp, source: logGeoSource, id: logRec.id })
      .execute()
  } catch (_) {}

  // 1d. 账户封禁检查
  if (userRecord.getBool('is_banned')) {
    // ban_empty_served_at 懒加载：首次请求时开启 48h 窗口，覆盖所有设备的同步周期
    var servedAt = tokenRecord.getString('ban_empty_served_at')
    var BAN_WINDOW_MS = 48 * 60 * 60 * 1000

    if (servedAt) {
      var elapsed = Date.now() - new Date(servedAt).getTime()
      if (elapsed > BAN_WINDOW_MS) {
        return e.json(403, { error: 'Account suspended' })
      }
    } else {
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

  // 1e. Token 吊销检查（风控触发）—— 懒加载 48h 空日历窗口 → 403
  //     revoked_at 保留作审计字段（记录何时触发吊销），不参与窗口计算
  if (tokenRecord.getBool('is_revoked')) {
    var revokeServedAt = tokenRecord.getString('revoke_empty_served_at')
    var REVOKE_WINDOW_MS = 48 * 60 * 60 * 1000

    if (revokeServedAt) {
      if (Date.now() - new Date(revokeServedAt).getTime() > REVOKE_WINDOW_MS) {
        return e.json(403, { error: 'Token revoked. Please generate a new subscription link.' })
      }
    } else {
      try {
        $app.db()
          .newQuery("UPDATE ical_tokens SET revoke_empty_served_at = {:ts} WHERE id = {:id}")
          .bind({ ts: new Date().toISOString(), id: tokenRecord.id })
          .execute()
      } catch (_) {}
    }

    var emptyRevoked =
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
    return e.string(200, emptyRevoked)
  }

  // ── 速率门控：10 分钟内同一 token 超过 5 次请求 → 429 ─────────────────────
  var tokenCreated = tokenRecord.getString('created')
  var rateRows = arrayOf(new DynamicModel({ cnt: 0 }))
  try {
    $app.db()
      .newQuery("SELECT count(*) as cnt FROM ical_access_logs WHERE user_id = {:uid} AND created >= {:token_created} AND created >= datetime('now', '-10 minutes')")
      .bind({ uid: userId, token_created: tokenCreated })
      .all(rateRows)
  } catch (_) {}
  if (rateRows.length > 0 && parseInt(rateRows[0].cnt) > 5) {
    e.response.header().set('Retry-After', '600')
    return e.json(429, { error: 'Too many requests. Please retry after 10 minutes.' })
  }

  // ── 异常检测：24 小时内不同 IP 前缀数量 ───────────────────────────────────
  // 阈值：≥4 个不同 IP 前缀 → 标记可疑；≥6 个 → 立即吊销；
  //       已标记可疑 >48h 且仍 ≥4 个 → 吊销（持续未处理）
  // 吊销不删除 record，走 48h 空日历过渡（与账户暂停策略一致）
  // 注意：只统计当前 token 创建后的日志，避免旧 token 的访问历史污染新 token
  try {
    var ipRows = arrayOf(new DynamicModel({ cnt: 0 }))
    $app.db()
      .newQuery("SELECT count(DISTINCT ip_prefix) as cnt FROM ical_access_logs WHERE user_id = {:uid} AND created >= {:token_created} AND created >= datetime('now', '-24 hours')")
      .bind({ uid: userId, token_created: tokenCreated })
      .all(ipRows)
    var distinctIps = ipRows.length > 0 ? parseInt(ipRows[0].cnt) : 0

    var isSuspicious = tokenRecord.getBool('is_suspicious')
    var suspiciousAt = tokenRecord.getString('suspicious_at')
    var nowIso       = new Date().toISOString()

    var doRevoke = function(reason) {
      try {
        var rec = $app.findRecordById('ical_tokens', tokenRecord.id)
        rec.set('is_revoked',    true)
        rec.set('is_suspicious', true)
        if (!rec.getString('suspicious_at')) rec.set('suspicious_at', nowIso)
        rec.set('revoked_at', nowIso)
        $app.save(rec)
        console.warn('[iCal] Auto-revoked (' + reason + '): user=' + userId +
          ' email=' + userRecord.email() + ' distinct_ips_24h=' + distinctIps)
      } catch (_) {}
    }

    if (distinctIps > 5) {
      // 高危：立即吊销（≥6 个不同 IP 前缀，明显泄露）
      doRevoke('high-risk')
    } else if (isSuspicious && suspiciousAt) {
      // 已标记可疑：与当前 IP 数无关，持续 48h 未重置 → 吊销
      // （即使此刻 IP 数已降回正常，说明用户看到横幅却未处理）
      var suspAge = Date.now() - new Date(suspiciousAt).getTime()
      if (suspAge > 48 * 60 * 60 * 1000) {
        doRevoke('persistent')
      }
    } else if (distinctIps >= 4) {
      // 首次触达可疑阈值：标记 suspicious，用户前端将看到告警横幅
      try {
        var rec2 = $app.findRecordById('ical_tokens', tokenRecord.id)
        rec2.set('is_suspicious', true)
        rec2.set('suspicious_at', nowIso)
        $app.save(rec2)
      } catch (_) {}
    }
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
