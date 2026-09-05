import { app } from "./index";

Bun.serve({
  fetch: (req) => app.request(req),
});
