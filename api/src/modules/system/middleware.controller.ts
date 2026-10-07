import {
	bodySizeLimit,
	type Context,
	Controller,
	delay,
	Get,
	Post,
	rateLimiter,
	timeout,
	Use,
} from "@buntok/core";
import { DEMO_API_KEY, requireApiKey, traceMiddleware } from "@/middlewares/demos";

@Controller("/middleware")
export class MiddlewareController {
	@Get("/rate-limit")
	@Use(rateLimiter({ max: 5, windowMs: 10_000, headers: true }))
	rateLimit(ctx: Context) {
		return { ok: true, ip: ctx.ip, note: "max 5 requests per 10s per IP" };
	}

	@Get("/slow")
	@Use(timeout(1000))
	async slow(ctx: Context) {
		const ms = Number(ctx.query.ms ?? 200);
		await delay(ms);
		return { waitedMs: ms, note: "timeout middleware allows up to 1000ms" };
	}

	@Post("/large")
	@Use(
		bodySizeLimit({
			maxSize: 1024,
			message: "Payload too large for this route (max 1KB)",
		}),
	)
	async large(ctx: Context) {
		const body = await ctx.body();
		return { receivedBytes: JSON.stringify(body ?? {}).length };
	}

	@Get("/api-key")
	@Use(requireApiKey)
	apiKey(ctx: Context) {
		return {
			verified: ctx.store.apiKeyVerified === true,
			hint: `send header x-api-key: ${DEMO_API_KEY}`,
		};
	}

	@Get("/order")
	@Use(traceMiddleware("first"))
	@Use(traceMiddleware("second"))
	@Use(traceMiddleware("third"))
	order(ctx: Context) {
		return { order: [...((ctx.store.order as string[]) ?? []), "handler"] };
	}
}
