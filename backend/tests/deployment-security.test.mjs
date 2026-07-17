import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../../', import.meta.url)

async function source(path) {
  return readFile(new URL(path, root), 'utf8')
}

test('the production image declares a fixed non-root user and correct license', async () => {
  const dockerfile = await source('Dockerfile')

  assert.match(dockerfile, /adduser .*-u 10001 .* pocketbase/)
  assert.match(dockerfile, /^USER 10001:10001$/m)
  assert.match(dockerfile, /org\.opencontainers\.image\.licenses="AGPL-3\.0-only"/)
})

test('Compose removes unnecessary runtime privileges', async () => {
  const compose = await source('docker-compose.yml')

  assert.match(compose, /user: "10001:10001"/)
  assert.match(compose, /read_only: true/)
  assert.match(compose, /cap_drop:\n\s+- ALL/)
  assert.match(compose, /no-new-privileges:true/)
  assert.match(compose, /pids_limit: 128/)
  assert.match(compose, /\/tmp:rw,noexec,nosuid,nodev,size=16m/)
  assert.match(compose, /\$\{IMAGE_TAG:\?set IMAGE_TAG/)
  assert.doesNotMatch(compose, /IMAGE_TAG:-latest/)
})

test('deployment requires an exact main revision with backup and rollback', async () => {
  const deploy = await source('deploy.sh')

  assert.match(deploy, /\^\[0-9a-f\]\{40\}\$/)
  assert.match(deploy, /REVISION.*REMOTE_MAIN/)
  assert.match(deploy, /\.backup/)
  assert.match(deploy, /PRAGMA integrity_check/)
  assert.match(deploy, /rollback\(\)/)
  assert.match(deploy, /--pull never/)
  assert.match(deploy, /Config\.User/)

  const composeCalls = deploy
    .split('\n')
    .filter((line) => line.includes('docker compose'))
  assert.ok(composeCalls.length > 0)
  for (const line of composeCalls) {
    assert.match(line, /IMAGE_TAG=/)
  }
})
