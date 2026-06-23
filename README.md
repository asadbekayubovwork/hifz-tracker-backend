# Hifz Maktab — Backend API

Express + JSON-file persistence (zero native dependencies). JWT autentifikatsiya.

## Ishga tushirish

```bash
cd server
npm install
npm run dev      # node --watch (http://localhost:4000)
# yoki
npm start
```

Ma'lumotlar `server/data/db.json` faylida saqlanadi (birinchi ishga tushganda seed'dan yaratiladi).
Qayta seed qilish: `npm run seed`.

## Muhit o'zgaruvchilari (ixtiyoriy)

| O'zgaruvchi | Default | Izoh |
|---|---|---|
| `PORT` | `4000` | Server porti |
| `JWT_SECRET` | dev secret | Productionда **albatta** o'zgartiring |
| `TEACHER_PASSWORD` | `ustoz` | Ustoz paroli |
| `CORS_ORIGINS` | `localhost:5173,4173` | Ruxsat etilgan frontend manzillari |

## API

Barcha `/api/students*` GET'lar token talab qiladi. Yozish (POST/PATCH) faqat **ustoz** uchun.

| Metod | Yo'l | Rol | Tavsif |
|---|---|---|---|
| GET | `/api/health` | — | Holat tekshiruvi |
| POST | `/api/auth/login/teacher` | — | `{ password }` → `{ token, user }` |
| POST | `/api/auth/login/student` | — | `{ studentId }` → `{ token, user }` |
| GET | `/api/auth/me` | auth | Sessiyani tiklash |
| GET | `/api/suras` | — | 114 sura ro'yxati |
| GET | `/api/students` | auth | Barcha o'quvchilar (status bilan) |
| GET | `/api/students/:id` | auth | Bitta o'quvchi |
| POST | `/api/students` | ustoz | Yangi o'quvchi |
| PATCH | `/api/students/:id/suras/:num` | ustoz | Sura holatini o'zgartirish (`{status?}` — bo'sh bo'lsa aylanadi) |
| POST | `/api/students/:id/comments` | ustoz | Izoh qo'shish |
