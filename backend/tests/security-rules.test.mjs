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

test('user emails stay private and profiles are limited to connected users', async () => {
  const [hook, migration, admin] = await Promise.all([
    source('backend/pb_hooks/auth_ci.pb.js'),
    source('backend/pb_migrations/1784360000_protect_user_email_visibility.js'),
    source('frontend/src/views/AdminView.vue'),
  ])

  assert.match(hook, /set\('emailVisibility', false\)/)
  assert.match(migration, /UPDATE users SET emailVisibility = false/)
  assert.match(migration, /'@request\.auth\.is_banned != true',\s*'&&',/)
  assert.match(migration, /'id = @request\.auth\.id'/)
  assert.match(migration, /@collection\.friendships\.from_user\.id/)
  assert.match(migration, /@collection\.friendships\.to_user\.id/)
  assert.doesNotMatch(admin, /emailVisibility:\s*true/)
})

test('public timetable access is removed without deleting timetables', async () => {
  const [migration, home, compare] = await Promise.all([
    source('backend/pb_migrations/1784360100_remove_public_timetable_visibility.js'),
    source('frontend/src/views/HomeView.vue'),
    source('frontend/src/views/CompareView.vue'),
  ])

  assert.match(
    migration,
    /UPDATE timetables SET visibility = "private" WHERE visibility = "public"/,
  )
  assert.match(migration, /visibility\.values = \["private", "friends"\]/)
  assert.doesNotMatch(migration, /DELETE FROM timetables/)

  for (const ruleName of ['timetableReadRule', 'courseReadRule']) {
    const rule = migration.match(
      new RegExp(`const ${ruleName} = \\[([\\s\\S]*?)\\]\\.join\\("\\ "\\)`),
    )
    assert.ok(rule, `${ruleName} must be defined`)
    assert.doesNotMatch(rule[1], /public/)
    assert.match(rule[1], /visibility = "friends"/)
    assert.match(rule[1], /status \?= "accepted"/)
  }

  assert.match(migration, /listRule = timetableReadRule/)
  assert.match(migration, /viewRule = timetableReadRule/)
  assert.match(migration, /listRule = courseReadRule/)
  assert.match(migration, /viewRule = courseReadRule/)
  assert.match(migration, /do not restore public timetable access/)
  assert.doesNotMatch(home, /public:\s*'所有人可见'/)
  assert.doesNotMatch(compare, /没有公开的课表/)
  assert.match(compare, /没有你可访问的课表/)
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

test('legal acceptance records are versioned, private, immutable, and exported', async () => {
  const [migration, hook, login, settings, dataExport] = await Promise.all([
    source('backend/pb_migrations/1784383552_add_legal_acceptances.js'),
    source('backend/pb_hooks/legal_acceptance.pb.js'),
    source('frontend/src/views/LoginView.vue'),
    source('frontend/src/views/SettingsView.vue'),
    source('frontend/src/utils/dataExport.js'),
  ])

  for (const field of [
    'legal_notice_version',
    'legal_notice_accepted',
    'minimum_age',
    'minimum_age_confirmed',
  ]) {
    assert.match(migration, new RegExp(field))
    assert.match(hook, new RegExp(field))
  }
  assert.match(migration, /cascadeDelete: true/)
  assert.match(migration, /updateRule: null/)
  assert.match(migration, /deleteRule: null/)
  assert.match(migration, /@request\.auth\.id = user\.id/)
  assert.match(hook, /onRecordCreateRequest[\s\S]*'users'/)
  assert.match(hook, /e\.record\.set\('user', auth\.id\)/)
  assert.match(login, /minimumAge/)
  assert.match(login, /legalNoticeVersion/)
  assert.match(settings, /collection\('legal_acceptances'\)/)
  assert.match(dataExport, /legal_acceptances/)

  for (const sourceText of [migration, hook, login, dataExport]) {
    assert.doesNotMatch(sourceText, /date_of_birth|birth_date|birthday/i)
  }
})

test('settings uses the configured external legal notice when present', async () => {
  const settings = await source('frontend/src/views/SettingsView.vue')

  assert.match(settings, /v-if="instanceConfig\.legal_notice_url"/)
  assert.match(settings, /:href="instanceConfig\.legal_notice_url"/)
  assert.match(settings, /rel="noopener noreferrer"/)
  assert.match(settings, /v-else to="\/terms"/)
})

test('the application footer uses the instance identity, not the operator name', async () => {
  const app = await source('frontend/src/App.vue')

  assert.match(app, /\{\{ instanceConfig\.instance_name \}\}/)
  assert.doesNotMatch(
    app,
    /instanceConfig\.operator_name \|\| instanceConfig\.instance_name/,
  )
})
