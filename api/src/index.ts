import { App } from "@buntok/core";
import { env } from "./env";

export const app = new App();

app.get("/", (ctx) => {
  return ctx.json({ message: "Hello from Buntok!" });
});

export default app;
