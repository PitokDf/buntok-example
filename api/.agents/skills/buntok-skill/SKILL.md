---
name: buntok-skill
description: Use when the user is building, coding, or asking questions about a project that uses @buntok/core. Covers routing, controllers, decorators, validation, file upload, middleware, helpers, error handling, IoC container, SSE, WebSocket, and all utility functions.
---

# @buntok/core Skill Guide

Complete reference for building applications with `@buntok/core`.

## Install

```bash
bun add @buntok/core
```

**⚠️ IMPORTANT: Bun >= 1.2.0 is REQUIRED.** `@buntok/core` uses Bun-native APIs (like `Bun.CryptoHasher`, `Bun.gzipSync`, `Bun.Image`, `Bun.file`, etc.) that are NOT available in Node.js. Using `npm install` or running with Node.js will cause runtime errors. Always use `bun` for package management and execution.

---

## Getting Started (CLI)

Scaffold a production-ready project in seconds. The `buntok` CLI is included with `@buntok/core` (`bin: buntok -> dist/cli/index.js`).

### 1. Create project & init

```bash
mkdir my-app && cd my-app
bun init -y                      # create package.json
bun add @buntok/core
bunx buntok init                 # interactive setup — generates all boilerplate
```

`buntok init` generates the full project scaffold:
- Copies `SKILL.md` → `.agents/skills/buntok-skill/SKILL.md`
- Updates `package.json` scripts: `dev`, `build`, `start`, `check`, `format`, `lint`
- Generates `tsconfig.json` (bundler, strict, `@/*` → `./src/*`, ESNext), `biome.json`, `.vscode/settings.json`
- Creates `src/index.ts` (Hello Buntok + `export const app`) and `src/env.ts` (`App.validateEnv` for `PORT`, `AUTH_STORE`, `AUTH_COOKIE`, `NODE_ENV`)
- Creates `server.ts` (build entry point — `app.listen(env.PORT)`)
- Creates `.env` / `.env.example` (`PORT=1212`, `AUTH_STORE=header`, `AUTH_COOKIE=session`)
- Creates `.gitignore`, optionally `vercel.json` (prompt: "Do you want to deploy to Vercel?"), optionally `Dockerfile` + `.dockerignore` (prompt: "Do you want to add Docker support?")

### 2. Project Structure (after `buntok init`)

```text
.
├── .agents/skills/buntok-skill/SKILL.md
├── .vscode/settings.json
├── src/
│   ├── index.ts              # export default app (clean — no listen)
│   ├── env.ts                # App.validateEnv({ PORT, AUTH_STORE, ... })
│   ├── controllers/          # buntok create <entity> --controller
│   ├── services/             # buntok create <entity> --service
│   └── repositories/         # buntok create <entity> --repo
├── server.ts                 # build entry point — app.listen(env.PORT)
├── public/docs/swagger.json  # buntok make:docs
├── .env / .env.example
├── tsconfig.json / biome.json / vercel.json? / Dockerfile? / .dockerignore? / .gitignore
├── package.json
└── .buntok/                  # buntok build output (server.js)
```

> `src/index.ts` must `export const app` — required by `buntok make:docs` (loads it with `BUNTOK_DOCS_BUILD=1`). `server.ts` is the build entry point for all modes (Vercel, Docker, local). It calls `app.listen(env.PORT)` which internally uses `Bun.serve()`.

### 3. Generate code

```bash
buntok create user                      # repo + service + controller for "user"
buntok create user --repo --service     # only repo & service
buntok create user --controller         # only controller

# Auto: creates src/repositories/user.repository.ts, src/services/user.service.ts,
# src/controllers/user.controller.ts and injects:
#   const repo = new UserRepository(); const service = new UserService(repo);
#   app.registerController(new UserController(service));
# then runs `bunx biome format --write`
```

### 4. Build / DB / Docs

```bash
buntok build              # production bundle → .buntok/server.js
buntok db migrate         # migrate | seed | reset | generate | studio | status
buntok db seed
buntok make:docs          # generates public/docs/swagger.json (no args)
bun run dev               # after init: bun --watch server.ts
```

**CLI reference (`src/cli/index.ts:15`):**

| Command | Args / Flags | Description |
|---------|--------------|-------------|
| `buntok init` | — | Project setup |
| `buntok build` | — | Build to `.buntok/` |
| `buntok create <entity>` | `--repo --service --controller` | Generate layered files |
| `buntok db <cmd>` | `migrate, seed, reset, generate, studio, status` | ORM delegation |
| `buntok make:docs` | — | Generate OpenAPI `swagger.json` |

---

## Quick Start

```ts
import { App } from "@buntok/core";

const app = new App();

// Classic style (explicit Response via ctx)
app.get("/", (ctx) => {
  return ctx.json({ message: "Hello, Buntok!" });
});

// Elysia-style flexible return (also supported)
app.get("/hello", () => "Hello, Buntok!");              // text/plain
app.get("/json", () => ({ message: "Hello, Buntok!" })); // application/json
app.get("/users/:id", ({ params }) => params);            // direct return + destructuring

app.listen(1212);
```

---

## App

### Creating Instance

```ts
import { App } from "@buntok/core";
const app = new App();
```

### API

| Method | Signature | Description |
|--------|-----------|-------------|
| `app.get` | `(path, ...handlers)` | Register GET route — `Handler<DI, ExtractParams<Path>>` + up to 5 `Middleware` |
| `app.post` | `(path, ...handlers)` | Register POST route |
| `app.put` | `(path, ...handlers)` | Register PUT route |
| `app.patch` | `(path, ...handlers)` | Register PATCH route |
| `app.delete` | `(path, ...handlers)` | Register DELETE route |
| `app.options` | `(path, ...handlers)` | Register OPTIONS route |
| `app.head` | `(path, ...handlers)` | Register HEAD route |
| `app.all` | `(path, ...handlers)` | Register all methods (GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS) |
| `app.query` | `(path, ...handlers)` | Register QUERY (RFC 10008) |
| `app.use` | `(middleware)` | Add global middleware |
| `app.group` | `(prefix)` | Create route group — returns `RouterGroup` with `use()`, `group()`, same HTTP verbs (inherits group middlewares) |
| `app.static` | `(routePath, directory, options?)` | Serve static files — `StaticOptions {maxAge?, cacheControl?, etag?}`; traversal-safe, `index.html` fallback, ETag `304` |
| `app.ws` | `(path, handler)` | Register WebSocket endpoint — exact path only (no params), `WSHandler {open?, message?, close?, drain?, authenticate?}` |
| `app.listen` | `(port?, callback?)` | Start server — respects `process.env.PORT` or `1212`, auto-increments 10 ports on `EADDRINUSE`, graceful `SIGTERM/SIGINT` 30s |
| `app.request` | `(input, init?)` | Dispatch request (testing) — string without `http://` auto-prefixed `http://localhost` |
| `app.fetch` | `(request)` | Dispatch request without binding a port — Vercel/serverless entry point (delegates to `app.request`) |
| `app.plugin` | `(plugin)` | Install a plugin — dedup by `plugin.name`, supports async `install()`, tracks in `app.installedPlugins` |
| `app.onError` | `(handler)` | Override global error handler — `ErrorHandler<DI> (err, ctx) => HandlerReturn` |
| `app.notFound` | `(handler)` | Override 404 handler — `NotFoundHandler<DI> (ctx) => HandlerReturn` |
| `app.set` | `(key, value)` | Store value in `app.di: DI` |
| `app.setContainer` | `(container)` | Attach IoC Container |
| `app.getContainer` | `()` | Get or create container |
| `app.registerController` | `(ControllerClass \| instance)` | Register controller — accepts class **or** instance; resolves via `container.resolve()` (use `FactoryProvider` for ctor deps) |
| `app.validateEnv` | `(schema, options?)` / `App.validateEnv(schema, options?)` | Validate env vars with Zod — `options?: EnvValidationOptions {onError?: (errors:{field,message}[])=>void}` |
| `app.disable` | `("x-powered-by")` | Disable built-in `X-Powered-By: buntok` header |
| `app.enable` | `("x-powered-by")` | Re-enable disabled features |
| `app.enableReusePort` | `(enabled?)` | `SO_REUSEPORT` (Linux only — warns on macOS/Windows) |
| `app.icon` | `(path)` | Set custom favicon path (default `./public/favicon.ico` + built-in fallback) |
| `app.apiDocs` | `(options?)` | Register API docs UI at `/docs` — routes NOT in `openApiDocs` |
| `app.server` | `Server<WSData>` | Underlying `Bun.Server` after `listen()` — for `server.publish()` |
| `app.di` | `DI` | Public DI store |
| `app.openApiDocs` | `any[]` | Collected OpenAPI docs per route (for `make:docs`) |

### validateEnv()

Type-safe env validation with Zod. Exits on failure. **Static** `App.validateEnv` is preferred (e.g. in `src/env.ts`); instance `app.validateEnv` delegates to it.

```ts
import { App } from "@buntok/core";
import { z } from "zod";

// Static — no App instance needed (ideal for src/env.ts)
export const env = App.validateEnv({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  PORT: z.coerce.number().default(1212),
});
// env is fully typed

// With custom error handler (e.g. Sentry)
const env2 = App.validateEnv(
  { DATABASE_URL: z.string().url() },
  {
    onError: (errors) => {
      console.error("ENV ERROR:", errors); // [{field, message}]
      process.exit(1);
    },
  }
);

// Instance (backward compat)
const app = new App();
const env3 = app.validateEnv({ PORT: z.coerce.number().default(1212) });
```

`EnvValidationOptions { onError?: (errors:{field:string,message:string}[])=>void|never }` — if `onError` provided, default pretty print + `process.exit(1)` is skipped; if `onError` doesn't exit/throw, framework throws `Environment validation failed: ...`.

### disable() / enable()

```ts
app.disable("x-powered-by");  // Remove X-Powered-By header
app.enable("x-powered-by");   // Re-enable
```

### app.apiDocs()

Register a built-in API docs UI. No extra packages needed.

```ts
app.apiDocs({
  path: "/docs",         // UI route (default: "/docs")
  title: "My API",       // HTML <title> (default: "API Documentation")
  version: "2.0.0",      // Shown in UI (default: "1.0.0")
  description: "My API", // Shown in UI
  safeOnProduction: true, // Return 404 in production (default: false)
});
// Type: ApiDocsOptions { path?, title?, version?, description?, safeOnProduction? }
// StaticOptions { maxAge?, cacheControl?, etag? } — for app.static(route, dir, options)
```

Open `http://localhost:1212/docs` to see the auto-generated API docs with live API client.

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `path` | `string` | `"/docs"` | Route path for the docs UI |
| `title` | `string` | `"API Documentation"` | Page title |
| `version` | `string` | `"1.0.0"` | API version |
| `description` | `string` | `""` | API description |
| `safeOnProduction` | `boolean` | `false` | When `true` + `NODE_ENV=production`, docs return 404 |

Generate `swagger.json` separately (no args — must `export const app` from `src/index.ts`):

```sh
bunx buntok make:docs
# → public/docs/swagger.json (loads src/index.ts with BUNTOK_DOCS_BUILD=1, via zod-to-openapi)
```

Docs routes (`/docs`, `/docs/swagger.json`, `/docs/*` assets, `/docs/index.html`) are registered directly on router and **do not** appear in `openApiDocs` / `swagger.json`.

### app.request()

Test routes without binding a port. String paths without `http://` are auto-prefixed to `http://localhost`.

```ts
const res = await app.request("/users", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "Alice" }),
});
const data = await res.json();

// Also accepts Request/URL
await app.request(new Request("http://localhost/users"));
```

### app.static — StaticOptions

```ts
app.static("/assets", "./public", { maxAge: 3600, etag: true });
app.static("/files", "./uploads", { cacheControl: "private, max-age=60" });
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxAge` | `number` | `3600` | `Cache-Control` max-age seconds (ignored if `cacheControl` set) |
| `cacheControl` | `string` | `"public, max-age=3600"` | Full `Cache-Control` header |
| `etag` | `boolean` | `true` | ETag + `If-None-Match` → `304`; also directory traversal guard + `index.html` fallback |

### enableReusePort

Linux-only. On macOS/Windows warns and is ignored.

```ts
app.enableReusePort(true); // SO_REUSEPORT
```

---

## Dev Server

Bun development server with HMR (Hot Module Replacement) enabled. Thin wrapper around `Bun.serve()` with `development: true` — automatic re-bundling, source maps, and hot reload when files change.

```ts
import { devServer } from "@buntok/core/dev";
```

### Usage

**Minimal** — default returns 404 for all requests:

```ts
import { devServer } from "@buntok/core/dev";

devServer({
  port: 3000,
  onReady: (info) => console.log(`Dev server: http://localhost:${info.port}`),
});
```

**With routes** — serve HTML files directly:

```ts
import { devServer } from "@buntok/core/dev";
import homepage from "./index.html";

devServer({
  port: 3000,
  routes: { "/": homepage },
  onReady: (info) => console.log(`Dev server: http://localhost:${info.port}`),
});
```

**With custom fetch handler:**

```ts
import { devServer } from "@buntok/core/dev";

devServer({
  port: 3000,
  fetch: (req) => new Response(`Hello from ${req.url}`),
});
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `port` | `number` | `3000` | Port to listen on. `0` = random available port |
| `hostname` | `string` | `"localhost"` | Hostname to bind to |
| `routes` | `Record<string, unknown>` | — | Bun routes object — maps paths to HTML files or handlers |
| `fetch` | `(req: Request) => Response \| Promise<Response>` | 404 handler | Custom fetch handler — used when no `routes` provided |
| `hmr` | `boolean` | `true` | Enable Hot Module Replacement |
| `console` | `boolean` | `true` | Echo browser console to terminal |
| `onReady` | `(info: { port, hostname }) => void` | — | Called when server starts |
| `...rest` | `BunServeOptions` | — | Any additional `Bun.serve()` options (e.g. `maxRequestBodySize`) |

