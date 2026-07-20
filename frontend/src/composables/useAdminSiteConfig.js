import { computed, reactive, ref } from 'vue'
import adminPb from '../lib/adminPb'
import { DEFAULT_INSTANCE_NAME } from '../utils/branding'
import { isSafeEmail, safeWebUrl } from '../utils/instanceMetadata'

export function useAdminSiteConfig(semesters) {
  // ── Site Config ────────────────────────────────────────────────────────────
  const siteConfigDefaults = {
    instance_name: DEFAULT_INSTANCE_NAME,
    operator_name: '',
    operator_contact_email: '',
    source_code_url: 'https://github.com/GeniusLv2006/xjtlu-timetable',
    legal_notice_url: '',
    legal_notice_version: '',
    minimum_age: 0,
    blocked_registration_retention_days: 365,
    registration_open: false,
    require_invite: true,
    allowed_email_suffixes: '',
    site_notice: '',
    ical_risk_enabled: true,
    ical_rate_limit_enabled: true,
    ical_ip_anomaly_enabled: true,
    ical_rate_window_minutes: 10,
    ical_rate_max_requests: 5,
    ical_suspicious_ip_prefixes: 4,
    ical_revoke_ip_prefixes: 6,
    ical_suspicious_grace_hours: 48,
    ical_empty_calendar_hours: 48,
  }
  const siteConfig   = reactive({ ...siteConfigDefaults })
  const siteConfigId = ref('')
  const configSaving = ref(false)
  const noticeSaving = ref(false)
  const configSaved  = ref(false)
  const noticeSaved  = ref(false)
  const configError  = ref('')
  const stats        = reactive({ users: null, timetables: null })

  const currentSemesterName = computed(() => {
    const cur = semesters.value.find(s => s.is_current)
    return cur ? cur.name : '未设置'
  })

  async function loadSiteConfig() {
    configError.value = ''
    try {
      const list = await adminPb.collection('site_config').getList(1, 1, { requestKey: null })
      if (list.items.length) {
        const cfg = list.items[0]
        siteConfigId.value = cfg.id
        Object.assign(siteConfig, {
          instance_name:                 cfg.instance_name || siteConfigDefaults.instance_name,
          operator_name:                 cfg.operator_name || '',
          operator_contact_email:        cfg.operator_contact_email || '',
          source_code_url:               cfg.source_code_url || siteConfigDefaults.source_code_url,
          legal_notice_url:              cfg.legal_notice_url || '',
          legal_notice_version:          cfg.legal_notice_version || '',
          minimum_age:                   nonNegativeInt(cfg.minimum_age, 0),
          blocked_registration_retention_days: nonNegativeInt(
            cfg.blocked_registration_retention_days,
            siteConfigDefaults.blocked_registration_retention_days,
          ),
          registration_open:              cfg.registration_open,
          require_invite:                 cfg.require_invite,
          allowed_email_suffixes:         cfg.allowed_email_suffixes || '',
          site_notice:                    cfg.site_notice || '',
          ical_risk_enabled:              cfg.ical_risk_enabled ?? siteConfigDefaults.ical_risk_enabled,
          ical_rate_limit_enabled:        cfg.ical_rate_limit_enabled ?? siteConfigDefaults.ical_rate_limit_enabled,
          ical_ip_anomaly_enabled:        cfg.ical_ip_anomaly_enabled ?? siteConfigDefaults.ical_ip_anomaly_enabled,
          ical_rate_window_minutes:       positiveInt(cfg.ical_rate_window_minutes, siteConfigDefaults.ical_rate_window_minutes),
          ical_rate_max_requests:         positiveInt(cfg.ical_rate_max_requests, siteConfigDefaults.ical_rate_max_requests),
          ical_suspicious_ip_prefixes:    positiveInt(cfg.ical_suspicious_ip_prefixes, siteConfigDefaults.ical_suspicious_ip_prefixes),
          ical_revoke_ip_prefixes:        positiveInt(cfg.ical_revoke_ip_prefixes, siteConfigDefaults.ical_revoke_ip_prefixes),
          ical_suspicious_grace_hours:    positiveInt(cfg.ical_suspicious_grace_hours, siteConfigDefaults.ical_suspicious_grace_hours),
          ical_empty_calendar_hours:      positiveInt(cfg.ical_empty_calendar_hours, siteConfigDefaults.ical_empty_calendar_hours),
        })
      }
    } catch (e) {
      configError.value = e.message
    }
  }

  function positiveInt(value, fallback = 1) {
    const n = Number.parseInt(value, 10)
    return Number.isFinite(n) && n > 0 ? n : fallback
  }

  function nonNegativeInt(value, fallback = 0) {
    const n = Number.parseInt(value, 10)
    return Number.isFinite(n) && n >= 0 ? n : fallback
  }

  function normalizeIcalRiskConfig() {
    siteConfig.ical_rate_window_minutes = positiveInt(siteConfig.ical_rate_window_minutes, siteConfigDefaults.ical_rate_window_minutes)
    siteConfig.ical_rate_max_requests = positiveInt(siteConfig.ical_rate_max_requests, siteConfigDefaults.ical_rate_max_requests)
    siteConfig.ical_suspicious_ip_prefixes = positiveInt(siteConfig.ical_suspicious_ip_prefixes, siteConfigDefaults.ical_suspicious_ip_prefixes)
    siteConfig.ical_revoke_ip_prefixes = positiveInt(siteConfig.ical_revoke_ip_prefixes, siteConfigDefaults.ical_revoke_ip_prefixes)
    siteConfig.ical_suspicious_grace_hours = positiveInt(siteConfig.ical_suspicious_grace_hours, siteConfigDefaults.ical_suspicious_grace_hours)
    siteConfig.ical_empty_calendar_hours = positiveInt(siteConfig.ical_empty_calendar_hours, siteConfigDefaults.ical_empty_calendar_hours)
    if (siteConfig.ical_revoke_ip_prefixes <= siteConfig.ical_suspicious_ip_prefixes) {
      siteConfig.ical_revoke_ip_prefixes = siteConfig.ical_suspicious_ip_prefixes + 1
    }
  }

  async function loadStats() {
    try {
      const [u, t] = await Promise.all([
        adminPb.collection('users').getList(1, 1, { requestKey: null }),
        adminPb.collection('timetables').getList(1, 1, { requestKey: null }),
      ])
      stats.users = u.totalItems
      stats.timetables = t.totalItems
    } catch { /* ignore */ }
  }

  async function saveSiteConfig() {
    configError.value = ''
    configSaving.value = true
    configSaved.value = false
    try {
      if (!siteConfigId.value) throw new Error('站点配置不可用，请确认 migration 已成功执行')
      normalizeIcalRiskConfig()
      const contactEmail = siteConfig.operator_contact_email.trim()
      const rawSourceUrl = siteConfig.source_code_url.trim() || siteConfigDefaults.source_code_url
      const rawLegalUrl = siteConfig.legal_notice_url.trim()
      const legalNoticeVersion = siteConfig.legal_notice_version.trim()
      const minimumAge = nonNegativeInt(siteConfig.minimum_age, 0)
      const sourceUrl = safeWebUrl(rawSourceUrl)
      const legalUrl = safeWebUrl(rawLegalUrl)
      if (!isSafeEmail(contactEmail)) throw new Error('运营者联系邮箱格式无效')
      if (!sourceUrl) throw new Error('源代码地址必须是有效的 HTTP 或 HTTPS URL')
      if (rawLegalUrl && !legalUrl) throw new Error('外部法律说明地址必须是有效的 HTTP 或 HTTPS URL')
      if (minimumAge > 120) throw new Error('最低年龄必须在 0 到 120 之间')
      const retentionDays = nonNegativeInt(
        siteConfig.blocked_registration_retention_days,
        siteConfigDefaults.blocked_registration_retention_days,
      )
      if (retentionDays > 3650) throw new Error('注册限制留存期限必须在 0 到 3650 天之间')
      const payload = {
        instance_name:                 siteConfig.instance_name.trim() || siteConfigDefaults.instance_name,
        operator_name:                 siteConfig.operator_name.trim(),
        operator_contact_email:        contactEmail,
        source_code_url:               sourceUrl,
        legal_notice_url:              legalUrl,
        legal_notice_version:          legalNoticeVersion,
        minimum_age:                   minimumAge,
        blocked_registration_retention_days: retentionDays,
        registration_open:              siteConfig.registration_open,
        require_invite:                 siteConfig.require_invite,
        allowed_email_suffixes:         siteConfig.allowed_email_suffixes,
        ical_risk_enabled:              siteConfig.ical_risk_enabled,
        ical_rate_limit_enabled:        siteConfig.ical_rate_limit_enabled,
        ical_ip_anomaly_enabled:        siteConfig.ical_ip_anomaly_enabled,
        ical_rate_window_minutes:       siteConfig.ical_rate_window_minutes,
        ical_rate_max_requests:         siteConfig.ical_rate_max_requests,
        ical_suspicious_ip_prefixes:    siteConfig.ical_suspicious_ip_prefixes,
        ical_revoke_ip_prefixes:        siteConfig.ical_revoke_ip_prefixes,
        ical_suspicious_grace_hours:    siteConfig.ical_suspicious_grace_hours,
        ical_empty_calendar_hours:      siteConfig.ical_empty_calendar_hours,
      }
      await adminPb.collection('site_config').update(siteConfigId.value, payload, { requestKey: null })
      configSaved.value = true
      setTimeout(() => { configSaved.value = false }, 2500)
    } catch (e) {
      configError.value = e.message
    } finally {
      configSaving.value = false
    }
  }

  async function saveNotice() {
    configError.value = ''
    noticeSaving.value = true
    noticeSaved.value = false
    try {
      if (!siteConfigId.value) throw new Error('站点配置不可用，请确认 migration 已成功执行')
      await adminPb.collection('site_config').update(siteConfigId.value, {
        site_notice: siteConfig.site_notice,
      }, { requestKey: null })
      noticeSaved.value = true
      setTimeout(() => { noticeSaved.value = false }, 2500)
    } catch (e) {
      configError.value = e.message
    } finally {
      noticeSaving.value = false
    }
  }

  return {
    configError,
    configSaved,
    configSaving,
    currentSemesterName,
    loadSiteConfig,
    loadStats,
    noticeSaved,
    noticeSaving,
    saveNotice,
    saveSiteConfig,
    siteConfig,
    stats,
  }
}
