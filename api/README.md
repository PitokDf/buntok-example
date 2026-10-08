# Buntok Example API

A complete, runnable Buntok application that exercises every major feature of the
framework. Every route is declared with **classes + decorators** (`@Controller`,
`@Get`, `@Post`, `@Use`, `@Dependencies`, `BaseController` / `BaseService`) — no
functional `app.get()` handlers.

Built against `@buntok/core` `2.2.4` (`buntok-core-2.2.4.tgz`, installed via
`file:` dependency).

## Quick start

```bash
bun install
bun run dev        # http://localhost:1212
```

Other commands:

```bash
bun run test       # bun test (43 in-process tests via app.request)
bun run check      # biome check --write
bunx tsc --noEmit  # typecheck
bun run build      # buntok build (production bundle in buntok/)
bun run start      # run the production bundle
```

Configuration lives in `.env` (see below). The dev server runs on port **1212**
so it never clashes with `next dev` or other local apps.

## Project layout

```
server.ts                     entry: app.listen(env.PORT)
src/
  index.ts                    app wiring: plugins, global middleware, routes, onError
  env.ts                      env schema validated with Buntok.validateEnv()
  lib/shared.ts               metrics, cache, scheduler, queues, broadcaster, audit log
  middlewares/demos.ts        requireApiKey, traceMiddleware
  modules/
    system/                   core.controller, validation.controller, errors.controller,
                              middleware.controller  — routing, envelopes, zValidator, HttpError
    resilience/               cache, circuit breaker, event emitter, typed client, AI streaming
    files/                    file serving, download, export CSV/JSON, zip, multipart upload
    realtime/                 SSE endpoint + broadcaster, WS at /ws
    helpers/                  crypto/password/string/object/number/id/date/timezone/async,
                              UserFactory, TemplateEngine + Mailer preview
    background/               QueueController, ScheduleController, AuditController
    auth/                     AuthService (seeded users), auth.controller with guards
    posts/                    repository → service (@Dependencies) → controller (BaseController)
    tasks/                    @CronJob scheduler demo
tests/api.test.ts             in-process test suite (app.request, no port binding)
public/                       static assets (/assets), sample.txt
uploads/                      LocalDiskStorage target for POST /upload
```

## Endpoint catalog

### Core (`CoreController`, `@Controller("")`)

| Method | Path | Shows |
| ------ | ---- | ----- |
| GET | `/` | app info |
| GET | `/ping`, `/json`, `/number`, `/empty`, `/context` | JSON/text/204/Context basics |
| GET | `/hello?name=Tok` | query parsing |
| GET | `/users/:id`, `/wildcard/*` | params + wildcard |
| GET | `/redirect` | `@Redirect` decorator (302) |
| GET | `/custom-headers` | `@SetHeader` decorator |
| GET | `/versioned` | `@Version` decorator |
| GET | `/metadata` | `@Public` + `@SetMetadata` + `getMetadata()` |
| GET | `/guard` | `@UseGuard` (403 without `x-guard` header) |
| GET | `/envelopes/success\|error\|paginate\|cursor` | `ctx.success/error/paginate/cursorPaginate` |
| GET | `/stream` | `ctx.htmlStream()` chunked HTML |
| POST | `/echo` | `@HttpCode(201)` + body echo |
| GET | `/cookies/set\|read` | cookie helpers |
| GET | `/di` | Container / DI resolution |

Prefixed routes:

- `@Controller("/api/v1")` + `@Use(traceMiddleware)`: `GET /api/v1/status`, `GET /api/v1/items/:id`
- `GET /plugin/status` — `createPlugin()` demo

### Validation (`/validation`)

`zValidator` for `body`, `query`, `params`, urlencoded, `text/plain`,
`multipart/form-data`, plus `zResponse` OpenAPI annotations.

```bash
curl -s -X POST http://127.0.0.1:1212/validation/users \
  -H 'Content-Type: application/json' \
  -d '{"name":"Tok","email":"a@b.com"}'          # 201

curl -s -X POST http://127.0.0.1:1212/validation/users \
  -H 'Content-Type: application/json' \
  -d '{"name":""}'                               # 422

curl -s 'http://127.0.0.1:1212/validation/pagination?page=2&limit=3'
curl -s -X POST http://127.0.0.1:1212/validation/text \
  -H 'Content-Type: text/plain' --data 'hello'
```

