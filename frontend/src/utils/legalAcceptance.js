export function normalizeLegalRequirements(config = {}) {
  const parsedAge = Number.parseInt(config.minimum_age, 10)
  return {
    legal_notice_version: String(config.legal_notice_version || '').trim(),
    minimum_age: Number.isFinite(parsedAge) && parsedAge > 0 ? parsedAge : 0,
  }
}

export function requiresLegalAcceptance(config = {}) {
  const requirements = normalizeLegalRequirements(config)
  return Boolean(requirements.legal_notice_version || requirements.minimum_age)
}

export function hasCurrentLegalAcceptance(records = [], config = {}) {
  const requirements = normalizeLegalRequirements(config)
  if (!requiresLegalAcceptance(requirements)) return true

  return records.some(record =>
    String(record.legal_notice_version || '') === requirements.legal_notice_version &&
    Number(record.minimum_age || 0) === requirements.minimum_age &&
    (!requirements.legal_notice_version || record.legal_notice_accepted === true) &&
    (!requirements.minimum_age || record.minimum_age_confirmed === true)
  )
}

export function buildLegalAcceptancePayload(userId, config = {}) {
  const requirements = normalizeLegalRequirements(config)
  return {
    user: userId,
    legal_notice_version: requirements.legal_notice_version,
    legal_notice_accepted: Boolean(requirements.legal_notice_version),
    minimum_age: requirements.minimum_age,
    minimum_age_confirmed: requirements.minimum_age > 0,
  }
}
