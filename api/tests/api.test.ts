import { describe, expect, test } from "bun:test";
import { app } from "../src/index";

const PNG_1PX = Buffer.from(
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
	"base64",
);

describe("core routes", () => {
	test("GET / returns app info", async () => {
		const res = await app.request("/");
		expect(res.status).toBe(200);
		const body = (await res.json()) as { message: string };
		expect(body.message).toContain("Buntok");
	});

	test("GET /ping", async () => {
		const res = await app.request("/ping");
		expect(res.status).toBe(200);
	});

	test("GET /hello?name= passes query", async () => {
		const res = await app.request("/hello?name=Tok");
		expect(res.status).toBe(200);
		const body = (await res.text()) as string;
		expect(body).toContain("Tok");
	});

	test("GET /envelopes/success returns 201 envelope", async () => {
		const res = await app.request("/envelopes/success");
		expect(res.status).toBe(201);
		const body = (await res.json()) as { success: boolean; data: { name: string } };
		expect(body.success).toBe(true);
		expect(body.data.name).toBe("Tok");
	});

	test("GET /envelopes/error returns 400 envelope", async () => {
		const res = await app.request("/envelopes/error");
		expect(res.status).toBe(400);
		const body = (await res.json()) as { success: boolean; message: string };
		expect(body.success).toBe(false);
		expect(body.message).toBe("Validation failed");
	});

	test("GET /envelopes/paginate carries meta", async () => {
		const res = await app.request("/envelopes/paginate?page=2&limit=3");
		expect(res.status).toBe(200);
		const body = (await res.json()) as { meta: { currentPage: number; total: number } };
		expect(body.meta.currentPage).toBe(2);
		expect(body.meta.total).toBe(42);
	});

	test("GET /guard enforces header", async () => {
		const denied = await app.request("/guard");
		expect(denied.status).toBe(403);
		const allowed = await app.request("/guard", { headers: { "x-guard": "1" } });
		expect(allowed.status).toBe(200);
	});

	test("GET /nope returns 404", async () => {
		const res = await app.request("/nope");
		expect(res.status).toBe(404);
	});
});

describe("validation", () => {
	test("POST /validation/users accepts valid body", async () => {
		const res = await app.request("/validation/users", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ name: "Tok", email: "a@b.com" }),
		});
		expect(res.status).toBe(201);
		const body = (await res.json()) as { email: string };
		expect(body.email).toBe("a@b.com");
	});

	test("POST /validation/users rejects invalid body with 422", async () => {
		const res = await app.request("/validation/users", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ name: "", email: "bukan-email" }),
		});
		expect(res.status).toBe(422);
	});

	test("GET /validation/pagination coerces and caps query", async () => {
		const res = await app.request("/validation/pagination?page=2&limit=3");
		expect(res.status).toBe(200);
		const body = (await res.json()) as { page: number; limit: number; offset: number };
		expect(body.page).toBe(2);
		expect(body.offset).toBe(3);

		const bad = await app.request("/validation/pagination?limit=999");
		expect(bad.status).toBe(422);
	});

	test("GET /validation/users/:id validates uuid params", async () => {
		const id = crypto.randomUUID();
		const ok = await app.request(`/validation/users/${id}`);
		expect(ok.status).toBe(200);
		const bad = await app.request("/validation/users/not-a-uuid");
		expect(bad.status).toBe(422);
	});
});

describe("errors", () => {
	const cases: Array<[string, number]> = [
		["/errors/bad-request", 400],
		["/errors/unauthorized", 401],
		["/errors/forbidden", 403],
		["/errors/not-found", 404],
		["/errors/conflict", 409],
		["/errors/unprocessable", 422],
		["/errors/internal", 500],
		["/errors/service-unavailable", 503],
		["/errors/timeout", 504],
	];

	for (const [path, expected] of cases) {
		test(`GET ${path} → ${expected}`, async () => {
			const res = await app.request(path);
			expect(res.status).toBe(expected);
		});
	}

	test("error responses are JSON", async () => {
		const res = await app.request("/errors/not-found");
		expect(res.headers.get("content-type")).toContain("application/json");
		const body = (await res.json()) as { success: boolean; error: string; message: string };
		expect(body.success).toBe(false);
		expect(body.message.length).toBeGreaterThan(0);
	});
});