### Errors (`/errors`)

Every `HttpError` subclass: `GET /errors/{bad-request,unauthorized,forbidden,
not-found,conflict,unprocessable,too-many,internal,service-unavailable,timeout,async,raw}` →
matching status codes, JSON error envelope.

### Middleware (`/middleware`)

| Endpoint | Shows |
| -------- | ----- |
| `GET /middleware/order` | middleware execution order |
| `GET /middleware/api-key` | custom guard (403 without `x-api-key: demo-key-123`) |
| `GET /middleware/slow?ms=50` | `timeout()` — `ms=2000` → 504 |
| `POST /middleware/large` | `bodySizeLimit` — >1MB → 413 |
| `GET /middleware/rate-limit` | `rateLimiter()` — 6th call in a burst → 429 |

### Resilience (`/breaker`, `/cache`, `/emitter`, `/client`, `/ai`)

```bash
curl -s http://127.0.0.1:1212/cache/demo
curl -s -X DELETE http://127.0.0.1:1212/cache/clear

# circuit breaker: trips after 3 consecutive failures
curl -s -o /dev/null -w '%{http_code}\n' -X POST 'http://127.0.0.1:1212/breaker/fire?fail=1'
curl -s -o /dev/null -w '%{http_code}\n' -X POST 'http://127.0.0.1:1212/breaker/fire?fail=1'
curl -s -o /dev/null -w '%{http_code}\n' -X POST 'http://127.0.0.1:1212/breaker/fire?fail=1'
curl -s -o /dev/null -w '%{http_code}\n' -X POST 'http://127.0.0.1:1212/breaker/fire?fail=0'  # 503 while open
curl -s http://127.0.0.1:1212/breaker/status

curl -s -X POST http://127.0.0.1:1212/emitter/emit \
  -H 'Content-Type: application/json' -d '{"message":"hi"}'
curl -s http://127.0.0.1:1212/emitter/status
curl -s http://127.0.0.1:1212/client/demo       # type-safe client calling this same app
curl -s -X POST http://127.0.0.1:1212/ai/stream # chunked AI-style token streaming
```

### Files (`/upload`, `/files`)

```bash
curl -s -X POST http://127.0.0.1:1212/upload \
  -F 'avatar=@/path/to/pic.png'                 # LocalDiskStorage → ./uploads

curl -s http://127.0.0.1:1212/files/sample
curl -s -OJ http://127.0.0.1:1212/files/download
curl -s http://127.0.0.1:1212/files/export.csv
curl -s http://127.0.0.1:1212/files/export.json
curl -s -o out.zip http://127.0.0.1:1212/files/archive
curl -s http://127.0.0.1:1212/files/fallback    # 404 (custom not-found handler)
```

### Realtime (SSE + WebSocket)

```bash
curl -s http://127.0.0.1:1212/sse/status
curl -sN http://127.0.0.1:1212/sse               # event stream, tick every 2s
curl -s -X POST http://127.0.0.1:1212/sse/broadcast \
  -H 'Content-Type: application/json' -d '{"event":"note","data":"hi"}'
```

WebSocket (`/ws`, heartbeat + `validateWSMessage`):

```ts
const ws = new WebSocket("ws://127.0.0.1:1212/ws");
ws.onmessage = (e) => console.log(e.data);
ws.onopen = () => ws.send(JSON.stringify({ type: "chat", payload: "halo" }));
// <- {"type":"welcome","message":"Connected to Buntok WS"}
// <- {"type":"chat","payload":"halo","from":"server"}
// sending invalid JSON yields {"success":false,"error":"Invalid message"}
```

### Helpers, factory, mail (`/helpers`, `/factory`, `/mailer`)

- `GET /helpers/{crypto,password,string,object,number,id,date,date-lib,timezone,network,async}`
- `GET /factory/users?count=3` — `UserFactory.buildMany()`
- `GET /mailer/preview` — `TemplateEngine` partials + helpers, no provider needed
- `GET /mailer/strict-error` — strict-mode template error demo
- `POST /mailer/send` — guarded by `RESEND_API_KEY` (501 render-only without it)

