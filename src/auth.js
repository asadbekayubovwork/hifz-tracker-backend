import jwt from "jsonwebtoken";
import { JWT_SECRET, TOKEN_TTL } from "./config.js";

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

function readToken(req) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme === "Bearer" && token) return token;
  return null;
}

// Attaches req.user when a valid token is present; 401 otherwise.
export function requireAuth(req, res, next) {
  const token = readToken(req);
  if (!token) return res.status(401).json({ error: "Avtorizatsiya talab qilinadi." });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Token yaroqsiz yoki muddati o'tgan." });
  }
}

// Must run after requireAuth. Restricts a route to teachers.
export function requireTeacher(req, res, next) {
  if (req.user?.role !== "teacher") {
    return res.status(403).json({ error: "Bu amal faqat ustoz uchun." });
  }
  next();
}
