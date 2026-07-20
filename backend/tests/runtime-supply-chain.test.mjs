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

test('self-host lifecycle uses prebuilt images and current superuser APIs', async () => {
  const helper = await source('self-host.sh')

  assert.match(helper, /\/api\/collections\/_superusers\/auth-with-password/)
  assert.match(helper, /\.\/pocketbase superuser create/)
  assert.match(helper, /compose pull/)
  assert.match(helper, /compose up -d --no-build/)
  assert.match(helper, /--cap-add CHOWN/)
  assert.match(helper, /wait_for_container_health/)
  assert.match(helper, /safe_data_dir/)
  assert.match(helper, /DATA_DIR must be a dedicated subdirectory/)
  assert.match(helper, /IMAGE_TAG must be an exact vMAJOR\.MINOR\.PATCH release/)
  assert.doesNotMatch(helper, /docker (?:compose )?build/)
  assert.doesNotMatch(helper, /latest/)
})

test('pull request CI runs access rules against the built runtime image', async () => {
  const workflow = await source('.github/workflows/ci.yml')

  assert.match(workflow, /--publish 127\.0\.0\.1:18090:8080/)
  assert.match(workflow, /PB_INTEGRATION_URL=http:\/\/127\.0\.0\.1:18090/)
  assert.match(
    workflow,
    /node --test backend\/tests\/access-rules\.integration\.test\.mjs/,
  )
})

test('release images build once per native architecture', async () => {
  const workflow = await source('.github/workflows/release.yml')

  assert.match(workflow, /runner: ubuntu-24\.04$/m)
  assert.match(workflow, /runner: ubuntu-24\.04-arm$/m)
  assert.match(workflow, /push-by-digest=true/)
  assert.match(workflow, /docker buildx imagetools create/)
  assert.match(workflow, /provenance: mode=max/)
  assert.match(workflow, /sbom: true/)
  assert.equal(workflow.match(/docker\/build-push-action@/g)?.length, 1)
  assert.doesNotMatch(workflow, /setup-qemu-action/)
})
