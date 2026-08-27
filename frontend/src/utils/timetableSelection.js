export async function readActiveTimetableId(pb) {
  const result = await pb.send('/api/timetables/active', {
    method: 'GET',
    requestKey: null,
  })
  return result?.timetable_id || ''
}

export async function writeActiveTimetableId(pb, timetableId) {
  const result = await pb.send('/api/timetables/active', {
    method: 'PUT',
    body: { timetable_id: timetableId },
    requestKey: null,
  })
  return result?.timetable_id || ''
}

export function validateTimetableLabel(input) {
  const value = (input || '').trim()
  if (!value) return '课表名称不能为空'
  if (value.length > 80) return '课表名称不能超过 80 个字符'
  return ''
}
