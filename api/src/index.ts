import { App, Container } from "@buntok/core";
import { healthCheck } from "@buntok/core/middlewares";
import { AuthController } from "@/modules/auth";
// import { env } from "./env";

export const app = new App();
const container = new Container();

healthCheck(app);

container.scan([AuthController]);

app.setContainer(container);

app.registerController([AuthController]);

app.get("/", (ctx) => {
  return ctx.json({ message: "Hello from Buntok!" });
});

export default app;
