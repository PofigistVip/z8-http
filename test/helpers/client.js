import { Z8Http } from '../../src/index.js'

export function createTestClient(config) {
  return new Z8Http({ url: config.url })
}

/**
 * @param {object} json
 * @returns {string|undefined}
 */
export function extractSession(json) {
  if (!json || typeof json !== 'object') return undefined
  if (typeof json.session === 'string' && json.session.trim()) {
    return json.session.trim()
  }
  if (json.data && typeof json.data.session === 'string' && json.data.session.trim()) {
    return json.data.session.trim()
  }
  if (typeof json.data === 'string' && json.data.trim()) {
    return json.data.trim()
  }
  return undefined
}

export async function loginAndSetSession(client, config) {
  const json = await client.login(config.login, config.password)
  const session = extractSession(json)
  if (!session) {
    throw new Error(
      `Login response has no session. Keys: ${Object.keys(json ?? {}).join(', ')}`
    )
  }
  client.setSession(session)
  return json
}
