import { BaseService, Dependencies } from "@buntok/core";
import { PostRepository } from "./post.repository";
import type { CreatePostInput, Post, UpdatePostInput } from "./post.schema";

@Dependencies(PostRepository)
export class PostService extends BaseService<Post, CreatePostInput, UpdatePostInput> {
	constructor(repositoryInstance: PostRepository) {
		super(repositoryInstance);
	}
}
