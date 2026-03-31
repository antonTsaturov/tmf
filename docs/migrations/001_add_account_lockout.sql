-- Migration: Add account lockout support
-- Description: Add lock_until column to users table for account lockout after failed login attempts

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS lock_until TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_lock_until ON users(lock_until) 
WHERE lock_until IS NOT NULL;

-- This migration enables blocking user accounts for 15 minutes after 5 failed login attempts
