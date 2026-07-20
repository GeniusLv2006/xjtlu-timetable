import assert from 'node:assert/strict'
import { createHmac, randomUUID } from 'node:crypto'
import test from 'node:test'

const baseUrl = process.env.PB_INTEGRATION_URL?.replace(/\/$/, '')
const superuserEmail = process.env.PB_SUPERUSER_EMAIL
const superuserPassword = process.env.PB_SUPERUSER_PASSWORD
const enabled = Boolean(baseUrl && superuserEmail && superuserPassword)
const accountBlockKeys = (process.env.PB_ACCOUNT_BLOCK_KEYS || '')
  .split(',')
  .map(value => value.trim())
  .filter(Boolean)

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

  await request('/api/user-data-export/status', { expected: [401] })
  const initialExportStatus = await request('/api/user-data-export/status', {
    token: owner.token,
  })
  assert.equal(initialExportStatus.can_export, true)

  const authorizedExport = await request('/api/user-data-export/authorize', {
    method: 'POST',
    token: owner.token,
  })
  assert.equal(authorizedExport.cooldown_seconds, 86400)
  assert.ok(authorizedExport.authorized_at)
  assert.ok(authorizedExport.next_allowed_at)

  const limitedResponse = await fetch(
    `${baseUrl}/api/user-data-export/authorize`,
    {
      method: 'POST',
      headers: { Authorization: owner.token },
    },
  )
  assert.equal(limitedResponse.status, 429)
  assert.ok(Number(limitedResponse.headers.get('retry-after')) > 0)
  const limitedExport = await limitedResponse.json()
  assert.equal(limitedExport.can_export, false)
  assert.equal(limitedExport.last_requested_at, authorizedExport.authorized_at)

  const ownerExportRequests = await request(
    `/api/collections/data_export_requests/records?filter=${encodeURIComponent(`user = "${owner.id}"`)}`,
    { token: adminToken },
  )
  assert.equal(ownerExportRequests.totalItems, 1)
  await request(
    `/api/collections/data_export_requests/records/${ownerExportRequests.items[0].id}`,
    {
      body: {
        requested_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
      },
      method: 'PATCH',
      token: adminToken,
    },
  )
  const authorizedAfterCooldown = await request(
    '/api/user-data-export/authorize',
    { method: 'POST', token: owner.token },
  )
  assert.ok(authorizedAfterCooldown.authorized_at)

  await request('/api/collections/data_export_requests/records', {
    expected: [403],
    token: owner.token,
  })

  const concurrentResponses = await Promise.all([
    fetch(`${baseUrl}/api/user-data-export/authorize`, {
      method: 'POST',
      headers: { Authorization: friend.token },
    }),
    fetch(`${baseUrl}/api/user-data-export/authorize`, {
      method: 'POST',
      headers: { Authorization: friend.token },
    }),
  ])
  assert.deepEqual(
    concurrentResponses.map(response => response.status).sort(),
    [200, 429],
  )

  await request('/api/user-data-export/authorize', {
    method: 'POST',
    token: stranger.token,
  })
  const exportRequestsBeforeDelete = await request(
    `/api/collections/data_export_requests/records?filter=${encodeURIComponent(`user = "${stranger.id}"`)}`,
    { token: adminToken },
  )
  assert.equal(exportRequestsBeforeDelete.totalItems, 1)
  await request(`/api/collections/users/records/${stranger.id}`, {
    expected: [204],
    method: 'DELETE',
    token: adminToken,
  })
  const exportRequestsAfterDelete = await request(
    `/api/collections/data_export_requests/records?filter=${encodeURIComponent(`user = "${stranger.id}"`)}`,
    { token: adminToken },
  )
  assert.equal(exportRequestsAfterDelete.totalItems, 0)

  await request(`/api/collections/users/records/${owner.id}`, {
    body: { is_banned: true },
    method: 'PATCH',
    token: adminToken,
  })
  await request('/api/user-data-export/status', {
    expected: [403],
    token: owner.token,
  })
  await request('/api/user-data-export/authorize', {
    expected: [403],
    method: 'POST',
    token: owner.token,
  })

  await request('/api/collections/users/auth-with-password', {
    body: { identity: owner.email, password },
    expected: [400],
    method: 'POST',
  })
  await request(`/api/collections/users/records/${owner.id}`, {
    body: { restricted_login_allowed: true },
    method: 'PATCH',
    token: adminToken,
  })
  const restrictedToken = await authenticate('users', owner.email, password)
  await request(timetablePath, {
    expected: [400, 403, 404],
    token: restrictedToken,
  })
  await request(`/api/collections/users/records/${owner.id}`, {
    body: { name: 'restricted-user-cannot-update' },
    expected: [400, 403, 404],
    method: 'PATCH',
    token: restrictedToken,
  })
  const restrictedStatus = await request('/api/user-data-export/status', {
    token: restrictedToken,
  })
  assert.equal(restrictedStatus.can_export, false)

  await request(`/api/collections/data_export_requests/records/${ownerExportRequests.items[0].id}`, {
    body: {
      requested_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
    },
    method: 'PATCH',
    token: adminToken,
  })
  const restrictedExport = await request('/api/user-data-export/authorize', {
    method: 'POST',
    token: restrictedToken,
  })
  assert.equal(restrictedExport.data.user.id, owner.id)
  assert.equal(restrictedExport.data.user.email, owner.email)
  assert.equal(restrictedExport.data.user.restricted_login_allowed, true)
  assert.ok(restrictedExport.data.timetables.some(item => item.id === timetable.id))
  assert.ok(restrictedExport.data.courses.some(item => item.id === course.id))
  assert.equal(restrictedExport.data.user.passwordHash, undefined)
  assert.equal(restrictedExport.data.user.tokenKey, undefined)

  await request('/api/account/delete', {
    body: { password: 'incorrect-password' },
    expected: [400],
    method: 'POST',
    token: restrictedToken,
  })
  await request('/api/account/delete', {
    body: { password },
    method: 'POST',
    token: restrictedToken,
  })
  await request(`/api/collections/users/records/${owner.id}`, {
    expected: [404],
    token: adminToken,
  })
  let blockedRecords = await request(
    '/api/collections/blocked_registration_identifiers/records?perPage=20',
    { token: adminToken },
  )
  assert.equal(blockedRecords.totalItems, 1)
  assert.equal(blockedRecords.items[0].algorithm, 'hmac-sha256-v1')
  assert.notEqual(blockedRecords.items[0].identifier_hash, owner.email)
  assert.equal(JSON.stringify(blockedRecords.items).includes(owner.email), false)

  await request('/api/collections/users/records', {
    body: {
      email: owner.email,
      emailVisibility: false,
      name: 'blocked-recreation',
      password,
      passwordConfirm: password,
    },
    expected: [400],
    method: 'POST',
    token: adminToken,
  })
  const unblockResult = await request('/api/admin/registration-block/remove', {
    body: { email: owner.email },
    method: 'POST',
    token: adminToken,
  })
  assert.equal(unblockResult.removed, true)
  const recreatedOwner = await request('/api/collections/users/records', {
    body: {
      email: owner.email,
      emailVisibility: false,
      name: 'released-recreation',
      password,
      passwordConfirm: password,
    },
    method: 'POST',
    token: adminToken,
  })
  await request(`/api/collections/users/records/${recreatedOwner.id}`, {
    expected: [204],
    method: 'DELETE',
    token: adminToken,
  })
  blockedRecords = await request(
    '/api/collections/blocked_registration_identifiers/records?perPage=20',
    { token: adminToken },
  )
  assert.equal(blockedRecords.totalItems, 0)

  const adminDeleted = await createUser('admin-deleted-banned')
  await request(`/api/collections/users/records/${adminDeleted.id}`, {
    body: { is_banned: true, restricted_login_allowed: false },
    method: 'PATCH',
    token: adminToken,
  })
  await request(`/api/collections/users/records/${adminDeleted.id}`, {
    expected: [204],
    method: 'DELETE',
    token: adminToken,
  })
  blockedRecords = await request(
    '/api/collections/blocked_registration_identifiers/records?perPage=20',
    { token: adminToken },
  )
  assert.equal(blockedRecords.totalItems, 1)
  await request(`/api/collections/site_config/records/${configList.items[0].id}`, {
    body: { blocked_registration_retention_days: 30 },
    method: 'PATCH',
    token: adminToken,
  })
  blockedRecords = await request(
    '/api/collections/blocked_registration_identifiers/records?perPage=20',
    { token: adminToken },
  )
  const shortenedCreated = new Date(blockedRecords.items[0].created).getTime()
  const shortenedExpiry = new Date(blockedRecords.items[0].expires_at).getTime()
  assert.ok(shortenedExpiry - shortenedCreated <= 30 * 24 * 60 * 60 * 1000 + 1000)
  const adminUnblock = await request('/api/admin/registration-block/remove', {
    body: { email: adminDeleted.email },
    method: 'POST',
    token: adminToken,
  })
  assert.equal(adminUnblock.removed, true)

  if (accountBlockKeys.length >= 2) {
    const rotatedEmail = `rotated-${suffix}@example.invalid`
    const previousDigest = createHmac('sha256', accountBlockKeys[1])
      .update(rotatedEmail)
      .digest('hex')
    await request('/api/collections/blocked_registration_identifiers/records', {
      body: {
        algorithm: 'hmac-sha256-v1',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        identifier_hash: previousDigest,
      },
      method: 'POST',
      token: adminToken,
    })
    await request('/api/collections/users/records', {
      body: {
        email: rotatedEmail,
        password,
        passwordConfirm: password,
      },
      expected: [400],
      method: 'POST',
      token: adminToken,
    })
    const rotatedUnblock = await request('/api/admin/registration-block/remove', {
      body: { email: rotatedEmail },
      method: 'POST',
      token: adminToken,
    })
    assert.equal(rotatedUnblock.removed, true)
  }

  const activeKey = accountBlockKeys[0]
  if (activeKey) {
    const expiredEmail = `expired-${suffix}@example.invalid`
    const expiredDigest = createHmac('sha256', activeKey).update(expiredEmail).digest('hex')
    const expiredRecord = await request('/api/collections/blocked_registration_identifiers/records', {
      body: {
        algorithm: 'hmac-sha256-v1',
        expires_at: new Date(Date.now() - 60 * 1000).toISOString(),
        identifier_hash: expiredDigest,
      },
      method: 'POST',
      token: adminToken,
    })
    const expiredRecreated = await request('/api/collections/users/records', {
      body: {
        email: expiredEmail,
        password,
        passwordConfirm: password,
      },
      method: 'POST',
      token: adminToken,
    })
    await request(`/api/collections/users/records/${expiredRecreated.id}`, {
      expected: [204],
      method: 'DELETE',
      token: adminToken,
    })
    await request(`/api/collections/blocked_registration_identifiers/records/${expiredRecord.id}`, {
      expected: [204],
      method: 'DELETE',
      token: adminToken,
    })
  }

  await request('/api/collections/blocked_registration_identifiers/records', {
    body: {
      algorithm: 'hmac-sha256-v1',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      identifier_hash: 'retention-disable-fixture',
    },
    method: 'POST',
    token: adminToken,
  })
  await request(`/api/collections/site_config/records/${configList.items[0].id}`, {
    body: { blocked_registration_retention_days: 0 },
    method: 'PATCH',
    token: adminToken,
  })
  blockedRecords = await request(
    '/api/collections/blocked_registration_identifiers/records?perPage=20',
    { token: adminToken },
  )
  assert.equal(blockedRecords.totalItems, 0)
  await request(`/api/collections/site_config/records/${configList.items[0].id}`, {
    body: { blocked_registration_retention_days: 365 },
    method: 'PATCH',
    token: adminToken,
  })

  await request('/api/collections/semesters/records?perPage=1')
})
