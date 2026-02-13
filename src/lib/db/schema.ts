export enum Tables {
  STUDY = 'study',
  SITE = 'site',
  DOCUMENT = 'document',
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
        CONSTRAINT audit_action_check CHECK (action IN ('CREATE', 'UPDATE', 'DELETE'))
    );
        CREATE INDEX idx_audit_timestamp ON audit(created_at DESC);
        CREATE INDEX idx_audit_user ON audit(user_id, created_at DESC);
        CREATE INDEX idx_audit_entity ON audit(entity_type, entity_id, created_at DESC);
        CREATE INDEX idx_audit_action ON audit(action, created_at DESC);
        CREATE INDEX idx_audit_study ON audit(study_id, created_at DESC);
        CREATE INDEX idx_audit_site ON audit(site_id, created_at DESC);

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
        audit_trail JSONB
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
`;

export const DocumentTable = `
  CREATE TABLE IF NOT EXISTS document (
      id UUID PRIMARY KEY,
      study_id INTEGER NOT NULL REFERENCES study(id) ON DELETE CASCADE,
      site_id INTEGER REFERENCES site(id) ON DELETE SET NULL,
      file_name TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size BIGINT NOT NULL,
      tmf_zone TEXT,
      tmf_artifact TEXT,
      version INTEGER,
      status TEXT,
      uploaded_by TEXT,
      uploaded_at TIMESTAMPTZ DEFAULT NOW(),
      metadata JSONB
  );
`;

export const UserTable = `
  CREATE TABLE IF NOT EXISTS ${Tables.USERS} (
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
    failed_login_attempts INTEGER DEFAULT 0,
    password_changed_at TIMESTAMPTZ,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
`;

// Триггер для обновления updated_at
export const UpdateUserTimestamp = `
  CREATE OR REPLACE FUNCTION update_user_timestamp()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  DROP TRIGGER IF EXISTS update_user_timestamp_trigger ON ${Tables.USERS};
  CREATE TRIGGER update_user_timestamp_trigger
  BEFORE UPDATE ON ${Tables.USERS}
  FOR EACH ROW
  EXECUTE FUNCTION update_user_timestamp();
`;

// Вспомогательная таблица для связи пользователей и исследований (опционально)
export const UserStudyRelationTable = `
  CREATE TABLE IF NOT EXISTS user_study_relation (
    user_id INTEGER REFERENCES user(id) ON DELETE CASCADE,
    study_id INTEGER REFERENCES study(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, study_id)
  );
`;

// Вспомогательная таблица для связи пользователей и центров (опционально)
export const UserSiteRelationTable = `
  CREATE TABLE IF NOT EXISTS user_site_relation (
    user_id INTEGER REFERENCES user(id) ON DELETE CASCADE,
    site_id INTEGER REFERENCES site(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, site_id)
  );
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
  failed_login_attempts,
  password_changed_at,
  last_login
`;

// Функции для работы с пользователями
export const UserQueries = {
  // Поиск пользователей по исследованию
  getUsersByStudy: (studyId: number) => `
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

  // Поиск пользователей по роли
  getUsersByRole: (role: string) => `
    SELECT ${getSafeUserFields()}
    FROM ${Tables.USERS}
    WHERE $1 = ANY(role)
    ORDER BY name ASC
  `,

  // Получение пользователя для аутентификации (с паролем)
  getUserForAuthentication: (email: boolean = true) => `
    SELECT 
      ${getSafeUserFields()},
      password_hash
    FROM ${Tables.USERS}
    WHERE ${email ? 'email' : 'id'} = $1
  `,

  // Получение всех пользователей исследования с определенной ролью
  getUsersByStudyAndRole: (studyId: number, role: string) => `
    SELECT ${getSafeUserFields()}
    FROM ${Tables.USERS}
    WHERE $1 = ANY(assigned_study_id)
      AND $2 = ANY(roles)
    ORDER BY name ASC
  `,
  
  // Обновление статуса пользователя
  updateUserStatus: (userId: number, status: string) => `
    UPDATE ${Tables.USERS} 
    SET status = $2, updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `,
  
  // Сброс счетчика неудачных попыток входа
  resetFailedLoginAttempts: (userId: number) => `
    UPDATE ${Tables.USERS} 
    SET failed_login_attempts = 0, updated_at = NOW()
    WHERE id = $1
  `,
  
  // Добавление исследования пользователю
  addStudyToUser: (userId: number, studyId: number) => `
    UPDATE ${Tables.USERS} 
    SET assigned_study_id = array_append(assigned_study_id, $2),
        updated_at = NOW()
    WHERE id = $1
    RETURNING assigned_study_id
  `,
  
  // Удаление исследования у пользователя
  removeStudyFromUser: (userId: number, studyId: number) => `
    UPDATE ${Tables.USERS} 
    SET assigned_study_id = array_remove(assigned_study_id, $2),
        updated_at = NOW()
    WHERE id = $1
    RETURNING assigned_study_id
  `,

  // Добавление центров пользователю
  addSiteToUser: (userId: number, siteId: number) => `
    UPDATE ${Tables.USERS} 
    SET assigned_site_id = array_append(assigned_site_id, $2),
        updated_at = NOW()
    WHERE id = $1
    RETURNING assigned_site_id
  `,
  
  // Удаление исследования у пользователя
  removeSiteFromUser: (userId: number, siteId: number) => `
    UPDATE ${Tables.USERS} 
    SET assigned_site_id = array_remove(assigned_site_id, $2),
        updated_at = NOW()
    WHERE id = $1
    RETURNING assigned_site_id
  `,
  
  // Обновление разрешений пользователя
  updateUserPermissions: (userId: number, permissions: any) => `
    UPDATE ${Tables.USERS} 
    SET permissions = $2::jsonb,
        updated_at = NOW()
    WHERE id = $1
    RETURNING permissions
  `
};

export const tableSQLMap: Record<Tables, string> = {
  [Tables.STUDY]: StudyTable,
  [Tables.SITE]: SiteTable,
  [Tables.DOCUMENT]: DocumentTable,
  [Tables.USERS]: UserTable,
  [Tables.AUDIT]: AuditTrialTable
};