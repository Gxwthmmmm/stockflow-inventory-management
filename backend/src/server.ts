import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { app } from "./app";
import { pool } from "./config/db";

const port = Number(process.env.PORT || 5000);
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters");
}

async function start() {
  try {
    const schema = readFileSync(join(process.cwd(), "src/db/schema.sql"), "utf8");
    await pool.query(schema);
    await pool.query("SELECT 1");
    console.log("PostgreSQL connected and schema is ready");
    app.listen(port, () => console.log("StockFlow API listening on " + port));
  } catch (error) {
    console.error("Unable to initialize StockFlow API", error);
    process.exit(1);
  }
}
void start();