### When to Use

- **Web/frontend development** — HMR for HTML, CSS, JS changes
- **Full-stack apps** — serve templates + API routes simultaneously
- **Framework development** — test BunTok itself with hot reload

### When NOT to Use

- **Pure API servers** — `bun --watch server.ts` is simpler and sufficient
- **Vercel deployment** — Vercel handles serving; use `app.fetch()` instead
- **Production** — always use `bun run build` + `bun run start`

### Return Value

Returns the `Bun.serve()` instance:

```ts
const server = devServer({ port: 0 });
console.log(server.port); // actual port (useful with port: 0)
server.stop(); // stop the server
```

---

## Handler & Context

Handlers receive a single `ctx: Context` argument. Two ergonomic styles are supported.

### Classic style (explicit Response via `ctx`)

```ts
app.get("/users/:id", (ctx) => {
  return ctx.json({ id: ctx.params.id });
});
```

### Elysia-style flexible return (also supported)

Handlers may return primitives/objects directly — framework auto-serializes via `toResponse()`:

| Return | Serialized as | Content-Type | Status |
|--------|---------------|--------------|--------|
| `string` | `new Response(string)` | `text/plain; charset=utf-8` | 200 |
| `number`/`boolean`/`bigint` | `String(value)` | `text/plain; charset=utf-8` | 200 |
| `object`/`array` | `Response.json(value)` | `application/json` | 200 |
| `null`/`undefined`/`void` | empty body | — | 204 |
| `Blob`/`ArrayBuffer`/`Uint8Array`/`ReadableStream` | `new Response(value)` | from value / none | 200 |
| `Response` | passthrough | as-is | as-is |

```ts
app.get("/hello", () => "hello world");                    // text/plain
app.get("/json", () => ({ hello: "buntok" }));             // json
app.get("/num", () => 42);                                 // text/plain "42"
app.get("/users", () => [{ id: 1 }, { id: 2 }]);           // json array
app.get("/empty", () => null);                             // 204
app.get("/custom", () => new Response("hi", { status: 201 })); // passthrough
```

### Elysia-style destructuring

`ctx` is an instance with `params/query/store/ip/request/di/...` as own properties — you can destructure:

```ts
app.get("/users/:id", ({ params }) => params);               // { id: "123" }
app.get("/users/:id", ({ params: { id } }) => id);          // "123"
app.get("/search", ({ query }) => query.q);                  // ?q=...
app.get("/files/*", ({ params }) => params["*"]);            // wildcard
app.get("/profile", ({ store, request }) => store.user);
```

`async ({ request }) => await request.json()` works for body; `ctx.body()`/`ctx.valid()` remain for validated body.

`HandlerReturn` type (`src/app.ts:112`, exported from `@buntok/core`) covers all of the above. `Handler = (ctx: Context) => HandlerReturn`.

---

## Context

`ctx` is the single argument passed to every handler (also supports destructuring above).

### Request

| Property / Method | Type | Description |
|-------------------|------|-------------|
| `ctx.request` | `Request` | Raw Bun Request object |
| `ctx.params` | `Record<string, string> & ExtractParams<Path>` | Route parameters (`:id`, `*` → `ctx.params["*"]`) |
| `ctx.query` | `Record<string, string>` | Parsed query string (lazy, cached; `+` → space) |
| `ctx.ip` | `string` | Client IP — only `x-forwarded-for` (first entry) else `127.0.0.1`. For `x-real-ip`/`remoteAddress` use `getClientIP(request)` helper |
| `ctx.store` | `Record<string, any>` | Key-value store between middleware (`uploader` → `store.files`/`store.fields`) |
| `ctx.di` | `DI` | DI store (`app.di`) — same generic as `App<DI>` |
| `ctx.user` | `Record<string, unknown> \| undefined` | Set by `requireAuth` — cast to your JWT shape |
| `await ctx.body<T>()` | `Promise<T>` | Parse JSON body (cached) |
| `await ctx.formData()` | `Promise<FormData>` | Parse multipart form-data (cached) — safe to call twice, used by `zValidator` + `uploader` |
| `ctx.getCookie(name)` | `string \| undefined` | Get one cookie (native `request.cookies` or `Cookie` header) |
| `ctx.getCookies()` | `Record<string, string>` | Get all cookies |
| `ctx.valid<T>(target)` | `T` | Get data validated by `zValidator` — throws if no validator ran for that target |
| `ctx.onAfterResponse(hook)` | `void` | Register `hook: (res:Response)=>Response\|undefined` in `ctx._afterHooks` |

### Response

| Method | Return | Description |
|--------|--------|-------------|
| `ctx.json(data, status?)` | `Response` | JSON response |
| `ctx.text(text, status?)` | `Response` | Plain text response |
| `ctx.html(html, status?)` | `Response` | HTML response |
| `ctx.redirect(url, status?)` | `Response` | Redirect (default 302) |
| `ctx.status(code)` | `Response` | Empty response with status code |
| `ctx.success(data?, message?, status?)` | `Response` | Standard success envelope |
| `ctx.error(message, status?, details?)` | `Response` | Standard error envelope |
| `ctx.paginate(data, total, page, limit)` | `Response` | Offset pagination |
| `ctx.cursorPaginate(data, nextCursor)` | `Response` | Cursor pagination |
| `ctx.htmlStream(generator, options?)` | `Response` | Streaming HTML via async generator — yields chunks progressively |
| `ctx.sse(callback, options?)` | `Response` | SSE stream |

---

## Routing

### Route Parameters

```ts
// Named param — classic
app.get("/users/:id", (ctx) => {
  return ctx.json({ id: ctx.params.id });
});

// Named param — Elysia-style
app.get("/users/:id", ({ params }) => params);               // { id: "123" }
app.get("/users/:id", ({ params: { id } }) => id);          // "123" text/plain

// Catch-all wildcard
app.get("/files/*", (ctx) => {
  return ctx.text(`File: ${ctx.params["*"]}`);
});
app.get("/files/*", ({ params }) => params["*"]);            // shorthand
```

### Route Group

```ts
const api = app.group("/api/v1");
api.get("/users", listUsers);
api.post("/users", createUser);

// Nested group with middleware
const admin = api.group("/admin");
admin.use(adminGuard);
admin.get("/stats", getStats);
```

### Static Files

```ts
app.static("/assets", "./public");
```

### HTTP Methods

```ts
app.get("/users", listUsers);
app.post("/users", createUser);
app.put("/users/:id", updateUser);
app.delete("/users/:id", deleteUser);
app.patch("/users/:id", patchUser);
app.head("/users", headUsers);
app.options("/users", optionsUser);
app.query("/users", queryUsers);  // RFC 10008
app.all("/users", allHandler);    // All methods
```

> **⚠️ Route matching order:** Routes are matched in the order they are registered. If multiple routes could match the same URL, the **first registered** route wins. For example, `app.get("/users/:id", ...)` and `app.get("/users/admin", ...)` — register the static route (`/users/admin`) **before** the parameterized route (`/users/:id`), otherwise `:id` will match `"admin"`.

---

## Middleware

Signature: `(ctx, next) => HandlerReturn` (alias for `Response | string | object | ... | Promise<...>` via `toResponse()`)

**Must `return next()`** to pass to next handler. If you return a `Response` without calling `next()`, the chain stops — subsequent middlewares and the route handler are skipped.

```ts
// Global middleware
app.use(async (ctx, next) => {
  const start = performance.now();
  const res = await next();        // <-- MUST call next() to continue the chain
  console.log(`${ctx.request.method} - ${(performance.now() - start).toFixed(2)}ms`);
  return res;
});

// Per-route middleware
app.get("/protected", authMiddleware, (ctx) => {
  return ctx.json({ data: "secret" });
});

// Group middleware
const api = app.group("/api");
api.use(rateLimiter({ max: 100, windowMs: 60_000 }));
```

> **⚠️ Execution order:** Middlewares run in the order they are registered. Global (`app.use`) → Group (`group.use`) → Per-route (left-to-right in handler args). If any middleware throws an error, it is caught by the framework and passed to `app.onError` handler (or the default 500 handler).

---

## Built-in Middleware

### CORS

```ts
import { cors } from "@buntok/core";

app.use(cors({
  origin: ["http://localhost:1212", "https://myapp.com"], // or string | (origin)=>boolean
  methods: ["GET", "POST", "PUT", "DELETE"],
  headers: ["Content-Type", "Authorization"],
  credentials: true,
}));
// Defaults: methods GET,POST,PUT,DELETE,PATCH,OPTIONS; headers Content-Type,Authorization,x-api-key
```

### Compress

```ts
import { compress } from "@buntok/core";

app.use(compress({
  threshold: 1024,   // only if Content-Length >= threshold
  brotliLevel: 4,    // 1-11
  types: ["text/", "application/json"], // MIME prefixes to compress
}));
```
Requires `Content-Length` header — if missing or below threshold, skips compression (avoids buffering). Uses `Bun.gzipSync` / `node:zlib.brotliCompressSync`.

### Rate Limiter

```ts
import { rateLimiter, slidingWindowRateLimiter } from "@buntok/core";

// Fixed window
app.use(rateLimiter({ max: 100, windowMs: 60_000 }));

// Sliding window
app.use(slidingWindowRateLimiter({ max: 100, windowMs: 60_000 }));

// Custom key / skip / store / headers
app.use(rateLimiter({
  max: 100, windowMs: 60_000,
  message: "Too many requests",
  statusCode: 429,
  headers: true,
  skip: (ctx) => ctx.ip === "127.0.0.1",
  keyGenerator: (ctx) => ctx.ip,
  // store: sqliteStore("./rate.db") // bun:sqlite
}));
```

`RateLimiterOptions {max=100, windowMs=60000, message, statusCode=429, headers=true, skip?, keyGenerator?, store?: RateLimitStore}`.

### Request ID

```ts
import { requestId, shortId, uuid } from "@buntok/core";
app.use(requestId()); // RequestIdOptions {header="x-request-id", generator=uuid, store=true, storeKey="requestId"}
app.use(requestId({ header: "x-correlation-id", generator: shortId })); // 8-char
```

### Response Time

```ts
import { responseTime } from "@buntok/core";
app.use(responseTime()); // ResponseTimeOptions {header="x-response-time", format="ms"|"s", store, storeKey="responseTime"}
```

### Helmet (Security Headers)

```ts
import { helmet } from "@buntok/core";
app.use(helmet());
// HelmetOptions {contentTypeOptions, frameOptions, xssProtection, referrerPolicy, hsts, dnsPrefetch, permissionsPolicy, additionalHeaders}
app.use(helmet({ hsts: { maxAge: 31536000, includeSubDomains: true } }));
```

### Timeout

```ts
import { timeout, TimeoutError } from "@buntok/core";
app.get("/slow", timeout(5000), async (ctx) => {
  await longOperation();
  return ctx.json({ ok: true });
});
app.get("/slow2", timeout(5000, "Custom timeout message"), handler);
// Throws TimeoutError { timeoutMs } on expiry (Promise.race)
```

### Body Size Limit

```ts
import { bodySizeLimit } from "@buntok/core";
app.use(bodySizeLimit({ maxSize: 10 * 1024 * 1024, statusCode: 413, message: "Payload Too Large" }));
// BodySizeLimitOptions {maxSize=10MB, statusCode=413, message} — checks Content-Length before parsing
```

---

## Validation (zValidator)

```ts
import { zValidator } from "@buntok/core";
import { z } from "zod";
```

### Body Validation

```ts
const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

app.post("/users", zValidator("body", schema), (ctx) => {
  const data = ctx.valid("body");
  return ctx.json(data, 201);
});
```

### Query Validation

```ts
const paginationSchema = z.object({
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(10),
});

app.get("/users", zValidator("query", paginationSchema), (ctx) => {
  const { page, limit } = ctx.valid("query");
  return ctx.json({ page, limit });
});
```

### Params Validation

```ts
const idSchema = z.object({ id: z.string().uuid() });

app.get("/users/:id", zValidator("params", idSchema), (ctx) => {
  const { id } = ctx.valid("params");
  return ctx.json({ id });
});
```

### Body Content-Type Variants

`zValidator("body", schema, { contentType })` — `ZValidatorOptions { contentType?: BodyContentType }` (default `application/json`). Validates correct `Content-Type` header and parses accordingly. Use `BodyContentType`:

| Content-Type | Schema receives |
|--------------|-----------------|
| `application/json` (default) | parsed JSON object (`ctx.body()`) |
| `multipart/form-data` | `Record<string, string \| File>` from `ctx.formData()` — use `z.file()` (Zod v4+) for files |
| `application/x-www-form-urlencoded` | `Record<string, string>` via `URLSearchParams` |
| `text/plain` | `string` (raw body) |
| `application/xml` / `text/xml` | `string` (raw XML) |
| `application/octet-stream` | `ArrayBuffer` |

```ts
// multipart/form-data text fields (pair with uploader() for files)
app.post("/profile",
  zValidator("body", z.object({ name: z.string() }), { contentType: "multipart/form-data" }),
  (ctx) => ctx.json(ctx.valid("body"))
);

// url-encoded
app.post("/login",
  zValidator("body", z.object({ email: z.string().email(), age: z.coerce.number() }), { contentType: "application/x-www-form-urlencoded" }),
  handler
);

// plain text / binary
app.post("/raw", zValidator("body", z.string().min(1), { contentType: "text/plain" }), handler);
app.post("/bin", zValidator("body", z.instanceof(ArrayBuffer), { contentType: "application/octet-stream" }), handler);
```

On failure returns `422 { success:false, message:"Validation Failed", details:[{field,message}] }`.

### Response Documentation (OpenAPI)

