-- Database Consolidation Script
-- Renames PascalCase tables to lowercase plural and syncs data to snake_case columns.

BEGIN;

-- 1. Drop the empty lowercase plural tables created by manual SQL
DROP TABLE IF EXISTS "tenant_members" CASCADE;
DROP TABLE IF EXISTS "teams" CASCADE;
DROP TABLE IF EXISTS "tenants" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;

-- 2. Rename Prisma PascalCase tables to lowercase plural
ALTER TABLE "User" RENAME TO "users";
ALTER TABLE "Tenant" RENAME TO "tenants";
ALTER TABLE "TenantMember" RENAME TO "tenant_members";
ALTER TABLE "Workspace" RENAME TO "workspaces"; -- Renaming Workspace to workspaces for consistency
ALTER TABLE "Module" RENAME TO "modules";
ALTER TABLE "Record" RENAME TO "records";
ALTER TABLE "UsageLog" RENAME TO "usage_logs";
ALTER TABLE "DocumentTemplate" RENAME TO "document_templates";
ALTER TABLE "GeneratedDocument" RENAME TO "generated_documents";

-- 3. Rename columns to snake_case (matching SQL conventions)

-- Tables: users
ALTER TABLE "users" RENAME COLUMN "isSuperAdmin" TO "is_superadmin";
ALTER TABLE "users" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "users" RENAME COLUMN "updatedAt" TO "updated_at";

-- Tables: tenants
ALTER TABLE "tenants" RENAME COLUMN "dbConnectionString" TO "db_connection_string";
ALTER TABLE "tenants" RENAME COLUMN "planTier" TO "plan_tier";
ALTER TABLE "tenants" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "tenants" RENAME COLUMN "updatedAt" TO "updated_at";

-- Tables: workspaces
ALTER TABLE "workspaces" RENAME COLUMN "tenantId" TO "tenant_id";

-- Tables: modules
ALTER TABLE "modules" RENAME COLUMN "tenantId" TO "tenant_id";
ALTER TABLE "modules" RENAME COLUMN "workspaceId" TO "workspace_id";
ALTER TABLE "modules" RENAME COLUMN "createdAt" TO "created_at";

-- Tables: tenant_members
ALTER TABLE "tenant_members" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "tenant_members" RENAME COLUMN "tenantId" TO "tenant_id";
ALTER TABLE "tenant_members" RENAME COLUMN "roleId" TO "role_id";
ALTER TABLE "tenant_members" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "tenant_members" RENAME COLUMN "updatedAt" TO "updated_at";

-- Tables: records
ALTER TABLE "records" RENAME COLUMN "tenantId" TO "tenant_id";
ALTER TABLE "records" RENAME COLUMN "moduleId" TO "module_id";
ALTER TABLE "records" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "records" RENAME COLUMN "updatedAt" TO "updated_at";

-- Tables: usage_logs
ALTER TABLE "usage_logs" RENAME COLUMN "tenantId" TO "tenant_id";

-- Tables: document_templates
ALTER TABLE "document_templates" RENAME COLUMN "tenantId" TO "tenant_id";
ALTER TABLE "document_templates" RENAME COLUMN "moduleId" TO "module_id";
ALTER TABLE "document_templates" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "document_templates" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "document_templates" RENAME COLUMN "createdBy" TO "created_by";

-- Tables: generated_documents
ALTER TABLE "generated_documents" RENAME COLUMN "tenantId" TO "tenant_id";
ALTER TABLE "generated_documents" RENAME COLUMN "templateId" TO "template_id";
ALTER TABLE "generated_documents" RENAME COLUMN "templateVersion" TO "template_version";
ALTER TABLE "generated_documents" RENAME COLUMN "recordId" TO "record_id";
ALTER TABLE "generated_documents" RENAME COLUMN "moduleId" TO "module_id";
ALTER TABLE "generated_documents" RENAME COLUMN "generatedAt" TO "generated_at";
ALTER TABLE "generated_documents" RENAME COLUMN "generatedBy" TO "generated_by";
ALTER TABLE "generated_documents" RENAME COLUMN "dataSnapshot" TO "data_snapshot";

-- 4. Re-apply RLS (Simplified version based on schema_v2.sql)
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workspaces" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "modules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "usage_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "document_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "generated_documents" ENABLE ROW LEVEL SECURITY;

-- Force RLS
ALTER TABLE "users" FORCE ROW LEVEL SECURITY;
ALTER TABLE "tenants" FORCE ROW LEVEL SECURITY;
ALTER TABLE "workspaces" FORCE ROW LEVEL SECURITY;
ALTER TABLE "tenant_members" FORCE ROW LEVEL SECURITY;

COMMIT;