describe("middleware", () => {
	test("API key gate", async () => {
		const denied = await app.request("/middleware/api-key");
		expect(denied.status).toBe(403);
		const allowed = await app.request("/middleware/api-key", {
			headers: { "x-api-key": "demo-key-123" },
		});
		expect(allowed.status).toBe(200);
	});

	test("timeout middleware aborts slow handler with 504", async () => {
		const res = await app.request("/middleware/slow?ms=1500");
		expect(res.status).toBe(504);
	});

	test("body size limit returns 413", async () => {
		const payload = JSON.stringify({ a: "x".repeat(1_048_576 + 64) });
		const res = await app.request("/middleware/large", {
			method: "POST",
			headers: { "content-type": "application/json", "content-length": String(payload.length) },
			body: payload,
		});
		expect(res.status).toBe(413);
	});
});

describe("auth", () => {
	test("login, me, logout flow", async () => {
		const login = await app.request("/auth/login", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ email: "admin@buntok.test", password: "admin123" }),
		});
		expect(login.status).toBe(200);
		const { token } = (await login.json()) as { token: string };
		expect(token.length).toBeGreaterThan(10);

		const me = await app.request("/auth/me", {
			headers: { Authorization: `Bearer ${token}` },
		});
		expect(me.status).toBe(200);
		const profile = (await me.json()) as { user: { role: string; userId: string } };
		expect(profile.user.role).toBe("admin");
		expect(profile.user.userId).toBe("u1");

		const logout = await app.request("/auth/logout", { method: "POST" });
		expect(logout.status).toBe(200);
	});

	test("wrong password returns 401", async () => {
		const res = await app.request("/auth/login", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ email: "admin@buntok.test", password: "salah" }),
		});
		expect(res.status).toBe(401);
	});

	test("me without token returns 401", async () => {
		const res = await app.request("/auth/me");
		expect(res.status).toBe(401);
	});

	test("role guard separates admin and user", async () => {
		const adminLogin = await app.request("/auth/login", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ email: "admin@buntok.test", password: "admin123" }),
		});
		const adminToken = ((await adminLogin.json()) as { token: string }).token;

		const userLogin = await app.request("/auth/login", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ email: "user@buntok.test", password: "user123" }),
		});
		const userToken = ((await userLogin.json()) as { token: string }).token;

		const adminOnAdmin = await app.request("/auth/admin", {
			headers: { Authorization: `Bearer ${adminToken}` },
		});
		expect(adminOnAdmin.status).toBe(200);

		const adminOnModerator = await app.request("/auth/moderator", {
			headers: { Authorization: `Bearer ${adminToken}` },
		});
		expect(adminOnModerator.status).toBe(200);

		const userOnAdmin = await app.request("/auth/admin", {
			headers: { Authorization: `Bearer ${userToken}` },
		});
		expect(userOnAdmin.status).toBe(403);

		const userOnModerator = await app.request("/auth/moderator", {
			headers: { Authorization: `Bearer ${userToken}` },
		});
		expect(userOnModerator.status).toBe(403);
	});
});

describe("posts (BaseController CRUD)", () => {
	test("create, read, update, delete lifecycle", async () => {
		const created = await app.request("/posts", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ title: "Hello test", body: "isi" }),
		});
		expect(created.status).toBe(201);
		const createdBody = (await created.json()) as { data: { id: number; title: string } };
		expect(createdBody.data.title).toBe("Hello test");
		const post = createdBody.data;

		const read = await app.request(`/posts/${post.id}`);
		expect(read.status).toBe(200);

		const updated = await app.request(`/posts/${post.id}`, {
			method: "PUT",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ title: "Updated test" }),
		});
		expect(updated.status).toBe(200);
		const updatedBody = (await updated.json()) as { data: { title: string } };
		expect(updatedBody.data.title).toBe("Updated test");

		const deleted = await app.request(`/posts/${post.id}`, { method: "DELETE" });
		expect(deleted.status).toBe(204);

		const gone = await app.request(`/posts/${post.id}`);
		expect(gone.status).toBe(404);
	});

	test("GET /posts returns list", async () => {
		const res = await app.request("/posts");
		expect(res.status).toBe(200);
		const body = (await res.json()) as { success: boolean; data: unknown[] };
		expect(body.success).toBe(true);
		expect(Array.isArray(body.data)).toBe(true);
	});

	test("search paginates filtered rows", async () => {
		const res = await app.request("/posts/search?q=Hello&page=1&limit=2");
		expect(res.status).toBe(200);
		const body = (await res.json()) as { data: unknown[]; meta: { currentPage: number } };
		expect(body.meta.currentPage).toBe(1);
		expect(Array.isArray(body.data)).toBe(true);
	});

	test("validated endpoint enforces schema", async () => {
		const bad = await app.request("/posts/validated", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ title: "" }),
		});
		expect(bad.status).toBe(422);
	});
});

