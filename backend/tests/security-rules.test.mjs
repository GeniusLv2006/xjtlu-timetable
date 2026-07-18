import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../../', import.meta.url)

async function source(path) {
  return readFile(new URL(path, root), 'utf8')
}

test('the corrective migration binds records to the authenticated owner', async () => {
  const migration = await source(
    'backend/pb_migrations/1784265400_harden_record_ownership.js',
  )

  assert.match(
    migration,
    /tokens\.createRule = '.*@request\.auth\.id = user\.id'/,
  )
  assert.match(
    migration,
    /timetables\.createRule = '.*@request\.auth\.id = user\.id'/,
  )
  assert.match(migration, /@request\.body\.user:changed = false/)
  assert.match(migration, /@request\.body\.timetable:changed = false/)
  assert.match(migration, /@request\.body\.from_user:changed = false/)
  assert.match(migration, /@request\.body\.to_user:changed = false/)
})

test('the squashed baseline and corrective migrations cover the secured collections', async () => {
  const [baseline, corrective] = await Promise.all([
    source('backend/pb_migrations/1776300000_add_ical_risk_config_and_ban_rules.js'),
    source('backend/pb_migrations/1784265400_harden_record_ownership.js'),
  ])

  for (const collection of ['timetables', 'courses', 'friendships', 'ical_tokens']) {
    assert.match(baseline, new RegExp(`"name": "${collection}"`))
  }

  assert.match(baseline, /@request\.auth\.id = user\.id/)
  assert.match(corrective, /@request\.auth\.id = user\.id/)
})

test('case-insensitive login does not expose an account lookup endpoint', async () => {
  const [hook, store] = await Promise.all([
    source('backend/pb_hooks/auth_ci.pb.js'),
    source('frontend/src/stores/auth.js'),
  ])

  assert.doesNotMatch(hook, /resolve-email/)
  assert.doesNotMatch(store, /resolve-email/)
  assert.match(hook, /toLowerCase\(\)/)
  assert.match(store, /toLowerCase\(\)/)
})

test('fresh self-host configuration is seeded with safe defaults', async () => {
  const migration = await source(
    'backend/pb_migrations/1784349726_seed_self_host_config.js',
  )

  for (const field of [
    'instance_name',
    'operator_name',
    'operator_contact_email',
    'source_code_url',
    'legal_notice_url',
    'initialization_complete',
    'initialization_stage',
  ]) {
    assert.match(migration, new RegExp(`"${field}"`))
  }
  assert.match(migration, /config\.set\("registration_open", false\)/)
  assert.match(migration, /config\.set\("require_invite", true\)/)
  assert.match(migration, /config\.set\("ical_risk_enabled", true\)/)
  assert.match(migration, /config\.set\("initialization_complete", false\)/)
  assert.match(migration, /config\.set\("initialization_stage", 0\)/)
  assert.match(migration, /for \(let i = 1; i < records\.length; i \+= 1\)/)
})

test('the branding migration only renames the legacy default instance', async () => {
  const migration = await source(
    'backend/pb_migrations/1784358117_rename_default_instance.js',
  )

  assert.match(migration, /OLD_DEFAULT_NAME = "XJTLU Timetable"/)
  assert.match(
    migration,
    /NEW_DEFAULT_NAME = "Timetable Toolkit for XJTLU Students"/,
  )
  assert.match(migration, /'instance_name = \{:name\}'/)
  assert.match(migration, /\{ name: from \}/)
  assert.match(migration, /renameDefaultInstance\(app, OLD_DEFAULT_NAME, NEW_DEFAULT_NAME\)/)
})

test('production iCal links use the current instance origin', async () => {
  const settings = await source('frontend/src/views/SettingsView.vue')

  assert.match(settings, /window\.location\.origin/)
  assert.doesNotMatch(settings, /const PROD_BASE/)
})
