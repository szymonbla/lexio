import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import { db } from "./db/index.js";
import { WordRepository } from "./db/word-repository.js";
import { createDeepLTranslator } from "./deepl-client.js";
import { env } from "./env.js";
import { createWordsRouter } from "./routes/words.js";

export function createApp() {
  const app = new OpenAPIHono();

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

  const wordsRouter = createWordsRouter({
    repo: new WordRepository(db),
    translate: createDeepLTranslator(env.DEEPL_API_KEY),
  });

  app.route("/", wordsRouter);

  app.doc("/openapi.json", {
    openapi: "3.0.0",
    info: { title: "Lexio API", version: "0.1.0" },
  });

  app.get("/ui", swaggerUI({ url: "/openapi.json" }));

  return app;
}
