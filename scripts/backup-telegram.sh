#!/usr/bin/env bash
#
# Hifz Maktab — kunlik backup: server/data/db.json faylini Telegram'ga yuboradi.
#
# Sozlash (bir marta):
#   1. Telegram'da @BotFather ga /newbot yozib bot yarating → BOT TOKEN oling.
#   2. O'sha botga "salom" deb yozing (bot sizga yozishi uchun avval siz yozishingiz shart).
#   3. CHAT ID ni oling:
#        curl -s "https://api.telegram.org/bot<TOKEN>/getUpdates" | grep -o '"id":[0-9]*'
#      (yoki @userinfobot ga yozing — u sizning id'ingizni aytadi).
#   4. server/scripts/backup.env faylini yarating (quyidagi namunaga qarang) yoki
#      bu o'zgaruvchilarni cron'da bering.
#
# Qo'lda test:  bash server/scripts/backup-telegram.sh
set -euo pipefail

# --- Skript joylashgan papkadan kelib chiqib yo'llarni aniqlaymiz ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(dirname "$SCRIPT_DIR")"
DB_FILE="$SERVER_DIR/data/db.json"

# --- Konfiguratsiya: backup.env bo'lsa o'qib olamiz (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID) ---
ENV_FILE="$SCRIPT_DIR/backup.env"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

: "${TELEGRAM_BOT_TOKEN:?TELEGRAM_BOT_TOKEN sozlanmagan (backup.env ga yozing)}"
: "${TELEGRAM_CHAT_ID:?TELEGRAM_CHAT_ID sozlanmagan (backup.env ga yozing)}"

if [[ ! -f "$DB_FILE" ]]; then
  echo "[backup] XATO: $DB_FILE topilmadi." >&2
  exit 1
fi

# --- Nusxa nomiga sana-vaqt qo'shamiz: db-2026-06-24_0300.json ---
STAMP="$(date +%Y-%m-%d_%H%M)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
BACKUP_FILE="$TMP_DIR/db-$STAMP.json"
cp "$DB_FILE" "$BACKUP_FILE"

CAPTION="🗄 Hifz Maktab backup — $STAMP"

# --- Telegram'ga document sifatida yuboramiz ---
HTTP_CODE="$(curl -s -o "$TMP_DIR/resp.json" -w '%{http_code}' \
  -F "chat_id=${TELEGRAM_CHAT_ID}" \
  -F "caption=${CAPTION}" \
  -F "document=@${BACKUP_FILE}" \
  "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument")"

if [[ "$HTTP_CODE" == "200" ]]; then
  echo "[backup] OK — $STAMP Telegram'ga yuborildi."
else
  echo "[backup] XATO: Telegram javobi HTTP $HTTP_CODE" >&2
  cat "$TMP_DIR/resp.json" >&2 || true
  exit 1
fi
