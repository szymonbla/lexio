import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import type { WordRepository } from "../db/word-repository.js";

const RequestBodySchema = z.object({
  word: z.string().min(1),
  sentence: z.string().min(1),
  sourceUrl: z.string().url(),
  sourceTitle: z.string().min(1),
});

const CreatedSchema = z.object({
  id: z.string(),
  translation: z.string(),
});

const DuplicateSchema = z.object({
  duplicate: z.literal(true),
  existingWord: z.object({ id: z.string(), status: z.string() }),
});

const ErrorSchema = z.object({ error: z.string() });

const postWordsRoute = createRoute({
  method: "post",
  path: "/words",
  tags: ["words"],
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
          },
        },
      },
      required: true,
    },
  },
  responses: {
    200: { description: "Duplicate — word already in collection", content: { "application/json": { schema: DuplicateSchema } } },
    201: { description: "Word created", content: { "application/json": { schema: CreatedSchema } } },
    400: { description: "Validation error", content: { "application/json": { schema: ErrorSchema } } },
    422: { description: "Multi-word input rejected", content: { "application/json": { schema: ErrorSchema } } },
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

    if (/\s/.test(body.word)) {
      return c.json({ error: "word must be a single token" }, 422);
    }

    const { word, isNew } = await repo.captureWord({
      word: body.word,
      sentence: body.sentence,
      sourceUrl: body.sourceUrl,
      sourceTitle: body.sourceTitle,
    });

    if (!isNew) {
      return c.json({ duplicate: true as const, existingWord: { id: word.id, status: word.status } }, 200);
    }

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
