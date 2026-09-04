-- =========================================================================
-- Aurora Supabase Security Advisory Remediation: Chat, Inbox, Saved Views & Migrations
-- Enables and forces RLS, applies tenant isolation policies, grants permissions
-- =========================================================================

-- 1. ENABLE & FORCE RLS ON ALL REMAINING TABLES
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" FORCE ROW LEVEL SECURITY;

ALTER TABLE "saved_views" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "saved_views" FORCE ROW LEVEL SECURITY;

ALTER TABLE "inbox_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inbox_accounts" FORCE ROW LEVEL SECURITY;

ALTER TABLE "inbox_folders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inbox_folders" FORCE ROW LEVEL SECURITY;

ALTER TABLE "inbox_threads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inbox_threads" FORCE ROW LEVEL SECURITY;

ALTER TABLE "inbox_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inbox_messages" FORCE ROW LEVEL SECURITY;

ALTER TABLE "inbox_attachments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inbox_attachments" FORCE ROW LEVEL SECURITY;

ALTER TABLE "inbox_internal_notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inbox_internal_notes" FORCE ROW LEVEL SECURITY;

ALTER TABLE "inbox_snippets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inbox_snippets" FORCE ROW LEVEL SECURITY;

ALTER TABLE "inbox_signatures" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inbox_signatures" FORCE ROW LEVEL SECURITY;

ALTER TABLE "inbox_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inbox_rules" FORCE ROW LEVEL SECURITY;

ALTER TABLE "chat_channels" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chat_channels" FORCE ROW LEVEL SECURITY;

ALTER TABLE "chat_channel_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chat_channel_members" FORCE ROW LEVEL SECURITY;

ALTER TABLE "chat_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chat_messages" FORCE ROW LEVEL SECURITY;

ALTER TABLE "chat_message_reactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chat_message_reactions" FORCE ROW LEVEL SECURITY;

ALTER TABLE "chat_message_attachments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chat_message_attachments" FORCE ROW LEVEL SECURITY;

ALTER TABLE "chat_user_presences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chat_user_presences" FORCE ROW LEVEL SECURITY;


-- 2. DROP EXISTING POLICIES FOR IDEMPOTENCY
DROP POLICY IF EXISTS superadmin_only_prisma_migrations ON "_prisma_migrations";
DROP POLICY IF EXISTS tenant_isolation_saved_views ON "saved_views";
DROP POLICY IF EXISTS tenant_isolation_inbox_accounts ON "inbox_accounts";
DROP POLICY IF EXISTS tenant_isolation_inbox_folders ON "inbox_folders";
DROP POLICY IF EXISTS tenant_isolation_inbox_threads ON "inbox_threads";
DROP POLICY IF EXISTS tenant_isolation_inbox_messages ON "inbox_messages";
DROP POLICY IF EXISTS tenant_isolation_inbox_attachments ON "inbox_attachments";
DROP POLICY IF EXISTS tenant_isolation_inbox_internal_notes ON "inbox_internal_notes";
DROP POLICY IF EXISTS tenant_isolation_inbox_snippets ON "inbox_snippets";
DROP POLICY IF EXISTS tenant_isolation_inbox_signatures ON "inbox_signatures";
DROP POLICY IF EXISTS tenant_isolation_inbox_rules ON "inbox_rules";
DROP POLICY IF EXISTS tenant_isolation_chat_channels ON "chat_channels";
DROP POLICY IF EXISTS tenant_isolation_chat_channel_members ON "chat_channel_members";
DROP POLICY IF EXISTS tenant_isolation_chat_messages ON "chat_messages";
DROP POLICY IF EXISTS tenant_isolation_chat_message_reactions ON "chat_message_reactions";
DROP POLICY IF EXISTS tenant_isolation_chat_message_attachments ON "chat_message_attachments";
DROP POLICY IF EXISTS tenant_isolation_chat_user_presences ON "chat_user_presences";


-- 3. CREATE POLICIES

-- Prisma migrations: superadmin only
CREATE POLICY superadmin_only_prisma_migrations ON "_prisma_migrations"
    FOR ALL USING (is_superadmin());

-- Saved Views
CREATE POLICY tenant_isolation_saved_views ON "saved_views"
    FOR ALL USING (has_tenant_access(tenant_id));

