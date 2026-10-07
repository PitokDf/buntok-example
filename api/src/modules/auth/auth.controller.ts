import {
	type Context,
	Controller,
	Dependencies,
	deleteCookie,
	Get,
	Post,
	requireAuth,
	requirePermission,
	requireRole,
	setCookie,
	Use,
} from "@buntok/core";
import { zValidator } from "@buntok/core/middlewares/validator";
import { env } from "@/env";
import { jwt } from "@/lib/shared";
import { LoginSchema } from "./auth.schema";
import { AuthService } from "./auth.service";

@Dependencies(AuthService)
@Controller("/auth")
export class AuthController {
	constructor(private authService: AuthService) {}

	@Post("/login")
	@Use(zValidator("body", LoginSchema))
	async login(ctx: Context) {
		const { email, password } = ctx.valid("body") as { email: string; password: string };
		const user = await this.authService.login(email, password);
		const token = await jwt.sign(
			{ userId: user.id, role: user.role, permissions: user.permissions },
			3600,
		);
		const payload = { token, user, expiresIn: 3600, store: env.AUTH_STORE };
		if (env.AUTH_STORE === "cookie") {
			return setCookie(ctx.json(payload), env.AUTH_COOKIE, token, {
				httpOnly: true,
				sameSite: "lax",
				path: "/",
				maxAge: 3600,
			});
		}
		return ctx.json(payload);
	}

	@Post("/logout")
	logout(ctx: Context) {
		if (env.AUTH_STORE === "cookie") {
			return deleteCookie(ctx.json({ success: true }), env.AUTH_COOKIE, { path: "/" });
		}
		return ctx.json({
			success: true,
			note: "header mode: drop the bearer token client-side",
		});
	}

	@Get("/me")
	@Use(requireAuth(env.JWT_SECRET))
	me(ctx: Context) {
		return ctx.json({ user: ctx.user });
	}

	@Get("/admin")
	@Use(requireAuth(env.JWT_SECRET))
	@Use(requireRole("admin"))
	admin(ctx: Context) {
		return { admin: true, user: ctx.user };
	}

	@Get("/moderator")
	@Use(requireAuth(env.JWT_SECRET))
	@Use(requireRole("admin", "moderator"))
	moderator(ctx: Context) {
		return { moderator: true, user: ctx.user };
	}

	@Get("/delete-user")
	@Use(requireAuth(env.JWT_SECRET))
	@Use(requirePermission("users:delete"))
	deleteUser(ctx: Context) {
		return { allowed: true, user: ctx.user };
	}
}
