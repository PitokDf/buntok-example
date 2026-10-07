import {
	BaseController,
	type Context,
	Controller,
	Dependencies,
	Get,
	HttpCode,
	Post,
	Use,
} from "@buntok/core";
import { zValidator } from "@buntok/core/middlewares/validator";
import {
	type CreatePostInput,
	CreatePostSchema,
	type Post as PostEntity,
	type PostQuery,
	PostQuerySchema,
	type UpdatePostInput,
} from "./post.schema";
import { PostService } from "./post.service";

@Dependencies(PostService)
@Controller("/posts")
export class PostController extends BaseController<PostEntity, CreatePostInput, UpdatePostInput> {
	constructor(private readonly postService: PostService) {
		super(postService);
	}

	@Get("/stats")
	async stats() {
		const total = await this.postService.count();
		const all = await this.postService.getAll();
		return { total, published: all.filter((post) => post.published).length };
	}

	@Get("/search")
	@Use(zValidator("query", PostQuerySchema))
	async search(ctx: Context) {
		const { page, limit, q } = ctx.valid<PostQuery>("query");
		const all = await this.postService.getAll();
		const filtered = q ? all.filter((post) => post.title.includes(q)) : all;
		const rows = filtered.slice((page - 1) * limit, page * limit);
		return ctx.paginate(rows, filtered.length, page, limit);
	}

	@Post("/validated")
	@Use(zValidator("body", CreatePostSchema))
	@HttpCode(201)
	async createValidated(ctx: Context) {
		const data = ctx.valid<CreatePostInput>("body");
		return await this.postService.create(data);
	}
}
