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

test('the squashed baseline and current rule sources cover the secured collections', async () => {
  const [baseline, setupRules, schema] = await Promise.all([
    source('backend/pb_migrations/1776300000_add_ical_risk_config_and_ban_rules.js'),
    source('backend/setup-rules.sh'),
    source('backend/schema.json'),
  ])

  for (const collection of ['timetables', 'courses', 'friendships', 'ical_tokens']) {
    assert.match(baseline, new RegExp(`"name": "${collection}"`))
  }

  for (const value of [setupRules, schema]) {
    assert.match(value, /@request\.auth\.id = user\.id/)
  }
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
