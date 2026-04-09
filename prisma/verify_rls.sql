-- Verification Script for Multi-tenant RLS
-- Run this to test the logical isolation and superadmin bypass

-- 1. SETUP TEST DATA
-- Reset any existing test data (WARNING: Drops tables to ensure clean state)
DROP TABLE IF EXISTS tenant_members;
DROP TABLE IF EXISTS teams;
DROP TABLE IF EXISTS tenants;
DROP TABLE IF EXISTS users;

-- Re-run the schema (Assumes schema_v2.sql has been executed)
-- [PASTE schema_v2.sql content here or execute it]

-- 2. CREATE SAMPLE DATA
INSERT INTO users (id, email, auth_provider, is_superadmin) VALUES 
('u1111111-1111-1111-1111-111111111111', 'admin@aurora.com', 'email', true),
('u2222222-2222-2222-2222-222222222222', 'user1@tenant_a.com', 'email', false),
('u3333333-3333-3333-3333-333333333333', 'user2@tenant_b.com', 'email', false);

INSERT INTO tenants (id, name, status) VALUES 
('tAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA', 'Tenant A', 'active'),
('tBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBBB', 'Tenant B', 'active');

INSERT INTO teams (id, tenant_id, name) VALUES 
('tmAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA', 'tAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA', 'Team A-1'),
('tmBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBBB', 'tBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBBB', 'Team B-1');

INSERT INTO tenant_members (user_id, tenant_id, role_id) VALUES 
('u2222222-2222-2222-2222-222222222222', 'tAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA', 'admin'),
('u3333333-3333-3333-3333-333333333333', 'tBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBBB', 'member');

-- 3. TEST SUITE

-- TEST 1: Tenant A User Access
-- Simulation: User1 from Tenant A is logged in
SET app.current_user_id = 'u2222222-2222-2222-2222-222222222222';
SET app.current_tenant_id = 'tAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA';

-- Should see only Team A-1
SELECT 'TEST 1 (Teams - Tenant A User)' as test, name FROM teams;

-- Should see only Tenant A
SELECT 'TEST 1 (Tenants - Tenant A User)' as test, name FROM tenants;

-- TEST 2: Tenant B User Access
-- Simulation: User2 from Tenant B is logged in
SET app.current_user_id = 'u3333333-3333-3333-3333-333333333333';
SET app.current_tenant_id = 'tBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBBB';

-- Should see only Team B-1
SELECT 'TEST 2 (Teams - Tenant B User)' as test, name FROM teams;

-- TEST 3: Superadmin Access (Bypass)
-- Simulation: Superadmin is logged in
SET app.current_user_id = 'u1111111-1111-1111-1111-111111111111';
SET app.current_tenant_id = ''; -- Not scoped to any tenant

-- Should see ALL users
SELECT 'TEST 3 (Users - Superadmin)' as test, email FROM users;

-- Should see ALL tenants
SELECT 'TEST 3 (Tenants - Superadmin)' as test, name FROM tenants;

-- Should see ALL teams across ALL tenants
SELECT 'TEST 3 (Teams - Superadmin)' as test, name FROM teams;
