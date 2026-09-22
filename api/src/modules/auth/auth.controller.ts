import { Dependencies, Controller, Get, Context } from "@buntok/core";
import { AuthService } from "./auth.service";

@Dependencies(AuthService)
@Controller("/auths")
export class AuthController {
  constructor(private authService: AuthService) {}
  @Get("/login")
  async login(ctx: Context) {
    const result = await this.authService.login();
    return ctx.json(result);
  }
}
