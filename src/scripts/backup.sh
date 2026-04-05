#!/bin/bash
###############################################################################
# backup.sh — PostgreSQL + S3 backup with retention, logging, and verification
#
# Usage:
#   Manual:  ./backup.sh
#   Cron:    0 3 * * * /scripts/backup.sh >> /var/log/backup.log 2>&1
#   Docker:  docker exec tmf-app /scripts/backup.sh
#
# Requires:
#   - pg_dump (postgresql-client)
#   - aws CLI (or aws-cli for Yandex Cloud S3)
#   - Environment variables (see backup.env)
###############################################################################
set -euo pipefail

# ─── Load environment ──────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ -f "${SCRIPT_DIR}/backup.env" ]]; then
  set -a
  source "${SCRIPT_DIR}/backup.env"
  set +a
fi

# ─── Configuration ──────────────────────────────────────────────────────────
BACKUP_DIR="${BACKUP_LOCAL_DIR:-/backups}"
DATE=$(date +%F_%H%M%S)
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

# Database
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-tmf}"
DB_USER="${DB_USER:-postgres}"
export PGPASSWORD="${DB_PASSWORD:-}"

# S3 backup destination (separate bucket from production data!)
S3_BACKUP_DIR="${BACKUP_S3_BUCKET:-}"
S3_ENDPOINT="${BACKUP_S3_ENDPOINT:-https://storage.yandexcloud.net}"
S3_ACCESS_KEY="${BACKUP_S3_ACCESS_KEY:-}"
S3_SECRET_KEY="${BACKUP_S3_SECRET_KEY:-}"

# Source S3 (production data to backup)
SOURCE_S3_BUCKET="${SOURCE_S3_BUCKET:-}"

# Slack webhook for alerts (optional)
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"

# ─── Logging ────────────────────────────────────────────────────────────────
log() {
  echo "[${TIMESTAMP}] [BACKUP] $*" | tee -a "${BACKUP_DIR}/backup.log"
}

# ─── Pre-flight checks ─────────────────────────────────────────────────────
check_prerequisites() {
  local ok=true

  if ! command -v pg_dump &>/dev/null; then
    log "ERROR: pg_dump not found in PATH"
    ok=false
  fi

  if ! command -v aws &>/dev/null; then
    log "ERROR: aws CLI not found. Install with: apt install awscli"
    ok=false
  fi

  if [[ -z "${PGPASSWORD}" ]]; then
    log "ERROR: DB_PASSWORD is not set"
    ok=false
  fi

  if [[ -z "${S3_ACCESS_KEY}" ]]; then
    log "WARNING: BACKUP_S3_ACCESS_KEY not set — S3 upload will be skipped"
  fi

  if [[ -z "${SOURCE_S3_BUCKET}" ]]; then
    log "WARNING: SOURCE_S3_BUCKET not set — S3 files backup will be skipped"
  fi

  $ok || { log "Pre-flight checks FAILED"; exit 1; }

  # Create backup directory
  mkdir -p "${BACKUP_DIR}/db" "${BACKUP_DIR}/s3"
}

# ─── AWS CLI profile helper ─────────────────────────────────────────────────
configure_aws() {
  export AWS_ACCESS_KEY_ID="${S3_ACCESS_KEY}"
  export AWS_SECRET_ACCESS_KEY="${S3_SECRET_KEY}"
  export AWS_DEFAULT_REGION="ru-central1"
}

###############################################################################
# 1. PostgreSQL Backup
###############################################################################
backup_database() {
  log "=== Starting PostgreSQL backup ==="
  log "  Host: ${DB_HOST}:${DB_PORT}, DB: ${DB_NAME}, User: ${DB_USER}"

  local file="${BACKUP_DIR}/db/db_${DATE}.dump"
  local file_gz="${file}.gz"
  local start_time=$(date +%s)

  # Custom format — compressed, supports selective table restore
  pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -F c \
    -Z 9 \
    -f "$file" \
    --no-owner \
    --no-privileges \
    --verbose \
    2>&1 | tee -a "${BACKUP_DIR}/backup.log"

  local pg_exit=${PIPESTATUS[0]}
  if [[ $pg_exit -ne 0 ]]; then
    log "ERROR: pg_dump failed with exit code $pg_exit"
    return 1
  fi

  # Gzip for additional compression
  gzip -9 "$file"

  local end_time=$(date +%s)
  local duration=$(( end_time - start_time ))
  local size=$(du -h "$file_gz" | cut -f1)

  log "Database backup created: $file_gz ($size) in ${duration}s"

  # ─── Verification ───────────────────────────────────────────────────────
  log "Verifying backup integrity..."
  if pg_restore --list "$file_gz" &>/dev/null; then
    log "Verification: OK (pg_restore can read the archive)"
  else
    log "ERROR: Backup verification FAILED — archive may be corrupted"
    return 1
  fi

  # ─── Upload to S3 ───────────────────────────────────────────────────────
  if [[ -n "${S3_BACKUP_DIR}" && -n "${S3_ACCESS_KEY}" ]]; then
    log "Uploading to S3: ${S3_BACKUP_DIR}/db/"
    configure_aws

    aws s3 cp "$file_gz" "${S3_BACKUP_DIR}/db/" \
      --endpoint-url "$S3_ENDPOINT" \
      --storage-class STANDARD_IA \
      --metadata "backup-date=${DATE},db-name=${DB_NAME},size=${size}" \
      2>&1 | tee -a "${BACKUP_DIR}/backup.log"

    if [[ ${PIPESTATUS[0]} -eq 0 ]]; then
      log "Database backup uploaded to S3 successfully"
    else
      log "WARNING: S3 upload failed, local copy retained at $file_gz"
    fi
  fi

  return 0
}

