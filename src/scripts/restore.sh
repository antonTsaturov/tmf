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

# ─── Load environment ──────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ -f "${SCRIPT_DIR}/.env" ]]; then
  set -a
  source "${SCRIPT_DIR}/.env"
  set +a
fi

# ─── Configuration ──────────────────────────────────────────────────────────
BACKUP_DIR="${BACKUP_LOCAL_DIR:-/backups}"
DATE="${1:-}"  # Optional: specific backup date
RESTORE_DB_ONLY=false
RESTORE_S3_ONLY=false
LIST_ONLY=false

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-tmf}"
DB_USER="${DB_USER:-postgres}"
export PGPASSWORD="${DB_PASSWORD:-}"

S3_BACKUP_DIR="${BACKUP_S3_BUCKET:-}"
S3_ENDPOINT="${BACKUP_S3_ENDPOINT:-https://storage.yandexcloud.net}"
S3_ACCESS_KEY="${BACKUP_S3_ACCESS_KEY:-}"
S3_SECRET_KEY="${BACKUP_S3_SECRET_KEY:-}"
SOURCE_S3_BUCKET="${SOURCE_S3_BUCKET:-}"

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# ─── Logging ────────────────────────────────────────────────────────────────
log() {
  echo "[${TIMESTAMP}] [RESTORE] $*" | tee -a "${BACKUP_DIR}/restore.log"
}

# ─── Parse arguments ───────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --list)
      LIST_ONLY=true
      shift
      ;;
    --db-only)
      RESTORE_DB_ONLY=true
      shift
      ;;
    --s3-only)
      RESTORE_S3_ONLY=true
      shift
      ;;
    --force)
      FORCE=true
      shift
      ;;
    -*)
      echo "Unknown option: $1"
      echo "Usage: $0 [--list] [--db-only] [--s3-only] [--force] [DATE]"
      exit 1
      ;;
    *)
      DATE="$1"
      shift
      ;;
  esac
done

# ─── AWS CLI helper ─────────────────────────────────────────────────────────
configure_aws() {
  export AWS_ACCESS_KEY_ID="${S3_ACCESS_KEY}"
  export AWS_SECRET_ACCESS_KEY="${S3_SECRET_KEY}"
  export AWS_DEFAULT_REGION="ru-central1"
}

###############################################################################
# List available backups
###############################################################################
list_backups() {
  log "========================================="
  log "Available Backups"
  log "========================================="

  # Local database backups
  log "Local database backups:"
  if [[ -d "${BACKUP_DIR}/db" ]]; then
    find "${BACKUP_DIR}/db" -name "*.gz" -printf "  📦 %f  %s bytes  %T+\n" 2>/dev/null \
      | sort -k4 -r | head -20
  else
    log "  (none found)"
  fi

  # Local S3 archives
  log "Local S3 archives:"
  if [[ -d "${BACKUP_DIR}/s3" ]]; then
    find "${BACKUP_DIR}/s3" -name "*.tar.gz" -printf "  📦 %f  %s bytes  %T+\n" 2>/dev/null \
      | sort -k4 -r | head -20
  else
    log "  (none found)"
  fi

  # S3 backups (if configured)
  if [[ -n "${S3_BACKUP_DIR}" && -n "${S3_ACCESS_KEY}" ]]; then
    log "S3 remote backups:"
    configure_aws
    aws s3 ls "${S3_BACKUP_DIR}/db/" \
      --endpoint-url "$S3_ENDPOINT" \
      2>/dev/null | while read -r _ _ _ key; do
      echo "  ☁️  $key"
    done || log "  (could not list S3 backups)"
  fi
}

###############################################################################
# 1. Restore PostgreSQL database
###############################################################################
restore_database() {
  log "=== Starting PostgreSQL restore ==="

  # Find backup file
  local backup_file
  if [[ -n "$DATE" ]]; then
    backup_file="${BACKUP_DIR}/db/db_${DATE}.dump.gz"
  else
    # Use latest backup
    backup_file=$(find "${BACKUP_DIR}/db" -name "*.gz" -printf "%p\n" 2>/dev/null | sort -r | head -1)
  fi

  if [[ -z "$backup_file" || ! -f "$backup_file" ]]; then
    log "ERROR: Backup file not found: $backup_file"
    log "Run '$0 --list' to see available backups"
    return 1
  fi

  log "Restoring from: $backup_file"

  # Verify backup integrity
  log "Verifying backup integrity..."
  if ! pg_restore --list "$backup_file" &>/dev/null; then
    log "ERROR: Backup file is corrupted: $backup_file"
    return 1
  fi
  log "Backup verification: OK"

  # Safety confirmation
  if [[ "${FORCE:-false}" != "true" ]]; then
    echo ""
    echo "⚠️  WARNING: This will OVERWRITE the database '${DB_NAME}' on ${DB_HOST}!"
    echo "   All current data will be lost."
    echo ""
    echo "Available options:"
    echo "  1) Create a backup of current database first (RECOMMENDED)"
    echo "  2) Proceed with restore"
    echo "  3) Cancel"
    echo ""
    read -rp "Choose (1/2/3): " choice

    case "$choice" in
      1)
        log "Creating backup of current database first..."
        local pre_backup="${BACKUP_DIR}/db/pre_restore_$(date +%F_%H%M%S).dump.gz"
        pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
          -F c -Z 9 -f "${pre_backup%.gz}" --no-owner --no-privileges 2>&1
        gzip -9 "${pre_backup%.gz}"
        log "Pre-restore backup saved to: $pre_backup"
        ;;
      2)
        log "Proceeding with restore (user confirmed)..."
        ;;
      3)
        log "Restore cancelled by user"
        exit 0
        ;;
      *)
        log "Invalid choice. Restore cancelled."
        exit 1
        ;;
    esac
  fi

  # Option: restore to a new database for safety
  echo ""
  echo "Restore options:"
  echo "  1) Overwrite existing database '${DB_NAME}'"
  echo "  2) Restore to a new database (safe)"
  echo ""
  read -rp "Choose (1/2): " restore_choice

  local target_db="$DB_NAME"
  if [[ "$restore_choice" == "2" ]]; then
    read -rp "New database name: " new_db_name
    target_db="${new_db_name:-${DB_NAME}_restore_$(date +%F)}"

    log "Creating new database: $target_db"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
      -c "CREATE DATABASE ${target_db};" 2>/dev/null || true
  fi

  # Restore
  local start_time=$(date +%s)
  log "Restoring database '${target_db}' from backup..."

  pg_restore \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$target_db" \
    --no-owner \
    --no-privileges \
    --verbose \
    "$backup_file" \
    2>&1 | tee -a "${BACKUP_DIR}/restore.log"

  local end_time=$(date +%s)
  local duration=$(( end_time - start_time ))

  # Verify restored database
  log "Verifying restored database..."
  local table_count
  table_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$target_db" -t -c \
    "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')

  log "Restore complete in ${duration}s. Tables in '${target_db}': ${table_count}"

  if [[ "$target_db" != "$DB_NAME" ]]; then
    log ""
    log "✅ Restored to NEW database: ${target_db}"
    log "   Original database '${DB_NAME}' is untouched."
    log "   To switch: update DATABASE_URL to use '${target_db}'"
  else
    log "✅ Database '${DB_NAME}' restored successfully"
  fi
}

