import {
	ClientError,
	type Context,
	Controller,
	createClient,
	Delete,
	delay,
	emitter,
	Get,
	logger,
	Post,
	type RouteContract,
	streamAI,
	Use,
} from "@buntok/core";
import { circuitBreaker, getCircuitBreakers } from "@buntok/core/middlewares";
import { z, zValidator } from "@buntok/core/middlewares/validator";
import { env } from "@/env";
import { cache } from "@/lib/shared";

const emitSchema = z.object({ message: z.string().min(1) });

@Controller("/cache")
export class CacheController {
	@Get("/demo")
	async demo() {
		await cache.set("greeting", { hello: "buntok" }, 60);
		const greeting = await cache.get("greeting");
		const hits = await cache.increment("hits", 1, 300);
		const aside = await cache.getOrSet(
			"expensive",
			async () => {
				await delay(20);
				return { computed: true, at: Date.now() };
			},
			60,
		);
		return { greeting, hits, aside, keys: await cache.keys() };
	}

	@Delete("/clear")
	async clear() {
		await cache.clear();
		return { cleared: true };
	}
}

@Controller("/breaker")
export class BreakerController {
	@Post("/fire")
	@Use(
		circuitBreaker("flaky-service", {
			failureThreshold: 3,
			minimumNumberOfCalls: 10,
			slidingWindowSize: 5,
			timeout: 5000,
			onOpen: (ctx) =>
				ctx.json(
					{
						success: false,
						error: "CircuitOpen",
						message: "Circuit is open, retry later",
					},
					503,
				),
		}),
	)
	async fire(ctx: Context) {
		const fail = ctx.query.fail !== "0";
		if (fail) throw new Error("Downstream service failure");
		return { ok: true, at: new Date().toISOString() };
	}

	@Get("/status")
	status() {
		const breakers = getCircuitBreakers();
		return Object.fromEntries(
			[...breakers.entries()].map(([name, breaker]) => [
				name,
				{ state: breaker.getState(), metrics: breaker.getMetrics() },
			]),
		);
	}
}

const demoEvents: { event: string; payload: unknown; at: string }[] = [];

@Controller("/emitter")
export class EmitterController {
	constructor() {
		emitter.on("demo:event", (payload) => {
			demoEvents.push({
				event: "demo:event",
				payload,
				at: new Date().toISOString(),
			});
			if (demoEvents.length > 20) demoEvents.shift();
		});
	}

	@Post("/emit")
	@Use(zValidator("body", emitSchema))
	async emit(ctx: Context) {
		const payload = await ctx.body<{ message: string }>();
		await emitter.emit("demo:event", payload, {
			isolatedErrors: true,
			onError: (event, err) => logger.error("listener failed", { event, error: String(err) }),
		});
		return { emitted: true, listeners: emitter.listenerCount("demo:event") };
	}

	@Get("/status")
	status() {
		return {
			events: emitter.eventNames(),
			listeners: emitter.listenerCount("demo:event"),
			recent: demoEvents.slice(-5),
		};
	}
}

const contracts = {
	ping: {
		method: "GET",
		path: "/ping",
	} as RouteContract<undefined, undefined, undefined, string>,
	queueStatus: {
		method: "GET",
		path: "/queue/status",
	} as RouteContract<undefined, undefined, undefined, unknown>,
};

const client = createClient(contracts, `http://127.0.0.1:${env.PORT}`);

@Controller("/client")
export class ClientController {
	@Get("/demo")
	async demo() {
		try {
			const pong = await client.ping({});
			const status = await client.queueStatus({});
			return { pong, status };
		} catch (err) {
			if (err instanceof ClientError) {
				return { error: err.message, status: err.status, body: err.body };
			}
			return { error: String(err) };
		}
	}
}

@Controller("/ai")
export class AIController {
	@Post("/stream")
	async stream(ctx: Context) {
		async function* fakeLLM() {
			for (const chunk of ["Hello", " from", " Buntok", " AI", "!"]) {
				await delay(30);
				yield { choices: [{ delta: { content: chunk } }] };
			}
		}
		return streamAI(ctx, fakeLLM(), {
			onCompletion: (fullText) => logger.info("AI stream completed", { fullText }),
		});
	}
}
