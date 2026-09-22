import { z } from "@buntok/core/middlewares/validator";

export const CreateAuthSchema = z.object({
	name: z.string().min(1).max(100),
	// TODO: Add more fields
});

export const UpdateAuthSchema = CreateAuthSchema.partial();

export type CreateAuthInput = z.infer<typeof CreateAuthSchema>;
export type UpdateAuthInput = z.infer<typeof UpdateAuthSchema>;
