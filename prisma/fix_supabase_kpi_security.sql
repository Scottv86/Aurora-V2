-- =========================================================================
-- Fix Supabase Security Advisories:
-- 1. rls_disabled on kpi_definitions: Enable & force RLS, add tenant policy
-- 2. function_search_path_mutable on update_updated_at_column
-- =========================================================================

-- 1. Enable and force Row Level Security on kpi_definitions
ALTER TABLE "kpi_definitions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "kpi_definitions" FORCE ROW LEVEL SECURITY;

-- 2. Drop existing policy if present for idempotency
DROP POLICY IF EXISTS tenant_isolation_kpi_definitions ON "kpi_definitions";

-- 3. Create tenant isolation policy
CREATE POLICY tenant_isolation_kpi_definitions ON "kpi_definitions"
    FOR ALL USING (is_global = true OR tenant_id IS NULL OR has_tenant_access(tenant_id));

-- 4. Grant table permissions
GRANT ALL ON "kpi_definitions" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON "kpi_definitions" TO authenticated;

-- 5. Fix mutable search_path on update_updated_at_column
ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_temp;
