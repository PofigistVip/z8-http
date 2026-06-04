import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { Z8Http } from '../../src/index.js'

function parseFormBody(body) {
  return Object.fromEntries(new URLSearchParams(body))
}

describe('Z8Http export', () => {
  it('sends export payload with default format pdf', async () => {
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

    const columns = [{ id: 'name', title: 'Name' }]
    const quickFilter = [{ field: 'status', value: 'active' }]
    const where = [{ field: 'id', operator: 'eq', value: '1' }]
    const filter = [{ field: 'type', value: 'A' }]
    const period = { start: '2026-01-01', finish: '2026-12-31' }

    await client.export({
      request: 'MyRegister',
      columns,
      quickFilter,
      where,
      filter,
      period,
    })

    const form = parseFormBody(body)
    assert.equal(form.request, 'MyRegister')
    assert.equal(form.action, 'export')
    assert.equal(form.format, 'pdf')
    assert.equal(form.session, 'test-session')
    assert.deepEqual(JSON.parse(form.columns), columns)
    assert.deepEqual(JSON.parse(form.period), period)
    assert.deepEqual(JSON.parse(form.quickFilter), quickFilter)
    assert.deepEqual(JSON.parse(form.where), where)
    assert.deepEqual(JSON.parse(form.filter), filter)
  })

  it('sends explicit format', async () => {
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

    await client.export({
      request: 'MyRegister',
      format: 'xlsx',
      columns: [],
    })

    const form = parseFormBody(body)
    assert.equal(form.format, 'xlsx')
  })

  it('omits empty filter arrays from payload', async () => {
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

    await client.export({
      request: 'MyRegister',
      columns: [{ id: 'name' }],
      quickFilter: [],
      filter: [],
      where: [],
    })

    const form = parseFormBody(body)
    assert.equal(form.quickFilter, undefined)
    assert.equal(form.filter, undefined)
    assert.equal(form.where, undefined)
  })

  it('throws without session', async () => {
    const client = new Z8Http({
      fetchImpl: async () => ({ ok: true, async json() { return {} } }),
    })

    await assert.rejects(
      () =>
        client.export({
          request: 'MyRegister',
          columns: [],
        }),
      /session is not set/
    )
  })

  it('throws without request', async () => {
    const client = new Z8Http({
      fetchImpl: async () => ({ ok: true, async json() { return {} } }),
    })
    client.setSession('test-session')

    await assert.rejects(
      () =>
        client.export({
          request: '',
          columns: [],
        }),
      /request is required/
    )
  })

  it('throws when columns is not an array', async () => {
    const client = new Z8Http({
      fetchImpl: async () => ({ ok: true, async json() { return {} } }),
    })
    client.setSession('test-session')

    await assert.rejects(
      () =>
        client.export({
          request: 'MyRegister',
          columns: { id: 'name' },
        }),
      /columns must be an array/
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
            info: { messages: [{ text: 'exported', type: 'info' }] },
          }
        },
      }),
      onMessages: (messages) => received.push(...messages),
    })
    client.setSession('test-session')

    await client.export({
      request: 'MyRegister',
      columns: [{ id: 'name' }],
    })

    assert.equal(received.length, 1)
    assert.equal(received[0].text, 'exported')
  })
})
