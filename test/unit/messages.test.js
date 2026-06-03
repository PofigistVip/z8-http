import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { Z8Http } from '../../src/index.js'

function mockFetch(json) {
  return async () => ({
    ok: true,
    async json() {
      return json
    },
  })
}

describe('Z8Http onMessages', () => {
  it('calls instance onMessages when response has info.messages', async () => {
    const received = []
    const client = new Z8Http({
      fetchImpl: mockFetch({
        success: true,
        info: { messages: [{ text: 'hello', type: 'info' }] },
      }),
      onMessages: (messages) => received.push(...messages),
    })
    client.setSession('test-session')

    await client.read({ request: 'MyRegister' })

    assert.equal(received.length, 1)
    assert.equal(received[0].text, 'hello')
  })

  it('does not call handler when info.messages is missing or empty', async () => {
    let calls = 0
    const client = new Z8Http({
      fetchImpl: mockFetch({ success: true }),
      onMessages: () => {
        calls += 1
      },
    })
    client.setSession('test-session')

    await client.read({ request: 'MyRegister' })
    await client.read({ request: 'MyRegister' })

    assert.equal(calls, 0)
  })

  it('per-call onMessages overrides instance handler', async () => {
    const instanceReceived = []
    const perCallReceived = []
    const client = new Z8Http({
      fetchImpl: mockFetch({
        success: true,
        info: { messages: [{ text: 'per-call', type: 'warning' }] },
      }),
      onMessages: (messages) => instanceReceived.push(...messages),
    })
    client.setSession('test-session')

    await client.read({
      request: 'MyRegister',
      onMessages: (messages) => perCallReceived.push(...messages),
    })

    assert.equal(instanceReceived.length, 0)
    assert.equal(perCallReceived.length, 1)
    assert.equal(perCallReceived[0].text, 'per-call')
  })

  it('dispatches messages from login via postForm', async () => {
    const received = []
    const client = new Z8Http({
      fetchImpl: mockFetch({
        success: true,
        session: 's1',
        info: { messages: [{ text: 'logged in' }] },
      }),
      onMessages: (messages) => received.push(...messages),
    })

    await client.login('user', 'pass')

    assert.equal(received.length, 1)
    assert.equal(received[0].text, 'logged in')
  })
})
