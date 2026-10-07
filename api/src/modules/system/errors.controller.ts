import {
	asyncHandler,
	BadRequestError,
	ConflictError,
	Controller,
	delay,
	ForbiddenError,
	Get,
	InternalServerError,
	NotFoundError,
	ServiceUnavailableError,
	TooManyRequestsError,
	timeout,
	UnauthorizedError,
	UnprocessableEntityError,
	Use,
} from "@buntok/core";

@Controller("/errors")
export class ErrorsController {
	@Get("/bad-request")
	badRequest() {
		throw new BadRequestError("Name is required");
	}

	@Get("/unauthorized")
	unauthorized() {
		throw new UnauthorizedError("Missing or invalid authentication token");
	}

	@Get("/forbidden")
	forbidden() {
		throw new ForbiddenError("Requires one of: admin, moderator");
	}

	@Get("/not-found")
	notFound() {
		throw new NotFoundError("User not found");
	}

	@Get("/conflict")
	conflict() {
		throw new ConflictError("Email already registered");
	}

	@Get("/unprocessable")
	unprocessable() {
		throw new UnprocessableEntityError("Business rule violated");
	}

	@Get("/too-many")
	tooMany() {
		throw new TooManyRequestsError("Rate limit exceeded, retry in 10s");
	}

	@Get("/internal")
	internal() {
		throw new InternalServerError("Database connection lost");
	}

	@Get("/service-unavailable")
	serviceUnavailable() {
		throw new ServiceUnavailableError("Upstream service is down");
	}

	@Get("/timeout")
	@Use(timeout(500))
	async timeoutRoute() {
		await delay(1500);
		return { done: true };
	}

	@Get("/async")
	@Use(
		asyncHandler(async () => {
			await delay(10);
			throw new InternalServerError("Failure inside asyncHandler");
		}),
	)
	async asyncRoute() {
		return { ok: true };
	}

	@Get("/raw")
	raw() {
		throw new Error("Something exploded unexpectedly");
	}
}