`zResponse` is for docs only (no runtime validation) — wraps schema in `{success, message, data}` envelope. Collected in `app.openApiDocs`.

```ts
import { zResponse } from "@buntok/core";

app.get("/users",
  zValidator("query", paginationSchema),
  zResponse(200, z.array(userSchema), "List users"),
  zResponse(401, z.object({ error: z.string() }), "Unauthorized"),
  (ctx) => ctx.json(users)
);
```

`zResponse(status, schema | Class | [Class], description="Success") => Middleware`.

### Deprecated Shortcuts

```ts
import { validateBody, validateParams } from "@buntok/core";

// These still work but are deprecated — prefer zValidator above
app.post("/users", validateBody(schema), handler);
app.get("/users/:id", validateParams(idSchema), handler);
```

---

## Decorators

Stage 3 TC39 decorators — no `experimentalDecorators` needed.

### Route Decorators

| Decorator | Method |
|-----------|--------|
| `@Get(path)` | GET |
| `@Post(path)` | POST |
| `@Put(path)` | PUT |
| `@Patch(path)` | PATCH |
| `@Delete(path)` | DELETE |
| `@Options(path)` | OPTIONS |
| `@Head(path)` | HEAD |
| `@All(path)` | All (GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS) — `method="ALL"` |
| `@Query(path)` | QUERY (RFC 10008) |

### Response Decorators (zero-cost, AOT <1%)

Boot-time metadata — no per-request overhead. Same reference alias kept for backward compat (`UseGuard`/`UseGuards`, `Header`/`SetHeader`).

| Decorator | Effect | AOT cost |
|-----------|--------|----------|
| `@HttpCode(status)` | Override status for flexible return (e.g. `@HttpCode(201)` for POST) | Inlined constant |
| `@SetHeader(name, value)` | Set static response header (repeatable) | `headers.set` after `toResponse` |
| `@Header(name, value)` | **Deprecated** alias to `SetHeader` — use `SetHeader` | same as above |
| `@Redirect(url, status=302)` | Static redirect (handler not executed; handler `{url,statusCode}` overrides) | `new Response(null,{headers:{Location}})` |
| `@Version("1"\|"1,2")` | Version metadata (for guards/docs) | metadata only |
| `@SetMetadata(key, val)` | Arbitrary metadata (read via `getMetadata`) | WeakMap |
| `@Public()` | `SetMetadata("isPublic",true)` shorthand | same |

```ts
import { HttpCode, SetHeader, Redirect, Version } from "@buntok/core";

@Controller("/users")
class UserController {
  @Post("/")
  @HttpCode(201)
  create() { return { id: 1 }; } // 201 not 200

  @Get("/")
  @SetHeader("x-cache", "hit")
  @SetHeader("x-cache", "hit2") // repeatable
  list() { return []; }

  @Get("/old")
  @Redirect("/new", 301)
  old() {} // 301 -> /new, handler ignored

  @Get("/v")
  @Version("2")
  versioned() { return { v: 2 }; }
}
```

`Version` is metadata-only (no automatic `/v1` prefix) — use for `getMetadata()` in guards or OpenAPI.

### Metadata & Composition

```ts
import { SetMetadata, Public, getMetadata, applyDecorators } from "@buntok/core";

// SetMetadata + getMetadata
@SetMetadata("roles", ["admin"])
@Get("/admin")
admin() {}

const roles = getMetadata(AdminController, "admin", "roles"); // ["admin"]

// Public shorthand
@Public()
@Get("/health")
health() { return { ok: true }; }

// Compose multiple decorators (Nest applyDecorators)
const Auth = (...roles: string[]) => applyDecorators(
  SetMetadata("roles", roles),
  UseGuard(async (ctx) => checkRoles(ctx, roles))
);
@Auth("admin")
@Get("/secret")
secret() {}
```

### Middleware & Guard Decorators

```ts
import { Use, UseGuard, UseGuards } from "@buntok/core";
// Type: GuardFn = (ctx: Context) => boolean | Promise<boolean>
// UseGuards is alias to UseGuard (UseGuard deprecated -> use UseGuards)

@Use(authMiddleware)
@Get("/profile")
async getProfile(ctx: Context) { ... }

@UseGuard(async (ctx) => {
  return ctx.request.headers.has("x-api-key");
})
@Get("/secret")
async secret(ctx: Context) { ... }

// Plural Nest-style (recommended)
@UseGuards(async (ctx) => !!ctx.user)
@Get("/guarded")
guarded() {}

 // UseGuard signature: UseGuard(...guards: GuardFn[]) — if any guard returns false, framework responds 403 { success:false, error:"Forbidden", message:"Forbidden resource" }
 // UseGuards — same reference as UseGuard, kept for Nest compatibility (UseGuard flagged deprecated in types)
```

### DI (Container without decorators)

> **🚫 BREAKING CHANGE:** `@Inject` and `@Injectable` decorators have been **removed**. Using them will cause compile/runtime errors. Use constructor injection via `FactoryProvider` instead (see below).

```ts
import { Container } from "@buntok/core";

class UserRepository { async findAll() { return []; } }
class UserService {
  constructor(private repo: UserRepository) {}
  async getAll() { return this.repo.findAll(); }
}

const container = new Container();
container.registerClass(UserRepository);
container.register(UserService, {
  useFactory: (c) => new UserService(c.resolve(UserRepository)),
});
app.setContainer(container);
// or without container: app.registerController(new UserController(new UserService(new UserRepository())))
```

### Full Controller Example

Prefer `ZodCtx` for fully-typed `ctx.valid()` / `ctx.body()` — it infers types directly from your Zod schemas (no manual `z.infer` needed). Plain `Context` still works but requires manual casting.

```ts
import { Controller, Get, Post, Put, Delete, Use } from "@buntok/core";
import type { Context, ZodCtx } from "@buntok/core";
import { zValidator } from "@buntok/core";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});
const idSchema = z.object({ id: z.string().uuid() });
const querySchema = z.object({ page: z.coerce.number().default(1) });

@Controller("/users")
export class UserController {
  @Get("/")
  @Use(zValidator("query", querySchema))
  async list(ctx: ZodCtx<{ query: typeof querySchema }>) {
    const { page } = ctx.valid("query"); // typed as number
    return ctx.json([]);
  }

  @Get("/:id")
  @Use(zValidator("params", idSchema))
  async getById(ctx: ZodCtx<{ params: typeof idSchema }>) {
    const { id } = ctx.valid("params"); // typed as string (uuid)
    return ctx.json({ id });
  }

  @Post("/")
  @Use(zValidator("body", createSchema))
  async create(ctx: ZodCtx<{ body: typeof createSchema }>) {
    const data = ctx.valid("body"); // typed as { name: string; email: string }
    // also: const raw = await ctx.body<z.infer<typeof createSchema>>();
    return ctx.json(data, 201);
  }

  @Put("/:id")
  @Use(zValidator("params", idSchema))
  @Use(zValidator("body", createSchema.partial()))
  async update(ctx: ZodCtx<{ params: typeof idSchema; body: typeof createSchema }>) {
    const { id } = ctx.valid("params");
    const patch = ctx.valid("body");
    return ctx.json({ id, ...patch });
  }

  @Delete("/:id")
  async remove(ctx: Context) {
    return ctx.status(204);
  }
}

app.registerController(UserController);

// Plain handler equivalent (without ZodCtx):
// app.post("/users", zValidator("body", createSchema), (ctx) => {
//   const data = ctx.valid<z.infer<typeof createSchema>>("body");
//   return ctx.json(data, 201);
// });
```

---

## Error Handling

### Built-in Error Classes

Throw directly from handler — framework auto-catches and returns proper response.

| Class | Status | Description |
|-------|--------|-------------|
| `HttpError` | base | Base class for all errors |
| `BadRequestError` | 400 | Invalid request |
| `UnauthorizedError` | 401 | Authentication missing |
| `ForbiddenError` | 403 | No access |
| `NotFoundError` | 404 | Resource not found |
| `MethodNotAllowedError` | 405 | HTTP method not allowed |
| `ConflictError` | 409 | Data conflict |
| `UnprocessableEntityError` | 422 | Business logic validation |
| `TooManyRequestsError` | 429 | Rate limit exceeded |
| `InternalServerError` | 500 | Server error |
| `ServiceUnavailableError` | 503 | Service unavailable |

```ts
import { NotFoundError, BadRequestError } from "@buntok/core";

app.get("/users/:id", async (ctx) => {
  const user = await findUser(ctx.params.id);
  if (!user) throw new NotFoundError("User not found");
  return ctx.json(user);
});
```

> **⚠️ Errors thrown in handlers AND middlewares are caught automatically.** If a middleware throws (e.g., `throw new UnauthorizedError()`), the framework catches it and sends the appropriate error response. You do NOT need `try/catch` in every handler — only use it if you want to transform the error before it reaches the error handler.

### Override Error Handler

```ts
app.onError((err, ctx) => {
  if (err instanceof HttpError) {
    return ctx.json({ error: err.message }, err.status);
  }
  return ctx.json({ error: "Internal Server Error" }, 500);
});
```

### asyncHandler

Auto-catch errors and return proper response:

```ts
import { asyncHandler } from "@buntok/core";

app.get("/users/:id", asyncHandler(async (ctx) => {
  const user = await findUser(ctx.params.id);
  return ctx.json(user);
}));
```

---

## Plugin System

Extend BunTok apps with isolated, named plugins. Plugins can add middleware, routes, context properties, or any other functionality to the app.

```ts
import { createPlugin } from "@buntok/core";
import type { Plugin } from "@buntok/core";
```

### Plugin Interface

```ts
interface Plugin<DI extends Record<string, unknown> = Record<string, unknown>> {
  name: string;
  install: (app: App<DI>) => void | Promise<void>;
}
```

- `name` — unique identifier, used for dedup (same name = install once only)
- `install(app)` — receives the app instance, can be async
- `DI` generic — constrains the app's dependency injection type

### Creating a Plugin

**Simple plugin** — add middleware and routes:

```ts
const loggerPlugin = createPlugin({
  name: "logger",
  install: (app) => {
    app.use(async (ctx, next) => {
      const start = Date.now();
      await next();
      const ms = Date.now() - start;
      console.log(`${ctx.request.method} ${ctx.request.url} - ${ms}ms`);
    });
  },
});
```

**Plugin with routes:**

```ts
const healthPlugin = createPlugin({
  name: "health",
  install: (app) => {
    app.get("/health", () => ({ status: "ok", timestamp: Date.now() }));
    app.get("/health/ready", () => ({ ready: true }));
  },
});
```

**Plugin with async dependencies (lazy import):**

```ts
const authPlugin = createPlugin({
  name: "@buntok/auth",
  install: async (app) => {
    // Lazy import — zero startup cost if plugin not installed
    const { JwtService } = await import("@buntok/core");
    const jwt = new JwtService(process.env.JWT_SECRET!);
    app.use(requireAuth(jwt));
  },
});
```

### Installing Plugins

```ts
app.plugin(loggerPlugin);
app.plugin(healthPlugin);
```

- Dedup by `name` — installing same plugin twice is a no-op
- `install()` runs immediately when `app.plugin()` is called
- Async `install()` is awaited — server won't start until all plugins finish
- Installed names tracked in `app.installedPlugins` (Set)

### Checking Installed Plugins

```ts
if (app.installedPlugins.has("logger")) {
  console.log("Logger plugin is installed");
}
```

### Plugin Order Matters

Plugins run in order of `app.plugin()` calls. Middleware added by earlier plugins runs before later ones:

```ts
app.plugin(corsPlugin);    // CORS runs first
app.plugin(authPlugin);    // Auth runs second
app.plugin(loggerPlugin);  // Logger runs third
```

---

## IoC Container

Without decorators — explicit `FactoryProvider` for ctor deps:

```ts
import { Container } from "@buntok/core";

class UserRepository { async findAll() { return []; } }
class UserService {
  constructor(private repo: UserRepository) {}
  async getAll() { return this.repo.findAll(); }
}

const container = new Container();
container.registerClass(UserRepository); // singleton by default
container.register(UserService, {
  useFactory: (c) => new UserService(c.resolve(UserRepository)),
});
// transient example
container.registerClass(Logger, "transient");
app.setContainer(container);

// alternative without Container at all
// app.registerController(new UserController(new UserService(new UserRepository())));
```

### Container API

| Method | Description |
|--------|-------------|
| `container.register(token, provider)` | Register provider manually — `Provider = ClassProvider{useClass,scope}\|ValueProvider{useValue}\|FactoryProvider{useFactory,scope}` |
| `container.registerClass(cls, scope?)` | Auto-register class provider — `Scope = "singleton" (default) \| "transient"` |
| `container.resolve(token)` | Resolve instance (ctor via FactoryProvider) |
| `container.get(token)` | Resolve or `undefined` |
| `container.has(token)` | Check if registered |
| `container.hasResolved(token)` | Check if instance already created (singleton cache) |
| `container.clear()` | Reset all providers |

`transient` — new instance per `resolve()` (not cached). `singleton` — cached after first `resolve()`.

---

## File Upload

```ts
import {
  uploader, handleUploads, deleteUploadedFile,
  LocalDiskStorage, MemoryStorage,
} from "@buntok/core";
```

### Upload Options

| Option | Type | Description |
|--------|------|-------------|
| `storage` | `StorageDriver` | **Required** — `LocalDiskStorage`, `MemoryStorage`, or custom |
| `filename` | `(original, file) => { name, ext }` | Global default filename generator |
| `maxFileSize` | `number` | Global max file size in bytes |
| `allowedMimeTypes` | `MimeType[]` | Global allowed MIME types |
| `fields` | `Record<string, UploadFieldConfig>` | Whitelist & per-field validation |
| `verifyMagicBytes` | `boolean` | Verify file magic bytes against MIME type (default: true) |

