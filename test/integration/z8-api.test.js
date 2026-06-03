import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { getIntegrationConfig, getSkipReason } from '../helpers/env.js'
import { createTestClient, loginAndSetSession } from '../helpers/client.js'
import {
  defaultCreatePayload,
  extractRecordIds,
} from '../helpers/records.js'

const config = getIntegrationConfig()
const skipReason = getSkipReason(config)
const suite = skipReason ? describe.skip : describe

suite(`Z8 API integration${skipReason ? ` (${skipReason})` : ''}`, () => {
  /** @type {import('../../src/index.js').Z8Http} */
  let client
  /** @type {string[]} */
  let createdIds = []

  before(async () => {
    client = createTestClient(config)
    const loginJson = await loginAndSetSession(client, config)
    assert.equal(typeof loginJson, 'object')
    assert.ok(client.session)
  })

  after(async () => {
    if (!client?.session || createdIds.length === 0) return
    try {
      await client.destroy({
        request: config.testRequest,
        ids: createdIds,
      })
    } catch {
      // best-effort cleanup
    }
  })

  it('login returns a session', async () => {
    const fresh = createTestClient(config)
    const json = await loginAndSetSession(fresh, config)
    assert.equal(typeof json, 'object')
    assert.ok(fresh.session)
  })

  it('read returns JSON', async () => {
    const json = await client.read({
      request: config.testRequest,
      limit: config.testLimit,
      start: 0,
    })
    assert.equal(typeof json, 'object')
    assert.notEqual(json, null)
  })

  it('count returns JSON', async () => {
    const json = await client.count({
      request: config.testRequest,
    })
    assert.equal(typeof json, 'object')
    assert.notEqual(json, null)
  })

  it('create, update, and destroy a record', async () => {
    const createData =
      config.createData ?? defaultCreatePayload()

    const createJson = await client.create({
      request: config.testRequest,
      data: createData,
    })
    assert.equal(typeof createJson, 'object')

    const ids = extractRecordIds(createJson)
    assert.ok(ids.length > 0, 'create response should contain at least one recordId')

    createdIds = ids

    const updateJson = await client.update({
      request: config.testRequest,
      data: ids.map((recordId) => ({ recordId })),
    })
    assert.equal(typeof updateJson, 'object')

    const destroyJson = await client.destroy({
      request: config.testRequest,
      ids,
    })
    assert.equal(typeof destroyJson, 'object')

    createdIds = []
  })
})
