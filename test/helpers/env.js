import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '../..')

/**
 * Loads KEY=VALUE pairs from .env in project root (does not override existing process.env).
 */
export function loadEnvFile(path = resolve(projectRoot, '.env')) {
  if (!existsSync(path)) return

  const content = readFileSync(path, 'utf8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const eq = trimmed.indexOf('=')
    if (eq === -1) continue

    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

/**
 * @returns {{
 *   url: string,
 *   login: string,
 *   password: string,
 *   testRequest: string,
 *   testLimit: number,
 *   createData: object[] | null,
 * } | null}
 */
export function getIntegrationConfig() {
  loadEnvFile()

  if (process.env.Z8_SKIP_INTEGRATION === '1') {
    return null
  }

  const url = process.env.Z8_URL?.trim()
  const login = process.env.Z8_LOGIN?.trim()
  const testRequest = process.env.Z8_TEST_REQUEST?.trim()

  if (!url || !login || !testRequest) {
    return null
  }

  let createData = null
  const createDataRaw = process.env.Z8_TEST_CREATE_DATA?.trim()
  if (createDataRaw) {
    try {
      const parsed = JSON.parse(createDataRaw)
      createData = Array.isArray(parsed) ? parsed : [parsed]
    } catch {
      throw new Error('Z8_TEST_CREATE_DATA must be valid JSON array')
    }
  }

  return {
    url,
    login,
    password: process.env.Z8_PASSWORD ?? '',
    testRequest,
    testLimit: Number(process.env.Z8_TEST_LIMIT) || 5,
    createData,
  }
}

export function getSkipReason(config) {
  if (process.env.Z8_SKIP_INTEGRATION === '1') {
    return 'Z8_SKIP_INTEGRATION=1'
  }
  if (!config) {
    return 'Set Z8_URL, Z8_LOGIN, and Z8_TEST_REQUEST in .env (see .env.example)'
  }
  return null
}