### Upload Field Config

| Option | Type | Description |
|--------|------|-------------|
| `required` | `boolean` | Required or not (default: false) |
| `maxFileSize` | `number` | Max file size in bytes (overrides global) |
| `allowedMimeTypes` | `MimeType[]` | Allowed MIME types (overrides global) — `MimeType = keyof MAGIC_BYTES` |
| `filename` | `(original, file) => { name, ext }` | Custom filename for this field |
| `outputFormat` | `"webp"\|"png"\|"jpeg"\|"avif"` | Convert image via `Bun.Image` — return type narrows to `ImageUploadedFile {kind,width,height,format,originalType?,originalExt?}` |

### Magic Bytes Verification

Enabled by default. Verifies that the file's actual content matches the claimed MIME type by checking magic bytes (file signatures). Prevents malicious files with spoofed MIME types.

```ts
// Magic bytes verification ON (default)
const result = await handleUploads(ctx, {
  storage: new LocalDiskStorage("./uploads"),
  allowedMimeTypes: ["image/png", "image/jpeg"],
});

// Disable if needed (not recommended)
const result = await handleUploads(ctx, {
  storage: new LocalDiskStorage("./uploads"),
  verifyMagicBytes: false,
});
```

Supported formats: JPEG, PNG, GIF, WebP, BMP, TIFF, ICO, AVIF, HEIC, HEIF, MP4, WebM, OGG, QuickTime, AVI, Matroska, MPEG, MP3, WAV, AAC, FLAC, M4A, PDF, RTF, DOC, DOCX, XLS, XLSX, PPT, PPTX, ODT, ODS, ODP, ZIP, 7Z, RAR, GZIP, TAR, BZIP2, WOFF, WOFF2, TTF, OTF.

Text-based formats (JSON, HTML, CSS, etc.) skip verification.

### Middleware Approach (Recommended)

`uploader()` populates **both** `ctx.store.files` (array) and `ctx.store.fields` (map + text fields). Throws `BadRequestError` — use `asyncHandler`.

```ts
app.post("/upload",
  uploader({
    storage: new LocalDiskStorage("./uploads"),
    fields: {
      avatar: {
        required: true,
        maxFileSize: 2 * 1024 * 1024,
        allowedMimeTypes: ["image/png", "image/jpeg"],
        outputFormat: "webp", // → ImageUploadedFile
      },
    },
  }),
  async (ctx) => {
    const files = ctx.store.files as UploadedFile[];
    const fields = ctx.store.fields as Record<string, string | UploadedFile>;
    return ctx.json({ uploaded: files.length });
  }
);
```

### Manual Approach

`handleUploads` throws `BadRequestError` on validation failure (size, MIME type, magic bytes mismatch, or required fields missing):

```ts
app.post("/upload", asyncHandler(async (ctx) => {
  const result = await handleUploads(ctx, {
    storage: new LocalDiskStorage("./uploads"),
    fields: {
      avatar: { required: true, maxFileSize: 2 * 1024 * 1024 },
    },
  });
  return ctx.json({ files: result.files });
}));
```

### Custom Filename

```ts
// Global
filename: (name, file) => ({ name: `${Date.now()}-${name}`, ext: '.png' })

// Per-field
fields: {
  avatar: { filename: (name) => ({ name: `avatars/${Date.now()}-${name}`, ext: '.jpg' }) }
}
```

> Auto-extension: if filename callback doesn't include extension, framework auto-appends from original file.

### Custom Storage Driver (S3, GCS, R2)

```ts
import type { StorageDriver, UploadedFile } from "@buntok/core";

class S3Storage implements StorageDriver {
  constructor(private bucket: string) {}

  async handleFile(file: File, name: string, ext: string): Promise<UploadedFile> {
    const key = `uploads/${name}${ext}`;
    await s3.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file,
      ContentType: file.type,
    }));
    return {
      originalName: file.name,
      name,
      ext,
      size: file.size,
      type: file.type,
      path: key,
    };
  }

  async deleteFile(key: string): Promise<boolean> {
    try {
      await s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }
}
```

### File Deletion

```ts
import { deleteUploadedFile } from "@buntok/core";

const result = await handleUploads(ctx, options);
const avatar = result.fields.avatar;

// Delete file
const deleted = await deleteUploadedFile(options.storage, avatar);
```

### Rate Limiting

Combine with the built-in rate limiter to prevent upload abuse:

```ts
import { uploader, rateLimiter, LocalDiskStorage } from "@buntok/core";

// Rate limit uploads to 10 per hour per user
app.post("/upload",
  rateLimiter({ windowMs: 60 * 60 * 1000, max: 10 }),
  uploader({ storage: new LocalDiskStorage("./uploads") }),
  async (ctx) => {
    return ctx.json({ uploaded: true });
  }
);
```

### UploadedFile Object

```ts
interface UploadedFile {
  originalName: string;   // original filename from client
  name: string;           // generated filename (with UUID) without ext
  ext: string;            // file extension with dot (e.g. .png)
  size: number;           // size in bytes
  type: string;           // MIME type
  buffer?: ArrayBuffer;   // present if MemoryStorage
  path?: string;          // present if LocalDiskStorage (absolute path)
}
interface ImageUploadedFile extends UploadedFile {
  kind: "image";
  width: number;
  height: number;
  format: string;         // "webp" | "png" | "jpeg" | "avif"
  originalType?: string;  // before conversion
  originalExt?: string;
}
// ParseUploadResult<F> { fields: { [K in keyof F]: outputFormat? ImageUploadedFile : UploadedFile } & Record<string,string>, files: (UploadedFile|ImageUploadedFile)[] }
```

---

## Download / Export / Archive

Helper functions for file downloads, data export, and archive creation. Zero dependencies — uses `Bun.Archive` (native tar) for archives.

```ts
import {
  serveFileOrFallback,
  downloadFile, downloadBuffer,
  exportCSV, exportJSON,
  createZIP,
} from "@buntok/core";
```

### serveFileOrFallback

Serve a file from disk. If file doesn't exist, return the fallback response.

```ts
// Serve file or return 404
app.get("/documents/:id", async (ctx) => {
  return serveFileOrFallback(ctx, doc.file_path, () => {
    return ctx.json({ error: "Not found" }, 404);
  });
});

// Serve avatar or return default SVG
app.get("/avatars/:userId", async (ctx) => {
  const user = await db.users.find(ctx.params.userId);
  return serveFileOrFallback(ctx, user.avatar_path, () => {
    return new Response(generateInitialAvatar(user.name, user.id), {
      headers: { "Content-Type": "image/svg+xml" }
    });
  });
});
```

`serveFileOrFallback(ctx, filePath, fallback, options?)` → `Promise<Response>`. Fallback can be a `Response` or a function returning one.

### downloadFile

Serve a file for download with `Content-Disposition: attachment` header.

```ts
app.get("/reports/:id", async (ctx) => {
  return downloadFile(ctx, `./reports/${ctx.params.id}.pdf`);
  // Custom filename:
  return downloadFile(ctx, "./data.csv", "export.csv");
});
```

`downloadFile(ctx, filePath, filename?, options?)` → `Promise<Response>`. Options: `{ contentType?, cacheControl? }`. Returns 404 if file not found.

### downloadBuffer

Download a buffer/bytes as a file.

```ts
app.get("/generate-pdf", async (ctx) => {
  const pdfBytes = await generatePDF(data);
  return downloadBuffer(ctx, pdfBytes, "document.pdf");
});
```

`downloadBuffer(ctx, data, filename, options?)` → `Response`. Data can be `ArrayBuffer`, `Uint8Array`, or `Blob`.

### exportCSV

Export array of objects as CSV file download. Handles commas, quotes, and newlines (RFC 4180 compliant).

```ts
app.get("/users/export", async (ctx) => {
  const users = await db.users.find();
  return exportCSV(ctx, users, "users.csv");
  // Custom delimiter:
  return exportCSV(ctx, users, "users.csv", { delimiter: ";" });
});
```

`exportCSV<T>(ctx, data, filename?, options?)` → `Response`. Options: `{ delimiter?, header? }`.

### exportJSON

Export data as JSON file download.

```ts
app.get("/data/export", async (ctx) => {
  const data = await db.orders.find();
  return exportJSON(ctx, data, "orders.json");
});
```

`exportJSON(ctx, data, filename?)` → `Response`.

### createZIP

Create a tar archive from multiple files and serve as download. Uses `Bun.Archive` (native).

```ts
app.get("/export/bundle", async (ctx) => {
  const users = await db.users.find();
  const orders = await db.orders.find();

  return createZIP(ctx, [
    { name: "users.csv", data: exportCSVToString(users) },
    { name: "orders.json", data: JSON.stringify(orders) },
  ], "export.tar");

  // With gzip compression:
  return createZIP(ctx, files, "export.tar.gz", { compress: true });
});
```

`createZIP(ctx, files, filename?, options?)` → `Promise<Response>`. Files: `ZIPEntry[]` where `ZIPEntry = { name: string, data: string | Blob | ArrayBuffer | Uint8Array }`. Options: `{ compress? }`.

---

## SSE (Server-Sent Events)

```ts
import { SSE, SSEBroadcaster, createSSE } from "@buntok/core";
```

### Basic Usage

`SSEOptions {maxConnections?, onReconnect?, retry?, sendInitial?, initialEvent?}`. `SSEMessage {event?, data: string|object, id?: string|number}`.

```ts
app.get("/events", (ctx) => {
  return ctx.sse(async (sse) => {
    sse.send({ event: "message", data: "Hello!" });
    sse.sendData({ hello: "world" });
    sse.sendEvent("update", { count: 42 });
    sse.sendWithId("123", { msg: "with id" });
    sse.onClose(() => { clearInterval(timer); });
    console.log(sse.getLastEventId(), sse.isConnected);
  });
});
```

### Reconnection Support

```ts
app.get("/events", (ctx) => {
  return ctx.sse(async (sse) => {
    // Handle events
  }, {
    onReconnect: async (lastEventId: string): Promise<SSEMessage[]> => {
      return missedEvents; // replay
    },
    retry: 3000,            // client retry ms
    sendInitial: true,      // send "connected" event (default true)
    initialEvent: "connected",
  });
});
```

### Connection Limits

```ts
app.get("/events", (ctx) => {
  return ctx.sse(async (sse) => {
    // Handle events
  }, {
    maxConnections: 100, // 503 if exceeded
  });
});

console.log(SSE.activeConnections);       // count
console.log(SSE.getActiveConnections());  // ReadonlySet<SSE>
```

### Broadcasting

```ts
const broadcaster = new SSEBroadcaster();

app.get("/events", (ctx) => {
  return ctx.sse(async (sse) => {
    broadcaster.add(sse);
    sse.onClose(() => broadcaster.remove(sse));
    await new Promise(() => {});
  });
});

broadcaster.broadcast("update", { count: 42 });
broadcaster.broadcastWhere((sse) => sse.getLastEventId() !== null, "event", { data: 1 });
broadcaster.sendAll({ event: "notice", data: "hello" });
broadcaster.closeAll();
console.log(broadcaster.size, broadcaster.isEmpty);
```

---

## WebSocket

```ts
import { validateWSMessage, Room, wsAuth, wsHeartbeat } from "@buntok/core";
```

### Basic Usage

```ts
app.ws("/chat", {
  open(ws) {
    ws.subscribe("room-general");
    ws.send("Welcome!");
  },
  message(ws, message) {
    ws.publish("room-general", message);
  },
  close(ws, code, reason) {
    console.log("Disconnected", code);
  },
});
```

### Authentication

```ts
app.ws("/chat", {
  authenticate: async (ws) => {
    const token = new URL(ws.data.ctx.request.url).searchParams.get("token");
    if (!token) return null;
    const user = await verifyToken(token);
    return user ? { user } : null;
  },
  open: (ws) => {
    const { user } = ws.data.auth as { user: User };
  },
});
```

> **⚠️ If `authenticate` returns `null`, the connection is immediately closed with code `4001`.** The `open` handler is never called. Always return `null` for unauthenticated clients. The return value is stored in `ws.data.auth` and accessible in `open`/`message`/`close` handlers.

### Message Validation

```ts
import { z } from "zod";
import { validateWSMessage } from "@buntok/core";

const schema = z.object({
  type: z.enum(["chat", "ping"]),
  payload: z.string().optional(),
});

app.ws("/chat", {
  message: (ws, message) => {
    const result = validateWSMessage(schema, message);
    if (!result.success) {
      ws.send(JSON.stringify({ error: "Invalid message" }));
      return;
    }
    // result.data is typed
  },
});
```

### Room Management

```ts
import { Room } from "@buntok/core";

const rooms = new Map<string, Room>();

app.ws("/chat", {
  open: (ws) => {
    let room = rooms.get("general");
    if (!room) {
      room = new Room("general");
      rooms.set("general", room);
    }
    room.join(ws);
    room.broadcast({ type: "user:joined", users: room.size }, ws);
  },
  message: (ws, msg) => {
    const room = ws.data.room as Room;
    room.broadcast(msg, ws);
  },
});
// Room(name) {join(ws), leave(ws), has(ws), getMembers(), size, isEmpty, broadcast(data, exclude?), sendAll(data), closeAll()}
```

### Heartbeat

```ts
import { wsHeartbeat } from "@buntok/core";

app.ws("/chat", {
  ...wsHeartbeat(30_000),
  open: (ws) => console.log("Connected"),
  message: (ws, msg) => { /* handle */ },
});
```

---

## Logger

```ts
import { logger, Logger, LogLevel } from "@buntok/core";

logger.info("Server started", { port: 1212 });
logger.warn("High memory usage", { mb: 512 });
logger.error("DB connection failed");
// LogLevel: DEBUG=0, INFO=1, WARN=2, ERROR=3
// Logger {level, format:"text"|"json", logRequests} — production defaults to JSON+WARN, else text+INFO
// Env: LOG_DIR=./logs → daily app-YYYY-MM-DD.log, LOG_REQUESTS=false disables
logger.debug("verbose", { meta: 1 });
logger.flushSync(); // flush file logs
```