### Background (`/queue`, `/schedule`, `/tasks`, `/audit`)

```bash
curl -s -X POST http://127.0.0.1:1212/queue/jobs \
  -H 'Content-Type: application/json' \
  -d '{"to":"a@b.com","subject":"Hi","body":"Hello"}'
curl -s http://127.0.0.1:1212/queue/status
curl -s http://127.0.0.1:1212/queue/history
curl -s http://127.0.0.1:1212/schedule/status
curl -s -X POST http://127.0.0.1:1212/tasks/run   # manual cron run
curl -s http://127.0.0.1:1212/tasks/status
curl -s http://127.0.0.1:1212/audit/recent
curl -s -X DELETE http://127.0.0.1:1212/audit/clear
```

### Auth (`/auth`)

Seeded users:

| Email | Password | Role |
| ----- | -------- | ---- |
| `admin@buntok.test` | `admin123` | admin (perms: `users:delete`, `posts:create`) |
| `user@buntok.test` | `user123` | user |

`AUTH_STORE=header` → token in JSON body + `Authorization: Bearer`.

```bash
TOKEN=$(curl -s -X POST http://127.0.0.1:1212/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@buntok.test","password":"admin123"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

curl -s http://127.0.0.1:1212/auth/me -H "Authorization: Bearer $TOKEN"
curl -s http://127.0.0.1:1212/auth/admin -H "Authorization: Bearer $TOKEN"      # 200 admin
curl -s http://127.0.0.1:1212/auth/moderator -H "Authorization: Bearer $TOKEN"  # 200 admin
curl -s http://127.0.0.1:1212/auth/delete-user -H "Authorization: Bearer $TOKEN"
curl -s -X POST http://127.0.0.1:1212/auth/logout
```

### Posts (`/posts`) — class-based CRUD stack

`PostController extends BaseController` → `PostService extends BaseService` →
`PostRepository`, wired with `@Dependencies`.

```bash
curl -s http://127.0.0.1:1212/posts
curl -s -X POST http://127.0.0.1:1212/posts \
  -H 'Content-Type: application/json' -d '{"title":"Hello","body":"world"}'   # 201 envelope
curl -s http://127.0.0.1:1212/posts/1
curl -s -X PUT http://127.0.0.1:1212/posts/1 \
  -H 'Content-Type: application/json' -d '{"title":"Updated"}'
curl -s -X DELETE http://127.0.0.1:1212/posts/1                               # 204
curl -s http://127.0.0.1:1212/posts/stats
curl -s 'http://127.0.0.1:1212/posts/search?q=Hello&page=1&limit=2'
curl -s -X POST http://127.0.0.1:1212/posts/validated \
  -H 'Content-Type: application/json' -d '{"title":"Valid","body":"yes"}'     # 422 on bad input
```

### Operations

```bash
curl -s http://127.0.0.1:1212/health          # healthCheck with custom check()
curl -s http://127.0.0.1:1212/health/live     # livenessCheck
curl -s http://127.0.0.1:1212/health/ready    # readinessCheck (env + docs probes)
curl -s http://127.0.0.1:1212/metrics         # Prometheus text format
curl -s http://127.0.0.1:1212/docs            # Swagger UI (registered on listen)
curl -s http://127.0.0.1:1212/docs/swagger.json
curl -s http://127.0.0.1:1212/assets/sample.txt
```

## Environment variables

Validated at boot with `Buntok.validateEnv()` (`src/env.ts`):

| Variable | Default | Purpose |
| -------- | ------- | ------- |
| `PORT` | `1212` | HTTP port |
| `AUTH_STORE` | `header` | `header` (JSON token) or `cookie` |
| `AUTH_COOKIE` | `session` | cookie name when `AUTH_STORE=cookie` |
| `NODE_ENV` | `development` | environment |
| `JWT_SECRET` | dev fallback | JWT signing secret (set your own in production) |
| `RESEND_API_KEY` | — | enables `POST /mailer/send` |

## Tests

```bash
bun test
```

43 in-process tests in `tests/api.test.ts` dispatch through `app.request()` —
no port binding, covering routing, validation, error mapping, auth + RBAC,
BaseController CRUD, circuit breaker, uploads, queues and rate limiting.