describe("resilience", () => {
	test("cache read-through and clear", async () => {
		const first = await app.request("/cache/demo");
		expect(first.status).toBe(200);
		const cleared = await app.request("/cache/clear", { method: "DELETE" });
		expect(cleared.status).toBe(200);
	});

	test("circuit breaker opens after threshold failures", async () => {
		const fire = (query: string) => app.request(`/breaker/fire?${query}`, { method: "POST" });
		expect((await fire("fail=0")).status).toBe(200);
		expect((await fire("fail=1")).status).toBe(500);
		expect((await fire("fail=1")).status).toBe(500);
		expect((await fire("fail=1")).status).toBe(500);
		const open = await fire("fail=0");
		expect(open.status).toBe(503);
		const body = (await open.json()) as { error: string };
		expect(body.error).toBe("CircuitOpen");
		const status = await app.request("/breaker/status");
		expect(status.status).toBe(200);
	});
});

describe("files", () => {
	test("upload accepts PNG avatar", async () => {
		const form = new FormData();
		form.append("avatar", new File([PNG_1PX], "tiny.png", { type: "image/png" }));
		const res = await app.request("/upload", { method: "POST", body: form });
		expect(res.status).toBe(200);
		const body = (await res.json()) as { uploaded: { name: string; path: string }[] };
		expect(body.uploaded[0]?.name.length).toBeGreaterThan(0);
	});

	test("download and export endpoints", async () => {
		expect((await app.request("/files/sample")).status).toBe(200);
		expect((await app.request("/files/download")).status).toBe(200);
		expect((await app.request("/files/export.csv")).status).toBe(200);
		expect((await app.request("/files/archive")).status).toBe(200);
		expect((await app.request("/files/fallback")).status).toBe(404);
	});
});

describe("background jobs", () => {
	test("queue accepts job and reports status", async () => {
		const enqueued = await app.request("/queue/jobs", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ to: "a@b.com", subject: "Hi", body: "Hello" }),
		});
		expect(enqueued.status).toBe(200);
		await new Promise((resolve) => setTimeout(resolve, 300));
		expect((await app.request("/queue/status")).status).toBe(200);
		expect((await app.request("/queue/history")).status).toBe(200);
	});

	test("scheduler, tasks and audit endpoints respond", async () => {
		expect((await app.request("/schedule/status")).status).toBe(200);
		expect((await app.request("/tasks/status")).status).toBe(200);
		expect((await app.request("/audit/recent")).status).toBe(200);
	});
});

describe("helpers and docs", () => {
	test("factory builds deterministic user shapes", async () => {
		const res = await app.request("/factory/users?count=3");
		expect(res.status).toBe(200);
		const body = (await res.json()) as unknown[];
		expect(body.length).toBe(3);
	});

	test("mailer preview renders without provider", async () => {
		const res = await app.request("/mailer/preview");
		expect(res.status).toBe(200);
		const body = (await res.json()) as { html: string; list: string };
		expect(body.html).toContain("<h1>Hello Tok</h1>");
		expect(body.list).toContain("0: alpha");
	});

	test("health and metrics respond", async () => {
		const health = await app.request("/health");
		expect(health.status).toBe(200);
		const body = (await health.json()) as { status: string };
		expect(body.status).toBe("healthy");

		expect((await app.request("/health/live")).status).toBe(200);
		expect((await app.request("/health/ready")).status).toBe(200);

		const metrics = await app.request("/metrics");
		expect(metrics.status).toBe(200);
		expect(await metrics.text()).toContain("buntok_http_requests_total");
	});
});

describe("rate limit", () => {
	test("6th burst request is throttled", async () => {
		const statuses: number[] = [];
		for (let i = 0; i < 6; i++) {
			const res = await app.request("/middleware/rate-limit");
			statuses.push(res.status);
		}
		expect(statuses.slice(0, 5)).toEqual([200, 200, 200, 200, 200]);
		expect(statuses[5]).toBe(429);
	});
});
