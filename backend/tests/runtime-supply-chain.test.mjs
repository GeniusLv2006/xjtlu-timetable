import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../../', import.meta.url)

async function source(path) {
  return readFile(new URL(path, root), 'utf8')
}

test('the runtime is built from pinned stable components', async () => {
  const dockerfile = await source('Dockerfile')

  assert.match(dockerfile, /^FROM node:24\.18\.0-alpine3\.24 AS builder$/m)
  assert.match(dockerfile, /^FROM golang:1\.26\.5-alpine3\.24 AS pocketbase$/m)
  assert.match(dockerfile, /^ARG POCKETBASE_VERSION=0\.39\.7$/m)
  assert.match(
    dockerfile,
    /^ARG POCKETBASE_COMMIT=636b7e28d8ffd3829f501f28f3725facf62a4042$/m,
  )
  assert.match(
    dockerfile,
    /^ARG POCKETBASE_SOURCE_SHA256=[a-f0-9]{64}$/m,
  )
  assert.match(dockerfile, /^ARG GO_IMAGE_VERSION=0\.44\.0$/m)
  assert.match(dockerfile, /^FROM alpine:3\.24\.1$/m)
  assert.doesNotMatch(dockerfile, /COPY backend\/pocketbase/)
})

test('the published image has a runtime health check', async () => {
  const dockerfile = await source('Dockerfile')

  assert.match(dockerfile, /^HEALTHCHECK /m)
  assert.match(dockerfile, /http:\/\/127\.0\.0\.1:8080\/api\/health/)
})

test('setup helpers use the current PocketBase superuser endpoint', async () => {
  const helpers = await Promise.all(
    [
      'backend/add-nickname-field.py',
      'backend/setup-invite-codes.sh',
      'backend/setup-must-change-pwd.sh',
      'backend/setup-rules.sh',
      'backend/setup-site-config.sh',
    ].map(source),
  )

  for (const helper of helpers) {
    assert.match(helper, /\/api\/collections\/_superusers\/auth-with-password/)
    assert.doesNotMatch(helper, /\/api\/admins\/auth-with-password/)
  }
})
