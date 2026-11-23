-- =========================================================================
-- Aurora Supabase Security Advisory Remediation: Omnichannel Service Desk
-- Addresses:
-- 1. rls_disabled: Enable and force Row Level Security (RLS) on:
--    - service_desk_sessions
--    - service_desk_messages
--    - service_desk_operator_presences
--    - service_desk_wrap_ups
--    - service_desk_feedback_cases
--    - service_desk_canned_responses
-- 2. rls_enabled_no_policy: Add tenant isolation & service role policies
-- 3. Restrict permissions: Revoke public/anon access, grant to service_role & authenticated
-- =========================================================================

-- 1. ENABLE & FORCE RLS ON ALL 6 SERVICE DESK TABLES
ALTER TABLE "service_desk_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "service_desk_sessions" FORCE ROW LEVEL SECURITY;

ALTER TABLE "service_desk_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "service_desk_messages" FORCE ROW LEVEL SECURITY;

ALTER TABLE "service_desk_operator_presences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "service_desk_operator_presences" FORCE ROW LEVEL SECURITY;

ALTER TABLE "service_desk_wrap_ups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "service_desk_wrap_ups" FORCE ROW LEVEL SECURITY;

ALTER TABLE "service_desk_feedback_cases" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "service_desk_feedback_cases" FORCE ROW LEVEL SECURITY;

ALTER TABLE "service_desk_canned_responses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "service_desk_canned_responses" FORCE ROW LEVEL SECURITY;

-- 2. DROP EXISTING POLICIES IF ANY FOR IDEMPOTENCY
DROP POLICY IF EXISTS tenant_isolation_service_desk_sessions ON "service_desk_sessions";
DROP POLICY IF EXISTS service_role_service_desk_sessions ON "service_desk_sessions";

DROP POLICY IF EXISTS tenant_isolation_service_desk_messages ON "service_desk_messages";
DROP POLICY IF EXISTS service_role_service_desk_messages ON "service_desk_messages";

DROP POLICY IF EXISTS tenant_isolation_service_desk_operator_presences ON "service_desk_operator_presences";
DROP POLICY IF EXISTS service_role_service_desk_operator_presences ON "service_desk_operator_presences";

DROP POLICY IF EXISTS tenant_isolation_service_desk_wrap_ups ON "service_desk_wrap_ups";
DROP POLICY IF EXISTS service_role_service_desk_wrap_ups ON "service_desk_wrap_ups";

DROP POLICY IF EXISTS tenant_isolation_service_desk_feedback_cases ON "service_desk_feedback_cases";
DROP POLICY IF EXISTS service_role_service_desk_feedback_cases ON "service_desk_feedback_cases";

DROP POLICY IF EXISTS tenant_isolation_service_desk_canned_responses ON "service_desk_canned_responses";
DROP POLICY IF EXISTS service_role_service_desk_canned_responses ON "service_desk_canned_responses";

-- 3. CREATE TENANT ISOLATION POLICIES (AUTHENTICATED & TENANT ACCESS)
CREATE POLICY tenant_isolation_service_desk_sessions ON "service_desk_sessions"
    AS PERMISSIVE FOR ALL
    USING (has_tenant_access(tenant_id))
    WITH CHECK (has_tenant_access(tenant_id));

CREATE POLICY service_role_service_desk_sessions ON "service_desk_sessions"
    AS PERMISSIVE FOR ALL
    USING (current_user = 'postgres' OR current_setting('request.jwt.claim.role', true) = 'service_role')
    WITH CHECK (current_user = 'postgres' OR current_setting('request.jwt.claim.role', true) = 'service_role');

CREATE POLICY tenant_isolation_service_desk_messages ON "service_desk_messages"
    AS PERMISSIVE FOR ALL
    USING (has_tenant_access(tenant_id))
    WITH CHECK (has_tenant_access(tenant_id));

CREATE POLICY service_role_service_desk_messages ON "service_desk_messages"
    AS PERMISSIVE FOR ALL
    USING (current_user = 'postgres' OR current_setting('request.jwt.claim.role', true) = 'service_role')
    WITH CHECK (current_user = 'postgres' OR current_setting('request.jwt.claim.role', true) = 'service_role');

CREATE POLICY tenant_isolation_service_desk_operator_presences ON "service_desk_operator_presences"
    AS PERMISSIVE FOR ALL
    USING (has_tenant_access(tenant_id))
    WITH CHECK (has_tenant_access(tenant_id));

CREATE POLICY service_role_service_desk_operator_presences ON "service_desk_operator_presences"
    AS PERMISSIVE FOR ALL
    USING (current_user = 'postgres' OR current_setting('request.jwt.claim.role', true) = 'service_role')
    WITH CHECK (current_user = 'postgres' OR current_setting('request.jwt.claim.role', true) = 'service_role');

CREATE POLICY tenant_isolation_service_desk_wrap_ups ON "service_desk_wrap_ups"
    AS PERMISSIVE FOR ALL
    USING (has_tenant_access(tenant_id))
    WITH CHECK (has_tenant_access(tenant_id));

CREATE POLICY service_role_service_desk_wrap_ups ON "service_desk_wrap_ups"
    AS PERMISSIVE FOR ALL
    USING (current_user = 'postgres' OR current_setting('request.jwt.claim.role', true) = 'service_role')
    WITH CHECK (current_user = 'postgres' OR current_setting('request.jwt.claim.role', true) = 'service_role');

CREATE POLICY tenant_isolation_service_desk_feedback_cases ON "service_desk_feedback_cases"
    AS PERMISSIVE FOR ALL
    USING (has_tenant_access(tenant_id))
    WITH CHECK (has_tenant_access(tenant_id));

CREATE POLICY service_role_service_desk_feedback_cases ON "service_desk_feedback_cases"
    AS PERMISSIVE FOR ALL
    USING (current_user = 'postgres' OR current_setting('request.jwt.claim.role', true) = 'service_role')
    WITH CHECK (current_user = 'postgres' OR current_setting('request.jwt.claim.role', true) = 'service_role');

CREATE POLICY tenant_isolation_service_desk_canned_responses ON "service_desk_canned_responses"
    AS PERMISSIVE FOR ALL
    USING (has_tenant_access(tenant_id))
    WITH CHECK (has_tenant_access(tenant_id));

CREATE POLICY service_role_service_desk_canned_responses ON "service_desk_canned_responses"
    AS PERMISSIVE FOR ALL
    USING (current_user = 'postgres' OR current_setting('request.jwt.claim.role', true) = 'service_role')
    WITH CHECK (current_user = 'postgres' OR current_setting('request.jwt.claim.role', true) = 'service_role');

-- 4. REVOKE UNRESTRICTED ANON PRIVILEGES & GRANT SERVICE_ROLE / AUTHENTICATED
REVOKE ALL ON "service_desk_sessions", "service_desk_messages", "service_desk_operator_presences", "service_desk_wrap_ups", "service_desk_feedback_cases", "service_desk_canned_responses" FROM anon;

GRANT ALL ON "service_desk_sessions", "service_desk_messages", "service_desk_operator_presences", "service_desk_wrap_ups", "service_desk_feedback_cases", "service_desk_canned_responses" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON "service_desk_sessions", "service_desk_messages", "service_desk_operator_presences", "service_desk_wrap_ups", "service_desk_feedback_cases", "service_desk_canned_responses" TO authenticated;
