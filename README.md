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
