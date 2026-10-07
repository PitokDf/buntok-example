import { Controller, Get, Post } from "@buntok/core";
import { CronJob } from "@buntok/core/schedule";
import { scheduleState } from "@/lib/shared";

@Controller("/tasks")
export class TasksController {
	@CronJob("* * * * *")
	everyMinute() {
		scheduleState.ticks += 1;
		scheduleState.lastRun = new Date().toISOString();
	}

	@Get("/status")
	status() {
		return {
			ticks: scheduleState.ticks,
			lastRun: scheduleState.lastRun,
			note: "CronJob * * * * * runs every minute, manual trigger available via POST /tasks/run",
		};
	}

	@Post("/run")
	run() {
		this.everyMinute();
		return { ticks: scheduleState.ticks, lastRun: scheduleState.lastRun, triggered: "manually" };
	}
}
