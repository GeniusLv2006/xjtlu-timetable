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
  assert.match(compose, /\$\{IMAGE_REPOSITORY:\?set IMAGE_REPOSITORY}/)
  assert.match(compose, /\$\{IMAGE_TAG:\?set IMAGE_TAG/)
  assert.match(compose, /\$\{BIND_ADDRESS:-127\.0\.0\.1}/)
  assert.match(compose, /\$\{DATA_DIR:-\.\/data}/)
  assert.match(compose, /ACCOUNT_BLOCK_HMAC_KEYS: \$\{ACCOUNT_BLOCK_HMAC_KEYS:\?set/)
  assert.doesNotMatch(compose, /container_name:/)
  assert.doesNotMatch(compose, /IMAGE_TAG:-latest/)
})

test('local state and credentials never enter the image build context', async () => {
  const dockerignore = await source('.dockerignore')

  for (const entry of ['backend/pb_data/', 'data/', 'backups/', '.env']) {
    assert.match(dockerignore, new RegExp(`^${entry.replace('.', '\\.')}$`, 'm'))
  }
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

  assert.match(deploy, /docker-compose\.official\.yml/)
  assert.match(deploy, /export IMAGE_TAG="\$REVISION"/)
  assert.match(deploy, /export BIND_ADDRESS="172\.17\.0\.1"/)
  assert.match(deploy, /export DATA_DIR/)
  assert.doesNotMatch(deploy, /docker (?:compose )?build/)
  assert.match(deploy, /compose up -d --no-build/)
  assert.match(deploy, /ROLLBACK_ARMED=0[\s\S]*check-official-privacy\.sh/)
  assert.match(deploy, /for command in curl docker git sqlite3 sha256sum/)
})

test('official privacy validation checks the legal route without exposing email', async () => {
  const check = await source('backend/check-official-privacy.sh')

  assert.ok(check.includes('BASE_URL="${1:-https://timetable.xjtlu.uk}"'))
  assert.match(check, /Terms of Use and Privacy Notice/)
  assert.match(check, /script-src 'self'/)
  assert.match(check, /data-cfemail=/)
  assert.match(check, /CFEMAIL_COUNT.*"2"/s)
  assert.match(check, /email-decode\.min\.js/)
  assert.match(check, /legal_notice_url/)
  assert.match(check, /xjtlu-timetable-legal-notice-version/)
  assert.match(check, /test "\$PAGE_VERSION" = "\$CONFIG_VERSION"/)
  assert.doesNotMatch(check, /Version 1\.3/)
  assert.match(check, /api\/health/)
  assert.doesNotMatch(check, /tingkailyu@icloud\.com/)
})

test('deployment hardening avoids an unchanged Nginx reload', async () => {
  const hardening = await source('backend/harden-deployment.sh')

  assert.match(hardening, /cmp -s "\$TMP_CONF" "\$TMP_UPDATED"/)
  assert.match(hardening, /printf "%s", block/)
  assert.match(hardening, /reload skipped/)
  assert.match(hardening, /else[\s\S]*nginx -t[\s\S]*nginx -s reload/)
})
