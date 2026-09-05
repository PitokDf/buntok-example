import { App, responseTime } from "@buntok/core";
import { env } from "./env";

export const app = new App();

app.use(responseTime({ format: "ms", header: "X-Response-Time" }));
app.apiDocs({
  title: "API Documentation",
  description: "This is the API documentation for the Buntok project.",
});

app.get("/", (ctx) => {
  return ctx.json({ message: "Hello from Buntok!" });
});

app.listen(env.PORT);
