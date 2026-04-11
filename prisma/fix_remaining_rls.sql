-- Enable RLS and add isolation policies for positions, teams, and agents
BEGIN;

-- Helper function is already defined in earlier scripts, but we'll use it here
-- is_superadmin() is expected to be available

-- 1. Enable RLS
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions FORCE ROW LEVEL SECURITY;

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams FORCE ROW LEVEL SECURITY;

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents FORCE ROW LEVEL SECURITY;

ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs FORCE ROW LEVEL SECURITY;

-- 2. Drop existing if any (to be safe)
DROP POLICY IF EXISTS position_isolation ON positions;
DROP POLICY IF EXISTS team_isolation ON teams;
DROP POLICY IF EXISTS agent_isolation ON agents;
DROP POLICY IF EXISTS usage_log_isolation ON usage_logs;

-- 3. Apply Strict Isolation Policies
-- Logic: (tenant_id matches session) OR (superadmin AND no tenant context)

CREATE POLICY position_isolation ON positions FOR ALL USING (
    tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::TEXT 
    OR (is_superadmin() AND NULLIF(current_setting('app.current_tenant_id', true), '') IS NULL)
);

CREATE POLICY team_isolation ON teams FOR ALL USING (
    tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::TEXT 
    OR (is_superadmin() AND NULLIF(current_setting('app.current_tenant_id', true), '') IS NULL)
);

CREATE POLICY agent_isolation ON agents FOR ALL USING (
    tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::TEXT 
    OR (is_superadmin() AND NULLIF(current_setting('app.current_tenant_id', true), '') IS NULL)
);

CREATE POLICY usage_log_isolation ON usage_logs FOR ALL USING (
    tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::TEXT 
    OR (is_superadmin() AND NULLIF(current_setting('app.current_tenant_id', true), '') IS NULL)
);

COMMIT;
