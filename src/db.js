import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildInitialStudents, STUDENT_COLORS, AYAH_COUNTS } from "./seedData.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

function defaultData() {
  return { students: buildInitialStudents() };
}

let cache = null;

function ensureLoaded() {
  if (cache) return cache;
  try {
    if (fs.existsSync(DB_FILE)) {
      cache = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    }
  } catch (err) {
    console.error("[db] failed to read db.json, reseeding:", err.message);
  }
  if (!cache || !Array.isArray(cache.students)) {
    cache = defaultData();
    persist();
  }
  if (migrateAyahs(cache)) persist();
  return cache;
}

// Migrate legacy per-sura status maps to per-ayah memorized counts.
// Runs once: a student already carrying `ayahs` is left untouched.
//   memorized -> full ayah count   progress -> ~half (teacher refines)   none -> 0
// Returns true if any student was migrated (so the caller can persist).
function migrateAyahs(db) {
  let changed = false;
  for (const student of db.students) {
    if (student.ayahs && typeof student.ayahs === "object") continue;
    const status = student.status || {};
    const ayahs = {};
    for (let n = 1; n <= 114; n++) {
      const full = AYAH_COUNTS[n];
      const s = status[n] || "none";
      ayahs[n] = s === "memorized" ? full : s === "progress" ? Math.round(full / 2) : 0;
    }
    student.ayahs = ayahs;
    delete student.status;
    changed = true;
  }
  return changed;
}

function persist() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  // Write atomically: temp file then rename, so a crash mid-write can't corrupt db.json.
  const tmp = DB_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(cache, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

export function reset() {
  cache = defaultData();
  persist();
  return cache;
}

export function getStudents() {
  return ensureLoaded().students;
}

export function getStudent(id) {
  return getStudents().find((s) => s.id === id) || null;
}

// Normalize a login/username: lowercase, trimmed, safe characters only.
export function normUsername(s) {
  return (s ?? "").toString().trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "");
}

// A student's effective login — explicit `username`, falling back to `id` for
// records created before usernames existed.
function loginOf(s) {
  return s.username || s.id;
}

// A student's effective password — explicit `password`, falling back to login.
function passwordOf(s) {
  return s.password || loginOf(s);
}

export function getStudentByUsername(username) {
  const u = normUsername(username);
  if (!u) return null;
  return getStudents().find((s) => loginOf(s) === u) || null;
}

// True when `password` matches the student's stored (or fallback) password.
export function checkStudentPassword(student, password) {
  return student && passwordOf(student) === (password ?? "").toString();
}

// Set how many ayahs of a sura the student has memorized (0..ayahCount).
// Out-of-range counts are clamped. This is the source of truth; the three
// display states (none / progress / memorized) are derived from it.
export function setSuraAyahs(id, num, count) {
  const db = ensureLoaded();
  const student = db.students.find((s) => s.id === id);
  if (!student) return null;
  if (num < 1 || num > 114) return null;
  const full = AYAH_COUNTS[num];
  let c = Math.round(Number(count));
  if (!Number.isFinite(c)) return null;
  c = Math.max(0, Math.min(full, c));
  student.ayahs = { ...(student.ayahs || {}), [num]: c };
  persist();
  return student;
}

const VALID_STATUS = new Set(["none", "progress", "memorized"]);

// Legacy-friendly setter: map a status keyword to an ayah count, or (when
// `status` is undefined) toggle between empty and fully memorized.
export function setSuraStatus(id, num, status) {
  if (num < 1 || num > 114) return null;
  const full = AYAH_COUNTS[num];
  let count;
  if (status === "memorized") count = full;
  else if (status === "progress") count = Math.round(full / 2);
  else if (status === "none") count = 0;
  else if (status === undefined) {
    const cur = getStudent(id)?.ayahs?.[num] || 0;
    count = cur >= full ? 0 : full;
  } else if (!VALID_STATUS.has(status)) {
    return null;
  }
  return setSuraAyahs(id, num, count);
}

// Derive 1–2 letter initials from a name (e.g. "Ali Valiyev" -> "AV").
function initialsFrom(name) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Y";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function uniqueId(db, base) {
  let id = base || "oquvchi";
  let i = 2;
  while (db.students.some((s) => s.id === id)) id = `${base}-${i++}`;
  return id;
}

function uniqueUsername(db, base) {
  const root = base || "oquvchi";
  let u = root;
  let i = 2;
  while (db.students.some((s) => (s.username || s.id) === u)) u = `${root}${i++}`;
  return u;
}

export function addStudent(partial = {}) {
  const db = ensureLoaded();
  const name = (partial.name || "").trim() || "Yangi o'quvchi";
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "oquvchi";
  const id = partial.id || uniqueId(db, slug);
  // Login: explicit username, else derived from the name. Password defaults to
  // the username (admin tells the student "login = parol = <username>").
  const username = uniqueUsername(db, normUsername(partial.username) || normUsername(slug) || "oquvchi");
  const password = (partial.password ? partial.password.toString() : "") || username;
  const ayahs = {};
  for (let n = 1; n <= 114; n++) ayahs[n] = 0;
  const student = {
    id,
    username,
    password,
    name,
    initials: partial.initials || initialsFrom(name),
    color: partial.color || STUDENT_COLORS[db.students.length % STUDENT_COLORS.length],
    joined: partial.joined || "Bugun",
    grade: partial.grade || "—",
    ayahs,
    activity: [],
    comments: [],
  };
  db.students.push(student);
  persist();
  return student;
}

export function deleteStudent(id) {
  const db = ensureLoaded();
  const idx = db.students.findIndex((s) => s.id === id);
  if (idx === -1) return false;
  db.students.splice(idx, 1);
  persist();
  return true;
}

export function addComment(id, text) {
  const trimmed = (text || "").trim();
  if (!trimmed) return null;
  const student = getStudent(id);
  if (!student) return null;
  student.comments = [{ text: trimmed, date: "Bugun" }, ...student.comments];
  persist();
  return student;
}
