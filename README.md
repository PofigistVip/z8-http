# z8-http

HTTP client for the Z8 API (ESM).

## Install

Use as a local package or link from this repository:

```bash
npm install /path/to/z8-http
```

## Usage

```js
import { Z8Http } from 'z8-http'

const client = new Z8Http({ url: 'https://your-host/request.json' })

const loginJson = await client.login('user', 'password')
client.setSession(loginJson.session)

const rows = await client.read({ request: 'MyRegister', limit: 50 })
```

## Long-running jobs (`job`)

`job()` starts a server task by `request` and `period`, then polls until the response has `done === true`. While the task runs, each poll sends `request`, `server`, and `job` (task `id`) from the previous response, plus `session`.

```js
const result = await client.job({
  request: 'org.zenframework.z8.server.db.generator.SchemaGenerator',
  period: { start: null, finish: null },
  pollIntervalMs: 1000,
})
// result.done === true when finished
```

`pollIntervalMs` defaults to `1000`. Server messages from intermediate responses are delivered through `onMessages` like other API calls.

## Attachments (`attach` / `detach`)

`attach()` uploads a file via multipart (`action: 'attach'`). `detach()` removes attachments with `action: 'detach'` and a JSON `data` array (attachment objects as returned from `read`):

```js
await client.detach({
  request: 'MyRegister',
  recordId: '...',
  field: 'attachments',
  data: [{ /* attachment objects */ }],
})
```

## Export (`export`)

`export()` builds a register export (`action: 'export'`). `format` defaults to `pdf`; `columns` is required (array of column objects). Filters match `read`: `quickFilter`, `filter`, `where`, `period`.

```js
await client.export({
  request: 'MyRegister',
  format: 'pdf',
  columns: [{ /* column defs */ }],
  period: { start: null, finish: null },
})
```

## Request hook (`beforeRequest`)

For `read`, `count`, `create`, `update`, `destroy`, and `request` you can pass `beforeRequest(method, payload)` in options. It runs after the client builds the form payload and before `postForm`. Mutate `payload` in place, or return a new object to replace it. `method` is one of `'read'`, `'count'`, `'create'`, `'update'`, `'destroy'`, `'request'` (for `count`, `payload` already includes `count: 'true'`).

```js
await client.read({
  request: 'MyRegister',
  beforeRequest(method, payload) {
    payload.customField = 'value'
  },
})
```

## Generic request (`request`)

`request()` sends an arbitrary form payload. By default (`withSession: true`) it requires a logged-in client and sets `payload.session` from the instance. Use `withSession: false` for login-like calls without a session.

```js
await client.request({
  payload: { request: 'MyRegister', action: 'read', limit: 10 },
  beforeRequest(method, payload) {
    payload.customField = 'value'
  },
})

await client.request({
  payload: { request: 'login', login: 'user', password: 'pass', experimental: true },
  withSession: false,
})
```

## Server messages (`info.messages`)

After each successful JSON response, if the payload contains `info.messages`, the client invokes an `onMessages` handler.

- **Constructor** — `new Z8Http({ onMessages: (messages) => { ... } })` sets the default handler for all calls.
- **Per call** — pass `onMessages` in method options, e.g. `read({ request: 'MyRegister', onMessages: handler })`, or as the third argument to `login(login, password, { onMessages })`.
- **Priority** — per-call handler overrides the instance handler.
- **Default** — `defaultOnMessages` logs non-empty messages to the console (`[Z8:type] text`).

```js
import { Z8Http, defaultOnMessages } from 'z8-http'

const client = new Z8Http({
  url: 'https://your-host/request.json',
  onMessages: (messages) => {
    for (const m of messages) console.warn(m.text)
  },
})

// Override only for this request:
await client.read({
  request: 'MyRegister',
  limit: 10,
  onMessages: defaultOnMessages,
})
```

## Integration tests (real API)

Tests call a live Z8 server. Use a **test stand** and a register with CRUD permissions only.

1. Copy `.env.example` to `.env` and set:

   - `Z8_URL` — full URL to `request.json`
   - `Z8_LOGIN`, `Z8_PASSWORD`
   - `Z8_TEST_REQUEST` — register name for read/create/update/destroy

2. Run:

   ```bash
   npm test
   ```

Optional:

- `Z8_TEST_LIMIT` — read page size (default `5`)
- `Z8_SKIP_INTEGRATION=1` — skip all integration tests
- `Z8_TEST_CREATE_DATA` — JSON array for `create` payload (if the register requires extra fields)

Requires Node 18+ (`fetch` and `node:test`).
