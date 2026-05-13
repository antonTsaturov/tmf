// src/lib/db/schema.ts
export enum Tables {
  STUDY = 'study',
  SITE = 'site',
  DOCUMENT = 'document',
  DOCUMENT_VERSION = 'document_version',
  USERS = 'users',
  AUDIT = 'audit',
}

export const AuditTrialTable = `
  CREATE TABLE IF NOT EXISTS audit (
    id BIGSERIAL PRIMARY KEY,
    audit_id UUID NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL,
    user_id TEXT NOT NULL,
    user_email TEXT NOT NULL,
    user_role JSONB NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    old_value JSONB,
    new_value JSONB,
    ip_address INET NOT NULL,
    user_agent TEXT NOT NULL,
    session_id TEXT NOT NULL,
    status TEXT NOT NULL,
    error_message TEXT,
    reason TEXT,
    site_id VARCHAR(100),
    study_id VARCHAR(100),

    CONSTRAINT audit_status_check CHECK (status IN ('SUCCESS', 'FAILURE')),
    CONSTRAINT audit_action_check CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'RESTORE'))
  );
    CREATE INDEX idx_audit_timestamp ON audit(created_at DESC);
    CREATE INDEX idx_audit_user ON audit(user_id, created_at DESC);
    CREATE INDEX idx_audit_entity ON audit(entity_type, entity_id, created_at DESC);
    CREATE INDEX idx_audit_action ON audit(action, created_at DESC);
    CREATE INDEX idx_audit_study ON audit(study_id, created_at DESC);
    CREATE INDEX idx_audit_site ON audit(site_id, created_at DESC);
    CREATE INDEX idx_audit_site_id ON audit(site_id);

    CREATE OR REPLACE FUNCTION prevent_audit_update()
    RETURNS TRIGGER AS $$
    BEGIN
      RAISE EXCEPTION 'Audit logs cannot be modified';
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trigger_prevent_audit_update ON audit; 

    CREATE TRIGGER trigger_prevent_audit_update
      BEFORE UPDATE OR DELETE ON audit
      FOR EACH ROW
      EXECUTE FUNCTION prevent_audit_update();
`;


export const StudyTable = `
  CREATE TABLE IF NOT EXISTS study (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    protocol TEXT UNIQUE NOT NULL,
    sponsor TEXT,
    cro TEXT,
    countries TEXT[],
    status TEXT NOT NULL,
    users JSONB,
    total_documents INTEGER DEFAULT 0,
    folders_structure JSONB,
  );
`;

export const SiteTable = `
  CREATE TABLE IF NOT EXISTS site (
    id VARCHAR(100) PRIMARY KEY,
    study_id INTEGER NOT NULL REFERENCES study(id) ON DELETE CASCADE,
    study_protocol TEXT NOT NULL,
    name TEXT NOT NULL,
    number INTEGER NOT NULL,
    country TEXT,
    city TEXT,
    principal_investigator TEXT,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_site_country ON site(country);
`;

export const DocumentTable = `
  CREATE TABLE IF NOT EXISTS document (
    id UUID PRIMARY KEY,

    study_id INTEGER NOT NULL REFERENCES study(id) ON DELETE CASCADE,
    site_id VARCHAR REFERENCES site(id) ON DELETE SET NULL,
    country VARCHAR(100),

    folder_id TEXT NOT NULL,
    tmf_zone TEXT,
    tmf_artifact TEXT,

    current_version_id UUID, 
    -- FK добавляется позже через ALTER TABLE (из-за циклической зависимости)

    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id),
    deletion_reason TEXT,

    restored_by UUID REFERENCES users(id),
    restored_at TIMESTAMPTZ,
    restoration_reason TEXT,

    is_archived BOOLEAN DEFAULT FALSE,
    archived_at TIMESTAMPTZ,
    archived_by UUID REFERENCES users(id),

    unarchived_at TIMESTAMPTZ,
    unarchived_by UUID REFERENCES users(id),
    unarchive_reason TEXT

  );
`;

