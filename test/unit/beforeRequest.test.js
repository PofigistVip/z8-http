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

describe('Z8Http beforeRequest', () => {
  it('read: mutates payload before send', async () => {
    const { fetchImpl, getBody } = mockFetchCapture()
    const client = new Z8Http({ fetchImpl })
    client.setSession('test-session')

    const methods = []
    await client.read({
      request: 'MyRegister',
      beforeRequest(method, payload) {
        methods.push(method)
        payload.extra = 'x'
      },
    })

    assert.deepEqual(methods, ['read'])
    const form = parseFormBody(getBody())
    assert.equal(form.extra, 'x')
    assert.equal(form.action, 'read')
  })

  it('count: receives method count and count flag in payload', async () => {
    const { fetchImpl, getBody } = mockFetchCapture()
    const client = new Z8Http({ fetchImpl })
    client.setSession('test-session')

    let hookMethod
    let hookCount
    await client.count({
      request: 'MyRegister',
      beforeRequest(method, payload) {
        hookMethod = method
        hookCount = payload.count
      },
    })

    assert.equal(hookMethod, 'count')
    assert.equal(hookCount, 'true')
    const form = parseFormBody(getBody())
    assert.equal(form.count, 'true')
    assert.equal(form.action, 'read')
  })

  it('create: returned object replaces payload', async () => {
    const { fetchImpl, getBody } = mockFetchCapture()
    const client = new Z8Http({ fetchImpl })
    client.setSession('test-session')

    await client.create({
      request: 'MyRegister',
      data: [{ recordId: 'orig' }],
      beforeRequest() {
        return {
          request: 'OtherRegister',
          action: 'create',
          data: [{ recordId: 'replaced' }],
          session: 'test-session',
        }
      },
    })

    const form = parseFormBody(getBody())
    assert.equal(form.request, 'OtherRegister')
    assert.deepEqual(JSON.parse(form.data), [{ recordId: 'replaced' }])
  })

  it('destroy: mutates payload.data', async () => {
    const { fetchImpl, getBody } = mockFetchCapture()
    const client = new Z8Http({ fetchImpl })
    client.setSession('test-session')

    await client.destroy({
      request: 'MyRegister',
      ids: ['id-1'],
      beforeRequest(method, payload) {
        assert.equal(method, 'destroy')
        payload.data = [{ recordId: 'custom' }]
      },
    })

    const form = parseFormBody(getBody())
    assert.deepEqual(JSON.parse(form.data), [{ recordId: 'custom' }])
    assert.equal(form.action, 'destroy')
  })

  it('read without hook sends unchanged payload', async () => {
    const { fetchImpl, getBody } = mockFetchCapture()
    const client = new Z8Http({ fetchImpl })
    client.setSession('test-session')

    await client.read({ request: 'MyRegister', limit: 10 })

    const form = parseFormBody(getBody())
    assert.equal(form.request, 'MyRegister')
    assert.equal(form.action, 'read')
    assert.equal(form.limit, '10')
    assert.equal(form.extra, undefined)
  })
})
