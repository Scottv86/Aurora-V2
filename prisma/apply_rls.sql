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
            SELECT 1 FROM "users" 
            WHERE id = current_setting('app.current_user_id', true)
            AND "is_superadmin" = true
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. ENABLE RLS ON ALL TABLES
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workspaces" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "modules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "document_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "generated_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "member_phone_numbers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "member_certifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "member_education" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "member_skills" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "permission_groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "member_permission_groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "teams" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "positions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "member_successions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "employment_contracts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "remuneration_details" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "leave_balances" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "leave_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "timesheets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "timesheet_entries" ENABLE ROW LEVEL SECURITY;

-- 3. POLICIES FOR "users"
-- Superadmins see all users
DROP POLICY IF EXISTS user_superadmin_all ON "users";
CREATE POLICY user_superadmin_all ON "users" FOR ALL USING (is_superadmin());
-- Users can see/update themselves
DROP POLICY IF EXISTS user_self_access ON "users";
CREATE POLICY user_self_access ON "users" FOR ALL USING (id = current_setting('app.current_user_id', true));

-- 4. POLICIES FOR "tenants"
-- Superadmins see all tenants
DROP POLICY IF EXISTS tenant_superadmin_all ON "tenants";
CREATE POLICY tenant_superadmin_all ON "tenants" FOR ALL USING (is_superadmin());
-- Users can see tenants they are members of
DROP POLICY IF EXISTS tenant_member_select ON "tenants";
CREATE POLICY tenant_member_select ON "tenants" FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM "tenant_members" 
        WHERE "tenant_id" = "tenants".id 
        AND "user_id" = current_setting('app.current_user_id', true)
    )
);

-- 5. POLICIES FOR "tenant_members"
-- Superadmins see all memberships
DROP POLICY IF EXISTS member_superadmin_all ON "tenant_members";
CREATE POLICY member_superadmin_all ON "tenant_members" FOR ALL USING (is_superadmin());
-- Users see memberships for their tenants
DROP POLICY IF EXISTS member_tenant_isolation ON "tenant_members";
CREATE POLICY member_tenant_isolation ON "tenant_members" FOR ALL USING (
    "tenant_id" = current_setting('app.current_tenant_id', true)
);

-- 6. TENANT-SCOPED DATA (workspaces, modules, records, templates)
-- Shared Logic: Access if tenant_id matches OR superadmin bypass

-- Workspace
DROP POLICY IF EXISTS workspace_isolation ON "workspaces";
CREATE POLICY workspace_isolation ON "workspaces" FOR ALL USING (
    "tenant_id" = current_setting('app.current_tenant_id', true) OR is_superadmin()
);

-- Module
DROP POLICY IF EXISTS module_isolation ON "modules";
CREATE POLICY module_isolation ON "modules" FOR ALL USING (
    "tenant_id" = current_setting('app.current_tenant_id', true) OR is_superadmin()
);

-- Record
DROP POLICY IF EXISTS record_isolation ON "records";
CREATE POLICY record_isolation ON "records" FOR ALL USING (
    "tenant_id" = current_setting('app.current_tenant_id', true) OR is_superadmin()
);

-- DocumentTemplate
DROP POLICY IF EXISTS template_isolation ON "document_templates";
CREATE POLICY template_isolation ON "document_templates" FOR ALL USING (
    "tenant_id" = current_setting('app.current_tenant_id', true) OR is_superadmin()
);

DROP POLICY IF EXISTS document_isolation ON "generated_documents";
CREATE POLICY document_isolation ON "generated_documents" FOR ALL USING (
    "tenant_id" = current_setting('app.current_tenant_id', true) OR is_superadmin()
);

-- Member Lists
DROP POLICY IF EXISTS member_phone_isolation ON "member_phone_numbers";
CREATE POLICY member_phone_isolation ON "member_phone_numbers" FOR ALL USING (
    "tenant_id" = current_setting('app.current_tenant_id', true) OR is_superadmin()
);
DROP POLICY IF EXISTS member_cert_isolation ON "member_certifications";
CREATE POLICY member_cert_isolation ON "member_certifications" FOR ALL USING (
    "tenant_id" = current_setting('app.current_tenant_id', true) OR is_superadmin()
);
DROP POLICY IF EXISTS member_edu_isolation ON "member_education";
CREATE POLICY member_edu_isolation ON "member_education" FOR ALL USING (
    "tenant_id" = current_setting('app.current_tenant_id', true) OR is_superadmin()
);
DROP POLICY IF EXISTS member_skill_isolation ON "member_skills";
CREATE POLICY member_skill_isolation ON "member_skills" FOR ALL USING (
    "tenant_id" = current_setting('app.current_tenant_id', true) OR is_superadmin()
);

-- Permission Groups
DROP POLICY IF EXISTS permission_group_isolation ON "permission_groups";
CREATE POLICY permission_group_isolation ON "permission_groups" FOR ALL USING (
    "tenant_id" = current_setting('app.current_tenant_id', true) OR is_superadmin()
);

DROP POLICY IF EXISTS member_pg_isolation ON "member_permission_groups";
CREATE POLICY member_pg_isolation ON "member_permission_groups" FOR ALL USING (
    "tenant_id" = current_setting('app.current_tenant_id', true) OR is_superadmin()
);

-- Audit Logs
DROP POLICY IF EXISTS audit_log_isolation ON "audit_logs";
CREATE POLICY audit_log_isolation ON "audit_logs" FOR ALL USING (
    "tenant_id" = current_setting('app.current_tenant_id', true) OR is_superadmin()
);

