import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import test from 'node:test'

const baseUrl = process.env.PB_INTEGRATION_URL?.replace(/\/$/, '')
const superuserEmail = process.env.PB_SUPERUSER_EMAIL
const superuserPassword = process.env.PB_SUPERUSER_PASSWORD
const enabled = Boolean(baseUrl && superuserEmail && superuserPassword)

if (enabled) {
  const hostname = new URL(baseUrl).hostname
  assert.ok(
    ['127.0.0.1', '::1', 'localhost'].includes(hostname),
    'access-rule fixtures may run only against a loopback PocketBase instance',
  )
}

async function request(path, {
  body,
  expected = [200],
  method = 'GET',
  token,
} = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: token } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  let payload = null
  if (response.headers.get('content-type')?.includes('application/json')) {
    payload = await response.json()
  }
  assert.ok(
    expected.includes(response.status),
    `${method} ${path} returned ${response.status}: ${payload?.message || 'unexpected response'}`,
  )
  return payload
}

async function authenticate(collection, identity, password) {
  const result = await request(
    `/api/collections/${collection}/auth-with-password`,
    {
      body: { identity, password },
      method: 'POST',
    },
  )
  assert.ok(result.token)
  return result.token
}

test('runtime access rules enforce timetable and friendship boundaries', {
  skip: enabled ? false : 'set PocketBase integration environment variables',
}, async () => {
  const suffix = randomUUID().replaceAll('-', '').slice(0, 12)
  const password = `rules-${suffix}-password`
  const adminToken = await authenticate(
    '_superusers',
    superuserEmail,
    superuserPassword,
  )

  const configList = await request(
    '/api/collections/site_config/records?perPage=1',
    { token: adminToken },
  )
  assert.equal(configList.totalItems, 1)
  await request(`/api/collections/site_config/records/${configList.items[0].id}`, {
    body: { registration_open: true, require_invite: false },
    method: 'PATCH',
    token: adminToken,
  })

  async function createUser(role) {
    const email = `${role}-${suffix}@example.invalid`
    const record = await request('/api/collections/users/records', {
      body: {
        email,
        emailVisibility: false,
        name: `${role}-${suffix}`,
        password,
        passwordConfirm: password,
      },
      method: 'POST',
      token: adminToken,
    })
    const token = await authenticate('users', email, password)
    return { ...record, token }
  }

  const owner = await createUser('owner')
  const friend = await createUser('friend')
  const stranger = await createUser('stranger')

  const friendship = await request('/api/collections/friendships/records', {
    body: {
      from_user: owner.id,
      status: 'pending',
      to_user: friend.id,
    },
    method: 'POST',
    token: owner.token,
  })

  await request(`/api/collections/friendships/records/${friendship.id}`, {
    body: { status: 'accepted' },
    expected: [400, 403, 404],
    method: 'PATCH',
    token: owner.token,
  })
  const accepted = await request(
    `/api/collections/friendships/records/${friendship.id}`,
    {
      body: { status: 'accepted' },
      method: 'PATCH',
      token: friend.token,
    },
  )
  assert.equal(accepted.status, 'accepted')

  const timetable = await request('/api/collections/timetables/records', {
    body: {
      hash: `integration-${suffix}`,
      label: 'Access rule integration fixture',
      user: owner.id,
      visibility: 'friends',
    },
    method: 'POST',
    token: owner.token,
  })
  const course = await request('/api/collections/courses/records', {
    body: {
      code: 'INT001',
      timetable: timetable.id,
    },
    method: 'POST',
    token: owner.token,
  })

  const timetablePath = `/api/collections/timetables/records/${timetable.id}`
  await request(timetablePath, { expected: [400, 403, 404] })
  await request(timetablePath, { token: owner.token })
  await request(timetablePath, { token: friend.token })
  await request(timetablePath, {
    expected: [400, 403, 404],
    token: stranger.token,
  })

  const coursePath = `/api/collections/courses/records/${course.id}`
  await request(coursePath, { token: friend.token })
  await request(coursePath, {
    expected: [400, 403, 404],
    method: 'DELETE',
    token: stranger.token,
  })
  await request('/api/collections/semesters/records?perPage=1')
})
