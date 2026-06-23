import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { z } from "zod";
import * as schema from "./db/schema.js";
import { WordRepository } from "./db/word-repository.js";
import { createDeepLTranslator } from "./deepl-client.js";
import { env } from "./env.js";
import { logger } from "./logger.js";
import { createWordsRouter } from "./routes/words.js";

export function createApp() {
  const app = new OpenAPIHono();

  app.use(async (c, next) => {
    const start = Date.now();
    await next();
    logger.info({ method: c.req.method, path: c.req.path, status: c.res.status, ms: Date.now() - start });
  });

  app.openapi(
    createRoute({
      method: "get",
      path: "/health",
      tags: ["health"],
      responses: {
        200: {
          description: "Health check",
          content: { "application/json": { schema: z.object({ status: z.string() }) } },
        },
      },
    }),
    (c) => c.json({ status: "ok" })
  );

  const sqlite = new Database(env.DATABASE_PATH);
  const db = drizzle(sqlite, { schema });

  const wordsRouter = createWordsRouter({
    repo: new WordRepository(db),
    translate: createDeepLTranslator(env.DEEPL_API_KEY, env.TARGET_LANG, env.NATIVE_LANG),
  });

  app.route("/", wordsRouter);

  app.doc("/openapi.json", {
    openapi: "3.0.0",
    info: { title: "Lexio API", version: "0.1.0" },
  });

  app.get("/ui", swaggerUI({ url: "/openapi.json" }));

  return app;
}
