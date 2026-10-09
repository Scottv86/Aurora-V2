-- ==============================================================================
-- Commerce & Finance Tables: Row Level Security (RLS) Enablement & Tenant Policies
-- Enables RLS on all 21 tables created for POS, Invoicing, Billing, & Accounting.
-- ==============================================================================

-- 1. Enable & Force Row Level Security on all 21 Commerce & Finance Tables
ALTER TABLE "bank_statement_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bank_statement_lines" FORCE ROW LEVEL SECURITY;

ALTER TABLE "bill_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bill_lines" FORCE ROW LEVEL SECURITY;

ALTER TABLE "bills" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bills" FORCE ROW LEVEL SECURITY;

ALTER TABLE "catalog_item_variants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "catalog_item_variants" FORCE ROW LEVEL SECURITY;

ALTER TABLE "chart_of_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chart_of_accounts" FORCE ROW LEVEL SECURITY;

ALTER TABLE "inventory_locations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory_locations" FORCE ROW LEVEL SECURITY;

ALTER TABLE "inventory_movements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory_movements" FORCE ROW LEVEL SECURITY;

ALTER TABLE "invoice_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invoice_lines" FORCE ROW LEVEL SECURITY;

ALTER TABLE "invoice_payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invoice_payments" FORCE ROW LEVEL SECURITY;

ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invoices" FORCE ROW LEVEL SECURITY;

ALTER TABLE "journal_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "journal_entries" FORCE ROW LEVEL SECURITY;

ALTER TABLE "journal_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "journal_lines" FORCE ROW LEVEL SECURITY;

ALTER TABLE "pos_order_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pos_order_items" FORCE ROW LEVEL SECURITY;

ALTER TABLE "pos_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pos_orders" FORCE ROW LEVEL SECURITY;

ALTER TABLE "pos_payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pos_payments" FORCE ROW LEVEL SECURITY;

ALTER TABLE "pos_registers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pos_registers" FORCE ROW LEVEL SECURITY;

ALTER TABLE "pos_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pos_sessions" FORCE ROW LEVEL SECURITY;

ALTER TABLE "stock_allocations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "stock_allocations" FORCE ROW LEVEL SECURITY;

ALTER TABLE "tax_rates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tax_rates" FORCE ROW LEVEL SECURITY;

ALTER TABLE "voucher_redemptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "voucher_redemptions" FORCE ROW LEVEL SECURITY;

ALTER TABLE "vouchers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vouchers" FORCE ROW LEVEL SECURITY;

-- 2. Drop existing policies if any
DROP POLICY IF EXISTS tenant_isolation_bank_statement_lines ON "bank_statement_lines";
DROP POLICY IF EXISTS bill_isolation_bill_lines ON "bill_lines";
DROP POLICY IF EXISTS tenant_isolation_bills ON "bills";
DROP POLICY IF EXISTS catalog_item_isolation_variants ON "catalog_item_variants";
DROP POLICY IF EXISTS tenant_isolation_chart_of_accounts ON "chart_of_accounts";
DROP POLICY IF EXISTS tenant_isolation_inventory_locations ON "inventory_locations";
DROP POLICY IF EXISTS tenant_isolation_inventory_movements ON "inventory_movements";
DROP POLICY IF EXISTS invoice_isolation_invoice_lines ON "invoice_lines";
DROP POLICY IF EXISTS tenant_isolation_invoice_payments ON "invoice_payments";
DROP POLICY IF EXISTS tenant_isolation_invoices ON "invoices";
DROP POLICY IF EXISTS tenant_isolation_journal_entries ON "journal_entries";
DROP POLICY IF EXISTS journal_isolation_journal_lines ON "journal_lines";
DROP POLICY IF EXISTS pos_order_isolation_items ON "pos_order_items";
DROP POLICY IF EXISTS tenant_isolation_pos_orders ON "pos_orders";
DROP POLICY IF EXISTS pos_order_isolation_payments ON "pos_payments";
DROP POLICY IF EXISTS tenant_isolation_pos_registers ON "pos_registers";
DROP POLICY IF EXISTS tenant_isolation_pos_sessions ON "pos_sessions";
DROP POLICY IF EXISTS location_isolation_stock_allocations ON "stock_allocations";
DROP POLICY IF EXISTS tenant_isolation_tax_rates ON "tax_rates";
DROP POLICY IF EXISTS voucher_isolation_redemptions ON "voucher_redemptions";
DROP POLICY IF EXISTS tenant_isolation_vouchers ON "vouchers";

-- 3. Create Tenant Isolation Policies for Direct tenant_id Tables
CREATE POLICY tenant_isolation_bank_statement_lines ON "bank_statement_lines"
    FOR ALL USING (has_tenant_access(tenant_id));

