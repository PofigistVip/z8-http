const EMPTY_RECORD_ID = '00000000-0000-0000-0000-000000000000'

export function defaultCreatePayload() {
  return [{ recordId: EMPTY_RECORD_ID }]
}

/**
 * @param {object} json
 * @returns {string[]}
 */
export function extractRecordIds(json) {
  const ids = new Set()

  function addId(value) {
    if (value === undefined || value === null) return
    const s = String(value).trim()
    if (s && s !== EMPTY_RECORD_ID) ids.add(s)
  }

  function walk(node) {
    if (node == null) return
    if (Array.isArray(node)) {
      for (const item of node) walk(item)
      return
    }
    if (typeof node !== 'object') return

    if ('recordId' in node) addId(node.recordId)
    if ('id' in node && typeof node.id === 'string') addId(node.id)

    for (const value of Object.values(node)) {
      if (Array.isArray(value) || (value && typeof value === 'object')) {
        walk(value)
      }
    }
  }

  walk(json)
  return [...ids]
}