###############################################################################
# 2. S3 Files Backup (snapshot of production bucket)
###############################################################################
backup_s3_files() {
  if [[ -z "${SOURCE_S3_BUCKET}" ]]; then
    log "=== Skipping S3 files backup (SOURCE_S3_BUCKET not set) ==="
    return 0
  fi

  log "=== Starting S3 files backup ==="
  log "  Source: s3://${SOURCE_S3_BUCKET}"

  local start_time=$(date +%s)

  configure_aws

  # ─── Method 1: Direct bucket-to-bucket sync (preferred) ──────────────
  if [[ -n "${S3_BACKUP_DIR}" ]]; then
    log "Syncing to backup bucket..."
    aws s3 sync \
      "s3://${SOURCE_S3_BUCKET}" \
      "${S3_BACKUP_DIR}/files/tmf-${DATE}/" \
      --endpoint-url "$S3_ENDPOINT" \
      --storage-class STANDARD_IA \
      --quiet \
      2>&1 | tee -a "${BACKUP_DIR}/backup.log"
  fi

  # ─── Method 2: Download + archive (fallback / additional) ────────────
  local archive="${BACKUP_DIR}/s3/s3_files_${DATE}.tar.gz"
  local tmp_dir="/tmp/s3-sync-${DATE}"

  log "Downloading S3 files for archive..."
  mkdir -p "$tmp_dir"

  aws s3 sync \
    "s3://${SOURCE_S3_BUCKET}" \
    "$tmp_dir" \
    --endpoint-url "$S3_ENDPOINT" \
    --quiet \
    2>&1 | tee -a "${BACKUP_DIR}/backup.log"

  local file_count=$(find "$tmp_dir" -type f | wc -l)
  log "Downloaded ${file_count} files, creating archive..."

  tar czf "$archive" -C "$tmp_dir" . 2>/dev/null
  rm -rf "$tmp_dir"

  local end_time=$(date +%s)
  local duration=$(( end_time - start_time ))
  local size=$(du -h "$archive" | cut -f1)

  log "S3 files archive created: $archive ($size, ${file_count} files) in ${duration}s"

  # ─── Upload archive to S3 ─────────────────────────────────────────────
  if [[ -n "${S3_BACKUP_DIR}" ]]; then
    log "Uploading S3 archive to S3..."
    aws s3 cp "$archive" "${S3_BACKUP_DIR}/archives/" \
      --endpoint-url "$S3_ENDPOINT" \
      --storage-class GLACIER \
      --metadata "backup-date=${DATE},file-count=${file_count},size=${size}" \
      2>&1 | tee -a "${BACKUP_DIR}/backup.log"

    if [[ ${PIPESTATUS[0]} -eq 0 ]]; then
      log "S3 archive uploaded to S3 successfully"
    else
      log "WARNING: S3 archive upload failed, local copy retained at $archive"
    fi
  fi

  return 0
}

