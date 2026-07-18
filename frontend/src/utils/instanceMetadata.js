export function safeWebUrl(value, fallback = '') {
  const input = String(value || '').trim()
  if (!input) return fallback

  try {
    const parsed = new URL(input)
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : fallback
  } catch {
    return fallback
  }
}

export function isSafeEmail(value) {
  const input = String(value || '').trim()
  if (!input) return true
  return /^[^\s@?&#/]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(input)
}
