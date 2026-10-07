import { type Context, Controller, Get, HttpCode, Post, Use } from "@buntok/core";
import { z, zResponse, zValidator } from "@buntok/core/middlewares/validator";

const createBodySchema = z.object({
	name: z.string().min(1).max(100),
	email: z.string().email(),
});

const paginationSchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(50).default(10),
	search: z.string().optional(),
});

const uuidParamsSchema = z.object({ id: z.string().uuid() });

const formSchema = z.object({
	email: z.string().email(),
	age: z.coerce.number().int().min(0),
});

const multipartSchema = z.object({
	title: z.string().min(1),
	tags: z.string().optional(),
});

const textSchema = z.string().min(1);

const userResponseSchema = z.object({
	id: z.uuid(),
	name: z.string(),
	email: z.string().email(),
});

type CreateBody = z.output<typeof createBodySchema>;
type Pagination = z.output<typeof paginationSchema>;
type UuidParams = z.output<typeof uuidParamsSchema>;
type FormBody = z.output<typeof formSchema>;
type MultipartBody = z.output<typeof multipartSchema>;

@Controller("/validation")
export class ValidationController {
	@Post("/users")
	@Use(zValidator("body", createBodySchema))
	@HttpCode(201)
	createUser(ctx: Context) {
		return ctx.valid<CreateBody>("body");
	}

	@Get("/pagination")
	@Use(zValidator("query", paginationSchema))
	pagination(ctx: Context) {
		const { page, limit, search } = ctx.valid<Pagination>("query");
		return { page, limit, search: search ?? null, offset: (page - 1) * limit };
	}

	@Get("/users/:id")
	@Use(zValidator("params", uuidParamsSchema))
	byId(ctx: Context) {
		const { id } = ctx.valid<UuidParams>("params");
		return { id };
	}

	@Post("/form")
	@Use(zValidator("body", formSchema, { contentType: "application/x-www-form-urlencoded" }))
	form(ctx: Context) {
		return ctx.valid<FormBody>("body");
	}

	@Post("/text")
	@Use(zValidator("body", textSchema, { contentType: "text/plain" }))
	text(ctx: Context) {
		const value = ctx.valid<string>("body");
		return { length: value.length, text: value };
	}

	@Post("/multipart")
	@Use(zValidator("body", multipartSchema, { contentType: "multipart/form-data" }))
	multipart(ctx: Context) {
		const { title, tags } = ctx.valid<MultipartBody>("body");
		return { title, tags: tags ?? null };
	}

	@Get("/documented")
	@Use(zValidator("query", paginationSchema))
	@Use(zResponse(200, z.array(userResponseSchema), "List of users"))
	@Use(zResponse(401, z.object({ error: z.string() }), "Unauthorized"))
	documented(ctx: Context) {
		const { page, limit } = ctx.valid<Pagination>("query");
		return Array.from({ length: Math.min(limit, 3) }, (_, i) => ({
			id: crypto.randomUUID(),
			name: `User ${(page - 1) * limit + i + 1}`,
			email: `user${page}${i}@example.com`,
		}));
	}
}