###############################################################################
# 3. Cleanup old local backups
###############################################################################
cleanup() {
  log "=== Cleaning up old local backups ==="

  local db_count_before=$(find "${BACKUP_DIR}/db" -name "*.gz" 2>/dev/null | wc -l)
  local s3_count_before=$(find "${BACKUP_DIR}/s3" -name "*.tar.gz" 2>/dev/null | wc -l)

  find "${BACKUP_DIR}/db" -name "*.gz" -mtime +"${RETENTION_DAYS}" -delete 2>/dev/null || true
  find "${BACKUP_DIR}/s3" -name "*.tar.gz" -mtime +"${RETENTION_DAYS}" -delete 2>/dev/null || true

  local db_count_after=$(find "${BACKUP_DIR}/db" -name "*.gz" 2>/dev/null | wc -l)
  local s3_count_after=$(find "${BACKUP_DIR}/s3" -name "*.tar.gz" 2>/dev/null | wc -l)

  local db_removed=$(( db_count_before - db_count_after ))
  local s3_removed=$(( s3_count_before - s3_count_after ))

  log "Removed ${db_removed} database backups, ${s3_removed} S3 archives (older than ${RETENTION_DAYS} days)"
  log "Retained: ${db_count_after} DB backups, ${s3_count_after} S3 archives"
}

###############################################################################
# 4. Cleanup old S3 backups
###############################################################################
cleanup_s3() {
  if [[ -z "${S3_BACKUP_DIR}" || -z "${S3_ACCESS_KEY}" ]]; then
    return 0
  fi

  local s3_retention="${BACKUP_S3_RETENTION_DAYS:-90}"

  log "=== Cleaning up old S3 backups (>${s3_retention} days) ==="
  configure_aws

  aws s3 ls "${S3_BACKUP_DIR}/db/" \
    --endpoint-url "$S3_ENDPOINT" \
    2>/dev/null | while read -r _ _ _ key; do

    local file_date
    file_date=$(echo "$key" | grep -oP '\d{4}-\d{2}-\d{2}' || true)

    if [[ -n "$file_date" ]]; then
      local file_epoch
      file_epoch=$(date -d "$file_date" +%s 2>/dev/null || echo 0)
      local now_epoch
      now_epoch=$(date +%s)
      local age=$(( (now_epoch - file_epoch) / 86400 ))

      if (( age > s3_retention )); then
        aws s3 rm "${S3_BACKUP_DIR}/db/${key}" \
          --endpoint-url "$S3_ENDPOINT" 2>/dev/null
        log "Removed old S3 backup: $key (${age} days old)"
      fi
    fi
  done
}

###############################################################################
# 5. Alert notifications
###############################################################################
send_alert() {
  local status="$1"
  local message="$2"

  if [[ -z "${SLACK_WEBHOOK}" ]]; then
    return 0
  fi

  local emoji="✅"
  if [[ "$status" == "FAILED" ]]; then
    emoji="❌"
  elif [[ "$status" == "WARNING" ]]; then
    emoji="⚠️"
  fi

  curl -s -X POST "$SLACK_WEBHOOK" \
    -H 'Content-type: application/json' \
    -d "{
      \"text\": \"${emoji} Backup *${status}*\n\`\`\`${message}\`\`\`\"
    }" >/dev/null 2>&1 || true
}

###############################################################################
# 6. Backup summary
###############################################################################
print_summary() {
  log "========================================="
  log "Backup Summary"
  log "========================================="

  # Database backups
  log "Local database backups:"
  find "${BACKUP_DIR}/db" -name "*.gz" -printf "  %f  %s bytes  %T+\n" 2>/dev/null | sort -k3 -r | head -5

  # S3 archives
  if [[ -d "${BACKUP_DIR}/s3" ]]; then
    log "Local S3 archives:"
    find "${BACKUP_DIR}/s3" -name "*.tar.gz" -printf "  %f  %s bytes  %T+\n" 2>/dev/null | sort -k3 -r | head -5
  fi

  log "Disk usage: $(du -sh "${BACKUP_DIR}" 2>/dev/null | cut -f1)"
}

###############################################################################
# Main
###############################################################################
main() {
  log "========================================="
  log "Backup started"
  log "========================================="

  check_prerequisites

  local failed=false
  local warnings=""

  # 1. Database backup
  if ! backup_database; then
    failed=true
    log "ERROR: Database backup FAILED"
  fi

  # 2. S3 files backup
  if ! backup_s3_files; then
    warnings="${warnings}S3 files backup had issues. "
    log "WARNING: S3 files backup had issues"
  fi

  # 3. Cleanup
  cleanup
  cleanup_s3

  # 4. Summary
  print_summary

  # 5. Alert
  if $failed; then
    log "Backup completed with ERRORS"
    send_alert "FAILED" "Backup failed. Check /var/log/backup.log"
    exit 1
  elif [[ -n "$warnings" ]]; then
    log "Backup completed with warnings: $warnings"
    send_alert "WARNING" "Backup completed with warnings: $warnings"
  else
    log "Backup completed SUCCESSFULLY"
    send_alert "SUCCESS" "All backups completed successfully"
  fi
}

main "$@"
