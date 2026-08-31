-- Role-based permissions tables
-- Run this in Supabase SQL Editor

-- ERP Users (extends Supabase Auth)
CREATE TABLE IF NOT EXISTS erp_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'Viewer',
  status TEXT NOT NULL DEFAULT 'Active',
  phone TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Role Permissions (matrix: role × module × actions)
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL,
  module TEXT NOT NULL,
  can_view BOOLEAN DEFAULT false,
  can_create BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  can_approve BOOLEAN DEFAULT false,
  can_print BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role, module)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);

-- Row Level Security
ALTER TABLE erp_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "erp_users_policy" ON erp_users FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "role_permissions_policy" ON role_permissions FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Default roles
INSERT INTO role_permissions (role, module, can_view, can_create, can_edit, can_delete, can_approve, can_print)
VALUES
  ('Admin', 'All Modules', true, true, true, true, true, true)
ON CONFLICT (role, module) DO NOTHING;
