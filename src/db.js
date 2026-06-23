import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildInitialStudents, STUDENT_COLORS } from "./seedData.js";

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
  return cache;
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

const STATUS_CYCLE = ["none", "progress", "memorized"];
const VALID_STATUS = new Set(STATUS_CYCLE);

// Set a sura's status; if `status` is undefined, cycle to the next state.
export function setSuraStatus(id, num, status) {
  const db = ensureLoaded();
  const student = db.students.find((s) => s.id === id);
  if (!student) return null;
  if (num < 1 || num > 114) return null;

  let next;
  if (status === undefined) {
    const cur = student.status[num] || "none";
    next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(cur) + 1) % 3];
  } else {
    if (!VALID_STATUS.has(status)) return null;
    next = status;
  }
  student.status = { ...student.status, [num]: next };
  persist();
  return student;
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
  const status = {};
  for (let n = 1; n <= 114; n++) status[n] = "none";
  const student = {
    id,
    username,
    password,
    name,
    initials: partial.initials || initialsFrom(name),
    color: partial.color || STUDENT_COLORS[db.students.length % STUDENT_COLORS.length],
    joined: partial.joined || "Bugun",
    grade: partial.grade || "—",
    status,
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
