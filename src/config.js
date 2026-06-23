// Central config. Override via environment variables in production.
export const PORT = Number(process.env.PORT) || 4000;

// Secret used to sign JWTs. MUST be overridden in production via JWT_SECRET.
export const JWT_SECRET = process.env.JWT_SECRET || "hifz-maktab-dev-secret-change-me";
export const TOKEN_TTL = process.env.TOKEN_TTL || "7d";

// Demo teacher credentials. In production seed a real user / hashed password.
export const TEACHER_PASSWORD = process.env.TEACHER_PASSWORD || "ustoz";
export const TEACHER_NAME = "Ustoz Abdulloh";
export const TEACHER_ROLE_LABEL = "Murabbiy";

// Comma-separated list of allowed origins for CORS (frontend dev server).
export const CORS_ORIGINS = (process.env.CORS_ORIGINS || "http://localhost:5173,http://localhost:4173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
