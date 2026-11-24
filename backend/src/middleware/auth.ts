import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
export interface AuthRequest extends Request {
  auth?: { userId: string; organizationId: string };
}
export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return res.status(401).json({ message: "Authentication required" });
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET missing");
    const payload = jwt.verify(header.slice(7), secret);
    if (typeof payload === "string" || typeof payload.sub !== "string" || typeof payload.org !== "string")
      return res.status(401).json({ message: "Invalid token" });
    req.auth = { userId: payload.sub, organizationId: payload.org };
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
