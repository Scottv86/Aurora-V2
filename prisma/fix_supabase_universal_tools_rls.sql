-- =========================================================================
-- Aurora Supabase Security Advisory Remediation: Universal Tools
-- Addresses:
-- 1. rls_disabled: Enable and force Row Level Security (RLS) on:
--    - universal_calculations
--    - universal_notes
--    - universal_reminders
-- 2. rls_enabled_no_policy: Add tenant isolation & service role policies
-- 3. Restrict permissions: Revoke public/anon access, grant to service_role & authenticated
-- =========================================================================

-- 1. ENABLE & FORCE RLS ON ALL 3 TABLES
ALTER TABLE "universal_calculations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "universal_calculations" FORCE ROW LEVEL SECURITY;

ALTER TABLE "universal_notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "universal_notes" FORCE ROW LEVEL SECURITY;

ALTER TABLE "universal_reminders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "universal_reminders" FORCE ROW LEVEL SECURITY;

-- 2. DROP EXISTING POLICIES IF ANY FOR IDEMPOTENCY
DROP POLICY IF EXISTS tenant_isolation_universal_calculations ON "universal_calculations";
DROP POLICY IF EXISTS service_role_universal_calculations ON "universal_calculations";

DROP POLICY IF EXISTS tenant_isolation_universal_notes ON "universal_notes";
DROP POLICY IF EXISTS service_role_universal_notes ON "universal_notes";

DROP POLICY IF EXISTS tenant_isolation_universal_reminders ON "universal_reminders";
DROP POLICY IF EXISTS service_role_universal_reminders ON "universal_reminders";

-- 3. CREATE TENANT ISOLATION POLICIES (AUTHENTICATED & TENANT ACCESS)
CREATE POLICY tenant_isolation_universal_calculations ON "universal_calculations"
    AS PERMISSIVE FOR ALL
    USING (has_tenant_access(tenant_id))
    WITH CHECK (has_tenant_access(tenant_id));

CREATE POLICY service_role_universal_calculations ON "universal_calculations"
    AS PERMISSIVE FOR ALL
    USING (current_user = 'postgres' OR current_setting('request.jwt.claim.role', true) = 'service_role')
    WITH CHECK (current_user = 'postgres' OR current_setting('request.jwt.claim.role', true) = 'service_role');

CREATE POLICY tenant_isolation_universal_notes ON "universal_notes"
    AS PERMISSIVE FOR ALL
    USING (has_tenant_access(tenant_id))
    WITH CHECK (has_tenant_access(tenant_id));

CREATE POLICY service_role_universal_notes ON "universal_notes"
    AS PERMISSIVE FOR ALL
    USING (current_user = 'postgres' OR current_setting('request.jwt.claim.role', true) = 'service_role')
    WITH CHECK (current_user = 'postgres' OR current_setting('request.jwt.claim.role', true) = 'service_role');

CREATE POLICY tenant_isolation_universal_reminders ON "universal_reminders"
    AS PERMISSIVE FOR ALL
    USING (has_tenant_access(tenant_id))
    WITH CHECK (has_tenant_access(tenant_id));

CREATE POLICY service_role_universal_reminders ON "universal_reminders"
    AS PERMISSIVE FOR ALL
    USING (current_user = 'postgres' OR current_setting('request.jwt.claim.role', true) = 'service_role')
    WITH CHECK (current_user = 'postgres' OR current_setting('request.jwt.claim.role', true) = 'service_role');

-- 4. REVOKE UNRESTRICTED ANON PRIVILEGES & GRANT SERVICE_ROLE / AUTHENTICATED
REVOKE ALL ON "universal_calculations", "universal_notes", "universal_reminders" FROM anon;

GRANT ALL ON "universal_calculations", "universal_notes", "universal_reminders" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON "universal_calculations", "universal_notes", "universal_reminders" TO authenticated;
