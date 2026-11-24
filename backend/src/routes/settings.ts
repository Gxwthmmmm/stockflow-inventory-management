import { Router } from "express";
import { z } from "zod";
import { pool } from "../config/db";
import { authenticate, AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
const router = Router();
router.use(authenticate);
router.get("/", asyncHandler(async (req: AuthRequest,res) => {
  const result = await pool.query("SELECT default_low_stock_threshold FROM organization_settings WHERE organization_id=$1",[req.auth!.organizationId]);
  return res.json({ settings: result.rows[0] || { default_low_stock_threshold: 5 } });
}));
router.patch("/", asyncHandler(async (req: AuthRequest,res) => {
  const parsed = z.object({ default_low_stock_threshold: z.number().int().min(0).max(100000) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Threshold must be a non-negative integer" });
  const result = await pool.query(
    "INSERT INTO organization_settings(organization_id,default_low_stock_threshold) VALUES($1,$2) ON CONFLICT(organization_id) DO UPDATE SET default_low_stock_threshold=EXCLUDED.default_low_stock_threshold,updated_at=NOW() RETURNING default_low_stock_threshold",
    [req.auth!.organizationId,parsed.data.default_low_stock_threshold]
  );
  return res.json({ settings: result.rows[0] });
}));
export default router;
