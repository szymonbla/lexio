import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";

export const app = new OpenAPIHono();

app.get("/health", (c) => c.json({ status: "ok" }));

app.doc("/openapi.json", {
  openapi: "3.0.0",
  info: { title: "Lexio API", version: "0.1.0" },
});

app.get("/ui", swaggerUI({ url: "/openapi.json" }));
