import { Router } from "express";
import { pool } from "../config/db";
import { authenticate, AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
const router = Router();
router.use(authenticate);
router.get("/", asyncHandler(async (req: AuthRequest,res) => {
  const org = req.auth!.organizationId;
  const settings = await pool.query("SELECT default_low_stock_threshold FROM organization_settings WHERE organization_id=$1",[org]);
  const threshold = settings.rows[0]?.default_low_stock_threshold ?? 5;
  const summary = await pool.query(
    "SELECT COUNT(*)::int AS total_products,COALESCE(SUM(quantity_on_hand),0)::int AS total_units,COUNT(*) FILTER (WHERE quantity_on_hand <= COALESCE(low_stock_threshold,$2))::int AS low_stock_count FROM products WHERE organization_id=$1",
    [org,threshold]
  );
  const lowStock = await pool.query(
    "SELECT id,name,sku,quantity_on_hand,COALESCE(low_stock_threshold,$2) AS effective_low_stock_threshold FROM products WHERE organization_id=$1 AND quantity_on_hand <= COALESCE(low_stock_threshold,$2) ORDER BY quantity_on_hand ASC LIMIT 10",
    [org,threshold]
  );
  return res.json({ summary: summary.rows[0], lowStock: lowStock.rows });
}));
export default router;
