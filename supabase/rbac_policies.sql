-- ============================================================
-- Role-Based Access Control (RBAC) RLS Policies
-- Run AFTER tenants.sql
-- ============================================================

-- Helper: get current user's role in their tenant
CREATE OR REPLACE FUNCTION public.user_role()
RETURNS TEXT AS $$
  SELECT role FROM tenant_users WHERE user_id = auth.uid() AND status = 'Active' LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper: check if user can write (Admin, Manager, Owner)
CREATE OR REPLACE FUNCTION public.can_write()
RETURNS BOOLEAN AS $$
  SELECT public.user_role() IN ('Owner', 'Admin', 'Manager');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper: check if user can delete (Admin, Owner only)
CREATE OR REPLACE FUNCTION public.can_delete()
RETURNS BOOLEAN AS $$
  SELECT public.user_role() IN ('Owner', 'Admin');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper: check if user can manage users (Owner only)
CREATE OR REPLACE FUNCTION public.can_manage_users()
RETURNS BOOLEAN AS $$
  SELECT public.user_role() = 'Owner';
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Drop and recreate policies with role enforcement for critical tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'accounts','journal_entries','journal_lines',
      'invoices','purchase_invoices',
      'incoming_payments','outgoing_payments',
      'customers','suppliers','products'
    ])
  LOOP
    -- Drop existing policies
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_insert ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_update ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_delete ON %I', tbl);
    
    -- INSERT: must be writer and same tenant
    EXECUTE format(
      'CREATE POLICY tenant_isolation_insert ON %I FOR INSERT WITH CHECK (tenant_id = public.user_tenant_id() AND public.can_write())',
      tbl
    );
    -- UPDATE: must be writer and same tenant
    EXECUTE format(
      'CREATE POLICY tenant_isolation_update ON %I FOR UPDATE USING (tenant_id = public.user_tenant_id() AND public.can_write())',
      tbl
    );
    -- DELETE: must be admin and same tenant
    EXECUTE format(
      'CREATE POLICY tenant_isolation_delete ON %I FOR DELETE USING (tenant_id = public.user_tenant_id() AND public.can_delete())',
      tbl
    );
  END LOOP;
END $$;

-- Tenant users: only Owner can manage
DROP POLICY IF EXISTS tenant_users_insert ON tenant_users;
CREATE POLICY tenant_users_insert ON tenant_users FOR INSERT
  WITH CHECK (tenant_id = public.user_tenant_id() AND public.can_manage_users());

DROP POLICY IF EXISTS tenant_users_delete ON tenant_users;
CREATE POLICY tenant_users_delete ON tenant_users FOR DELETE
  USING (tenant_id = public.user_tenant_id() AND public.can_manage_users());
