// Reseed the database from the seed data. Run with: npm run seed
import { reset } from "./db.js";

const data = reset();
console.log(`[seed] database reset — ${data.students.length} students written.`);
