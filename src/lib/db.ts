import "server-only";
import { neon } from "@neondatabase/serverless";

// The URL stays on the server. Query values use tagged-template parameters.
export const sql = neon(process.env.DATABASE_URL!);
export const getDb = () => sql;
