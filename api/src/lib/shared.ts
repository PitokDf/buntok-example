import { existsSync } from "node:fs";
import { type AuditLogEntry, Cache, JwtService, MemoryCacheDriver } from "@buntok/core";
import { Metrics } from "@buntok/core/metrics";
import { Queue } from "@buntok/core/queue";
import { MemorySchedulerDriver, Scheduler } from "@buntok/core/schedule";
import { SSEBroadcaster } from "@buntok/core/sse";
import { env } from "@/env";

export const publicDir = ["./public", "./api/public"].find((dir) => existsSync(dir)) ?? "./public";

export const jwt = new JwtService(env.JWT_SECRET);

export const cache = new Cache(new MemoryCacheDriver());

export const metrics = new Metrics();

export const broadcaster = new SSEBroadcaster();

export const scheduler = new Scheduler(new MemorySchedulerDriver());

export interface EmailJob {
	to: string;
	subject: string;
	body: string;
}

export interface ProcessedJob extends EmailJob {
	id: string;
	attempt: number;
	processedAt: string;
}

export const emailQueue = new Queue<EmailJob>("email");

export const queueState = {
	processed: 0,
	history: [] as ProcessedJob[],
};

export function recordProcessedJob(job: ProcessedJob) {
	queueState.processed += 1;
	queueState.history.push(job);
	if (queueState.history.length > 50) queueState.history.shift();
}

export const auditEntries: AuditLogEntry[] = [];

export async function captureAudit(entry: AuditLogEntry) {
	auditEntries.push(entry);
	if (auditEntries.length > 100) auditEntries.shift();
}

export const scheduleState = { ticks: 0, lastRun: null as string | null };
