import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    // Generation is offline, while push/studio use the real configured URL.
    url:
      process.env.DATABASE_URL ??
      "mysql://book-the-lakehouse:development@127.0.0.1:3306/book_the_lakehouse",
  },
  strict: true,
  verbose: true,
});
