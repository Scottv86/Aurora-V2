-- Core PostgreSQL Schema for Hybrid Multi-tenancy
-- Objective: Logical isolation with superadmin override

-- 1. EXTENSIONS (Optional but common for UUIDs)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CORE TABLES

-- Global identity table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    auth_provider TEXT NOT NULL,
    is_superadmin BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tenant configuration table
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'suspended', 'maintenance'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sub-groupings scoped to a tenant
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pivot table mapping users to tenants
CREATE TABLE IF NOT EXISTS tenant_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    role_id TEXT NOT NULL DEFAULT 'member', -- 'admin', 'editor', 'member', 'viewer'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, tenant_id)
);

-- 3. INDEXES (Optimized for tenant-based querying)
CREATE INDEX IF NOT EXISTS idx_teams_tenant_id ON teams(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant_id ON tenant_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_user_id ON tenant_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_team_id ON tenant_members(team_id);

-- 4. ROW-LEVEL SECURITY (RLS)

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;

-- 5. RLS POLICIES

-- Helper Function to check superadmin status (avoids repeated complex logic in policies)
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        current_setting('app.is_superadmin', true) = 'true' 
        OR EXISTS (
            SELECT 1 FROM users 
            WHERE id = NULLIF(current_setting('app.current_user_id', true), '')::UUID 
            AND is_superadmin = true
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Users Table Policies
CREATE POLICY users_superadmin_bypass ON users
    FOR ALL
    USING (is_superadmin());

CREATE POLICY users_self_access ON users
    FOR ALL
    USING (id = NULLIF(current_setting('app.current_user_id', true), '')::UUID);

-- Tenants Table Policies
CREATE POLICY tenants_superadmin_bypass ON tenants
    FOR ALL
    USING (is_superadmin());

CREATE POLICY tenants_member_access ON tenants
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM tenant_members 
            WHERE tenant_id = tenants.id 
            AND user_id = NULLIF(current_setting('app.current_user_id', true), '')::UUID
        )
    );

-- Teams Table Policies (Tenant Isolation)
CREATE POLICY teams_tenant_isolation ON teams
    FOR ALL
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID
        OR is_superadmin()
    );

-- Tenant Members Table Policies (Tenant Isolation)
CREATE POLICY tenant_members_isolation ON tenant_members
    FOR ALL
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID
        OR is_superadmin()
    );

-- 6. DYNAMIC RLS ENFORCEMENT
-- Note: FORCE ROW LEVEL SECURITY ensures that even the table owner is subject to RLS
ALTER TABLE teams FORCE ROW LEVEL SECURITY;
ALTER TABLE tenant_members FORCE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE tenants FORCE ROW LEVEL SECURITY;

-- 7. AUDIT TRIGGER (Optional but recommended)
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_users_modtime BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenants_modtime BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teams_modtime BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_members_modtime BEFORE UPDATE ON tenant_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
