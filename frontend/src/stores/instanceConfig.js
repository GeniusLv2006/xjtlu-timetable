import { reactive, readonly } from 'vue'
import pb from '../lib/pocketbase'
import { DEFAULT_INSTANCE_NAME } from '../utils/branding'
import { isSafeEmail, safeWebUrl } from '../utils/instanceMetadata'

const defaults = {
  instance_name: DEFAULT_INSTANCE_NAME,
  operator_name: '',
  operator_contact_email: '',
  source_code_url: 'https://github.com/GeniusLv2006/xjtlu-timetable',
  legal_notice_url: '',
}

const state = reactive({
  ...defaults,
  loaded: false,
})

let pendingLoad

export async function loadInstanceConfig({ force = false } = {}) {
  if (state.loaded && !force) return state
  if (pendingLoad && !force) return pendingLoad

  pendingLoad = pb.collection('site_config').getList(1, 1, { requestKey: null })
    .then((list) => {
      if (list.items.length) {
        const config = list.items[0]
        for (const key of Object.keys(defaults)) {
          state[key] = config[key] || defaults[key]
        }
        state.source_code_url = safeWebUrl(
          config.source_code_url,
          defaults.source_code_url,
        )
        state.legal_notice_url = safeWebUrl(config.legal_notice_url)
        state.operator_contact_email = isSafeEmail(config.operator_contact_email)
          ? String(config.operator_contact_email || '').trim()
          : ''
      }
      state.loaded = true
      return state
    })
    .catch(() => {
      state.loaded = true
      return state
    })
    .finally(() => {
      pendingLoad = null
    })

  return pendingLoad
}

export const instanceConfig = readonly(state)
