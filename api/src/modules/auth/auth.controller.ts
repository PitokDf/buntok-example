import { Dependencies, Controller, Get, Context, Use } from "@buntok/core";
import { AuthService } from "./auth.service";
import { z, zValidator } from "@buntok/core/middlewares/validator";
import { uniq } from "@buntok/core/helpers";
import { deleteCookie, setCookie } from "@buntok/core/helpers";

@Dependencies(AuthService)
@Controller("/auths")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get()
  @Use(zValidator("query", z.object({ name: z.string().optional() })))
  async me() {
    return (
      "Hello, this is the auth controller!" +
      uniq([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    );
  }

  @Get("/login")
  async login(ctx: Context) {
    const result = await this.authService.login();
    return ctx.json(result);
  }
}
