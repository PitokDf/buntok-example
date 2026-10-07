import { z } from "@buntok/core/middlewares/validator";

export interface Post {
	id: number;
	title: string;
	body: string;
	published: boolean;
	createdAt: string;
}

export const CreatePostSchema = z.object({
	title: z.string().min(1).max(200),
	body: z.string().min(1),
	published: z.boolean().default(false),
});

export const UpdatePostSchema = CreatePostSchema.partial();

export const PostQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(50).default(10),
	q: z.string().optional(),
});

export type CreatePostInput = z.infer<typeof CreatePostSchema>;
export type UpdatePostInput = z.infer<typeof UpdatePostSchema>;
export type PostQuery = z.infer<typeof PostQuerySchema>;
