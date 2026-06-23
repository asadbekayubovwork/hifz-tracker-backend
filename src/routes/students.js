import { Router } from "express";
import { requireAuth, requireTeacher } from "../auth.js";
import * as db from "../db.js";

const router = Router();

// All student data is readable by any authenticated user (students need the
// leaderboard + peers' progress). Writes are teacher-only.

// GET /api/students
router.get("/", requireAuth, (_req, res) => {
  res.json({ students: db.getStudents() });
});

// GET /api/students/:id
router.get("/:id", requireAuth, (req, res) => {
  const student = db.getStudent(req.params.id);
  if (!student) return res.status(404).json({ error: "O'quvchi topilmadi." });
  res.json({ student });
});

// POST /api/students  (teacher) — create a new student
router.post("/", requireAuth, requireTeacher, (req, res) => {
  const student = db.addStudent(req.body || {});
  res.status(201).json({ student });
});

// PATCH /api/students/:id/suras/:num  (teacher) — set or cycle a sura's status
// Body: { status?: "none" | "progress" | "memorized" }. Omit to cycle.
router.patch("/:id/suras/:num", requireAuth, requireTeacher, (req, res) => {
  const num = Number(req.params.num);
  if (!Number.isInteger(num) || num < 1 || num > 114) {
    return res.status(400).json({ error: "Sura raqami 1 dan 114 gacha bo'lishi kerak." });
  }
  const student = db.setSuraStatus(req.params.id, num, req.body?.status);
  if (!student) return res.status(404).json({ error: "O'quvchi yoki holat noto'g'ri." });
  res.json({ student });
});

// POST /api/students/:id/comments  (teacher) — add a comment
router.post("/:id/comments", requireAuth, requireTeacher, (req, res) => {
  const student = db.addComment(req.params.id, req.body?.text);
  if (!student) return res.status(400).json({ error: "Izoh matni bo'sh yoki o'quvchi topilmadi." });
  res.status(201).json({ student });
});

export default router;
