import { app } from "./src/index";
import { env } from "./src/env";

export default {
  port: Number(env.PORT) || 1212,
  fetch: app.fetch.bind(app),
};
