import {
	addDays,
	type Context,
	Controller,
	camelCase,
	clamp,
	daysBetween,
	decrypt,
	encrypt,
	Factory,
	formatBytes,
	formatCurrency,
	formatDate,
	formatInTimezone,
	Get,
	generateCode,
	getClientIP,
	getTimezoneOffsetString,
	groupBy,
	hashPassword,
	isPrivateIP,
	isValidTimezone,
	kebabCase,
	nanoid,
	nowInTimezone,
	omit,
	parseUserAgent,
	randomFloat,
	randomHex,
	retry,
	sha256,
	slugify,
	timeAgo,
	ulid,
	uniq,
	verifyPassword,
} from "@buntok/core";
import { format } from "@buntok/core/date";
import { addDays as fpAddDays, format as fpFormat } from "@buntok/core/date/fp";
import { id as idLocale } from "@buntok/core/date/locale";

interface DemoUser {
	id: number;
	name: string;
	role: "admin" | "user";
	email: string;
}

const UserFactory = Factory.define<DemoUser>(() => ({
	id: Math.floor(Math.random() * 100000),
	name: ["Ada", "Linus", "Grace", "Edsger"][Math.floor(Math.random() * 4)] ?? "Anon",
	email: `user${Math.floor(Math.random() * 10000)}@example.com`,
	role: Math.random() > 0.7 ? "admin" : "user",
}));

@Controller("/helpers")
export class HelpersController {
	@Get("/crypto")
	async cryptoDemo() {
		const { ciphertext, iv } = await encrypt("secret data", "demo-key");
		const plain = await decrypt(ciphertext, "demo-key", iv);
		return {
			sha256: sha256("password"),
			randomHex: randomHex(16),
			encryptIv: iv,
			decrypt: plain,
		};
	}

	@Get("/password")
	async passwordDemo() {
		const hashed = await hashPassword("mypassword");
		const valid = await verifyPassword("mypassword", hashed);
		const wrong = await verifyPassword("wrong", hashed);
		return { hashed: `${hashed.slice(0, 20)}...`, valid, wrong };
	}

	@Get("/string")
	stringDemo() {
		return {
			slugify: slugify("Hello World!"),
			camelCase: camelCase("hello-world"),
			kebabCase: kebabCase("helloWorld"),
		};
	}

	@Get("/object")
	objectDemo() {
		const rows = [
			{ id: 1, group: "a" },
			{ id: 2, group: "b" },
			{ id: 3, group: "a" },
		];
		return {
			omit: omit({ a: 1, b: 2, c: 3 }, ["b"]),
			uniq: uniq([1, 2, 2, 3]),
			groupBy: groupBy(rows, (row) => row.group),
		};
	}

	@Get("/number")
	numberDemo() {
		return {
			clamp: clamp(15, 0, 10),
			randomFloat: randomFloat(1, 10),
			formatBytes: formatBytes(1048576),
			formatCurrency: formatCurrency(1000, "USD"),
		};
	}

	@Get("/id")
	idDemo() {
		return {
			code: generateCode("T"),
			nanoid: nanoid(),
			ulid: ulid(),
		};
	}

	@Get("/date")
	dateDemo() {
		const now = new Date();
		return {
			formatDate: formatDate(now),
			timeAgo: timeAgo(new Date(Date.now() - 180_000)),
			addDays: addDays(now, 7).toISOString(),
			daysBetween: daysBetween(new Date("2024-01-01"), new Date("2024-01-15")),
		};
	}

	@Get("/date-lib")
	dateLibDemo() {
		const now = new Date();
		return {
			format: format(now, "EEEE, d MMMM yyyy"),
			formatId: format(now, "EEEE, d MMMM yyyy", { locale: idLocale }),
			fpFormat: fpFormat("PP")(now),
			fpAddDays: fpAddDays(10)(now).toISOString(),
		};
	}

	@Get("/timezone")
	timezoneDemo() {
		const now = new Date();
		return {
			nowJakarta: nowInTimezone("Asia/Jakarta").toISOString(),
			formatted: formatInTimezone(now, "Asia/Jakarta", "default"),
			offset: getTimezoneOffsetString("Asia/Jakarta"),
			valid: isValidTimezone("Asia/Jakarta"),
			invalid: isValidTimezone("Invalid/Zone"),
		};
	}

	@Get("/network")
	networkDemo(ctx: Context) {
		return {
			ip: getClientIP(ctx.request),
			privateIp: isPrivateIP("192.168.1.1"),
			userAgent: parseUserAgent(ctx.request),
		};
	}

	@Get("/async")
	async asyncDemo() {
		const started = Date.now();
		let attempts = 0;
		const value = await retry(
			async () => {
				attempts += 1;
				if (attempts < 3) throw new Error("flaky");
				return "recovered";
			},
			{ retries: 3, delay: 10, backoff: "fixed" },
		);
		return { value, attempts, elapsedMs: Date.now() - started };
	}
}

@Controller("/factory")
export class FactoryController {
	@Get("/users")
	async users(ctx: Context) {
		const count = Math.min(Number(ctx.query.count ?? 5), 50);
		return UserFactory.buildMany(count);
	}
}
