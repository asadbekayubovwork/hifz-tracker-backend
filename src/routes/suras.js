import { Router } from "express";
import { SURAS } from "../seedData.js";

const router = Router();

// GET /api/suras — static reference list (number, arabic, transliteration, ayahCount)
router.get("/", (_req, res) => {
  const suras = SURAS.map(([num, arabic, translit, ayah]) => ({ num, arabic, translit, ayah }));
  res.json({ suras });
});

export default router;
