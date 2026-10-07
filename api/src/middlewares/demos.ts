import type { Middleware } from "@buntok/core";

export const DEMO_API_KEY = "demo-key-123";

export const requireApiKey: Middleware = (ctx, next) => {
	const key = ctx.request.headers.get("x-api-key");
	if (key !== DEMO_API_KEY) {
		return ctx.json(
			{ success: false, error: "Forbidden", message: "Missing or invalid x-api-key header" },
			403,
		);
	}
	ctx.store.apiKeyVerified = true;
	return next();
};

export function traceMiddleware(label: string): Middleware {
	return async (ctx, next) => {
		const order = (ctx.store.order as string[] | undefined) ?? [];
		order.push(label);
		ctx.store.order = order;
		return next();
	};
}
