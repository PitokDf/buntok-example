import { hashPassword, UnauthorizedError, verifyPassword } from "@buntok/core";

export interface AuthUser {
	id: string;
	name: string;
	email: string;
	password: string;
	role: "admin" | "user";
	permissions: string[];
}

export type SafeAuthUser = Omit<AuthUser, "password">;

export class AuthService {
	private users: AuthUser[] | null = null;

	private async seed(): Promise<AuthUser[]> {
		if (this.users) return this.users;
		const [adminPassword, userPassword] = await Promise.all([
			hashPassword("admin123"),
			hashPassword("user123"),
		]);
		this.users = [
			{
				id: "u1",
				name: "Admin Tok",
				email: "admin@buntok.test",
				password: adminPassword,
				role: "admin",
				permissions: ["users:delete", "posts:create"],
			},
			{
				id: "u2",
				name: "User Tok",
				email: "user@buntok.test",
				password: userPassword,
				role: "user",
				permissions: ["posts:create"],
			},
		];
		return this.users;
	}

	async login(email: string, password: string): Promise<SafeAuthUser> {
		const users = await this.seed();
		const user = users.find((candidate) => candidate.email === email);
		if (!user || !(await verifyPassword(password, user.password))) {
			throw new UnauthorizedError("Invalid credentials");
		}
		const { password: _ignored, ...safe } = user;
		return safe;
	}
}
