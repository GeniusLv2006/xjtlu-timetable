import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../../', import.meta.url)

async function source(path) {
  return readFile(new URL(path, root), 'utf8')
}

test('the iCal hook fetches courses in one relation query', async () => {
  const hook = await source('backend/pb_hooks/ical.pb.js')

  assert.match(hook, /'courses', 'timetable\.user = "/)
  assert.doesNotMatch(hook, /'courses', 'timetable = "' \+ tt\.id/)
})

test('the performance migration covers recurring query paths', async () => {
  const migration = await source(
    'backend/pb_migrations/1784265403_add_query_indexes.js',
  )

  for (const index of [
    'idx_timetables_user_hash',
    'idx_courses_timetable',
    'idx_friendships_from_status',
    'idx_friendships_to_status',
    'idx_ical_access_user_created',
    'idx_ical_access_created',
    'idx_login_logs_created',
  ]) {
    assert.match(migration, new RegExp(index))
  }
})

test('the frontend avoids bundling the full CJK font package', async () => {
  const [main, packageJson] = await Promise.all([
    source('frontend/src/main.js'),
    source('frontend/package.json'),
  ])

  assert.doesNotMatch(main, /noto-sans-sc/)
  assert.match(main, /ibm-plex-mono\/latin-400\.css/)
  assert.doesNotMatch(packageJson, /@fontsource\/noto-sans-sc/)
})

test('hashed assets are immutable while HTML always revalidates', async () => {
  const hook = await source('backend/pb_hooks/cache_headers.pb.js')

  assert.match(hook, /max-age=31536000, immutable/)
  assert.match(hook, /'Cache-Control', 'no-cache'/)
  assert.match(hook, /\^\\\/assets\\\//)
})