---

## Crypto Helpers

```ts
import {
  hash, sha256, sha512, md5, hmac, hashVerify,
  randomBytes, randomHex, randomAlphaNumeric, randomToken,
  encrypt, decrypt,
} from "@buntok/core";

// Hashing — hash/sha256/sha512 are SYNC (Bun.CryptoHasher), hmac/hashVerify are async (WebCrypto)
const digest = hash("password", "SHA-256"); // "SHA-1"|"SHA-256"|"SHA-384"|"SHA-512"
const d2 = sha256("password");
const d3 = sha512("password");
const md5Digest = await md5("password");
const hmacDigest = await hmac("data", "key", "SHA-256");
const valid = await hashVerify("password", digest);

// Random
randomBytes(16);       // Uint8Array
randomHex(32);         // hex string
randomAlphaNumeric(16);
randomToken(32);

// Encrypt/Decrypt — AES-256-GCM, iv is hex
const { ciphertext, iv } = await encrypt("secret data", "my-key");
const plain = await decrypt(ciphertext, "my-key", iv);
```

---

## Password Helpers

Memory-hard password hashing using **scrypt** (built-in, zero dependencies). Also supports legacy PBKDF2 hashes for backward compatibility.

```ts
import { hashPassword, verifyPassword } from "@buntok/core";

// Hash a password (returns scrypt format)
const hashed = await hashPassword("mypassword");
// "scrypt:a1b2c3d4...:e5f6g7h8..."

// Verify a password
const valid = await verifyPassword("mypassword", hashed);  // true
const wrong = await verifyPassword("wrong", hashed);        // false

// Also works with legacy PBKDF2 hashes (backward compatible)
const legacyHash = "100000:salt:hash"; // old format
await verifyPassword("password", legacyHash); // still works
```

**Config:**
- Algorithm: scrypt (memory-hard)
- Memory: 16 MB (N=16384)
- Block size: r=8
- Key length: 64 bytes
- Salt: 16 bytes (random)

---

## String Helpers

```ts
import { slugify, truncate, capitalize, camelCase, snakeCase, kebabCase } from "@buntok/core";

slugify("Hello World!");            // "hello-world"
truncate("Lorem ipsum dolor", 10); // "Lorem ipsu..."
capitalize("hello");                // "Hello"
camelCase("hello-world");          // "helloWorld"
snakeCase("helloWorld");           // "hello_world"
kebabCase("helloWorld");           // "hello-world"
```

---

## Object Helpers

```ts
import { pick, omit, groupBy, uniq, flatten, chunk, deepMerge, flattenObject } from "@buntok/core";

pick({ a: 1, b: 2, c: 3 }, ["a", "c"]);   // { a: 1, c: 3 }
omit({ a: 1, b: 2, c: 3 }, ["b"]);        // { a: 1, c: 3 }
uniq([1, 2, 2, 3]);                        // [1, 2, 3]
chunk([1, 2, 3, 4, 5], 2);                // [[1, 2], [3, 4], [5]]
flatten([[1, 2], [3, [4, 5]]]);           // [1, 2, 3, 4, 5]
deepMerge({ a: 1, b: { c: 2 } }, { b: { d: 3 } });  // { a: 1, b: { c: 2, d: 3 } }
flattenObject({ a: { b: { c: 1 } } });    // { "a.b.c": 1 }
```

---

## Number Helpers

```ts
import { clamp, random, randomFloat, formatNumber, formatBytes, formatCurrency } from "@buntok/core";

clamp(15, 0, 10);              // 10
random(1, 100);                // 42  (int inclusive)
randomFloat(1, 10);            // 4.723...
formatNumber(1000000);         // "1,000,000"
formatBytes(1048576);          // "1 MB"
formatCurrency(1000, "USD");   // "$1,000.00"
```

---

## Date Helpers

```ts
import {
  formatDate, timeAgo, formatDuration,
  addDays, daysBetween, startOfDay, endOfDay,
  isBefore, isAfter,
} from "@buntok/core";

formatDate(new Date());                    // "2024-01-15T10:30:00.000Z" (uses Temporal if available)
timeAgo(new Date(Date.now() - 180000));   // "3 minutes ago"
formatDuration(90061 * 1000);             // "1d 1h 1m 1s" (ms → human)

addDays(new Date(), 7);                   // Date +7 days
daysBetween(new Date("2024-01-01"), new Date("2024-01-15")); // 14
startOfDay(new Date());                   // 00:00:00.000
endOfDay(new Date());                     // 23:59:59.999
isBefore(new Date("2024-01-01"), new Date("2024-01-02")); // true
isAfter(new Date("2024-01-02"), new Date("2024-01-01"));  // true
```

---

## ID & Code Generators

```ts
import { generateCode, nanoid, ulid, resetCounter } from "@buntok/core";

generateCode("T");       // "T0001"
generateCode("T");       // "T0002"
nanoid();                // "V1StGXR8_Z5jdHi6B-myT"
ulid();                  // "01ARZ3NDEKTSV4RRFFQ69G5FAV"
```

---

## Network Helpers

```ts
import { getClientIP, isPrivateIP, parseUserAgent } from "@buntok/core";

const ip = getClientIP(request);
isPrivateIP("192.168.1.1");  // true
const ua = parseUserAgent(request);
```

---

## Async Helpers

```ts
import { delay, retry } from "@buntok/core";

await delay(1000);

const data = await retry(
  () => fetch("https://api.example.com/data").then(r => r.json()),
  { retries: 3, delay: 1000, backoff: "exponential", onError: (err, attempt) => true }
);
// RetryOptions {retries=3, delay=1000, backoff="fixed"|"exponential", onError?: (err, attempt)=>boolean}
```

---

## Cookie Helpers

```ts
import { getCookie, setCookie, deleteCookie, parseCookies, serializeCookie, getCookies } from "@buntok/core";

const token = ctx.getCookie("token");
const all = ctx.getCookies(); // or getCookies(request)
const response = setCookie(ctx.json({ ok: true }), "token", "abc123", {
  httpOnly: true, secure: true, sameSite: "lax", maxAge: 86_400, path: "/", domain: "example.com", partitioned: true,
});
// CookieOptions {domain?, maxAge?, expires?, path="/", secure?, httpOnly?, sameSite="strict"|"lax"|"none", partitioned?}
parseCookies("a=1; b=2"); // {a:"1", b:"2"}
serializeCookie("token", "abc", { httpOnly: true, maxAge: 3600 });
```

---

## Client SDK

Type-safe RPC client for calling your API from the frontend or other services. Define route contracts once, get full type inference everywhere.

```ts
import { createClient } from "@buntok/core/client";
import type { RouteContract } from "@buntok/core/client";
```

### Define Contracts

Each route is declared as a `RouteContract<Params, Query, Body, Response>`:

```ts
const routes = {
  getUser: {
    method: "GET",
    path: "/users/:id",
  } as RouteContract<
    { id: string },              // params
    undefined,                   // query
    undefined,                   // body
    { id: string; name: string } // response
  >,

  listUsers: {
    method: "GET",
    path: "/users",
  } as RouteContract<
    undefined,
    { page?: number; limit?: number },  // query
    undefined,
    { data: { id: string; name: string }[]; total: number }
  >,

  createUser: {
    method: "POST",
    path: "/users",
  } as RouteContract<
    undefined,
    undefined,
    { name: string; email: string },  // body
    { id: string; name: string }
  >,
};
```

### Create Client

```ts
const api = createClient(routes, "http://localhost:1212");

// Fully typed — params, body, and return type are all inferred
const user = await api.getUser({ params: { id: "1" } });
// user: { id: string; name: string }

const list = await api.listUsers({ query: { page: 2, limit: 10 } });
// list: { data: { id: string; name: string }[]; total: number }

const created = await api.createUser({
  body: { name: "Tok", email: "tok@example.com" },
});
// created: { id: string; name: string }
```

### Options

```ts
const api = createClient(routes, "http://localhost:1212", {
  // Headers sent on every request
  headers: { Authorization: "Bearer token" },

  // Request timeout in ms (default: 30000)
  timeout: 10_000,

  // Retry on failure
  retries: 3,                    // number of attempts (default: 0)
  retryDelay: 1_000,             // delay between retries in ms (default: 1000)
  retryOn: [408, 429, 500, 502, 503, 504],  // status codes to retry

  // Interceptors
  onRequest: (req) => req,       // modify request before send
  onResponse: (res) => res,      // inspect/modify response

  // Override fetch (useful for testing)
  fetch: customFetchFunction,
});
```

### ClientError

Typed error thrown when a request fails (non-2xx status or network error):

```ts
import { ClientError } from "@buntok/core/client";

try {
  await api.getUser({ params: { id: "999" } });
} catch (err) {
  if (err instanceof ClientError) {
    console.log(err.status);  // 404
    console.log(err.method);  // "GET"
    console.log(err.path);    // "/users/999"
    console.log(err.body);    // response body (string or null)
    console.log(err.message); // "GET /users/999 failed with status 404"
  }
}
```

### How It Works

1. `createClient()` iterates over contract keys and creates typed functions
2. Each function:
   - Substitutes `:params` in the path (e.g. `/users/:id` → `/users/1`)
   - Appends `?query` params to URL
   - Serializes `body` as JSON
   - Adds `Content-Type: application/json` header if body present
   - Applies `onRequest` interceptor before fetch
   - Applies `onResponse` interceptor after fetch
   - Retries on failure if `retries > 0` and status matches `retryOn`
   - Parses response as JSON or text based on Content-Type
   - Throws `ClientError` on non-2xx if not retryable

### RouteContract Type

```ts
interface RouteContract<
  TParams = undefined,   // URL params (e.g. { id: string })
  TQuery = undefined,    // Query params (e.g. { page?: number })
  TBody = undefined,     // Request body (e.g. { name: string })
  TResponse = unknown,   // Response type
> {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS";
  path: string;          // e.g. "/users/:id"
  params?: TParams;      // type-only, never read at runtime
  query?: TQuery;
  body?: TBody;
  response?: TResponse;
}
```

---

## Testing

```ts
import { App } from "@buntok/core";

const app = new App();
app.get("/ping", (ctx) => ctx.json({ pong: true }));

const res = await app.request("/ping");
const data = await res.json();
console.assert(res.status === 200);
```

---

## Layered Architecture

`@buntok/core` supports Repository → Service → Controller pattern with base classes.

### ORM Packages

| Package | ORM |
|---------|-----|
| `@buntok/prisma` | Prisma |
| `@buntok/drizzle` | Drizzle |
| `@buntok/typeorm` | TypeORM |

### Example (Prisma)

```ts
// Repository
import { BaseRepository } from "@buntok/prisma";
export class UserRepository extends BaseRepository<User, CreateUserInput, UpdateUserInput> {
  constructor(prisma: PrismaClient) {
    super(prisma, "user");
  }
}

// Service
import { BaseService } from "@buntok/core";
export class UserService extends BaseService<User, CreateUserInput, UpdateUserInput> {
  constructor(private userRepo: UserRepository) {
    super(userRepo);
  }
}

// Controller
import { BaseController, Controller } from "@buntok/core";
@Controller("/users")
export class UserController extends BaseController<User, CreateUserInput, UpdateUserInput> {
  constructor(private userService: UserService) {
    super(userService);
  }
}

// Register
const app = new App();
app.registerController(new UserController(new UserService(new UserRepository(prisma))));
app.listen(1212);
```

---

## Environment Variables

| Variable | Effect |
|----------|--------|
| `NODE_ENV=production` | JSON format logs, WARN level |
| `LOG_DIR=./logs` | Write logs to file |
| `LOG_REQUESTS=false` | Disable request logging |
| `PORT=1212` | Server port (default: 1212) |

---

## Docker

`buntok init` optionally generates a `Dockerfile` and `.dockerignore` (prompt: "Do you want to add Docker support?").

### Generated Files

**Dockerfile** — multi-stage build:
- **Builder** (`oven/bun:1-alpine`): installs prod deps via `--production`, runs `bunx buntok build`
- **Runtime** (`oven/bun:1-distroless`): copies `.buntok/`, `node_modules/`, `package.json`

**.dockerignore** — excludes `node_modules`, `dist`, `.buntok`, `.env`, logs

### Usage

```bash
# Build & run with Docker Compose
docker compose up --build

# Or build manually
docker build -t my-app .
docker run -p 1212:1212 my-app
```

### Configuration

Port is configurable via `PORT` env var (default: 1212):

```bash
docker run -e PORT=8080 -p 8080:8080 my-app
```

---

## Vercel Deployment

BunTok supports zero-config deployment on Vercel with Bun runtime. Select "Yes" when prompted during `buntok init`.

### Clean Entry Point Pattern

When Vercel is selected, the project uses a clean entry point pattern (matching Elysia/Hono):

**`src/index.ts`** — clean export only (no `app.listen()`):

```ts
import { App } from "@buntok/core";
import { env } from "./env";

export const app = new App();

// ... register routes, middleware, controllers ...

export default app;
```

**`server.ts`** — build entry point (all modes):

```ts
import { app } from "./src/index";
import { env } from "./src/env";

app.listen(env.PORT);
```

### Why Two Files?

- **`src/index.ts`** exports `app` cleanly — used by `buntok make:docs` (loads it with `BUNTOK_DOCS_BUILD=1`)
- **`server.ts`** is the build entry point — calls `app.listen()` which internally uses `Bun.serve()`
- Both Vercel and non-Vercel use `server.ts` as the build entry point

### `app.fetch()`

For Vercel serverless functions, `app.fetch()` processes requests without binding a port:

```ts
// What Vercel calls internally:
const response = await app.fetch(request);
```

`app.fetch(input, init?)` delegates to `app.request()` which handles lazy AOT compilation automatically. No need to call it yourself — Vercel does it.

### `app.request()` vs `app.fetch()`

| Method | Use Case | Binds Port |
|--------|----------|------------|
| `app.listen(port)` | Local development | Yes |
| `app.fetch(request)` | Vercel/serverless | No |
| `app.request(input, init?)` | Testing | No |

### vercel.json

Generated by `buntok init` when Vercel is selected:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "bunVersion": "1.4.x",
  "buildCommand": null
}
```

- `buildCommand: null` — overrides package.json build script. Vercel skips build and transpiles TS on-the-fly
- `bunVersion: "1.4.x"` — pins the Bun runtime version

### Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy (preview)
vercel

# Production deploy
vercel --prod
```

### Local Development

```bash
bun run dev   # runs: bun --watch server.ts
```

The `dev` script runs `server.ts` which calls `app.listen()` — this is separate from the Vercel entry point.

### Project Structure

```
my-app/
├── src/
│   ├── index.ts      # export default app (clean — no listen)
│   ├── env.ts        # App.validateEnv({ PORT, ... })
│   ├── controllers/
│   ├── services/
│   └── repositories/
├── server.ts         # build entry point — app.listen(env.PORT)
├── vercel.json       # Vercel config (optional)
├── package.json      # dev script: bun --watch server.ts
└── ...
```

### Notes

- `server.ts` is the build entry point for all modes (Vercel, Docker, local)
- `src/index.ts` must export `app` — used by `buntok make:docs`
- WebSocket routes may need additional Vercel configuration

---

## Authentication (JWT)

Zero-dependency JWT implementation using WebCrypto (built-in). Supports HMAC-SHA256 with expiration.

```ts
import { JwtService, requireAuth } from "@buntok/core";
```

### JwtService

```ts
const jwt = new JwtService("your-secret-key");

// Sign token (expires in 1 hour)
const token = await jwt.sign({ userId: 1, role: "admin" }, 3600);

// Verify token
const payload = await jwt.verify(token);
// { userId: 1, role: "admin", exp: 1700000000 }
```

### requireAuth Middleware

Extracts and verifies JWT from cookie or Authorization header. Injects payload into `ctx.user`.

```ts
const secret = "your-secret-key";

app.get("/protected", requireAuth(secret), (ctx) => {
  const user = ctx.user as { userId: number; role: string };  // cast required
  return ctx.json({ user });
});
```

**Cookie-based Auth:** Set `AUTH_STORE=cookie` in `.env` (created by `buntok init`) to enable cookie-based authentication. When enabled, `requireAuth` reads JWT from the HttpOnly cookie named in `AUTH_COOKIE`, then falls back to the Authorization header.

```ts
# .env
AUTH_STORE=cookie
AUTH_COOKIE=session

# Login — set HttpOnly cookie
app.post("/login", async (ctx) => {
  const { email, password } = await ctx.body();
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !await verifyPassword(password, user.password)) {
    return ctx.json({ error: "Invalid credentials" }, 401);
  }

  const token = await jwt.sign({ userId: user.id, role: user.role }, 86400);
  const response = ctx.json({ success: true });
  return setCookie(response, process.env.AUTH_COOKIE!, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 86400,
  });
});

# Logout — clear cookie
app.post("/logout", (ctx) => {
  const response = ctx.json({ success: true });
  return deleteCookie(response, process.env.AUTH_COOKIE!, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
  });
});
```

| Env Variable | Default | Description |
|--------------|---------|-------------|
| `AUTH_STORE` | `header` | Where to read JWT: `header` or `cookie` |
| `AUTH_COOKIE` | `session` | Cookie name (only used when `AUTH_STORE=cookie`) |

**Note:** `ctx.user` is typed as `Record<string, unknown>`. Cast it to your JWT payload shape.

**Error responses:**
- 401 `{ error: "Unauthorized", message: "Missing or invalid authentication token" }`
- 401 `{ error: "Unauthorized", message: "Token is invalid or expired" }`

---

## OAuth Social Login

Built-in OAuth 2.0 support for Google, GitHub, and Apple with PKCE and automatic state management.

```ts
import { createOAuth, storeOAuthState, verifyOAuthState, getCodeVerifier, clearOAuthCookies } from "@buntok/core";
// Advanced types/helpers (optional — import only if needed):
// import type { OAuthProvider, OAuthProviderConfig, AppleProviderConfig, OAuth2Tokens, OAuthUser, CreateAuthorizationURLOptions, ValidateAuthorizationCodeOptions } from "@buntok/core";
// import { BaseOAuthProvider, AppleProvider, GoogleProvider, GitHubProvider, OAuthError, generatePKCE, decodeIdToken, generateCodeVerifier, generateCodeChallenge, createOAuth2AuthorizationURL, validateOAuth2AuthorizationCode } from "@buntok/core";
// OAuthProviderConfig { clientId, clientSecret, redirectURI, scopes?: string[] }
// AppleProviderConfig extends OAuthProviderConfig { teamId, keyId, privateKey }
// OAuthProvider { id, createAuthorizationURL(state, codeVerifier), validateAuthorizationCode(code, redirectURI, codeVerifier?), getUserInfo(tokens) }
// OAuth2Tokens { accessToken, refreshToken?, idToken?, expiresAt?, tokenType?, scope? }
// OAuthError { code, provider } — subclasses: OAuthStateError("STATE_MISMATCH"), OAuthTokenError("TOKEN_ERROR"), OAuthProviderError("PROVIDER_ERROR", providerError?, providerErrorDescription?)
// Helpers: generatePKCE() => { verifier, challenge, challengeMethod }, decodeIdToken(idToken) => Record<string,unknown>, generateCodeVerifier(), generateCodeChallenge(verifier)
```

### Built-in Providers

| Provider | Type | PKCE | User ID |
|----------|------|------|---------|
| Google | OIDC | ✅ | `sub` |
| GitHub | OAuth2 | ❌ | `id` |
| Apple | OIDC | ✅ | `sub` |

### Quick Start

```ts
const google = createOAuth.google({
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  redirectURI: "http://localhost:1212/auth/google/callback",
});

// Start flow — framework handles state/cookie
app.get("/auth/google", async (ctx) => {
  const state = crypto.randomUUID();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const url = google.createAuthorizationURL(state, codeVerifier);

  let response = ctx.redirect(url);
  response = storeOAuthState(response, state, codeVerifier);
  return response;
});

// Callback — cookies cleaned up automatically
app.get("/auth/google/callback", async (ctx) => {
  const code = ctx.query.code!;
  const state = ctx.query.state!;

  if (!verifyOAuthState(ctx.request, state)) {
    return ctx.json({ error: "Invalid state" }, 400);
  }

  const codeVerifier = getCodeVerifier(ctx.request)!;
  const tokens = await google.validateAuthorizationCode(code, ctx.request.url, codeVerifier);
  const user = await google.getUserInfo(tokens);

  let response = ctx.json({ user });
  response = clearOAuthCookies(response);
  return response;
});
```

### Provider Setup

