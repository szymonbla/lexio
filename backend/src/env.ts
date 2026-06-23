import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  API_TOKEN: z.string().min(1),
  DEEPL_API_KEY: z.string().min(1),
  DATABASE_PATH: z.string().default("./lexio.db"),
  PORT: z.coerce.number().default(8000),
  NATIVE_LANG: z.string().min(1),
  TARGET_LANG: z.string().min(1),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Missing required environment variables:");
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();
