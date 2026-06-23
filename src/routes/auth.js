import { Router } from "express";
import { signToken, requireAuth } from "../auth.js";
import { TEACHER_USERNAME, TEACHER_PASSWORD, TEACHER_NAME, TEACHER_ROLE_LABEL } from "../config.js";
import { getStudent, getStudentByUsername, checkStudentPassword, normUsername } from "../db.js";

const router = Router();

// POST /api/auth/login/teacher  { username, password }
router.post("/login/teacher", (req, res) => {
  const { username, password } = req.body || {};
  if (normUsername(username) !== TEACHER_USERNAME || password !== TEACHER_PASSWORD) {
    return res.status(401).json({ error: "Login yoki parol noto'g'ri." });
  }
  const user = { role: "teacher", name: TEACHER_NAME, roleLabel: TEACHER_ROLE_LABEL, initials: "A" };
  const token = signToken(user);
  res.json({ token, user });
});

// POST /api/auth/login/student  { username, password }
router.post("/login/student", (req, res) => {
  const { username, password } = req.body || {};
  const student = getStudentByUsername(username);
  if (!student || !checkStudentPassword(student, password)) {
    return res.status(401).json({ error: "Login yoki parol noto'g'ri." });
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
