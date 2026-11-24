import { Router } from "express";
import { z } from "zod";
import { pool } from "../config/db";
import { authenticate, AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
const router = Router();
router.use(authenticate);
const schema = z.object({
  name: z.string().trim().min(1).max(150), sku: z.string().trim().min(1).max(100),
  description: z.string().max(2000).nullable().optional(), quantity_on_hand: z.number().int().min(0),
  cost_price: z.number().min(0).nullable().optional(), selling_price: z.number().min(0).nullable().optional(),
  low_stock_threshold: z.number().int().min(0).nullable().optional()
});
const allowed = ["name","sku","description","quantity_on_hand","cost_price","selling_price","low_stock_threshold"];
router.get("/", asyncHandler(async (req: AuthRequest,res) => {
  const search = String(req.query.search || "").trim();
  const result = await pool.query(
    "SELECT * FROM products WHERE organization_id=$1 AND ($2='' OR name ILIKE '%' || $2 || '%' OR sku ILIKE '%' || $2 || '%') ORDER BY updated_at DESC",
    [req.auth!.organizationId,search]
  );
  return res.json({ products: result.rows });
}));
router.post("/", asyncHandler(async (req: AuthRequest,res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid product details", errors: parsed.error.flatten() });
  const p = parsed.data;
  try {
    const result = await pool.query(
      "INSERT INTO products(organization_id,name,sku,description,quantity_on_hand,cost_price,selling_price,low_stock_threshold) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",
      [req.auth!.organizationId,p.name,p.sku,p.description ?? null,p.quantity_on_hand,p.cost_price ?? null,p.selling_price ?? null,p.low_stock_threshold ?? null]
    );
    return res.status(201).json({ product: result.rows[0] });
  } catch (err: any) {
    if (err.code === "23505") return res.status(409).json({ message: "SKU already exists in your organization" });
    throw err;
  }
}));
router.get("/:id", asyncHandler(async (req: AuthRequest,res) => {
  const result = await pool.query("SELECT * FROM products WHERE id=$1 AND organization_id=$2", [req.params.id,req.auth!.organizationId]);
  if (!result.rows[0]) return res.status(404).json({ message: "Product not found" });
  return res.json({ product: result.rows[0] });
}));
router.patch("/:id", asyncHandler(async (req: AuthRequest,res) => {
  const parsed = schema.partial().safeParse(req.body);
  if (!parsed.success || Object.keys(req.body || {}).length === 0) return res.status(400).json({ message: "Invalid product update" });
  const keys = allowed.filter(k => Object.prototype.hasOwnProperty.call(parsed.data,k));
  if (keys.length === 0) return res.status(400).json({ message: "No supported product fields supplied" });
  const values: any[] = keys.map(k => (parsed.data as any)[k]);
  const setClause = keys.map((k,i) => k + "=$" + (i+3)).join(",");
  values.push(req.params.id,req.auth!.organizationId);
  try {
    const result = await pool.query(
      "UPDATE products SET " + setClause + ",updated_at=NOW() WHERE id=$" + (values.length-1) + " AND organization_id=$" + values.length + " RETURNING *",
      values
    );
    if (!result.rows[0]) return res.status(404).json({ message: "Product not found" });
    return res.json({ product: result.rows[0] });
  } catch (err: any) {
    if (err.code === "23505") return res.status(409).json({ message: "SKU already exists in your organization" });
    throw err;
  }
}));
router.delete("/:id", asyncHandler(async (req: AuthRequest,res) => {
  const result = await pool.query("DELETE FROM products WHERE id=$1 AND organization_id=$2 RETURNING id", [req.params.id,req.auth!.organizationId]);
  if (!result.rows[0]) return res.status(404).json({ message: "Product not found" });
  return res.status(204).send();
}));
export default router;
