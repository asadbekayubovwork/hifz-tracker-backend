import express from "express";
import cors from "cors";
import { PORT, CORS_ORIGINS } from "./config.js";
import authRoutes from "./routes/auth.js";
import studentRoutes from "./routes/students.js";
import suraRoutes from "./routes/suras.js";

const app = express();

app.use(
  cors({
    origin(origin, cb) {
      // Allow same-origin / curl (no origin) and configured frontend origins.
      if (!origin || CORS_ORIGINS.includes(origin)) return cb(null, true);
      cb(new Error("CORS: origin ruxsat etilmagan — " + origin));
    },
  })
);
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/suras", suraRoutes);

// 404 for unknown API routes
app.use("/api", (_req, res) => res.status(404).json({ error: "Topilmadi." }));

// Central error handler
app.use((err, _req, res, _next) => {
  console.error("[server] error:", err.message);
  res.status(500).json({ error: "Server xatosi." });
});

app.listen(PORT, () => {
  console.log(`[server] Hifz Maktab API http://localhost:${PORT}`);
});
