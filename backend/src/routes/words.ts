import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import type { WordRepository } from "../db/word-repository.js";

const RequestBodySchema = z.object({
  word: z.string().min(1),
  sentence: z.string().min(1),
  sourceUrl: z.string().url(),
  sourceTitle: z.string().min(1),
  capturedAt: z.string().min(1),
});

const SuccessSchema = z.object({
  id: z.string(),
  translation: z.string(),
});

const ErrorSchema = z.object({ error: z.string() });

const postWordsRoute = createRoute({
  method: "post",
  path: "/words",
  request: {
    body: {
      content: {
        "application/json": {
          schema: RequestBodySchema,
          example: {
            word: "ephemeral",
            sentence: "The beauty of the moment was ephemeral, lasting only a few seconds.",
            sourceUrl: "https://example.com/article",
            sourceTitle: "Example Article",
            capturedAt: "2026-05-11T10:00:00Z",
          },
        },
      },
      required: true,
    },
  },
  responses: {
    201: { description: "Word created", content: { "application/json": { schema: SuccessSchema } } },
    400: { description: "Validation error", content: { "application/json": { schema: ErrorSchema } } },
    502: { description: "Translation unavailable", content: { "application/json": { schema: ErrorSchema } } },
  },
});

type Deps = {
  repo: WordRepository;
  translate: (word: string, sentence: string) => Promise<string>;
};

export function createWordsRouter({ repo, translate }: Deps) {
  const router = new OpenAPIHono({
    defaultHook: (result, c) => {
      if (!result.success) {
        return c.json({ error: result.error.issues.map((i) => i.message).join(", ") }, 400);
      }
    },
  });

  router.openapi(postWordsRoute, async (c) => {
    const body = c.req.valid("json");

    const word = await repo.insertWord({ word: body.word });
    await repo.insertWordContext({
      wordId: word.id,
      sentence: body.sentence,
      sourceUrl: body.sourceUrl,
      sourceTitle: body.sourceTitle,
      capturedAt: body.capturedAt,
    });

    let translation: string;
    try {
      translation = await translate(body.word, body.sentence);
    } catch {
      return c.json({ error: "Translation unavailable" }, 502);
    }

    await repo.updateTranslation(word.id, translation);

    return c.json({ id: word.id, translation }, 201);
  });

  return router;
}