export const DocumentVersionTable = `
  CREATE TABLE IF NOT EXISTS document_version (
    id UUID PRIMARY KEY,

    document_id UUID NOT NULL REFERENCES document(id) ON DELETE CASCADE,
    document_number INTEGER NOT NULL,
    document_name TEXT NOT NULL,

    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,

    checksum TEXT NOT NULL,

    uploaded_by UUID NOT NULL REFERENCES users(id),
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),

    change_reason TEXT,

    review_status TEXT,
    review_submitted_by UUID REFERENCES users(id),
    review_submitted_at TIMESTAMPTZ,
    review_submitted_to UUID REFERENCES users(id),

    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    review_comment TEXT,

    UNIQUE(document_id, document_number)
  );
`;

export const UserTable = `
  CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    title TEXT,
    organisation TEXT NOT NULL CHECK (organisation IN ('CRO', 'SPONSOR', 'SITE')),
    role TEXT[] NOT NULL DEFAULT '{}',
    status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'pending', 'terminated')) DEFAULT 'pending',    
    permissions JSONB NOT NULL,
    assigned_study_id INTEGER[] DEFAULT '{}',
    assigned_site_id INTEGER[] DEFAULT '{}',
    assigned_country_by_study JSONB DEFAULT '{}',
    failed_login_attempts INTEGER DEFAULT 0,
    lock_until TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ,
    last_login TIMESTAMPTZ,

    last_digest_at TIMESTAMPTZ,
    email_notifications_enabled BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
`;

export const UserSessionTable = `
  CREATE TABLE IF NOT EXISTS user_sessions (
      session_id VARCHAR(255) PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user_email VARCHAR(255) NOT NULL,
      refresh_token_hash VARCHAR(255) NOT NULL,
      created_at BIGINT NOT NULL,
      last_activity_at BIGINT NOT NULL,
      expires_at BIGINT NOT NULL,
      is_valid BOOLEAN DEFAULT true,
      ip_address VARCHAR(45),
      user_agent TEXT
  );
`;

export const CleanupExpiredSessions = `
  CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
  RETURNS INTEGER AS $$
  DECLARE
      deleted_count INTEGER;
  BEGIN
      DELETE FROM user_sessions 
      WHERE expires_at < EXTRACT(EPOCH FROM NOW()) * 1000
        OR NOT is_valid
        OR (EXTRACT(EPOCH FROM NOW()) * 1000 - last_activity_at) > 1800000; -- 30 минут idle
      
      GET DIAGNOSTICS deleted_count = ROW_COUNT;
      RETURN deleted_count;
  END;
  $$ LANGUAGE plpgsql;
`;


// Утилитарная функция для получения безопасных полей пользователя
const getSafeUserFields = () => `
  id,
  email,
  name,
  title,
  organisation,
  role,
  status,    
  permissions,
  assigned_study_id,
  assigned_site_id,
  assigned_country_by_study,
  failed_login_attempts,
  lock_until,             -- поле для работы блокировки
  password_changed_at,
  last_login
`;
// Функции для работы с пользователями
export const UserQueries = {
  // Поиск пользователей по исследованию
  getUsersByStudy: (_studyId: number) => `
    SELECT ${getSafeUserFields()}
    FROM ${Tables.USERS}
    WHERE $1 = ANY(assigned_study_id)
    ORDER BY name ASC
  `,
  
  // Получить всех пользователей
  getAllUsers: () => `
    SELECT ${getSafeUserFields()}
    FROM ${Tables.USERS}
    ORDER BY id ASC
  `,


  // Получение пользователя для аутентификации (с паролем)
  getUserForAuthentication: (email: boolean = true) => `
    SELECT 
      ${getSafeUserFields()},
      password_hash
    FROM ${Tables.USERS}
    WHERE ${email ? 'email' : 'id'} = $1
  `,
  
};

export const tableSQLMap: Record<Tables, string> = {
  [Tables.STUDY]: StudyTable,
  [Tables.SITE]: SiteTable,
  [Tables.DOCUMENT]: DocumentTable,
  [Tables.DOCUMENT_VERSION]: DocumentVersionTable,
  [Tables.USERS]: UserTable,
  [Tables.AUDIT]: AuditTrialTable
};

export const tableSQLDepend: Partial<Record<Tables, Tables[]>> = {
  [Tables.DOCUMENT]: [Tables.DOCUMENT_VERSION],
};