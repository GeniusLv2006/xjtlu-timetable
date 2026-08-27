const ACTIVITY_ENDPOINT_PREFIX = 'https://timetableplus.xjtlu.edu.cn/ptapi/api/enrollment/hash/'

export function extractTimetableHash(input) {
  const value = (input || '').trim()
  const embedded = value.match(/[#/]([0-9A-Fa-f]{40,})/)

  if (embedded) return embedded[1].toUpperCase()
  if (/^[0-9A-Fa-f]{40,}$/.test(value)) return value.toUpperCase()
  return null
}

export function buildTimetableActivityUrl(input) {
  const hash = extractTimetableHash(input)
  return hash ? `${ACTIVITY_ENDPOINT_PREFIX}${hash}/activity` : ''
}

export function extractActivityList(data) {
  if (Array.isArray(data)) return data
  return data?.data || data?.activities || data?.result || []
}
