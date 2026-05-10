import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "zod";

export const app = new OpenAPIHono();

app.openapi(
  createRoute({
    method: "get",
    path: "/health",
    responses: {
      200: {
        description: "Health check",
        content: { "application/json": { schema: z.object({ status: z.string() }) } },
      },
    },
  }),
  (c) => c.json({ status: "ok" })
);

app.doc("/openapi.json", {
  openapi: "3.0.0",
  info: { title: "Lexio API", version: "0.1.0" },
});

app.get("/swagger", swaggerUI({ url: "/openapi.json" }));
