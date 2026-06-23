import { Router } from "express";
import { signToken, requireAuth } from "../auth.js";
import { TEACHER_PASSWORD, TEACHER_NAME, TEACHER_ROLE_LABEL } from "../config.js";
import { getStudent, getStudents } from "../db.js";

const router = Router();

// GET /api/auth/students — public roster for the login picker (no progress data).
router.get("/students", (_req, res) => {
  const roster = getStudents().map(({ id, name, initials, color, joined }) => ({
    id, name, initials, color, joined,
  }));
  res.json({ students: roster });
});

// POST /api/auth/login/teacher  { password }
router.post("/login/teacher", (req, res) => {
  const { password } = req.body || {};
  if (password !== TEACHER_PASSWORD) {
    return res.status(401).json({ error: "Parol noto'g'ri." });
  }
  const user = { role: "teacher", name: TEACHER_NAME, roleLabel: TEACHER_ROLE_LABEL, initials: "A" };
  const token = signToken(user);
  res.json({ token, user });
});

// POST /api/auth/login/student  { studentId }
router.post("/login/student", (req, res) => {
  const { studentId } = req.body || {};
  const student = getStudent(studentId);
  if (!student) {
    return res.status(404).json({ error: "Bunday o'quvchi topilmadi." });
  }
  const user = {
    role: "student", studentId: student.id, name: student.name,
    roleLabel: "O'quvchi", initials: student.initials, color: student.color,
  };
  const token = signToken(user);
  res.json({ token, user });
});

// GET /api/auth/me — restore session from token
router.get("/me", requireAuth, (req, res) => {
  const { iat, exp, ...user } = req.user;
  // Refresh student profile fields in case they changed since the token was issued.
  if (user.role === "student") {
    const student = getStudent(user.studentId);
    if (!student) return res.status(404).json({ error: "O'quvchi topilmadi." });
    user.name = student.name;
    user.initials = student.initials;
    user.color = student.color;
  }
  res.json({ user });
});

export default router;