CREATE POLICY tenant_isolation_bills ON "bills"
    FOR ALL USING (has_tenant_access(tenant_id));

CREATE POLICY tenant_isolation_chart_of_accounts ON "chart_of_accounts"
    FOR ALL USING (has_tenant_access(tenant_id));

CREATE POLICY tenant_isolation_inventory_locations ON "inventory_locations"
    FOR ALL USING (has_tenant_access(tenant_id));

CREATE POLICY tenant_isolation_inventory_movements ON "inventory_movements"
    FOR ALL USING (has_tenant_access(tenant_id));

CREATE POLICY tenant_isolation_invoice_payments ON "invoice_payments"
    FOR ALL USING (has_tenant_access(tenant_id));

CREATE POLICY tenant_isolation_invoices ON "invoices"
    FOR ALL USING (has_tenant_access(tenant_id));

CREATE POLICY tenant_isolation_journal_entries ON "journal_entries"
    FOR ALL USING (has_tenant_access(tenant_id));

CREATE POLICY tenant_isolation_pos_orders ON "pos_orders"
    FOR ALL USING (has_tenant_access(tenant_id));

CREATE POLICY tenant_isolation_pos_registers ON "pos_registers"
    FOR ALL USING (has_tenant_access(tenant_id));

CREATE POLICY tenant_isolation_pos_sessions ON "pos_sessions"
    FOR ALL USING (has_tenant_access(tenant_id));

CREATE POLICY tenant_isolation_tax_rates ON "tax_rates"
    FOR ALL USING (has_tenant_access(tenant_id));

CREATE POLICY tenant_isolation_vouchers ON "vouchers"
    FOR ALL USING (has_tenant_access(tenant_id));

-- 4. Create Tenant Isolation Policies for Child Relation Tables
CREATE POLICY bill_isolation_bill_lines ON "bill_lines"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM "bills" b
            WHERE b.id = "bill_lines".bill_id
            AND has_tenant_access(b.tenant_id)
        )
    );

CREATE POLICY catalog_item_isolation_variants ON "catalog_item_variants"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM "catalog_items" c
            WHERE c.id = "catalog_item_variants".catalog_item_id
            AND has_tenant_access(c.tenant_id)
        )
    );

CREATE POLICY invoice_isolation_invoice_lines ON "invoice_lines"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM "invoices" i
            WHERE i.id = "invoice_lines".invoice_id
            AND has_tenant_access(i.tenant_id)
        )
    );

CREATE POLICY journal_isolation_journal_lines ON "journal_lines"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM "journal_entries" j
            WHERE j.id = "journal_lines".journal_entry_id
            AND has_tenant_access(j.tenant_id)
        )
    );

CREATE POLICY pos_order_isolation_items ON "pos_order_items"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM "pos_orders" o
            WHERE o.id = "pos_order_items".order_id
            AND has_tenant_access(o.tenant_id)
        )
    );

CREATE POLICY pos_order_isolation_payments ON "pos_payments"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM "pos_orders" o
            WHERE o.id = "pos_payments".order_id
            AND has_tenant_access(o.tenant_id)
        )
    );

CREATE POLICY location_isolation_stock_allocations ON "stock_allocations"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM "inventory_locations" l
            WHERE l.id = "stock_allocations".location_id
            AND has_tenant_access(l.tenant_id)
        )
    );

CREATE POLICY voucher_isolation_redemptions ON "voucher_redemptions"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM "vouchers" v
            WHERE v.id = "voucher_redemptions".voucher_id
            AND has_tenant_access(v.tenant_id)
        )
    );

-- 5. Grant table privileges to service_role and authenticated roles
GRANT ALL ON 
    "bank_statement_lines",
    "bill_lines",
    "bills",
    "catalog_item_variants",
    "chart_of_accounts",
    "inventory_locations",
    "inventory_movements",
    "invoice_lines",
    "invoice_payments",
    "invoices",
    "journal_entries",
    "journal_lines",
    "pos_order_items",
    "pos_orders",
    "pos_payments",
    "pos_registers",
    "pos_sessions",
    "stock_allocations",
    "tax_rates",
    "voucher_redemptions",
    "vouchers"
TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON 
    "bank_statement_lines",
    "bill_lines",
    "bills",
    "catalog_item_variants",
    "chart_of_accounts",
    "inventory_locations",
    "inventory_movements",
    "invoice_lines",
    "invoice_payments",
    "invoices",
    "journal_entries",
    "journal_lines",
    "pos_order_items",
    "pos_orders",
    "pos_payments",
    "pos_registers",
    "pos_sessions",
    "stock_allocations",
    "tax_rates",
    "voucher_redemptions",
    "vouchers"
TO authenticated;
