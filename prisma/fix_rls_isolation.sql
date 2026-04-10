BEGIN;

-- 1. Helper Function: Corrected for lowercase table/columns and TEXT IDs
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        current_setting('app.is_superadmin', true) = 'true' 
        OR EXISTS (
            SELECT 1 FROM users 
            WHERE id = NULLIF(current_setting('app.current_user_id', true), '')::TEXT 
            AND is_superadmin = true
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Clean up and Re-apply Policies
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS module_isolation ON ' || quote_ident(t);
        EXECUTE 'DROP POLICY IF EXISTS record_isolation ON ' || quote_ident(t);
        EXECUTE 'DROP POLICY IF EXISTS workspace_isolation ON ' || quote_ident(t);
        EXECUTE 'DROP POLICY IF EXISTS user_self_access ON ' || quote_ident(t);
        EXECUTE 'DROP POLICY IF EXISTS user_superadmin_all ON ' || quote_ident(t);
        EXECUTE 'DROP POLICY IF EXISTS tenant_member_select ON ' || quote_ident(t);
        EXECUTE 'DROP POLICY IF EXISTS tenant_superadmin_all ON ' || quote_ident(t);
        EXECUTE 'DROP POLICY IF EXISTS member_tenant_isolation ON ' || quote_ident(t);
        EXECUTE 'DROP POLICY IF EXISTS template_isolation ON ' || quote_ident(t);
        EXECUTE 'DROP POLICY IF EXISTS document_isolation ON ' || quote_ident(t);
    END LOOP;
END $$;

-- Enable RLS and Force it for all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants FORCE ROW LEVEL SECURITY;
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_members FORCE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces FORCE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules FORCE ROW LEVEL SECURITY;
ALTER TABLE records ENABLE ROW LEVEL SECURITY;
ALTER TABLE records FORCE ROW LEVEL SECURITY;
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_templates FORCE ROW LEVEL SECURITY;
ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_documents FORCE ROW LEVEL SECURITY;

-- 4. Apply Strict Policies
-- These policies use a stricter logic for SuperAdmins:
-- isolation = (tenant_id matches OR (user is superadmin AND no tenant context is provided))

-- Users
CREATE POLICY user_superadmin_all ON users FOR ALL USING (is_superadmin());
CREATE POLICY user_self_access ON users FOR ALL USING (id = NULLIF(current_setting('app.current_user_id', true), '')::TEXT);

-- Tenants
CREATE POLICY tenant_superadmin_all ON tenants FOR ALL USING (is_superadmin());
CREATE POLICY tenant_member_select ON tenants FOR SELECT USING (EXISTS (SELECT 1 FROM tenant_members WHERE tenant_id = tenants.id AND user_id = NULLIF(current_setting('app.current_user_id', true), '')::TEXT));

-- Tenant Memberships
CREATE POLICY member_tenant_isolation ON tenant_members FOR ALL USING (
    tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::TEXT 
    OR (is_superadmin() AND NULLIF(current_setting('app.current_tenant_id', true), '') IS NULL)
);

-- Workspaces
CREATE POLICY workspace_isolation ON workspaces FOR ALL USING (
    tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::TEXT 
    OR (is_superadmin() AND NULLIF(current_setting('app.current_tenant_id', true), '') IS NULL)
);

-- Modules
CREATE POLICY module_isolation ON modules FOR ALL USING (
    tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::TEXT 
    OR (is_superadmin() AND NULLIF(current_setting('app.current_tenant_id', true), '') IS NULL)
);

-- Records
CREATE POLICY record_isolation ON records FOR ALL USING (
    tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::TEXT 
    OR (is_superadmin() AND NULLIF(current_setting('app.current_tenant_id', true), '') IS NULL)
);

-- Document Templates
CREATE POLICY template_isolation ON document_templates FOR ALL USING (
    tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::TEXT 
    OR (is_superadmin() AND NULLIF(current_setting('app.current_tenant_id', true), '') IS NULL)
);

-- Generated Documents
CREATE POLICY document_isolation ON generated_documents FOR ALL USING (
    tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::TEXT 
    OR (is_superadmin() AND NULLIF(current_setting('app.current_tenant_id', true), '') IS NULL)
);

COMMIT;
