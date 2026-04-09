-- Aurora Session-Based RLS Context Setup
-- This script enables RLS on all core tables and defines policies based on
-- app.current_user_id and app.current_tenant_id session variables.

-- 1. Helper Function for SuperAdmin check
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        current_setting('app.is_superadmin', true) = 'true' 
        OR EXISTS (
            SELECT 1 FROM "User" 
            WHERE id = current_setting('app.current_user_id', true)
            AND "isSuperAdmin" = true
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. ENABLE RLS ON ALL TABLES
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Workspace" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Module" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Record" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TenantMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DocumentTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GeneratedDocument" ENABLE ROW LEVEL SECURITY;

-- 3. POLICIES FOR "User"
-- Superadmins see all users
CREATE POLICY user_superadmin_all ON "User" FOR ALL USING (is_superadmin());
-- Users can see/update themselves
CREATE POLICY user_self_access ON "User" FOR ALL USING (id = current_setting('app.current_user_id', true));

-- 4. POLICIES FOR "Tenant"
-- Superadmins see all tenants
CREATE POLICY tenant_superadmin_all ON "Tenant" FOR ALL USING (is_superadmin());
-- Users can see tenants they are members of
CREATE POLICY tenant_member_select ON "Tenant" FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM "TenantMember" 
        WHERE "tenantId" = "Tenant".id 
        AND "userId" = current_setting('app.current_user_id', true)
    )
);

-- 5. POLICIES FOR "TenantMember"
-- Superadmins see all memberships
CREATE POLICY member_superadmin_all ON "TenantMember" FOR ALL USING (is_superadmin());
-- Users see memberships for their tenants
CREATE POLICY member_tenant_isolation ON "TenantMember" FOR ALL USING (
    "tenantId" = current_setting('app.current_tenant_id', true)
);

-- 6. TENANT-SCOPED DATA (Workspace, Module, Record, Templates)
-- Shared Logic: Access if tenantId matches OR superadmin bypass

-- Workspace
CREATE POLICY workspace_isolation ON "Workspace" FOR ALL USING (
    "tenantId" = current_setting('app.current_tenant_id', true) OR is_superadmin()
);

-- Module
CREATE POLICY module_isolation ON "Module" FOR ALL USING (
    "tenantId" = current_setting('app.current_tenant_id', true) OR is_superadmin()
);

-- Record
CREATE POLICY record_isolation ON "Record" FOR ALL USING (
    "tenantId" = current_setting('app.current_tenant_id', true) OR is_superadmin()
);

-- DocumentTemplate
CREATE POLICY template_isolation ON "DocumentTemplate" FOR ALL USING (
    "tenantId" = current_setting('app.current_tenant_id', true) OR is_superadmin()
);

-- GeneratedDocument
CREATE POLICY document_isolation ON "GeneratedDocument" FOR ALL USING (
    "tenantId" = current_setting('app.current_tenant_id', true) OR is_superadmin()
);

-- 7. FORCE RLS (Ensures owner is also restricted)
ALTER TABLE "User" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Tenant" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Workspace" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Module" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Record" FORCE ROW LEVEL SECURITY;
ALTER TABLE "TenantMember" FORCE ROW LEVEL SECURITY;
ALTER TABLE "DocumentTemplate" FORCE ROW LEVEL SECURITY;
ALTER TABLE "GeneratedDocument" FORCE ROW LEVEL SECURITY;
