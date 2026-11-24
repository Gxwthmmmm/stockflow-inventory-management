import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../config/db";
import { authenticate, AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();
const signupSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
  organizationName: z.string().trim().min(2).max(150)
});
const loginSchema = z.object({ email: z.string().trim().email().max(255), password: z.string().min(1).max(72) });
function makeToken(userId: string, organizationId: string) {
  return jwt.sign({ org: organizationId }, process.env.JWT_SECRET!, {
    subject: userId, expiresIn: (process.env.JWT_EXPIRES_IN || "1d") as jwt.SignOptions["expiresIn"]
  });
}

router.post("/signup", asyncHandler(async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid signup details", errors: parsed.error.flatten() });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const org = await client.query("INSERT INTO organizations(name) VALUES($1) RETURNING id,name", [parsed.data.organizationName]);
    const hash = await bcrypt.hash(parsed.data.password, 12);
    const user = await client.query(
      "INSERT INTO users(organization_id,email,password_hash) VALUES($1,$2,$3) RETURNING id,organization_id,email",
      [org.rows[0].id, parsed.data.email.toLowerCase(), hash]
    );
    await client.query("INSERT INTO organization_settings(organization_id) VALUES($1)", [org.rows[0].id]);
    await client.query("COMMIT");
    return res.status(201).json({
      token: makeToken(user.rows[0].id, user.rows[0].organization_id),
      user: user.rows[0], organization: org.rows[0]
    });
  } catch (err: any) {
    await client.query("ROLLBACK");
    if (err.code === "23505") return res.status(409).json({ message: "An account with this email already exists" });
    throw err;
  } finally { client.release(); }
}));

router.post("/login", asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Email and password are required" });
  const result = await pool.query("SELECT id,organization_id,email,password_hash FROM users WHERE email=$1", [parsed.data.email.toLowerCase()]);
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(parsed.data.password, user.password_hash)))
    return res.status(401).json({ message: "Invalid email or password" });
  return res.json({
    token: makeToken(user.id, user.organization_id),
    user: { id: user.id, organization_id: user.organization_id, email: user.email }
  });
}));

router.get("/me", authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const result = await pool.query(
    "SELECT u.id,u.email,u.organization_id,o.name AS organization_name FROM users u JOIN organizations o ON o.id=u.organization_id WHERE u.id=$1 AND u.organization_id=$2",
    [req.auth!.userId, req.auth!.organizationId]
  );
  if (!result.rows[0]) return res.status(404).json({ message: "Account not found" });
  return res.json({ user: result.rows[0] });
}));
export default router;
