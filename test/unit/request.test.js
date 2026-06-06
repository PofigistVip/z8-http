import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { Z8Http } from '../../src/index.js'

function parseFormBody(body) {
  return Object.fromEntries(new URLSearchParams(body))
}

function mockFetchCapture() {
  let body = ''
  return {
    getBody: () => body,
    fetchImpl: async (_url, init) => {
      body = String(init?.body ?? '')
      return {
        ok: true,
        async json() {
          return { success: true }
        },
      }
    },
  }
}

describe('Z8Http request', () => {
  it('adds session by default', async () => {
    const { fetchImpl, getBody } = mockFetchCapture()
    const client = new Z8Http({ fetchImpl })
    client.setSession('test-session')

    await client.request({
      payload: { request: 'MyRegister', action: 'read', limit: 5 },
    })

    const form = parseFormBody(getBody())
    assert.equal(form.session, 'test-session')
    assert.equal(form.request, 'MyRegister')
    assert.equal(form.action, 'read')
    assert.equal(form.limit, '5')
  })

  it('overwrites session in payload when withSession is true', async () => {
    const { fetchImpl, getBody } = mockFetchCapture()
    const client = new Z8Http({ fetchImpl })
    client.setSession('client-session')

    await client.request({
      payload: { request: 'MyRegister', session: 'old-session' },
    })

    const form = parseFormBody(getBody())
    assert.equal(form.session, 'client-session')
  })

  it('skips session when withSession is false', async () => {
    const { fetchImpl, getBody } = mockFetchCapture()
    const client = new Z8Http({ fetchImpl })

    await client.request({
      payload: { request: 'login', login: 'user' },
      withSession: false,
    })

    const form = parseFormBody(getBody())
    assert.equal(form.session, undefined)
    assert.equal(form.login, 'user')
  })

  it('calls beforeRequest with method request after session injection', async () => {
    const { fetchImpl, getBody } = mockFetchCapture()
    const client = new Z8Http({ fetchImpl })
    client.setSession('test-session')

    let hookMethod
    let hookSession
    await client.request({
      payload: { request: 'MyRegister' },
      beforeRequest(method, payload) {
        hookMethod = method
        hookSession = payload.session
        payload.extra = 'yes'
      },
    })

    assert.equal(hookMethod, 'request')
    assert.equal(hookSession, 'test-session')
    const form = parseFormBody(getBody())
    assert.equal(form.extra, 'yes')
  })

  it('beforeRequest return value replaces body', async () => {
    const { fetchImpl, getBody } = mockFetchCapture()
    const client = new Z8Http({ fetchImpl })
    client.setSession('test-session')

    await client.request({
      payload: { request: 'Orig' },
      beforeRequest() {
        return { request: 'Replaced', session: 'test-session' }
      },
    })

    const form = parseFormBody(getBody())
    assert.equal(form.request, 'Replaced')
  })

  it('dispatches onMessages from response', async () => {
    const received = []
    const client = new Z8Http({
      fetchImpl: async () => ({
        ok: true,
        async json() {
          return {
            success: true,
            info: { messages: [{ text: 'ok', type: 'info' }] },
          }
        },
      }),
      onMessages: (messages) => received.push(...messages),
    })
    client.setSession('test-session')

    await client.request({ payload: { request: 'MyRegister' } })

    assert.equal(received.length, 1)
    assert.equal(received[0].text, 'ok')
  })

  it('throws without session when withSession is true', async () => {
    const client = new Z8Http({
      fetchImpl: async () => ({ ok: true, async json() { return {} } }),
    })

    await assert.rejects(
      () => client.request({ payload: { request: 'MyRegister' } }),
      /session is not set/
    )
  })

  it('throws when payload is not an object', async () => {
    const client = new Z8Http({
      fetchImpl: async () => ({ ok: true, async json() { return {} } }),
    })
    client.setSession('test-session')

    await assert.rejects(
      () => client.request({ payload: [] }),
      /payload must be an object/
    )
  })
})
