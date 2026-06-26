-- Aurora Session & JWT Based RLS Context Setup (RECURSION FIXED)
-- This script enables RLS on all core tables and defines policies based on
-- BOTH session variables (for Backend/Prisma) AND auth.uid() (for Frontend/Supabase).

-- 1. Helper Functions for Context Resolution
-- Note: SECURITY DEFINER is used to break recursion by allowing these functions 
-- to query tables (users, tenant_members) while bypassing their RLS policies.
-- search_path is set to 'public' to prevent search path hijacking.

CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS TEXT AS $$
BEGIN
    RETURN COALESCE(
        current_setting('app.current_user_id', true),
        (SELECT auth.uid()::text)
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS TEXT AS $$
BEGIN
    RETURN current_setting('app.current_tenant_id', true);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN AS $$
DECLARE
    curr_uid TEXT;
BEGIN
    curr_uid := get_current_user_id();
    IF curr_uid IS NULL THEN RETURN FALSE; END IF;

    RETURN (
        current_setting('app.is_superadmin', true) = 'true' 
        OR EXISTS (
            SELECT 1 FROM public."users" 
            WHERE id = curr_uid
            AND "is_superadmin" = true
        )
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 2. Membership Check Function
CREATE OR REPLACE FUNCTION has_tenant_access(t_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    curr_uid TEXT;
    sess_t_id TEXT;
BEGIN
    curr_uid := get_current_user_id();
    sess_t_id := get_current_tenant_id();

    -- Backend/Session match or Superadmin bypass
    IF t_id = sess_t_id OR is_superadmin() THEN
        RETURN TRUE;
    END IF;

    -- Frontend/JWT membership check
    IF curr_uid IS NOT NULL THEN
        RETURN EXISTS (
            SELECT 1 FROM public."tenant_members" 
            WHERE "tenant_id" = t_id 
            AND "user_id" = curr_uid
            AND "status" = 'Active'
        );
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 3. ENABLE RLS ON ALL TABLES
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name NOT IN ('_prisma_migrations', 'spatial_ref_sys')
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    END LOOP;
END $$;

-- 4. POLICIES FOR "users"
DROP POLICY IF EXISTS user_isolation ON "users";
CREATE POLICY user_isolation ON "users" FOR ALL USING (
    id = get_current_user_id() OR is_superadmin()
);

-- 5. POLICIES FOR "tenants"
DROP POLICY IF EXISTS tenant_access ON "tenants";
CREATE POLICY tenant_access ON "tenants" FOR SELECT USING (
    is_superadmin() OR
    EXISTS (
        SELECT 1 FROM public."tenant_members" 
        WHERE "tenant_id" = "tenants".id 
        AND "user_id" = get_current_user_id()
    )
);

-- 6. TENANT-SCOPED DATA (Generic Isolation)
-- Apply Tenant Isolation to core tables
DROP POLICY IF EXISTS tenant_isolation_workspaces ON "workspaces";
CREATE POLICY tenant_isolation_workspaces ON "workspaces" FOR ALL USING (has_tenant_access(tenant_id));

DROP POLICY IF EXISTS tenant_isolation_modules ON "modules";
CREATE POLICY tenant_isolation_modules ON "modules" FOR ALL USING (has_tenant_access(tenant_id));

DROP POLICY IF EXISTS tenant_isolation_records ON "records";
CREATE POLICY tenant_isolation_records ON "records" FOR ALL USING (has_tenant_access(tenant_id));

DROP POLICY IF EXISTS tenant_isolation_members ON "tenant_members";
CREATE POLICY tenant_isolation_members ON "tenant_members" FOR ALL USING (has_tenant_access(tenant_id));

DROP POLICY IF EXISTS tenant_isolation_global_lists ON "global_lists";
CREATE POLICY tenant_isolation_global_lists ON "global_lists" FOR ALL USING (has_tenant_access(tenant_id));

DROP POLICY IF EXISTS tenant_isolation_global_list_items ON "global_list_items";
CREATE POLICY tenant_isolation_global_list_items ON "global_list_items" FOR ALL USING (has_tenant_access(tenant_id));

DROP POLICY IF EXISTS tenant_isolation_audit_logs ON "audit_logs";
CREATE POLICY tenant_isolation_audit_logs ON "audit_logs" FOR ALL USING (has_tenant_access(tenant_id));

DROP POLICY IF EXISTS tenant_isolation_teams ON "teams";
CREATE POLICY tenant_isolation_teams ON "teams" FOR ALL USING (has_tenant_access(tenant_id));

DROP POLICY IF EXISTS tenant_isolation_agents ON "agents";
CREATE POLICY tenant_isolation_agents ON "agents" FOR ALL USING (has_tenant_access(tenant_id));

DROP POLICY IF EXISTS tenant_isolation_positions ON "positions";
CREATE POLICY tenant_isolation_positions ON "positions" FOR ALL USING (has_tenant_access(tenant_id));

DROP POLICY IF EXISTS tenant_isolation_taxonomies ON "taxonomies";
CREATE POLICY tenant_isolation_taxonomies ON "taxonomies" FOR ALL USING (has_tenant_access(tenant_id));

DROP POLICY IF EXISTS tenant_isolation_connectors ON "tenant_connectors";
CREATE POLICY tenant_isolation_connectors ON "tenant_connectors" FOR ALL USING (has_tenant_access(tenant_id));

DROP POLICY IF EXISTS tenant_isolation_automations ON "automations";
CREATE POLICY tenant_isolation_automations ON "automations" FOR ALL USING (has_tenant_access(tenant_id));

DROP POLICY IF EXISTS tenant_isolation_automation_runs ON "automation_runs";
CREATE POLICY tenant_isolation_automation_runs ON "automation_runs" FOR ALL USING (has_tenant_access(tenant_id));

-- Sub-resource Isolation
DROP POLICY IF EXISTS subresource_isolation_phone ON "member_phone_numbers";
CREATE POLICY subresource_isolation_phone ON "member_phone_numbers" FOR ALL USING (has_tenant_access(tenant_id));

DROP POLICY IF EXISTS subresource_isolation_cert ON "member_certifications";
CREATE POLICY subresource_isolation_cert ON "member_certifications" FOR ALL USING (has_tenant_access(tenant_id));

DROP POLICY IF EXISTS subresource_isolation_edu ON "member_education";
CREATE POLICY subresource_isolation_edu ON "member_education" FOR ALL USING (has_tenant_access(tenant_id));

DROP POLICY IF EXISTS subresource_isolation_skill ON "member_skills";
CREATE POLICY subresource_isolation_skill ON "member_skills" FOR ALL USING (has_tenant_access(tenant_id));

-- 7. EXPLICIT GRANTS FOR DATA API (PostgREST)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON TABLE "tenants", "users" TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
