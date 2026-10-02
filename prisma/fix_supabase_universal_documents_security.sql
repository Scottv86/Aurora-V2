-- =========================================================================
-- Fix Supabase Security Advisories:
-- Enable & force Row Level Security (RLS) and add tenant isolation policies
-- for Universal Documents tables:
-- 1. universal_documents
-- 2. universal_disposal_schedules
-- 3. universal_document_links
-- 4. universal_document_audit_logs
-- 5. universal_document_versions
-- =========================================================================

-- 1. Enable and force Row Level Security (RLS)
ALTER TABLE "universal_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "universal_documents" FORCE ROW LEVEL SECURITY;

ALTER TABLE "universal_disposal_schedules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "universal_disposal_schedules" FORCE ROW LEVEL SECURITY;

ALTER TABLE "universal_document_links" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "universal_document_links" FORCE ROW LEVEL SECURITY;

ALTER TABLE "universal_document_audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "universal_document_audit_logs" FORCE ROW LEVEL SECURITY;

ALTER TABLE "universal_document_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "universal_document_versions" FORCE ROW LEVEL SECURITY;

-- 2. Drop existing policies if present for idempotency
DROP POLICY IF EXISTS tenant_isolation_universal_documents ON "universal_documents";
DROP POLICY IF EXISTS tenant_isolation_universal_disposal_schedules ON "universal_disposal_schedules";
DROP POLICY IF EXISTS tenant_isolation_universal_document_links ON "universal_document_links";
DROP POLICY IF EXISTS tenant_isolation_universal_document_audit_logs ON "universal_document_audit_logs";
DROP POLICY IF EXISTS tenant_isolation_universal_document_versions ON "universal_document_versions";

-- 3. Create tenant isolation policies
CREATE POLICY tenant_isolation_universal_documents ON "universal_documents"
    FOR ALL USING (has_tenant_access(tenant_id));

CREATE POLICY tenant_isolation_universal_disposal_schedules ON "universal_disposal_schedules"
    FOR ALL USING (has_tenant_access(tenant_id));

CREATE POLICY tenant_isolation_universal_document_links ON "universal_document_links"
    FOR ALL USING (has_tenant_access(tenant_id));

CREATE POLICY tenant_isolation_universal_document_audit_logs ON "universal_document_audit_logs"
    FOR ALL USING (has_tenant_access(tenant_id));

CREATE POLICY tenant_isolation_universal_document_versions ON "universal_document_versions"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM "universal_documents" d
            WHERE d.id = "universal_document_versions".document_id
              AND has_tenant_access(d.tenant_id)
        )
    );

-- 4. Grant table permissions to service_role & authenticated roles
GRANT ALL ON "universal_documents", "universal_disposal_schedules", "universal_document_links", "universal_document_audit_logs", "universal_document_versions" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON "universal_documents", "universal_disposal_schedules", "universal_document_links", "universal_document_audit_logs", "universal_document_versions" TO authenticated;
