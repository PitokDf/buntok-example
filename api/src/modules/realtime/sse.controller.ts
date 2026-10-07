import { type Context, Controller, Get, Post, Use } from "@buntok/core";
import { z, zValidator } from "@buntok/core/middlewares/validator";
import { SSE } from "@buntok/core/sse";
import { broadcaster } from "@/lib/shared";

const broadcastSchema = z.object({
	event: z.string().min(1),
	data: z.string().min(1),
});

@Controller("/sse")
export class SSEController {
	@Get("/")
	stream(ctx: Context) {
		return ctx.sse(
			async (sse) => {
				broadcaster.add(sse);
				sse.onClose(() => broadcaster.remove(sse));

				let tick = 0;
				const timer = setInterval(() => {
					tick += 1;
					sse.sendEvent("tick", { tick, at: new Date().toISOString() });
				}, 2000);
				sse.onClose(() => clearInterval(timer));

				await new Promise(() => {});
			},
			{ maxConnections: 50, retry: 3000, sendInitial: true, initialEvent: "connected" },
		);
	}

	@Post("/broadcast")
	@Use(zValidator("body", broadcastSchema))
	broadcast(ctx: Context) {
		const { event, data } = ctx.valid("body") as z.infer<typeof broadcastSchema>;
		broadcaster.broadcast(event, data);
		return { delivered: broadcaster.size, event, data };
	}

	@Get("/status")
	status() {
		return {
			activeConnections: SSE.activeConnections,
			broadcasterSize: broadcaster.size,
		};
	}
}
