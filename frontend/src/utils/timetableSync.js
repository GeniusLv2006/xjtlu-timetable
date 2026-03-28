// 课表同步工具：normalizeActivities + syncTimetable
// 供 ImportView 和 HomeView 共用

const SCHEDULED_DAY_MAP = {
  '0': 'MON', '1': 'TUE', '2': 'WED', '3': 'THU',
  '4': 'FRI', '5': 'SAT', '6': 'SUN',
}

function isoToCST(iso, subtractMinutes = 0) {
  if (!iso) return null
  let hh, mm
  if (iso.includes('T')) {
    const d = new Date(iso)
    hh = d.getUTCHours()
    mm = d.getUTCMinutes()
  } else {
    const part = iso.includes(' ') ? iso.split(' ')[1] : iso
    ;[hh, mm] = (part || '00:00').split(':').map(Number)
  }
  const totalMin = hh * 60 + mm + 480 - subtractMinutes
  const ch = Math.floor(totalMin / 60) % 24
  const cm = totalMin % 60
  return `${String(ch).padStart(2, '0')}:${String(cm).padStart(2, '0')}`
}

export function normalizeActivities(raw) {
  if (!Array.isArray(raw)) return []
  return raw
    .map((a) => {
      if (!a) return null
      const startRaw     = a.startTime || a.start || ''
      const endRaw       = a.endTime   || a.end   || ''
      const nameRaw      = a.name      || ''
      const activityType = a.activityType || ''

      const day =
        SCHEDULED_DAY_MAP[String(a.scheduledDay)] ||
        (startRaw
          ? ['SUN','MON','TUE','WED','THU','FRI','SAT'][new Date(startRaw).getDay()]
          : 'MON')

      const startTime = isoToCST(startRaw, 0)
      const endTime   = isoToCST(endRaw, 10)

      const m = nameRaw.match(/^([A-Z]+\d+)[-–]([^-–]+)[-–](.+)$/)
      const code    = m ? m[1] : (a.moduleId || nameRaw.split(/[-–]/)[0] || nameRaw)
      const section = m ? m[3].trim() : ''

      return {
        identity:      a.identity || a.id || '',
        code:          code.trim(),
        activity_type: activityType || (m ? m[2].trim() : ''),
        section,
        day,
        start_time:    startTime || '--:--',
        end_time:      endTime   || '--:--',
        location:      (a.location || '').trim(),
        staff:         (a.staff    || '').trim(),
        weeks:         a.weekPattern || a.week || '',
      }
    })
    .filter(Boolean)
}

/**
 * 使用已保存的 HASH 从学校服务器拉取最新课表数据，追加新增课程。
 * @returns {{ total: number, saved: number, skipped: number }}
 */
export async function syncTimetable(pb, timetableId, hash) {
  // 1. 拉取学校服务器数据
  let rawList
  let res
  try {
    res = await fetch(
      `https://timetableplus.xjtlu.edu.cn/ptapi/api/enrollment/hash/${hash}/activity`,
      { headers: { Accept: 'application/json' } },
    )
  } catch {
    res = await fetch(`/timetable-api/ptapi/api/enrollment/hash/${hash}/activity`, {
      headers: { Accept: 'application/json' },
    })
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} — HASH 可能已失效，请重新导入课表`)
  const data = await res.json()
  rawList = Array.isArray(data) ? data : (data.data || data.activities || data.result || [])
  if (!rawList.length) throw new Error('返回空数据，可能是空课表或 HASH 已过期')

  const activities = normalizeActivities(rawList)

  // 2. 获取已有课程的 identity，跳过重复
  const existingCourses = await pb.collection('courses').getFullList({
    filter: `timetable = "${timetableId}"`,
    fields: 'identity',
  })
  const existingIdentities = new Set(existingCourses.map((c) => c.identity))

  // 3. 追加新课程
  let saved = 0
  for (const act of activities) {
    if (act.identity && existingIdentities.has(act.identity)) continue
    await pb.collection('courses').create({
      timetable:     timetableId,
      code:          act.code,
      activity_type: act.activity_type,
      section:       act.section,
      day:           act.day,
      start_time:    act.start_time,
      end_time:      act.end_time,
      location:      act.location,
      staff:         act.staff,
      weeks:         act.weeks,
      identity:      act.identity,
    })
    saved++
  }

  // 4. 更新同步时间
  await pb.collection('timetables').update(timetableId, {
    last_synced: new Date().toISOString().replace('T', ' ').slice(0, 19) + 'Z',
  })

  return { total: activities.length, saved, skipped: activities.length - saved }
}
