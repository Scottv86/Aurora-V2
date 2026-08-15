-- =========================================================================
-- Aurora Supabase Database Security Advisories Fix Migration Script
-- Addresses:
-- 1. rls_disabled: Enable and force RLS on 8 remaining public tables
-- 2. rls_enabled_no_policy: Add RLS policies for all 10 un-isolated tables
-- 3. function_search_path_mutable: Set explicit search_path on SECURITY DEFINER functions
-- 4. extension_in_public: Relocate vector extension to extensions schema
-- =========================================================================

-- 1. ENABLE & FORCE RLS ON ALL 8 UNPROTECTED TABLES
ALTER TABLE "forms" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "forms" FORCE ROW LEVEL SECURITY;

ALTER TABLE "workflows" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workflows" FORCE ROW LEVEL SECURITY;

ALTER TABLE "connector_mappings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "connector_mappings" FORCE ROW LEVEL SECURITY;

ALTER TABLE "validation_rulesets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "validation_rulesets" FORCE ROW LEVEL SECURITY;

ALTER TABLE "antigravity_scheduled_tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "antigravity_scheduled_tasks" FORCE ROW LEVEL SECURITY;

ALTER TABLE "solution_blueprints" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "solution_blueprints" FORCE ROW LEVEL SECURITY;

ALTER TABLE "recycling_bin_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "recycling_bin_items" FORCE ROW LEVEL SECURITY;

ALTER TABLE "sites" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sites" FORCE ROW LEVEL SECURITY;

ALTER TABLE "connector_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "connector_logs" FORCE ROW LEVEL SECURITY;

ALTER TABLE "industry_blueprints" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "industry_blueprints" FORCE ROW LEVEL SECURITY;


-- 2. DROP EXISTING POLICIES IF ANY TO ALLOW RE-RUNNABILITY
DROP POLICY IF EXISTS tenant_isolation_forms ON "forms";
DROP POLICY IF EXISTS tenant_isolation_workflows ON "workflows";
DROP POLICY IF EXISTS tenant_isolation_connector_mappings ON "connector_mappings";
DROP POLICY IF EXISTS tenant_isolation_validation_rulesets ON "validation_rulesets";
DROP POLICY IF EXISTS tenant_isolation_antigravity_scheduled_tasks ON "antigravity_scheduled_tasks";
DROP POLICY IF EXISTS tenant_isolation_solution_blueprints ON "solution_blueprints";
DROP POLICY IF EXISTS tenant_isolation_recycling_bin_items ON "recycling_bin_items";
DROP POLICY IF EXISTS tenant_isolation_sites ON "sites";
DROP POLICY IF EXISTS tenant_isolation_connector_logs ON "connector_logs";
DROP POLICY IF EXISTS read_industry_blueprints ON "industry_blueprints";
DROP POLICY IF EXISTS write_industry_blueprints ON "industry_blueprints";


-- 3. CREATE TENANT ISOLATION POLICIES
CREATE POLICY tenant_isolation_forms ON "forms"
    FOR ALL USING (is_global = true OR tenant_id IS NULL OR has_tenant_access(tenant_id));

CREATE POLICY tenant_isolation_workflows ON "workflows"
    FOR ALL USING (is_global = true OR tenant_id IS NULL OR has_tenant_access(tenant_id));

CREATE POLICY tenant_isolation_connector_mappings ON "connector_mappings"
    FOR ALL USING (has_tenant_access(tenant_id));

CREATE POLICY tenant_isolation_validation_rulesets ON "validation_rulesets"
    FOR ALL USING (has_tenant_access(tenant_id));

CREATE POLICY tenant_isolation_antigravity_scheduled_tasks ON "antigravity_scheduled_tasks"
    FOR ALL USING (has_tenant_access(tenant_id));

CREATE POLICY tenant_isolation_solution_blueprints ON "solution_blueprints"
    FOR ALL USING (tenant_id IS NULL OR has_tenant_access(tenant_id));

CREATE POLICY tenant_isolation_recycling_bin_items ON "recycling_bin_items"
    FOR ALL USING (has_tenant_access(tenant_id));

CREATE POLICY tenant_isolation_sites ON "sites"
    FOR ALL USING (tenant_id IS NULL OR has_tenant_access(tenant_id));

CREATE POLICY tenant_isolation_connector_logs ON "connector_logs"
    FOR ALL USING (has_tenant_access(tenant_id));

-- Global Catalog / Industry Blueprints Policies
CREATE POLICY read_industry_blueprints ON "industry_blueprints"
    FOR SELECT USING (true);

CREATE POLICY write_industry_blueprints ON "industry_blueprints"
    FOR ALL USING (is_superadmin());


-- 4. GRANT TABLE PERMISSIONS TO SERVICE_ROLE & AUTHENTICATED ROLES
GRANT ALL ON "forms", "workflows", "connector_mappings", "validation_rulesets", "antigravity_scheduled_tasks", "solution_blueprints", "recycling_bin_items", "sites", "connector_logs", "industry_blueprints" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON "forms", "workflows", "connector_mappings", "validation_rulesets", "antigravity_scheduled_tasks", "solution_blueprints", "recycling_bin_items", "sites", "connector_logs", "industry_blueprints" TO authenticated;


-- 5. SET EXPLICIT SEARCH_PATH ON ALL SECURITY DEFINER FUNCTIONS
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT p.oid::regprocedure AS func_signature
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' 
          AND p.prosecdef = true
    LOOP
        EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', r.func_signature);
    END LOOP;
END $$;


-- 6. RELOCATE EXTENSIONS FROM PUBLIC SCHEMA TO EXTENSIONS SCHEMA
CREATE SCHEMA IF NOT EXISTS extensions;
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_extension e
        JOIN pg_namespace n ON n.oid = e.extnamespace
        WHERE e.extname = 'vector' AND n.nspname = 'public'
    ) THEN
        ALTER EXTENSION vector SET SCHEMA extensions;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not move vector extension to extensions schema: %', SQLERRM;
END $$;
