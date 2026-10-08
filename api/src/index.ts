import {
	auditLog,
	Buntok,
	bodySizeLimit,
	Container,
	compress,
	createPlugin,
	delay,
	HttpError,
	healthCheck,
	helmet,
	livenessCheck,
	logger,
	readinessCheck,
	requestId,
	responseTime,
	TimeoutError,
} from "@buntok/core";
import { metricsEndpoint, metricsMiddleware } from "@buntok/core/metrics";
import { z } from "@buntok/core/middlewares/validator";
import { validateWSMessage, wsHeartbeat } from "@buntok/core/ws-helpers";
import { env } from "@/env";
import {
	auditEntries,
	captureAudit,
	emailQueue,
	metrics,
	recordProcessedJob,
	scheduler,
	scheduleState,
} from "@/lib/shared";
import { AuthController } from "@/modules/auth";
import {
	AuditController,
	QueueController,
	ScheduleController,
} from "@/modules/background/background.controllers";
import { FilesController, UploadController } from "@/modules/files/files.controllers";
import { FactoryController, HelpersController } from "@/modules/helpers/helpers.controllers";
import { MailerController } from "@/modules/helpers/mailer.controller";
import { PostController } from "@/modules/posts";
import { SSEController } from "@/modules/realtime/sse.controller";
import {
	AIController,
	BreakerController,
	CacheController,
	ClientController,
	EmitterController,
} from "@/modules/resilience/resilience.controllers";
import { ApiController, CoreController } from "@/modules/system/core.controller";
import { ErrorsController } from "@/modules/system/errors.controller";
import { MiddlewareController } from "@/modules/system/middleware.controller";
import { ValidationController } from "@/modules/system/validation.controller";
import { TasksController } from "@/modules/tasks/tasks.controller";

export const app = new Buntok();

app.set("startedAt", new Date().toISOString());

app.plugin(
	createPlugin({
		name: "demo-status",
		install: (instance) => {
			instance.get("/plugin/status", () => ({
				plugin: "demo-status",
				message: "installed via app.plugin()",
			}));
		},
	}),
);

app.cors({
	origin: [`http://localhost:${env.PORT}`, `http://127.0.0.1:${env.PORT}`],
	credentials: true,
});

app.use(requestId());
app.use(metricsMiddleware(metrics));
app.use(responseTime());
app.use(helmet());
app.use(compress({ threshold: 1024 }));
app.use(bodySizeLimit({ maxSize: 1024 * 1024 }));
app.use(
	auditLog({
		storage: captureAudit,
		excludePaths: ["/health", "/health/live", "/health/ready", "/metrics"],
	}),
);

app.apiDocs({
	title: "Buntok Example API",
	version: "1.0.0",
	description: "Full-feature demo of @buntok/core using classes and decorators",
	safeOnProduction: false,
});

app.static("/assets", "./public");

healthCheck(app, {
	includeUptime: true,
	version: "1.0.0",
	check: async () => ({
		status: "healthy",
		checks: {
			memory: {
				status: process.memoryUsage().heapUsed < 1024 * 1024 * 1024 ? "healthy" : "unhealthy",
			},
		},
	}),
});
livenessCheck(app);
readinessCheck(app, {
	checks: [
		{ name: "env", check: async () => env.PORT > 0 },
		{ name: "docs", check: async () => true },
	],
});
metricsEndpoint(metrics, "/metrics")(app);

const wsSchema = z.object({
	type: z.enum(["chat", "ping"]),
	payload: z.string().optional(),
});

app.ws("/ws", {
	...wsHeartbeat(30_000),
	open(ws) {
		ws.subscribe("general");
		ws.send(JSON.stringify({ type: "welcome", message: "Connected to Buntok WS" }));
	},
	message(ws, message) {
		const result = validateWSMessage(wsSchema, String(message));
		if (!result.success) {
			ws.send(JSON.stringify({ success: false, error: "Invalid message" }));
			return;
		}
		if (result.data.type === "ping") {
			ws.send(JSON.stringify({ type: "pong", at: Date.now() }));
			return;
		}
		const reply = JSON.stringify({
			type: "chat",
			payload: result.data.payload ?? "",
			from: "server",
		});
		ws.publish("general", reply);
		ws.send(reply);
	},
	close(_ws, code) {
		console.log(`ws closed: ${code ?? "-"}`);
	},
});

const container = new Container();
container.scan([AuthController, PostController]);
app.setContainer(container);

app.registerController([
	CoreController,
	ApiController,
	ValidationController,
	ErrorsController,
	MiddlewareController,
	CacheController,
	BreakerController,
	EmitterController,
	ClientController,
	AIController,
	FilesController,
	UploadController,
	SSEController,
	HelpersController,
	FactoryController,
	MailerController,
	QueueController,
	ScheduleController,
	AuditController,
	TasksController,
	AuthController,
	PostController,
]);

emailQueue.process(async (job) => {
	await delay(50);
	recordProcessedJob({
		...job.data,
		id: job.id,
		attempt: job.attempt,
		processedAt: new Date().toISOString(),
	});
});

scheduler.schedule("* * * * *", () => {
	scheduleState.ticks += 1;
	scheduleState.lastRun = new Date().toISOString();
});

logger.info("Buntok example ready", {
	port: env.PORT,
	docs: `http://localhost:${env.PORT}/docs`,
	auditEntries: auditEntries.length,
});

app.onError((err, ctx) => {
	if (err instanceof TimeoutError) {
		return ctx.json({ success: false, error: "TimeoutError", message: err.message }, 504);
	}
	if (err instanceof HttpError) {
		return ctx.json({ success: false, error: err.name, message: err.message }, err.status);
	}
	logger.error("unhandled error", {
		message: err instanceof Error ? err.message : String(err),
	});
	const message =
		env.NODE_ENV === "production"
			? "An unexpected error occurred"
			: err instanceof Error
				? err.message
				: String(err);
	return ctx.json({ success: false, error: "InternalServerError", message }, 500);
});

export default app;
