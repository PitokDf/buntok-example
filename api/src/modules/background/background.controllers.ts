import { type Context, Controller, Delete, Get, Post, Use } from "@buntok/core";
import { z, zValidator } from "@buntok/core/middlewares/validator";
import { auditEntries, emailQueue, queueState, scheduleState } from "@/lib/shared";

const jobSchema = z.object({
	to: z.string().email(),
	subject: z.string().min(1),
	body: z.string().min(1),
	delay: z.coerce.number().int().min(0).max(60_000).default(0),
	priority: z.coerce.number().int().min(0).max(10).default(0),
});

@Controller("/queue")
export class QueueController {
	@Post("/jobs")
	@Use(zValidator("body", jobSchema))
	async create(ctx: Context) {
		const { to, subject, body, delay, priority } = ctx.valid("body") as z.infer<typeof jobSchema>;
		await emailQueue.add({ to, subject, body }, { delay, priority });
		return { queued: true, pending: emailQueue.size() };
	}

	@Get("/status")
	status() {
		return { pending: emailQueue.size(), processed: queueState.processed };
	}

	@Get("/history")
	history() {
		return queueState.history;
	}
}

@Controller("/schedule")
export class ScheduleController {
	@Get("/status")
	status() {
		return {
			ticks: scheduleState.ticks,
			lastRun: scheduleState.lastRun,
			note: "programmatic scheduler runs every minute (cron * * * * *)",
		};
	}
}

@Controller("/audit")
export class AuditController {
	@Get("/recent")
	recent() {
		return auditEntries.slice(-20).reverse();
	}

	@Delete("/clear")
	clear() {
		auditEntries.length = 0;
		return { cleared: true };
	}
}
