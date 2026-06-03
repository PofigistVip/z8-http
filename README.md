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
