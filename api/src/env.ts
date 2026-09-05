import { App, z } from "@buntok/core";

export const env = App.validateEnv({
	PORT: z.coerce.number().default(1212),
	AUTH_STORE: z.enum(["header", "cookie"]).default("header"),
	AUTH_COOKIE: z.string().default("session"),
	NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});
