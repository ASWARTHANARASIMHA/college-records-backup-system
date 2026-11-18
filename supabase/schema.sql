-- ========================================================================
-- AUTOMATED BACKUP AND RECOVERY SYSTEM FOR COLLEGE RECORDS
-- SUPABASE POSTGRESQL SCHEMA & STORAGE CONFIGURATION
-- ========================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------
-- 1. TABLES
-- ------------------------------------------------------------------------

-- Table: files (Academic records working storage metadata)
CREATE TABLE IF NOT EXISTS public.files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL DEFAULT 'application/octet-stream',
    file_size BIGINT NOT NULL DEFAULT 0,
    category TEXT NOT NULL DEFAULT 'Examination Records',
    department TEXT NOT NULL DEFAULT 'Computer Science & Engineering',
    academic_year TEXT NOT NULL DEFAULT '2024-2025',
    semester TEXT NOT NULL DEFAULT 'Semester VI',
    storage_path TEXT NOT NULL,
    sha256_hash TEXT NOT NULL,
    backup_status TEXT NOT NULL DEFAULT 'Awaiting Backup',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    tampered BOOLEAN NOT NULL DEFAULT FALSE,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: backups (Cryptographically isolated backup archives)
CREATE TABLE IF NOT EXISTS public.backups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID REFERENCES public.files(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    category TEXT NOT NULL,
    department TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    backup_storage_path TEXT NOT NULL,
    backup_size BIGINT NOT NULL,
    backup_hash TEXT NOT NULL,
    backup_type TEXT NOT NULL DEFAULT 'MANUAL', -- 'MANUAL' or 'AUTOMATIC'
    status TEXT NOT NULL DEFAULT 'SUCCESS',     -- 'SUCCESS', 'FAILED', 'SKIPPED'
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: recovery_logs (Disaster recovery audit trail)
CREATE TABLE IF NOT EXISTS public.recovery_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID REFERENCES public.files(id) ON DELETE SET NULL,
    backup_id UUID REFERENCES public.backups(id) ON DELETE SET NULL,
    file_name TEXT NOT NULL,
    category TEXT,
    department TEXT,
    recovery_status TEXT NOT NULL DEFAULT 'SUCCESS',
    restored_by TEXT NOT NULL DEFAULT 'Chief Administrator',
    integrity_verified BOOLEAN NOT NULL DEFAULT TRUE,
    details TEXT,
    recovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: activity_logs (Comprehensive institutional activity ledger)
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action TEXT NOT NULL,
    file_name TEXT,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'SUCCESS', -- 'SUCCESS', 'WARNING', 'DANGER', 'INFO'
    operator TEXT NOT NULL DEFAULT 'Chief Administrator',
    details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: settings (Institution profile and automated scheduler settings)
CREATE TABLE IF NOT EXISTS public.settings (
    id TEXT PRIMARY KEY DEFAULT 'system_config',
    institution_name TEXT NOT NULL DEFAULT 'Apex Institute of Engineering & Technology',
    department_name TEXT NOT NULL DEFAULT 'Office of the Controller of Examinations & Academic Records',
    auto_backup_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    backup_interval INTEGER NOT NULL DEFAULT 5, -- in minutes: 1, 5, 15
    admin_name TEXT NOT NULL DEFAULT 'Chief Records Administrator',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------
-- 2. INDEXES
-- ------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_files_category ON public.files(category);
CREATE INDEX IF NOT EXISTS idx_files_is_deleted ON public.files(is_deleted);
CREATE INDEX IF NOT EXISTS idx_files_sha256 ON public.files(sha256_hash);
CREATE INDEX IF NOT EXISTS idx_backups_file_id ON public.backups(file_id);
CREATE INDEX IF NOT EXISTS idx_backups_hash ON public.backups(backup_hash);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON public.activity_logs(created_at DESC);

-- ------------------------------------------------------------------------
-- 3. STORAGE BUCKETS SETUP
-- ------------------------------------------------------------------------
-- Note: Insert storage buckets into the Supabase storage schema if not present
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('college-records-originals', 'college-records-originals', false, 104857600, NULL),
    ('college-records-backups', 'college-records-backups', false, 104857600, NULL)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full administrative access
CREATE POLICY "Allow authenticated full access on files" 
ON public.files FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated full access on backups" 
ON public.backups FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated full access on recovery_logs" 
ON public.recovery_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated full access on activity_logs" 
ON public.activity_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated full access on settings" 
ON public.settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Also allow anon read/write if demo mode or unauthenticated client access is permitted
CREATE POLICY "Allow anon read/write on files" 
ON public.files FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon read/write on backups" 
ON public.backups FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon read/write on recovery_logs" 
ON public.recovery_logs FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon read/write on activity_logs" 
ON public.activity_logs FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon read/write on settings" 
ON public.settings FOR ALL TO anon USING (true) WITH CHECK (true);

-- Storage bucket access policies
CREATE POLICY "Allow authenticated bucket access originals"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'college-records-originals')
WITH CHECK (bucket_id = 'college-records-originals');

CREATE POLICY "Allow authenticated bucket access backups"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'college-records-backups')
WITH CHECK (bucket_id = 'college-records-backups');

CREATE POLICY "Allow anon bucket access originals"
ON storage.objects FOR ALL TO anon
USING (bucket_id = 'college-records-originals')
WITH CHECK (bucket_id = 'college-records-originals');

CREATE POLICY "Allow anon bucket access backups"
ON storage.objects FOR ALL TO anon
USING (bucket_id = 'college-records-backups')
WITH CHECK (bucket_id = 'college-records-backups');

-- ------------------------------------------------------------------------
-- 5. INITIAL SETTINGS SEED
-- ------------------------------------------------------------------------
INSERT INTO public.settings (id, institution_name, department_name, auto_backup_enabled, backup_interval, admin_name)
VALUES ('system_config', 'Apex Institute of Engineering & Technology', 'Office of the Controller of Examinations & Academic Records', true, 5, 'Chief Records Administrator')
ON CONFLICT (id) DO UPDATE SET updated_at = NOW();
