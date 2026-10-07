import type { CreatePostInput, Post, UpdatePostInput } from "./post.schema";

export class PostRepository {
	private posts: Post[] = [
		{
			id: 1,
			title: "Hello Buntok",
			body: "First post created by PostRepository.",
			published: true,
			createdAt: new Date().toISOString(),
		},
	];
	private nextId = 2;

	findAll(): Promise<Post[]> {
		return Promise.resolve([...this.posts]);
	}

	findById(id: string | number): Promise<Post | null> {
		const found = this.posts.find((post) => post.id === Number(id)) ?? null;
		return Promise.resolve(found);
	}

	create(data: CreatePostInput): Promise<Post> {
		const post: Post = {
			id: this.nextId++,
			title: data.title,
			body: data.body,
			published: data.published ?? false,
			createdAt: new Date().toISOString(),
		};
		this.posts.push(post);
		return Promise.resolve(post);
	}

	update(id: string | number, data: UpdatePostInput): Promise<Post> {
		const post = this.posts.find((candidate) => candidate.id === Number(id));
		if (!post) return Promise.reject(new Error(`Post ${id} not found`));
		Object.assign(post, data);
		return Promise.resolve(post);
	}

	delete(id: string | number): Promise<Post> {
		const index = this.posts.findIndex((candidate) => candidate.id === Number(id));
		if (index === -1) return Promise.reject(new Error(`Post ${id} not found`));
		const [removed] = this.posts.splice(index, 1);
		return Promise.resolve(removed as Post);
	}

	count(): Promise<number> {
		return Promise.resolve(this.posts.length);
	}
}