###############################################################################
# 2. Restore S3 files
###############################################################################
restore_s3_files() {
  log "=== Starting S3 files restore ==="

  if [[ -z "${SOURCE_S3_BUCKET}" ]]; then
    log "ERROR: SOURCE_S3_BUCKET not set. Cannot determine target bucket."
    return 1
  fi

  configure_aws

  # Find backup archive
  local archive_file
  if [[ -n "$DATE" ]]; then
    # Try local first, then S3
    archive_file="${BACKUP_DIR}/s3/s3_files_${DATE}.tar.gz"
    if [[ ! -f "$archive_file" ]]; then
      log "Local archive not found, downloading from S3..."
      mkdir -p "${BACKUP_DIR}/s3"
      aws s3 cp "${S3_BACKUP_DIR}/archives/s3_files_${DATE}.tar.gz" \
        "${BACKUP_DIR}/s3/" \
        --endpoint-url "$S3_ENDPOINT" 2>&1 || {
        log "ERROR: S3 archive not found for date: ${DATE}"
        return 1
      }
      archive_file="${BACKUP_DIR}/s3/s3_files_${DATE}.tar.gz"
    fi
  else
    archive_file=$(find "${BACKUP_DIR}/s3" -name "*.tar.gz" -printf "%p\n" 2>/dev/null | sort -r | head -1)
  fi

  if [[ -z "$archive_file" || ! -f "$archive_file" ]]; then
    log "ERROR: S3 archive not found. Run '$0 --list' to see available backups."
    return 1
  fi

  log "Restoring S3 files from: $archive_file"

  # Safety: confirm
  if [[ "${FORCE:-false}" != "true" ]]; then
    echo ""
    echo "⚠️  WARNING: This will OVERWRITE files in S3 bucket '${SOURCE_S3_BUCKET}'!"
    echo ""
    read -rp "Type 'yes' to confirm: " confirm

    if [[ "$confirm" != "yes" ]]; then
      log "Restore cancelled by user"
      exit 0
    fi
  fi

  # Extract and upload
  local tmp_dir="/tmp/s3-restore-${DATE:-latest}"
  log "Extracting archive to ${tmp_dir}..."
  mkdir -p "$tmp_dir"
  tar xzf "$archive_file" -C "$tmp_dir"

  local file_count=$(find "$tmp_dir" -type f | wc -l)
  log "Extracted ${file_count} files. Uploading to S3..."

  aws s3 sync \
    "$tmp_dir" \
    "s3://${SOURCE_S3_BUCKET}" \
    --endpoint-url "$S3_ENDPOINT" \
    --storage-class STANDARD \
    --quiet \
    2>&1 | tee -a "${BACKUP_DIR}/restore.log"

  rm -rf "$tmp_dir"

  log "✅ S3 files restored: ${file_count} files uploaded to s3://${SOURCE_S3_BUCKET}"
}

###############################################################################
# Main
###############################################################################
main() {
  log "========================================="
  log "Restore utility started"
  log "========================================="

  if $LIST_ONLY; then
    list_backups
    exit 0
  fi

  if [[ -z "${PGPASSWORD}" ]]; then
    log "ERROR: DB_PASSWORD is not set. See backup.env.example"
    exit 1
  fi

  local failed=false

  if [[ "$RESTORE_S3_ONLY" != "true" ]]; then
    restore_database || failed=true
  fi

  if [[ "$RESTORE_DB_ONLY" != "true" ]]; then
    restore_s3_files || failed=true
  fi

  if $failed; then
    log "Restore completed with ERRORS"
    exit 1
  else
    log "Restore completed SUCCESSFULLY"
  fi
}

main "$@"
