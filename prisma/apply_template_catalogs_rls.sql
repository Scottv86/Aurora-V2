-- =========================================================================
-- Aurora Row Level Security & Policy Remediation: template_catalogs
-- Enables & forces RLS, applies multi-tenant + system scoping policies, grants roles
-- =========================================================================

-- 1. ENABLE & FORCE RLS
ALTER TABLE "template_catalogs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "template_catalogs" FORCE ROW LEVEL SECURITY;

-- 2. DROP EXISTING POLICIES FOR IDEMPOTENCY
DROP POLICY IF EXISTS template_catalogs_select_policy ON "template_catalogs";
DROP POLICY IF EXISTS template_catalogs_insert_policy ON "template_catalogs";
DROP POLICY IF EXISTS template_catalogs_update_policy ON "template_catalogs";
DROP POLICY IF EXISTS template_catalogs_delete_policy ON "template_catalogs";
DROP POLICY IF EXISTS tenant_isolation_template_catalogs ON "template_catalogs";

-- 3. CREATE POLICIES

-- SELECT: System templates (is_system = true OR tenant_id IS NULL) are readable by all authenticated users.
-- Tenant custom templates are only accessible to members of that specific tenant or superadmins.
CREATE POLICY template_catalogs_select_policy ON "template_catalogs"
    FOR SELECT USING (
        is_system = true 
        OR tenant_id IS NULL 
        OR is_superadmin() 
        OR has_tenant_access(tenant_id)
    );

-- INSERT: Superadmins can create system or tenant templates.
-- Tenant members can create custom templates only for their own tenant (is_system must be false).
CREATE POLICY template_catalogs_insert_policy ON "template_catalogs"
    FOR INSERT WITH CHECK (
        is_superadmin() 
        OR (
            tenant_id IS NOT NULL 
            AND is_system = false 
            AND has_tenant_access(tenant_id)
        )
    );

-- UPDATE: Superadmins can update any template.
-- Tenant members can only modify custom templates belonging to their own tenant.
CREATE POLICY template_catalogs_update_policy ON "template_catalogs"
    FOR UPDATE USING (
        is_superadmin() 
        OR (
            tenant_id IS NOT NULL 
            AND is_system = false 
            AND has_tenant_access(tenant_id)
        )
    );

-- DELETE: Superadmins can delete any template.
-- Tenant members can only delete custom templates belonging to their own tenant.
CREATE POLICY template_catalogs_delete_policy ON "template_catalogs"
    FOR DELETE USING (
        is_superadmin() 
        OR (
            tenant_id IS NOT NULL 
            AND is_system = false 
            AND has_tenant_access(tenant_id)
        )
    );

-- 4. GRANT PRIVILEGES
GRANT ALL ON "template_catalogs" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON "template_catalogs" TO authenticated;
