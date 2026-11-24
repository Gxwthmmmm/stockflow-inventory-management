import "dotenv/config";
import { app } from "./app";
import { pool } from "./config/db";
const port = Number(process.env.PORT || 5000);
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error("JWT_SECRET must be at least 32 characters");
pool.query("SELECT 1").then(() => {
  console.log("PostgreSQL connected");
  app.listen(port,() => console.log("StockFlow API listening on " + port));
}).catch(err => { console.error("Unable to connect to PostgreSQL",err); process.exit(1); });
