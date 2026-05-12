import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { env } from "./env.js";
import { logger } from "./logger.js";

const app = createApp();

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  logger.info(`Server running on port ${info.port}`);
});