**Google:** Create OAuth 2.0 Client ID at [Google Cloud Console](https://console.cloud.google.com/apis/credentials). Add redirect URI.

**GitHub:** Create OAuth App at [GitHub Developer Settings](https://github.com/settings/developers). Set callback URL. Use `user:email` scope for email.

**Apple:** Create App ID + Services ID + Key at [Apple Developer Console](https://developer.apple.com). Apple requires JWT-based client secret (private key + team ID + key ID). Name is only sent on FIRST auth.

### Custom Providers

```ts
import { createOAuth2AuthorizationURL, validateOAuth2AuthorizationCode } from "@buntok/core";

// Use generic helpers for any OAuth2 provider
const url = createOAuth2AuthorizationURL("https://provider.com/authorize", {
  clientId: "...", redirectURI: "...", scopes: [...], state, codeChallenge,
});

const tokens = await validateOAuth2AuthorizationCode({
  code, redirectURI: "...", clientId: "...", clientSecret: "...", codeVerifier, tokenEndpoint: "https://provider.com/token",
});
```

### User Info

```ts
interface OAuthUser {
  id: string;           // Unique identifier (sub claim) — always use this
  name?: string;
  email?: string;
  emailVerified?: boolean;
  image?: string;
  [key: string]: unknown;  // Provider-specific fields
}
```

### Error Classes

| Error | Cause |
|-------|-------|
| `OAuthStateError` | State mismatch — CSRF attack |
| `OAuthTokenError` | Token exchange failed |
| `OAuthProviderError` | Provider returned error |

---

## RBAC (Role-Based Access Control)

```ts
import { requireRole, requirePermission } from "@buntok/core";
```

> **⚠️ KEY DIFFERENCE:** `requireRole` uses **OR** logic (user needs ANY of the specified roles). `requirePermission` uses **AND** logic (user needs ALL of the specified permissions). Mixing them up is a common security mistake.

### requireRole

Requires user to have at least one of the specified roles. Must be used AFTER `requireAuth`.

```ts
// With middleware chain
app.get("/admin", requireAuth(secret), requireRole("admin"), adminHandler);

// Multiple roles (OR logic - any match)
app.get("/mod", requireAuth(secret), requireRole("admin", "moderator"), modHandler);

// Custom resolver (for different JWT payload structures)
app.get("/admin", requireAuth(secret), requireRole({
  roles: ["admin"],
  resolver: (user) => user.claims.roles,
}), adminHandler);

// Custom error message
app.get("/admin", requireAuth(secret), requireRole({
  roles: ["superadmin"],
  message: "Hanya superadmin yang boleh akses",
}), adminHandler);
```

### Decorator Usage

```ts
// Stage 3: evaluated top→bottom, applied bottom→top (via unshift)
// @Use(requireAuth) di ATAS agar run pertama (auth sebelum role)

@Get("/admin")
@Use(requireAuth(secret))    // ← evaluated 2nd, applied 3rd → run 1st
@Use(requireRole("admin"))   // ← evaluated 3rd, applied 2nd → run 2nd
async getAdmin(ctx: Context) {
  const user = ctx.user as { userId: number; role: string };
  return ctx.json({ admin: true });
}
```

**Auto-detection:** Looks for `user.role` (string) or `user.roles` (string[]) by default.

### requirePermission

Requires user to have ALL specified permissions.

```ts
// Require ALL permissions
app.delete("/users/:id",
  requireAuth(secret),
  requirePermission("users:delete"),
  deleteUser
);

// Multiple permissions
app.post("/posts",
  requireAuth(secret),
  requirePermission("posts:create", "posts:publish"),
  createPost
);

// Custom resolver
app.delete("/users/:id",
  requireAuth(secret),
  requirePermission({
    permissions: ["posts:edit", "posts:delete"],
    resolver: (user) => user.scope,
  }),
  deleteUser
);
```

### Decorator Usage

```ts
// Stage 3: evaluated top→bottom, applied bottom→top — ATAS run duluan

@Delete("/users/:id")
@Use(requireAuth(secret))                        // ← evaluated 2nd, applied 3rd → run 1st
@Use(requirePermission("users:delete"))          // ← evaluated 3rd, applied 2nd → run 2nd
async deleteUser(ctx: Context) {
  // ...
}

// Multiple permissions (harus semua) — auth tetap di ATAS
@Post("/posts")
@Use(requireAuth(secret))
@Use(requirePermission("posts:create", "posts:publish"))
async createPost(ctx: Context) {
  // ...
}
```

**Difference from requireRole:**
| | `requireRole` | `requirePermission` |
|--|---------------|---------------------|
| Logic | **OR** (salah satu cukup) | **AND** (harus semua) |
| Default field | `user.role` / `user.roles` | `user.permissions` |

**Error responses:**
- 401 `{ success: false, message: "Authentication required" }`
- 403 `{ success: false, error: "Forbidden", message: "Requires one of: admin, moderator" }`
- 403 `{ success: false, error: "Forbidden", message: "Missing permissions: users:delete" }`

---

## Event Emitter

```ts
import { emitter, EventEmitter } from "@buntok/core";
import type { AppEvents } from "@buntok/core";  // type-only export
```

### Basic Usage

```ts
// Listen to events
emitter.on("user:created", (user) => {
  console.log("New user:", user);
});

// Emit events
await emitter.emit("user:created", { id: 1, name: "John" });

// Once listener
emitter.once("user:deleted", (user) => {
  console.log("User deleted:", user);
});

// Remove listener
emitter.off("user:created", listener);

// Check listener count
const count = emitter.listenerCount("user:created");

// Get all event names
const names = emitter.eventNames();
```

### Error Isolation

```ts
await emitter.emit("user:created", { user }, {
  isolatedErrors: true,
  onError: (event, error) => console.error(event, error),
});
```

### Serial Execution

```ts
await emitter.emitSerial("order:placed", { order }, {
  isolatedErrors: true,
});
```

### Max Listeners

```ts
const emitter = new EventEmitter({ maxListeners: 10 });
emitter.increaseMaxListeners(20);
```

### Custom Events

```ts
// Define event types
interface AppEvents {
  "user:created": { id: number; name: string };
  "user:deleted": { id: number };
  "order:placed": { orderId: string; total: number };
}

// Typed emitter
const emitter = new EventEmitter<AppEvents>();
```

---

## Cache

In-memory cache with LRU eviction. Zero dependencies.

```ts
import { Cache, MemoryCacheDriver, type CacheDriver } from "@buntok/core";
```

`CacheDriver {get(key), set(key,value,ttl?), delete(key), clear(), keys?()}` — `Cache` uses `MemoryCacheDriver` (LRU) by default.

> **⚠️ `keys?()` is optional.** Not all custom drivers implement it. If you call `cache.keys()` on a driver that doesn't implement `keys`, it will return an empty array. The `deletePattern` method also depends on `keys()` being available.

### Usage

```ts
const cache = new Cache(new MemoryCacheDriver()); // or new Cache(customDriver)

// Set with TTL (seconds)
await cache.set("user:1", { id: 1, name: "John" }, 300);

// Get
const user = await cache.get("user:1");

// Check existence
if (await cache.has("user:1")) { ... }

// Cache-aside pattern
const data = await cache.getOrSet("key", () => expensiveQuery(), 300);

// Atomic counter
await cache.increment("page:views", 1, 3600);
await cache.decrement("counter", 1);

// Batch operations
await cache.mset([["a", 1], ["b", 2]], 300);
const [a, b] = await cache.mget(["a", "b"]);

// Pattern delete
await cache.deletePattern("session:*");

// List keys
const keys = await cache.keys();
```

### Custom Driver

```ts
import type { CacheDriver } from "@buntok/core";

class RedisCacheDriver implements CacheDriver {
  async get(key: string) { ... }
  async set(key: string, value: any, ttl?: number) { ... }
  async delete(key: string) { ... }
  async clear() { ... }
}
```

---

## Payment

Pluggable payment gateway integration supporting Stripe, Midtrans, Xendit, and PayPal. All providers share a unified `PaymentDriver` interface with normalized types.

```ts
import { createPayment } from "@buntok/core";

const stripe = createPayment.stripe({
  secretKey: process.env.STRIPE_SECRET_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
});
```

### Drivers

| Driver | Config | Notes |
|--------|--------|-------|
| `createPayment.stripe(config)` | `StripeDriverConfig` | Stripe Checkout Sessions, PaymentIntents, Refunds, Subscriptions, Payment Links |
| `createPayment.midtrans(config)` | `MidtransDriverConfig` | Midtrans Snap + REST API, VA/retail/OTC payments |
| `createPayment.xendit(config)` | `XenditDriverConfig` | Xendit Payment Requests, e-wallets, VA, retail |
| `createPayment.paypal(config)` | `PayPalDriverConfig` | PayPal Orders + Billing, OAuth2 token management |

### Checkout

```ts
const result = await stripe.createCheckout({
  amount: 100000,
  currency: "IDR",
  description: "Order #123",
  customerEmail: "user@example.com",
  successUrl: "https://myapp.com/success",
  cancelUrl: "https://myapp.com/cancel",
}, {
  idempotencyKey: "order-123",
});

// result.checkoutUrl → redirect customer
// result.status → "pending" | "processing" | "completed" | "failed" | ...
```

### Refund

```ts
const refund = await stripe.createRefund({
  paymentId: "pi_xxx",
  amount: 50000,      // partial refund (omit for full)
  reason: "customer_request",
});
```

### Subscription

```ts
const sub = await stripe.createSubscription({
  planId: "price_xxx",
  customerEmail: "user@example.com",
  trialPeriodDays: 14,
});

// Cancel
await stripe.cancelSubscription(sub.id);
```

### Payment Link

```ts
const link = await stripe.createPaymentLink({
  amount: 100000,
  currency: "IDR",
  description: "One-time payment",
});
// link.url → share with customer
```

### Webhooks

```ts
import { paymentWebhook } from "@buntok/core";

app.post("/webhooks/stripe",
  paymentWebhook({
    driver: stripe,
    secret: process.env.STRIPE_WEBHOOK_SECRET!,
  }),
  (ctx) => {
    const event = ctx.store.paymentEvent;
    // event.type → "payment.completed" | "payment.failed" | ...
    return ctx.json({ received: true });
  }
);
```

Default signature headers per provider:
- Stripe: `stripe-signature`
- Midtrans: `x-signature`
- Xendit: `x-callback-token`
- PayPal: `paypal-transmission-sig`

### Error Handling

```ts
import {
  PaymentError,              // base class (extends HttpError)
  PaymentProviderError,      // 502 — provider API error
  PaymentVerificationError,  // 400 — webhook signature mismatch
  PaymentIdempotencyError,   // 409 — idempotency key reuse
  PaymentConfigurationError, // 500 — invalid driver config
} from "@buntok/core";
```

---

## Mailer

Email sending with built-in support for Resend, SendGrid, and Mailgun (zero-deps HTTP). SMTP via optional `nodemailer` import. Supports attachments, CC/BCC, reply-to, and inline images.

```ts
import { Mailer } from "@buntok/core";
// Types (optional — for type-checking only):
// MailerConfig { provider: "resend"|"sendgrid"|"mailgun"|"smtp", apiKey?: string, domain?: string (mailgun), smtp?: { host, port, secure?, auth:{user,pass} } }
// MailOptions { from: string, to: string|string[], cc?: string|string[], bcc?: string|string[], replyTo?: string|string[], subject: string, text?: string, html?: string, attachments?: MailAttachment[] }
// MailAttachment { filename: string, content?: Buffer|string (base64), path?: string (remote URL — Resend only), contentType?: string, cid?: string }
```

### Providers

| Provider | Requires | Notes |
|----------|----------|-------|
| resend | apiKey | Zero-deps, HTTP-based |
| sendgrid | apiKey | Zero-deps, HTTP-based |
| mailgun | apiKey + domain | Zero-deps, HTTP-based |
| smtp | smtp config | **⚠️ Requires `bun add nodemailer`** — will throw if not installed |

### Basic Usage

```ts
// Resend
const mailer = new Mailer({
  provider: "resend",
  apiKey: process.env.RESEND_API_KEY,
});

await mailer.send({
  from: "noreply@example.com",
  to: "user@example.com",
  subject: "Welcome!",
  html: "<h1>Hello!</h1>",
});

// SMTP
const mailer = new Mailer({
  provider: "smtp",
  smtp: {
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  },
});
```

### CC & BCC

```ts
await mailer.send({
  from: "noreply@example.com",
  to: "user@example.com",
  cc: "manager@example.com",
  bcc: ["audit@example.com", "logs@example.com"],
  subject: "Invoice #123",
  html: "<p>See attached invoice</p>",
});
```

### Reply-To

```ts
await mailer.send({
  from: "noreply@example.com",
  replyTo: "support@example.com",
  to: "user@example.com",
  subject: "Your account",
  html: "<p>Reply to our support team</p>",
});
```

### Attachments

```ts
import { readFileSync } from "fs";

const pdfBuffer = readFileSync("./invoice.pdf");

await mailer.send({
  from: "noreply@example.com",
  to: "user@example.com",
  subject: "Your Invoice",
  html: "<p>See attached invoice</p>",
  attachments: [
    {
      filename: "invoice.pdf",
      content: pdfBuffer,
      contentType: "application/pdf",
    },
  ],
});
```

### Inline Images (CID)

Embed images directly in HTML using Content-ID:

```ts
const logoBase64 = readFileSync("./logo.png").toString("base64");

await mailer.send({
  from: "noreply@example.com",
  to: "user@example.com",
  subject: "Welcome!",
  html: `
    <h1>Welcome!</h1>
    <img src="cid:company-logo" alt="Logo" />
  `,
  attachments: [
    {
      filename: "logo.png",
      content: logoBase64,
      contentType: "image/png",
      cid: "company-logo",  // Matches cid: in HTML
    },
  ],
});
```

---

## GraphQL

BunTok supports GraphQL via Apollo Server and Yoga plugins. Both lazy-import peer dependencies — zero startup cost if not used.

### Apollo Server

```ts
import { apolloPlugin } from "@buntok/core/plugins/graphql/apollo";

app.plugin(apolloPlugin({
  typeDefs: `type Query { hello: String }`,
  resolvers: { Query: { hello: () => "Hello from Apollo!" } },
}));
```

### GraphQL Yoga

```ts
import { yogaPlugin } from "@buntok/core/plugins/graphql/yoga";

app.plugin(yogaPlugin({
  typeDefs: `type Query { hello: String }`,
  resolvers: { Query: { hello: () => "Hello from Yoga!" } },
}));
```

### Options

| Option | Apollo | Yoga | Description |
|--------|--------|------|-------------|
| `typeDefs` | ✅ | ✅ | GraphQL schema (SDL string or DocumentNode) |
| `resolvers` | ✅ | ✅ | Resolvers object |
| `path` | ✅ | ✅ | Route path (default: `/graphql`) |
| `enablePlayground` / `graphiql` | ✅ | ✅ | IDE in non-production (default: true) |
| `context` | ✅ | — | Build GraphQL context from request |

### Peer Dependencies

```bash
# For Apollo
bun add graphql @apollo/server

# For Yoga
bun add graphql graphql-yoga
```

Both plugins lazy-import these dependencies — no startup cost until plugin is installed.

### Full Example with Yoga

```ts
import { App } from "@buntok/core";
import { yogaPlugin } from "@buntok/core/plugins/graphql/yoga";

const app = new App();

app.plugin(yogaPlugin({
  typeDefs: `
    type Query {
      users: [User]
      user(id: ID!): User
    }
    type User {
      id: ID!
      name: String!
      email: String!
    }
  `,
  resolvers: {
    Query: {
      users: () => db.user.findMany(),
      user: (_, { id }) => db.user.findUnique({ where: { id } }),
    },
  },
}));

app.listen(1212);
```

### Apollo with Context

```ts
app.plugin(apolloPlugin({
  typeDefs,
  resolvers,
  context: async ({ request }) => {
    const token = request.headers.get("Authorization")?.split(" ")[1];
    const user = token ? await verifyToken(token) : null;
    return { user };
  },
}));
```

### Playground

Both plugins enable a GraphQL IDE in development:
- **Apollo**: GraphiQL at `/graphql`
- **Yoga**: GraphiQL at `/graphql`

Disable with `enablePlayground: false` (Apollo) or `graphiql: false` (Yoga).

### Which to Choose?

| | Apollo Server | Yoga |
|---|---|---|
| **Ecosystem** | Larger, more plugins | Smaller, focused |
| **Context** | Built-in context builder | Manual |
| **Performance** | Good | Better (native fetch) |
| **Bundle size** | Larger | Smaller |

Both work well. Yoga is lighter; Apollo has more ecosystem support.

---

## OpenTelemetry

Distributed tracing with per-request spans following HTTP semantic conventions. All telemetry dependencies are lazily imported — zero startup cost until the plugin is installed.

```ts
import { otelPlugin } from "@buntok/core/plugins/opentelemetry";
```

### Quick Start

```ts
app.plugin(otelPlugin({
  serviceName: "my-api",
  exporter: "console",  // logs traces to console
}));
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `serviceName` | `string` | — | **Required.** Service name for trace identification |
| `serviceVersion` | `string` | — | Service version |
| `exporter` | `"console" \| "otlp"` | `"console"` | Trace exporter |
| `otlpEndpoint` | `string` | `"http://localhost:4318"` | OTLP endpoint URL (only for `"otlp"`) |
| `sampler` | `"alwaysOn" \| "alwaysOff" \| "traceIdRatioBased"` | `"alwaysOn"` | Sampling strategy |
| `sampleRate` | `number` | `1` | Sample ratio (0-1), only for `"traceIdRatioBased"` |

### What It Does

1. **Initializes** OpenTelemetry SDK with your service name
2. **Registers global middleware** that creates a span per request
3. **Records HTTP semantic attributes**:
   - `http.request.method` (GET, POST, etc.)
   - `url.full` (full request URL)
   - `http.response.status_code` (200, 404, etc.)
4. **Sets span status** OK/Error based on response status (2xx = OK, 4xx/5xx = ERROR)
5. **Records exceptions** on error (stack trace captured)
6. **Graceful shutdown** on `SIGTERM`/`SIGINT` — flushes remaining spans

### Dependency

```bash
bun add @opentelemetry/api
```

Peer dependency — lazy imported, no startup cost until plugin is installed.

### OTLP Exporter (Production)

For production, send traces to a collector (Jaeger, Grafana Tempo, Honeycomb, etc.):

```ts
app.plugin(otelPlugin({
  serviceName: "my-api",
  exporter: "otlp",
  otlpEndpoint: "http://localhost:4318",
  sampler: "traceIdRatioBased",
  sampleRate: 0.1,  // sample 10% of requests
}));
```

### Console Exporter (Development)

Logs traces to console — useful for debugging:

```ts
app.plugin(otelPlugin({
  serviceName: "my-api",
  exporter: "console",
}));
```

### Sampling Strategies

| Strategy | Description | Use Case |
|----------|-------------|----------|
| `"alwaysOn"` | Record all requests | Development, low traffic |
| `"alwaysOff"` | Record no requests | Disable tracing |
| `"traceIdRatioBased"` | Sample `sampleRate` % of requests | Production (reduce overhead) |

### Span Lifecycle

```
Request arrives
  → span starts (method, url)
  → handler runs
  → response sent
  → span ends (status code, duration)
  → span exported to collector
```

### What Gets Traced

- Every HTTP request to any route
- Request method and URL
- Response status code
- Duration (start → end)
- Errors and exceptions

---

## Template Engine

Handlebars-like template engine with zero dependencies. Perfect for email templates.

```ts
import { render, TemplateEngine } from "@buntok/core";
```

> **⚠️ Strict mode is ON by default.** If you reference a variable that doesn't exist in the context (e.g., `{{ usre.name }}` instead of `{{ user.name }}`), the template will throw an error with a "did you mean?" suggestion. To disable strict mode, pass `{ strict: false }` as the third argument to `render()` or set it in `TemplateEngine` constructor options.

### Types

```ts
// Types (optional — for type-checking only):
// TemplateOptions { strict?: boolean (default true), escapeHtml?: boolean (default true), onMissing?: (path, availableKeys) => void }
// HelperFn = (...args: unknown[]) => string
// Methods: engine.registerHelper(name, fn), engine.registerPartial(name, template), engine.compile(template) => (ctx)=>string
// Tokens: {{ var }}, {{{ unescaped }}}, {{#if cond}}...{{else}}...{{/if}}, {{#unless}}...{{/unless}}, {{#each items}}...{{/each}}, {{> partial}}, {{! comment }}
```

### Basic Usage

```ts
const html = render("Hello {{ name }}!", { name: "World" });
// → "Hello World!"
```

### Variables

```ts
render("{{ user.email }}", { user: { email: "budi@example.com" } });
// → "budi@example.com"
```

### Raw HTML (Triple Braces)

```ts
render("{{{ html }}}", { html: "<b>bold</b>" });
// → "<b>bold</b>" (not escaped)
```

### Conditionals

```ts
render("{{#if active}}Yes{{else}}No{{/if}}", { active: false });
// → "No"

render("{{#unless verified}}Please verify{{/unless}}", { verified: false });
// → "Please verify"
```

### Loops

```ts
render("{{#each items}}{{name}} {{/each}}", {
  items: [{ name: "A" }, { name: "B" }],
});
// → "A B "
```

Special variables: `@index`, `@first`, `@last`

### Partials & Helpers

```ts
const engine = new TemplateEngine();
engine.registerPartial("header", "<h1>{{ title }}</h1>");
engine.registerHelper("formatDate", (d) => new Date(d).toLocaleDateString());

const html = engine.render("{{> header }}<p>{{ formatDate date }}</p>", {
  title: "Welcome",
  date: "2024-01-15",
});
```

### Strict Mode (Typo Detection)

```ts
render("Hello {{ usre.name }}", { user: { name: "Budi" } });
// → Error: Variable 'usre.name' not found.
//   Available keys: user
//   Did you mean: 'user.name'?
```

---

## Queue

Background job processing with pluggable drivers. Supports Memory, Redis (ioredis), Bun native Redis, BullMQ, and RabbitMQ.

```ts
import { Queue } from "@buntok/core";
```

> **⚠️ `name` is the first argument and is REQUIRED.** Each queue must have a unique name (e.g., `"email"`, `"notifications"`). This name is used for logging, debugging, and driver isolation.

### Drivers

| Driver | Package | Import |
|--------|---------|--------|
| **Memory** | built-in | `new Queue("email")` |
| **Redis** | `ioredis` | `{ driver: "redis", url: "..." }` |
| **Bun Redis** | `bun` (native) | `{ driver: "bun-redis", url: "..." }` |
| **BullMQ** | `bullmq` | `{ driver: "bullmq", connection: {...} }` |
| **RabbitMQ** | `amqplib` | `{ driver: "rabbitmq", url: "..." }` |

### Usage

```ts
// Memory driver (default — development)
const queue = new Queue<{ to: string; subject: string }>("email");

// Redis (ioredis) — production recommended
const queue = new Queue<EmailJob>("email", {
  driver: "redis",
  url: "redis://localhost:6379",
  maxRetries: 3,
  retryDelay: 1000,
  backoff: "exponential",
});

// Bun native Redis — zero dependencies on Bun >= 1.3
const queue = new Queue<EmailJob>("email", {
  driver: "bun-redis",
  url: "redis://localhost:6379",
});

// BullMQ — enterprise features (rate limiting, job scheduling)
const queue = new Queue<EmailJob>("email", {
  driver: "bullmq",
  connection: { host: "localhost", port: 6379 },
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: { age: 86400 },
    removeOnFail: { age: 604800 },
  },
});

// RabbitMQ — fan-out, multi-language workers
const queue = new Queue<EmailJob>("email", {
  driver: "rabbitmq",
  url: "amqp://guest:guest@localhost:5672",
  prefetch: 1,
  maxRetries: 3,
});
```

### Process Jobs

```ts
// Handler receives full Job<T> object
queue.process(async (job) => {
  console.log(`Attempt ${job.attempt + 1} for ${job.id}`);
  await sendEmail(job.data.to, job.data.subject);
});

// Add jobs
await queue.add({ to: "user@example.com", subject: "Welcome" });

// With delay (ms) and priority (higher = sooner)
await queue.add({ to: "user@example.com", subject: "Welcome" }, {
  delay: 5000,
  priority: 10,
});

// Introspect
queue.size();   // pending count
queue.clear();  // remove all pending
```

### Custom Driver

```ts
import type { QueueDriver, Job, JobHandler } from "@buntok/core";

class MyCustomDriver implements QueueDriver<{ to: string }> {
  async add(data: { to: string }, opts?: { priority?: number; delay?: number }): Promise<void> { ... }
  process(handler: JobHandler<{ to: string }>): void { ... }
  size(): number { return 0; }
  clear(): void {}
}

const queue = new Queue("email", new MyCustomDriver());
```

---

## Scheduler / CronJob

Cron-based task scheduling with pluggable drivers. `CronJob` is a **method decorator** (uses `context.addInitializer` so `this` is bound to instance).

```ts
import { Scheduler, CronJob, MemorySchedulerDriver, BunCronSchedulerDriver, setDefaultSchedulerDriver } from "@buntok/core";
```

### Scheduler (programmatic)

```ts
const scheduler = new Scheduler(new MemorySchedulerDriver());
// or Bun native (survives restarts, requires Bun >=1.3.11):
const scheduler2 = new Scheduler(new BunCronSchedulerDriver());

// Schedule — returns Cron job handle
const job = scheduler.schedule("0 2 * * *", async () => {
  await cleanupOldFiles();
}, { timezone: "Asia/Jakarta" }); // options passed to croner / Bun.cron

// Stop all jobs
scheduler.stopAll();

// Change default driver for @CronJob decorator
setDefaultSchedulerDriver(new BunCronSchedulerDriver());
```

`SchedulerDriver {schedule(pattern, handler, options?): unknown, stopAll(): void}`. `Scheduler.schedule(pattern, handler, options?)`, `Scheduler.stopAll()`.

### CronJob Decorator

```ts
import { Controller, CronJob } from "@buntok/core";

@Controller("/tasks")
export class TaskController {
  constructor(private readonly cache: Cache) {}

  @CronJob("0 0 * * *") // daily midnight
  async dailyCleanup() {
    // `this` is TaskController instance — injected services work
    await this.cache.deletePattern("tmp:*");
  }

  @CronJob("*/5 * * * *", { timezone: "Asia/Jakarta" })
  async everyFiveMinutes() {
    console.log("tick");
  }
}
// Decorator schedules when class is instantiated (e.g. app.registerController(new TaskController()))
```

> **⚠️ `@CronJob` schedules when the class is instantiated**, not when the decorator is defined. If you create the class with `new TaskController()` but never call `app.registerController()` or otherwise instantiate it, the cron job will NOT run. The `this` context is bound to the instance via `context.addInitializer`, so injected services work correctly.

---

## Audit Log

Request logging middleware with customizable storage.

```ts
import { auditLog } from "@buntok/core";
```

> **⚠️ Default storage is `logger.info`.** If you call `app.use(auditLog())` without a `storage` function, audit entries are logged via `logger.info()` (which writes to console/file based on your logger config). To persist to a database, provide a custom `storage` function.

### Usage

```ts
// Basic usage
app.use(auditLog());

// With options
app.use(auditLog({
  excludePaths: ["/health", "/ping"],
  excludeMethods: ["OPTIONS"],
  logBody: true,        // default false
  logQuery: true,       // default true
  maxBodySize: 1024,    // truncate body beyond this (default 1024)
  storage: async (entry) => {
    await db.auditLog.create({ data: entry });
  },
}));
```

`AuditLogOptions {storage?, excludePaths?, excludeMethods?, logBody=false, logQuery=true, maxBodySize=1024}`. Storage defaults to `logger.info`.

### AuditLogEntry

```ts
interface AuditLogEntry {
  timestamp: string;
  method: string;
  path: string;
  status: number;
  duration: number;
  ip?: string;
  userId?: string;
  userAgent?: string;
  body?: any;
  query?: any;
  error?: string;
}
```

---

## Health Check

> **🚫 DO NOT wrap `healthCheck` with `app.get`.** The `healthCheck()` function registers the route itself. Wrapping it will create duplicate routes or cause unexpected behavior.

```ts
import { healthCheck, createHealthCheck, createDatabaseCheck } from "@buntok/core";

// ✅ CORRECT — registers GET /health automatically
healthCheck(app, {
  path: "/health",            // default "/health"
  includeUptime: true,
  version: "1.0.0",
  checks: {
    database: createDatabaseCheck(async () => {
      await db.$queryRaw`SELECT 1`; // must resolve true/false
    }),
    redis: createHealthCheck(async () => {
      await redis.ping();
    }),
  },
});

// Helpers return () => Promise<HealthStatus>
// createHealthCheck(() => Promise<boolean|void>)
// createDatabaseCheck(() => Promise<boolean|void>)
```

### Response

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "checks": {
    "database": { "status": "healthy", "duration": 12 },
    "redis": { "status": "unhealthy", "error": "Connection refused", "duration": 5000 }
  }
}
```

---

## Timezone Helpers

```ts
import {
  parseTime, formatInTimezone, toTimezoneParts,
  toISOWithTimezone, nowInTimezone, getTimezoneOffset,
  getTimezoneOffsetString, isValidTimezone,
  groupByTimezone, getGroupLabels, formatGroupLabel,
} from "@buntok/core";
```

### parseTime

Parse time string in any timezone:

```ts
const date = parseTime("14:30", "Asia/Jakarta");
const date2 = parseTime("2024-01-15 14:30", "America/New_York");
```

### formatInTimezone

Format date in specific timezone:

```ts
const formatted = formatInTimezone(new Date(), "Asia/Jakarta", "HH:mm:ss");
// "17:30:00" (if current time in Jakarta is 17:30)
```

### toTimezoneParts

Get date parts in timezone:

```ts
const parts = toTimezoneParts(new Date(), "Asia/Jakarta");
// { year: 2024, month: 1, day: 15, hour: 17, minute: 30, second: 0 }
```

### nowInTimezone

Get current time in timezone:

```ts
const now = nowInTimezone("Asia/Jakarta");
```

### getTimezoneOffset

Get offset in minutes. **Negative = ahead of UTC** (e.g., UTC+7 = -420 minutes).

```ts
const offset = getTimezoneOffset("Asia/Jakarta");  // -420 (UTC+7 means 7 hours AHEAD of UTC)
const offsetStr = getTimezoneOffsetString("Asia/Jakarta"); // "+07:00"
```

### isValidTimezone

```ts
isValidTimezone("Asia/Jakarta");  // true
isValidTimezone("Invalid/Zone");  // false
```

### groupByTimezone

Group items by timezone + date part:

```ts
// Types (optional): GroupByKey = "hour"|"day"|"month"|"year", GroupByTimezoneOptions { locale?, labelFormatter? }
// groupByTimezone<T>(items: T[], dateField: keyof T, timezone: string, groupBy: GroupByKey="day", options?: GroupByTimezoneOptions)

const grouped = groupByTimezone(orders, "createdAt", "Asia/Jakarta", "day");
// Map<string, Order[]>  e.g. "2024-01-15" → [orders]

const groupedByHour = groupByTimezone(events, "timestamp", "America/New_York", "hour");

const labels = getGroupLabels("day"); // ["2024-01-15", ...]
formatGroupLabel("2024-01-15", "day", "Asia/Jakarta"); // "15 Jan 2024"
toISOWithTimezone(new Date(), "Asia/Jakarta"); // "2024-01-15T17:30:00+07:00"
```

---

## FFI / Native

Bun native FFI integration for calling native libraries.

```ts
import { getBackend, isNativeAvailable } from "@buntok/core";
```

### Usage

```ts
if (isNativeAvailable()) {
  const backend = getBackend();
  // Use native backend for better performance
} else {
  // Fallback to JavaScript implementation
}
```

---

## AI Module

Built-in AI integration with caching and Vercel AI SDK Data Stream compatibility.

```ts
import { streamAI, AICache, injectSystemPrompt } from "@buntok/core";
```

### streamAI

Transforms an `AsyncIterable` (OpenAI/Anthropic stream) into a `Response` with `text/x-unknown` + `x-vercel-ai-data-stream: v1` (protocol `0:"text"`, `d:{"finishReason":"stop"}`, `e:{"message"}`).

```ts
import { streamAI } from "@buntok/core";

// ctx is required (first arg) — streamAI returns a Response directly, no ctx.sse needed
app.post("/chat", async (ctx) => {
  const openaiStream = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: "Hello" }],
    stream: true,
  });

  return streamAI(ctx, openaiStream, {
    onCompletion: async (fullText) => {
      console.log("Completed:", fullText);
    },
  });
});
// streamAI(ctx, AsyncIterable<any>, {onCompletion?: (fullText:string)=>void}) => Response
```

Supports chunk shapes: `chunk.choices[0].delta.content`, `chunk.message.content`, or plain `string`.

> **⚠️ If your AI provider uses a different chunk shape**, the stream will still work but content extraction may fail silently (empty chunks). Check your provider's stream format and ensure the chunk has a `content` string somewhere in the response delta.

### AICache

Semantic cache for exact conversation matches (hashes last 3 user/assistant messages via 32-bit hash — not cryptographic). Requires a `CacheDriver`.

```ts
import { AICache, MemoryCacheDriver } from "@buntok/core";

const cache = new AICache(new MemoryCacheDriver());

const cached = await cache.get(messages);
if (cached) return cached;

const response = await generateAI(messages);
await cache.set(messages, response, 3600);  // TTL seconds (default: 3600)
```

### injectSystemPrompt

Strips existing `system` roles (prevents injection) and prepends the system prompt:

```ts
// injectSystemPrompt(messages, systemPrompt) — messages first!
const messages = injectSystemPrompt(userMessages, "You are a helpful assistant.");
// → [{role:"system", content:"..."}, ...userMessages.filter(m=>m.role!=="system")]
```
