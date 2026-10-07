import { type Context, Controller, Get, Post, Use } from "@buntok/core";
import { Mailer } from "@buntok/core/mailer";
import { z, zValidator } from "@buntok/core/middlewares/validator";
import { render, TemplateEngine } from "@buntok/core/template";
import { env } from "@/env";

const sendSchema = z.object({
	name: z.string().min(1),
	to: z.string().email(),
});

@Controller("/mailer")
export class MailerController {
	@Get("/preview")
	preview() {
		const engine = new TemplateEngine();
		engine.registerPartial("layout", '<div class="mail">{{{body}}}</div>');
		engine.registerHelper("upper", (text: unknown) => String(text).toUpperCase());
		const html = engine.render(
			"{{> layout }}<h1>Hello {{ name }}</h1><p>Code: {{ upper code }}</p>",
			{ name: "Tok", code: "abc123", body: "<strong>Welcome to Buntok</strong>" },
		);
		const list = render("{{#each items}}{{@index}}: {{@value}} {{/each}}", {
			items: ["alpha", "beta"],
		});
		return { html, list };
	}

	@Get("/strict-error")
	strictError() {
		try {
			render("Hello {{ usre.name }}", { user: { name: "Budi" } });
			return { rendered: true };
		} catch (err) {
			return { error: String(err) };
		}
	}

	@Post("/send")
	@Use(zValidator("body", sendSchema))
	async send(ctx: Context) {
		if (!env.RESEND_API_KEY) {
			return ctx.json(
				{
					sent: false,
					message: "Set RESEND_API_KEY in .env to enable real sending (template rendered instead)",
					preview: render("<h1>Welcome {{name}}</h1>", ctx.valid("body") as object),
				},
				501,
			);
		}
		const mailer = new Mailer({ provider: "resend", apiKey: env.RESEND_API_KEY });
		mailer.registerTemplate("welcome", "<h1>Welcome, {{name}}!</h1>");
		const { name, to } = ctx.valid("body") as z.infer<typeof sendSchema>;
		await mailer.sendTemplate({
			from: "noreply@example.com",
			to,
			subject: "Welcome!",
			template: "welcome",
			context: { name },
		});
		return { sent: true };
	}
}
