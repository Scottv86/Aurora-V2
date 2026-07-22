-- Enable RLS and apply tenant isolation policies for all remaining unrestricted tables

-- 1. Enable and Force RLS on all 9 tables
ALTER TABLE "ai_usage_metrics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_usage_metrics" FORCE ROW LEVEL SECURITY;

ALTER TABLE "antigravity_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "antigravity_sessions" FORCE ROW LEVEL SECURITY;

ALTER TABLE "antigravity_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "antigravity_messages" FORCE ROW LEVEL SECURITY;

ALTER TABLE "quarantine_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "quarantine_records" FORCE ROW LEVEL SECURITY;

ALTER TABLE "reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reports" FORCE ROW LEVEL SECURITY;

ALTER TABLE "scheduled_jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "scheduled_jobs" FORCE ROW LEVEL SECURITY;

ALTER TABLE "tenant_ai_keys" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_ai_keys" FORCE ROW LEVEL SECURITY;

ALTER TABLE "tenant_ai_mappings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_ai_mappings" FORCE ROW LEVEL SECURITY;

ALTER TABLE "webhook_subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "webhook_subscriptions" FORCE ROW LEVEL SECURITY;

-- 2. Drop existing policies if any
DROP POLICY IF EXISTS tenant_isolation_ai_usage_metrics ON "ai_usage_metrics";
DROP POLICY IF EXISTS tenant_isolation_antigravity_sessions ON "antigravity_sessions";
DROP POLICY IF EXISTS session_isolation_antigravity_messages ON "antigravity_messages";
DROP POLICY IF EXISTS tenant_isolation_quarantine_records ON "quarantine_records";
DROP POLICY IF EXISTS tenant_isolation_reports ON "reports";
DROP POLICY IF EXISTS tenant_isolation_scheduled_jobs ON "scheduled_jobs";
DROP POLICY IF EXISTS tenant_isolation_tenant_ai_keys ON "tenant_ai_keys";
DROP POLICY IF EXISTS tenant_isolation_tenant_ai_mappings ON "tenant_ai_mappings";
DROP POLICY IF EXISTS tenant_isolation_webhook_subscriptions ON "webhook_subscriptions";

-- 3. Create Tenant Isolation Policies

-- Direct tenant_id tables
CREATE POLICY tenant_isolation_ai_usage_metrics ON "ai_usage_metrics" 
    FOR ALL USING (has_tenant_access(tenant_id));

CREATE POLICY tenant_isolation_antigravity_sessions ON "antigravity_sessions" 
    FOR ALL USING (has_tenant_access(tenant_id));

CREATE POLICY tenant_isolation_quarantine_records ON "quarantine_records" 
    FOR ALL USING (has_tenant_access(tenant_id));

CREATE POLICY tenant_isolation_reports ON "reports" 
    FOR ALL USING (has_tenant_access(tenant_id));

CREATE POLICY tenant_isolation_scheduled_jobs ON "scheduled_jobs" 
    FOR ALL USING (has_tenant_access(tenant_id));

CREATE POLICY tenant_isolation_tenant_ai_keys ON "tenant_ai_keys" 
    FOR ALL USING (has_tenant_access(tenant_id));

CREATE POLICY tenant_isolation_tenant_ai_mappings ON "tenant_ai_mappings" 
    FOR ALL USING (has_tenant_access(tenant_id));

CREATE POLICY tenant_isolation_webhook_subscriptions ON "webhook_subscriptions" 
    FOR ALL USING (has_tenant_access(tenant_id));

-- Sub-resource table linked via session_id
CREATE POLICY session_isolation_antigravity_messages ON "antigravity_messages" 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM "antigravity_sessions" s
            WHERE s.id = "antigravity_messages".session_id
            AND has_tenant_access(s.tenant_id)
        )
    );

-- 4. Grant table privileges to service_role and authenticated roles
GRANT ALL ON "ai_usage_metrics", "antigravity_sessions", "antigravity_messages", "quarantine_records", "reports", "scheduled_jobs", "tenant_ai_keys", "tenant_ai_mappings", "webhook_subscriptions" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON "ai_usage_metrics", "antigravity_sessions", "antigravity_messages", "quarantine_records", "reports", "scheduled_jobs", "tenant_ai_keys", "tenant_ai_mappings", "webhook_subscriptions" TO authenticated;
