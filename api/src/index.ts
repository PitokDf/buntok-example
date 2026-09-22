import { App } from "@buntok/core";
import { healthCheck } from "@buntok/core/middlewares";
// import { env } from "./env";

export const app = new App();

healthCheck(app);

app.get("/", (ctx) => {
  return ctx.json({ message: "Hello from Buntok!" });
});

export default app;