-- Teams
DROP POLICY IF EXISTS team_isolation ON "teams";
CREATE POLICY team_isolation ON "teams" FOR ALL USING (
    "tenant_id" = current_setting('app.current_tenant_id', true) OR is_superadmin()
);

-- Agents
DROP POLICY IF EXISTS agent_isolation ON "agents";
CREATE POLICY agent_isolation ON "agents" FOR ALL USING (
    "tenant_id" = current_setting('app.current_tenant_id', true) OR is_superadmin()
);

-- Positions
DROP POLICY IF EXISTS position_isolation ON "positions";
CREATE POLICY position_isolation ON "positions" FOR ALL USING (
    "tenant_id" = current_setting('app.current_tenant_id', true) OR is_superadmin()
);

-- Succession
DROP POLICY IF EXISTS succession_isolation ON "member_successions";
CREATE POLICY succession_isolation ON "member_successions" FOR ALL USING (
    EXISTS (
        SELECT 1 FROM "tenant_members" m 
        WHERE m.id = "member_successions".member_id 
        AND m.tenant_id = current_setting('app.current_tenant_id', true)
    ) OR is_superadmin()
);

-- Contracts & Pay
DROP POLICY IF EXISTS contract_isolation ON "employment_contracts";
CREATE POLICY contract_isolation ON "employment_contracts" FOR ALL USING (
    "tenant_id" = current_setting('app.current_tenant_id', true) OR is_superadmin()
);

DROP POLICY IF EXISTS remuneration_isolation ON "remuneration_details";
CREATE POLICY remuneration_isolation ON "remuneration_details" FOR ALL USING (
    EXISTS (SELECT 1 FROM "employment_contracts" c WHERE c.id = "remuneration_details".contract_id AND c.tenant_id = current_setting('app.current_tenant_id', true)) OR is_superadmin()
);

-- Leave & Time
DROP POLICY IF EXISTS leave_balance_isolation ON "leave_balances";
CREATE POLICY leave_balance_isolation ON "leave_balances" FOR ALL USING (
    EXISTS (SELECT 1 FROM "tenant_members" m WHERE m.id = "leave_balances".member_id AND m.tenant_id = current_setting('app.current_tenant_id', true)) OR is_superadmin()
);

DROP POLICY IF EXISTS leave_request_isolation ON "leave_requests";
CREATE POLICY leave_request_isolation ON "leave_requests" FOR ALL USING (
    EXISTS (SELECT 1 FROM "tenant_members" m WHERE m.id = "leave_requests".member_id AND m.tenant_id = current_setting('app.current_tenant_id', true)) OR is_superadmin()
);

DROP POLICY IF EXISTS timesheet_isolation ON "timesheets";
CREATE POLICY timesheet_isolation ON "timesheets" FOR ALL USING (
    EXISTS (SELECT 1 FROM "tenant_members" m WHERE m.id = "timesheets".member_id AND m.tenant_id = current_setting('app.current_tenant_id', true)) OR is_superadmin()
);

DROP POLICY IF EXISTS timesheet_entry_isolation ON "timesheet_entries";
CREATE POLICY timesheet_entry_isolation ON "timesheet_entries" FOR ALL USING (
    EXISTS (SELECT 1 FROM "timesheets" t JOIN "tenant_members" m ON t.member_id = m.id WHERE t.id = "timesheet_entries".timesheet_id AND m.tenant_id = current_setting('app.current_tenant_id', true)) OR is_superadmin()
);

-- 7. FORCE RLS (Ensures owner is also restricted)
ALTER TABLE "users" FORCE ROW LEVEL SECURITY;
ALTER TABLE "tenants" FORCE ROW LEVEL SECURITY;
ALTER TABLE "workspaces" FORCE ROW LEVEL SECURITY;
ALTER TABLE "modules" FORCE ROW LEVEL SECURITY;
ALTER TABLE "records" FORCE ROW LEVEL SECURITY;
ALTER TABLE "tenant_members" FORCE ROW LEVEL SECURITY;
ALTER TABLE "document_templates" FORCE ROW LEVEL SECURITY;
ALTER TABLE "generated_documents" FORCE ROW LEVEL SECURITY;
ALTER TABLE "member_phone_numbers" FORCE ROW LEVEL SECURITY;
ALTER TABLE "member_certifications" FORCE ROW LEVEL SECURITY;
ALTER TABLE "member_education" FORCE ROW LEVEL SECURITY;
ALTER TABLE "member_skills" FORCE ROW LEVEL SECURITY;
ALTER TABLE "permission_groups" FORCE ROW LEVEL SECURITY;
ALTER TABLE "member_permission_groups" FORCE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" FORCE ROW LEVEL SECURITY;
ALTER TABLE "teams" FORCE ROW LEVEL SECURITY;
ALTER TABLE "agents" FORCE ROW LEVEL SECURITY;
ALTER TABLE "positions" FORCE ROW LEVEL SECURITY;
ALTER TABLE "member_successions" FORCE ROW LEVEL SECURITY;
ALTER TABLE "employment_contracts" FORCE ROW LEVEL SECURITY;
ALTER TABLE "remuneration_details" FORCE ROW LEVEL SECURITY;
ALTER TABLE "leave_balances" FORCE ROW LEVEL SECURITY;
ALTER TABLE "leave_requests" FORCE ROW LEVEL SECURITY;
ALTER TABLE "timesheets" FORCE ROW LEVEL SECURITY;
ALTER TABLE "timesheet_entries" FORCE ROW LEVEL SECURITY;
