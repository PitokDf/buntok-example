import {
	type Context,
	Controller,
	delay,
	Get,
	getMetadata,
	HttpCode,
	Post,
	Public,
	Redirect,
	SetHeader,
	SetMetadata,
	setCookie,
	Use,
	UseGuard,
	Version,
} from "@buntok/core";
import { traceMiddleware } from "@/middlewares/demos";

@Controller("")
export class CoreController {
	@Get("/")
	home() {
		return { message: "Hello from Buntok!", docs: "/docs", catalog: "README.md" };
	}

	@Get("/ping")
	ping() {
		return "pong";
	}

	@Get("/version")
	version() {
		return new Response("v2", { status: 200 });
	}

	@Get("/hello")
	hello(ctx: Context) {
		return `Hello, ${ctx.query.name ?? "world"}!`;
	}

	@Get("/json")
	json() {
		return { hello: "buntok" };
	}

	@Get("/number")
	number() {
		return 42;
	}

	@Get("/empty")
	empty() {
		return null;
	}

	@Get("/users/:id")
	userById(ctx: Context) {
		return ctx.params;
	}

	@Get("/wildcard/*")
	wildcard(ctx: Context) {
		return `Wildcard value: ${ctx.params["*"]}`;
	}

	@Get("/context")
	context(ctx: Context) {
		return ctx.json({
			method: ctx.request.method,
			url: ctx.request.url,
			params: ctx.params,
			query: ctx.query,
			ip: ctx.ip,
			store: ctx.store,
		});
	}

	@Get("/redirect")
	@Redirect("/ping", 302)
	redirect() {
		return undefined;
	}

	@Get("/custom-headers")
	@SetHeader("x-demo", "buntok")
	@SetHeader("x-demo-2", "decorator")
	customHeaders() {
		return { ok: true };
	}

	@Get("/versioned")
	@Version("2")
	versioned() {
		return { apiVersion: "2" };
	}

	@Get("/metadata")
	@Public()
	@SetMetadata("tags", ["system", "demo"])
	metadata() {
		return { tags: getMetadata(CoreController, "metadata", "tags") };
	}

	@Get("/guard")
	@UseGuard((ctx) => ctx.request.headers.has("x-guard"))
	guard(ctx: Context) {
		return { message: "Guard passed", header: ctx.request.headers.get("x-guard") };
	}

	@Get("/envelopes/success")
	envelopeSuccess(ctx: Context) {
		return ctx.success({ id: 1, name: "Tok" }, "User created", 201);
	}

	@Get("/envelopes/error")
	envelopeError(ctx: Context) {
		return ctx.error("Validation failed", 400, [{ field: "email" }]);
	}

	@Get("/envelopes/paginate")
	envelopePaginate(ctx: Context) {
		const page = Number(ctx.query.page ?? 1);
		const limit = Number(ctx.query.limit ?? 5);
		const rows = Array.from({ length: limit }, (_, i) => ({
			id: (page - 1) * limit + i + 1,
		}));
		return ctx.paginate(rows, 42, page, limit);
	}

	@Get("/envelopes/cursor")
	envelopeCursor(ctx: Context) {
		return ctx.cursorPaginate([{ id: 1 }, { id: 2 }], "cursor-next-xyz");
	}

	@Get("/stream")
	stream(ctx: Context) {
		const chunks = (async function* () {
			yield "<h1>Buntok streaming</h1>";
			await delay(100);
			yield "<p>Chunked HTML via ctx.htmlStream()</p>";
		})();
		return ctx.htmlStream(chunks, { headers: { "Content-Type": "text/html; charset=utf-8" } });
	}

	@Post("/echo")
	@HttpCode(201)
	async echo(ctx: Context) {
		return await ctx.body();
	}

	@Get("/cookies/set")
	cookiesSet(ctx: Context) {
		return setCookie(ctx.json({ set: true }), "demo", "tasted", {
			httpOnly: true,
			path: "/",
			maxAge: 3600,
		});
	}

	@Get("/cookies/read")
	cookiesRead(ctx: Context) {
		return { demo: ctx.getCookie("demo") ?? null, all: ctx.getCookies() };
	}

	@Get("/di")
	di(ctx: Context) {
		return { startedAt: ctx.di.startedAt, store: ctx.store };
	}
}

@Controller("/api/v1")
export class ApiController {
	@Get("/status")
	@Use(traceMiddleware("group"))
	status(ctx: Context) {
		return { ok: true, order: ctx.store.order ?? [] };
	}

	@Get("/items/:id")
	@Use(traceMiddleware("group"))
	@Use((ctx, next) => {
		ctx.store.adminGuard = true;
		return next();
	})
	item(ctx: Context) {
		return { id: ctx.params.id, guarded: ctx.store.adminGuard === true, order: ctx.store.order };
	}
}
