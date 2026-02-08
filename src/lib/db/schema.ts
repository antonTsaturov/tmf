export enum Tables {
  STUDY = 'study',
  SITE = 'site',
  DOCUMENT = 'document',
  USER = 'user'
}

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
      id SERIAL PRIMARY KEY,
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
  CREATE TABLE IF NOT EXISTS user (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      password_hash TEXT,
      is_active BOOLEAN,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      last_login TIMESTAMPTZ
  );
`;

export const tableSQLMap: Record<Tables, string> = {
  [Tables.STUDY]: StudyTable,
  [Tables.SITE]: SiteTable,
  [Tables.DOCUMENT]: DocumentTable,
  [Tables.USER]: UserTable,
};