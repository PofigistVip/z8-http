import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { Z8Http } from '../../src/index.js'

const TASK_REQUEST = 'org.zenframework.z8.server.db.generator.SchemaGenerator'
const JOB_ID = '8CD4CDB1-EA15-44DA-A43A-3E9F4796B62C'
const SERVER_ID = '6F550D37-6E72-426A-99AA-EE79B63E33DF'

/**
 * @param {object[]} responses - JSON bodies per fetch call
 * @returns {{ fetchImpl: typeof fetch, bodies: string[], callCount: () => number }}
 */
function mockFetchSequence(responses) {
  const bodies = []
  let calls = 0
  return {
    bodies,
    callCount: () => calls,
    fetchImpl: async (_url, init) => {
      bodies.push(String(init?.body ?? ''))
      const json = responses[calls]
      calls += 1
      return {
        ok: true,
        async json() {
          return json
        },
      }
    },
  }
}

function parseFormBody(body) {
  return Object.fromEntries(new URLSearchParams(body))
}

describe('Z8Http job', () => {
  it('polls until done and sends job, server, request on second call', async () => {
    const { fetchImpl, bodies, callCount } = mockFetchSequence([
      {
        request: TASK_REQUEST,
        success: true,
        id: JOB_ID,
        server: SERVER_ID,
        isJob: true,
        done: false,
        total: 100,
        worked: 0,
      },
      {
        request: TASK_REQUEST,
        success: true,
        id: JOB_ID,
        server: SERVER_ID,
        isJob: true,
        done: true,
        total: 100,
        worked: 100,
      },
    ])

    const client = new Z8Http({ fetchImpl })
    client.setSession('test-session')

    const result = await client.job({
      request: TASK_REQUEST,
      pollIntervalMs: 0,
    })

    assert.equal(callCount(), 2)
    assert.equal(result.done, true)
    assert.equal(result.worked, 100)

    const startBody = parseFormBody(bodies[0])
    assert.equal(startBody.request, TASK_REQUEST)
    assert.equal(startBody.session, 'test-session')
    assert.match(startBody.period, /"start":null/)

    const pollBody = parseFormBody(bodies[1])
    assert.equal(pollBody.request, TASK_REQUEST)
    assert.equal(pollBody.server, SERVER_ID)
    assert.equal(pollBody.job, JOB_ID)
    assert.equal(pollBody.session, 'test-session')
  })

  it('returns immediately when first response has done true', async () => {
    const { fetchImpl, callCount } = mockFetchSequence([
      {
        request: TASK_REQUEST,
        success: true,
        done: true,
      },
    ])

    const client = new Z8Http({ fetchImpl })
    client.setSession('test-session')

    const result = await client.job({ request: TASK_REQUEST })

    assert.equal(callCount(), 1)
    assert.equal(result.done, true)
  })

  it('throws when success is false', async () => {
    const client = new Z8Http({
      fetchImpl: mockFetchSequence([
        { success: false, text: 'Task failed' },
      ]).fetchImpl,
    })
    client.setSession('test-session')

    await assert.rejects(
      () => client.job({ request: TASK_REQUEST, pollIntervalMs: 0 }),
      (err) => {
        assert.ok(err instanceof Error)
        assert.equal(err.message, 'Task failed')
        return true
      }
    )
  })

  it('dispatches onMessages on intermediate poll responses', async () => {
    const received = []
    const { fetchImpl } = mockFetchSequence([
      {
        success: true,
        request: TASK_REQUEST,
        id: JOB_ID,
        server: SERVER_ID,
        done: false,
      },
      {
        success: true,
        request: TASK_REQUEST,
        id: JOB_ID,
        server: SERVER_ID,
        done: true,
        info: { messages: [{ text: 'progress', type: 'info' }] },
      },
    ])

    const client = new Z8Http({
      fetchImpl,
      onMessages: (messages) => received.push(...messages),
    })
    client.setSession('test-session')

    await client.job({ request: TASK_REQUEST, pollIntervalMs: 0 })

    assert.equal(received.length, 1)
    assert.equal(received[0].text, 'progress')
  })
})