-- Inbox
CREATE POLICY tenant_isolation_inbox_accounts ON "inbox_accounts"
    FOR ALL USING (has_tenant_access(tenant_id));

CREATE POLICY tenant_isolation_inbox_folders ON "inbox_folders"
    FOR ALL USING (has_tenant_access(tenant_id));

CREATE POLICY tenant_isolation_inbox_threads ON "inbox_threads"
    FOR ALL USING (has_tenant_access(tenant_id));

CREATE POLICY tenant_isolation_inbox_messages ON "inbox_messages"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM "inbox_threads" t
            WHERE t.id = "inbox_messages".thread_id
            AND has_tenant_access(t.tenant_id)
        )
    );

CREATE POLICY tenant_isolation_inbox_attachments ON "inbox_attachments"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM "inbox_messages" m
            JOIN "inbox_threads" t ON t.id = m.thread_id
            WHERE m.id = "inbox_attachments".message_id
            AND has_tenant_access(t.tenant_id)
        )
    );

CREATE POLICY tenant_isolation_inbox_internal_notes ON "inbox_internal_notes"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM "inbox_threads" t
            WHERE t.id = "inbox_internal_notes".thread_id
            AND has_tenant_access(t.tenant_id)
        )
    );

CREATE POLICY tenant_isolation_inbox_snippets ON "inbox_snippets"
    FOR ALL USING (has_tenant_access(tenant_id));

CREATE POLICY tenant_isolation_inbox_signatures ON "inbox_signatures"
    FOR ALL USING (has_tenant_access(tenant_id));

CREATE POLICY tenant_isolation_inbox_rules ON "inbox_rules"
    FOR ALL USING (has_tenant_access(tenant_id));

-- Chat
CREATE POLICY tenant_isolation_chat_channels ON "chat_channels"
    FOR ALL USING (has_tenant_access(tenant_id));

CREATE POLICY tenant_isolation_chat_channel_members ON "chat_channel_members"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM "chat_channels" c
            WHERE c.id = "chat_channel_members".channel_id
            AND has_tenant_access(c.tenant_id)
        )
    );

CREATE POLICY tenant_isolation_chat_messages ON "chat_messages"
    FOR ALL USING (has_tenant_access(tenant_id));

CREATE POLICY tenant_isolation_chat_message_reactions ON "chat_message_reactions"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM "chat_messages" m
            WHERE m.id = "chat_message_reactions".message_id
            AND has_tenant_access(m.tenant_id)
        )
    );

CREATE POLICY tenant_isolation_chat_message_attachments ON "chat_message_attachments"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM "chat_messages" m
            WHERE m.id = "chat_message_attachments".message_id
            AND has_tenant_access(m.tenant_id)
        )
    );

CREATE POLICY tenant_isolation_chat_user_presences ON "chat_user_presences"
    FOR ALL USING (has_tenant_access(tenant_id));


-- 4. GRANT TABLE PRIVILEGES
GRANT ALL ON 
    "_prisma_migrations",
    "saved_views",
    "inbox_accounts",
    "inbox_folders",
    "inbox_threads",
    "inbox_messages",
    "inbox_attachments",
    "inbox_internal_notes",
    "inbox_snippets",
    "inbox_signatures",
    "inbox_rules",
    "chat_channels",
    "chat_channel_members",
    "chat_messages",
    "chat_message_reactions",
    "chat_message_attachments",
    "chat_user_presences"
TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON 
    "saved_views",
    "inbox_accounts",
    "inbox_folders",
    "inbox_threads",
    "inbox_messages",
    "inbox_attachments",
    "inbox_internal_notes",
    "inbox_snippets",
    "inbox_signatures",
    "inbox_rules",
    "chat_channels",
    "chat_channel_members",
    "chat_messages",
    "chat_message_reactions",
    "chat_message_attachments",
    "chat_user_presences"
TO authenticated;

-- 5. ENSURE SECURITY DEFINER FUNCTIONS HAVE SEARCH PATH FIXED
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT p.oid::regprocedure AS func_signature
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' 
          AND p.prosecdef = true
    LOOP
        EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', r.func_signature);
    END LOOP;
END $$;
