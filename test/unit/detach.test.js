import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { Z8Http } from '../../src/index.js'

function parseFormBody(body) {
  return Object.fromEntries(new URLSearchParams(body))
}

describe('Z8Http detach', () => {
  it('sends detach payload with JSON data array', async () => {
    let body = ''
    const client = new Z8Http({
      fetchImpl: async (_url, init) => {
        body = String(init?.body ?? '')
        return {
          ok: true,
          async json() {
            return { success: true }
          },
        }
      },
    })
    client.setSession('test-session')

    const attachmentData = [{ id: 'file-1', name: 'doc.pdf' }]
    await client.detach({
      request: 'MyRegister',
      recordId: 'rec-1',
      field: 'attachments',
      data: attachmentData,
    })

    const form = parseFormBody(body)
    assert.equal(form.request, 'MyRegister')
    assert.equal(form.action, 'detach')
    assert.equal(form.recordId, 'rec-1')
    assert.equal(form.field, 'attachments')
    assert.equal(form.session, 'test-session')
    assert.deepEqual(JSON.parse(form.data), attachmentData)
  })

  it('throws without session', async () => {
    const client = new Z8Http({
      fetchImpl: async () => ({ ok: true, async json() { return {} } }),
    })

    await assert.rejects(
      () =>
        client.detach({
          request: 'MyRegister',
          recordId: 'rec-1',
          field: 'attachments',
          data: [],
        }),
      /session is not set/
    )
  })

  it('throws without recordId', async () => {
    const client = new Z8Http({
      fetchImpl: async () => ({ ok: true, async json() { return {} } }),
    })
    client.setSession('test-session')

    await assert.rejects(
      () =>
        client.detach({
          request: 'MyRegister',
          recordId: '',
          field: 'attachments',
          data: [],
        }),
      /recordId is required/
    )
  })

  it('throws when data is not an array', async () => {
    const client = new Z8Http({
      fetchImpl: async () => ({ ok: true, async json() { return {} } }),
    })
    client.setSession('test-session')

    await assert.rejects(
      () =>
        client.detach({
          request: 'MyRegister',
          recordId: 'rec-1',
          field: 'attachments',
          data: { id: 'file-1' },
        }),
      /data must be an array/
    )
  })

  it('dispatches onMessages from response', async () => {
    const received = []
    const client = new Z8Http({
      fetchImpl: async () => ({
        ok: true,
        async json() {
          return {
            success: true,
            info: { messages: [{ text: 'detached', type: 'info' }] },
          }
        },
      }),
      onMessages: (messages) => received.push(...messages),
    })
    client.setSession('test-session')

    await client.detach({
      request: 'MyRegister',
      recordId: 'rec-1',
      field: 'attachments',
      data: [{ id: 'file-1' }],
    })

    assert.equal(received.length, 1)
    assert.equal(received[0].text, 'detached')
  })
})
