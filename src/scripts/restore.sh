#!/bin/bash
###############################################################################
# restore.sh — Restore PostgreSQL database and S3 files from backup
#
# Usage:
#   ./restore.sh                          # Latest backup
#   ./restore.sh 2025-01-15_030000        # Specific backup date
#   ./restore.sh --list                   # List available backups
#   ./restore.sh --db-only                # Restore database only
#   ./restore.sh --s3-only                # Restore S3 files only
#
# WARNING: This will OVERWRITE existing data! Use with caution.
###############################################################################

set -euo pipefail

# ─── Загрузка окружения ──────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "${SCRIPT_DIR}/.env" ]]; then
  set -a
  source "${SCRIPT_DIR}/.env"
  set +a
fi

# ─── Конфигурация ──────────────────────────────────────────────────────────
BACKUP_DIR="${BACKUP_LOCAL_DIR:-/backups}"
DATE="${1:-}" 
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-tmf}"
DB_USER="${DB_USER:-postgres}"
export PGPASSWORD="${DB_PASSWORD:-}"

S3_ENDPOINT="${BACKUP_S3_ENDPOINT:-https://storage.yandexcloud.net}"
SOURCE_S3_BUCKET="${SOURCE_S3_BUCKET:-tmf}"

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

log() {
  echo "[${TIMESTAMP}] [RESTORE] $*" | tee -a "${BACKUP_DIR}/restore.log"
}

###############################################################################
# 1. Восстановление базы данных
###############################################################################
restore_database() {
  log "=== Начало восстановления PostgreSQL ==="

  local backup_file
  if [[ -n "$DATE" ]]; then
    backup_file="${BACKUP_DIR}/db/db_${DATE}.dump.gz"
  else
    backup_file=$(find "${BACKUP_DIR}/db" -name "*.gz" -printf "%p\n" 2>/dev/null | sort -r | head -1)
  fi

  if [[ -z "$backup_file" || ! -f "$backup_file" ]]; then
    log "⚠️  ВНИМАНИЕ: Файл бэкапа БД не найден. Пропускаем."
    return 1
  fi

  log "Найден бэкап: $backup_file"

  # Сначала спрашиваем, потом делаем тяжелые операции
  echo -e "\n⚠️  ВНИМАНИЕ: Это ПЕРЕЗАПИШЕТ базу данных '${DB_NAME}'!"
  read -rp "Продолжить восстановление БД? (y/n): " confirm
  if [[ "$confirm" != "y" ]]; then
    log "Восстановление базы отменено пользователем."
    return 1 # Возвращаем ошибку, чтобы main спросил про S3
  fi

  local tmp_dump="/tmp/restore_${DB_NAME}_$(date +%s).dump"
  log "Распаковка дампа..."
  gunzip -c "$backup_file" > "$tmp_dump"

  log "Восстановление данных..."
  if command -v pv &>/dev/null; then
    pv "$tmp_dump" | pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
      --no-owner --no-privileges --clean --if-exists 2>> "${BACKUP_DIR}/restore.log"
  else
    pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
      --no-owner --no-privileges --clean --if-exists "$tmp_dump" 2>> "${BACKUP_DIR}/restore.log"
  fi

  rm -f "$tmp_dump"
  log "✅ База данных восстановлена успешно."
  return 0
}

###############################################################################
# 2. Восстановление файлов S3
###############################################################################
restore_s3_files() {
  log "=== Начало восстановления файлов S3 ==="
  
  local archive_file
  if [[ -n "$DATE" ]]; then
    archive_file="${BACKUP_DIR}/s3/s3_files_${DATE}.tar.gz"
  else
    archive_file=$(find "${BACKUP_DIR}/s3" -name "*.tar.gz" -printf "%p\n" 2>/dev/null | sort -r | head -1)
  fi

  if [[ -z "$archive_file" || ! -f "$archive_file" ]]; then
    log "⚠️  ВНИМАНИЕ: Архив S3 не найден. Пропускаем."
    return 0
  fi

  log "Найден архив: $archive_file"
  log "Распаковка архива..."
  
  local tmp_dir="/tmp/s3-restore-$$-$(date +%s)"
  mkdir -p "$tmp_dir"
  
  if ! tar xzf "$archive_file" -C "$tmp_dir"; then
    log "❌ Ошибка распаковки архива S3"
    rm -rf "$tmp_dir"
    return 1
  fi

  log "Синхронизация с бакетом ${SOURCE_S3_BUCKET}..."
  
  # Запускаем синхронизацию и ждём её завершения
  set +e  # Временно отключаем exit on error
  local sync_output
  sync_output=$(aws s3 sync "$tmp_dir" "s3://${SOURCE_S3_BUCKET}" \
    --endpoint-url "$S3_ENDPOINT" 2>&1)
  local sync_exit_code=$?
  set -e  # Включаем обратно
  
  # Подсчитываем количество загруженных файлов
  local upload_count=0
  if [[ -n "$sync_output" ]]; then
    upload_count=$(echo "$sync_output" | grep -c "upload:" || true)
  fi
  
  if [[ $sync_exit_code -eq 0 ]]; then
    if [[ $upload_count -eq 0 ]]; then
      log "✅ S3 уже в актуальном состоянии (ни одного файла не загружено)"
    else
      log "✅ Файлы S3 восстановлены. Загружено файлов: ${upload_count}"
    fi
  else
    log "❌ Ошибка синхронизации S3 (код: ${sync_exit_code})"
    log "Последние строки вывода: ${sync_output}"
    rm -rf "$tmp_dir"
    return 1
  fi

  # Очистка
  rm -rf "$tmp_dir"
  log "=== Восстановление S3 завершено ==="
  return 0
}

###############################################################################
# Main
###############################################################################
main() {
  log "========================================="
  log "Утилита восстановления запущена"
  log "========================================="

  if [[ -z "${PGPASSWORD}" ]]; then
    log "ОШИБКА: Пароль БД (DB_PASSWORD) не найден в .env"
    exit 1
  fi

  # Если БД не восстановили (отказ или нет файла), спрашиваем про S3 отдельно
  if ! restore_database; then
    echo -e "\n"
    read -rp "База не восстановлена. Все равно восстановить файлы S3? (y/n): " confirm_s3
    if [[ "$confirm_s3" == "y" ]]; then
      restore_s3_files
    else
      log "Восстановление полностью прервано."
    fi
  else
    # Если БД восстановили успешно, просто идем к S3
    restore_s3_files
  fi

  log "Работа завершена."
}

main "$@"