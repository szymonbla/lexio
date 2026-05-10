import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { env } from "../env.js";
import * as schema from "./schema.js";

const sqlite = new Database(env.DATABASE_PATH);
export const db = drizzle(sqlite, { schema });
