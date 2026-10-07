import { z } from "@buntok/core/middlewares/validator";

export const LoginSchema = z.object({
	email: z.string().email(),
	password: z.string().min(1),
});

export type LoginInput = z.infer<typeof LoginSchema>;
