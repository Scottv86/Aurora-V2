DROP TABLE IF EXISTS public.global_list_items CASCADE;
DROP TABLE IF EXISTS public.global_lists CASCADE;

-- Create global_lists table
CREATE TABLE IF NOT EXISTS public.global_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  columns JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create unique index on global_lists to support the composite FK
CREATE UNIQUE INDEX IF NOT EXISTS idx_global_lists_id_tenant ON public.global_lists (id, tenant_id);

-- Create global_list_items table (SCD Type 2)
CREATE TABLE IF NOT EXISTS public.global_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES public.global_lists(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_to TIMESTAMPTZ,
  
  -- Ensure tenant consistency
  CONSTRAINT fk_list_tenant FOREIGN KEY (list_id, tenant_id) REFERENCES public.global_lists(id, tenant_id)
);

-- Helper functions for RLS that work without session variables (for Supabase client)
CREATE OR REPLACE FUNCTION public.is_platform_superadmin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()::text
    AND is_superadmin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_platform_member(t_id text)
RETURNS boolean AS $$
BEGIN
  RETURN (
    -- Either they are a superadmin
    public.is_platform_superadmin()
    OR 
    -- Or they are a member of the tenant
    EXISTS (
      SELECT 1 FROM public.tenant_members
      WHERE tenant_id = t_id
      AND user_id = auth.uid()::text
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE public.global_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_list_items ENABLE ROW LEVEL SECURITY;

-- Policies for global_lists
DROP POLICY IF EXISTS "global_lists_tenant_isolation" ON public.global_lists;
CREATE POLICY "global_lists_tenant_isolation"
  ON public.global_lists
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true) 
    OR public.is_platform_member(tenant_id)
  )
  WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id', true) 
    OR public.is_platform_member(tenant_id)
  );

-- Policies for global_list_items
DROP POLICY IF EXISTS "global_list_items_tenant_isolation" ON public.global_list_items;
CREATE POLICY "global_list_items_tenant_isolation"
  ON public.global_list_items
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true) 
    OR public.is_platform_member(tenant_id)
  )
  WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id', true) 
    OR public.is_platform_member(tenant_id)
  );

-- RPC Functions for SCD Type 2 management
-- Cleanup old signatures to avoid ambiguity
DROP FUNCTION IF EXISTS public.add_global_list_item(UUID, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.edit_global_list_item(UUID, UUID, TEXT, JSONB);

CREATE OR REPLACE FUNCTION public.add_global_list_item(
  p_list_id UUID,
  p_tenant_id TEXT,
  p_data JSONB,
  p_sort_order INT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_new_id UUID;
  v_sort_order INT;
BEGIN
  -- Security check
  IF NOT (p_tenant_id = current_setting('app.current_tenant_id', true) OR public.is_platform_member(p_tenant_id)) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Auto-calculate sort order if not provided
  IF p_sort_order IS NULL THEN
    SELECT COALESCE(MAX(sort_order), -1) + 1 INTO v_sort_order 
    FROM public.global_list_items 
    WHERE list_id = p_list_id AND is_active = true;
  ELSE
    v_sort_order := p_sort_order;
  END IF;

  INSERT INTO public.global_list_items (list_id, tenant_id, data, sort_order)
  VALUES (p_list_id, p_tenant_id, p_data, v_sort_order)
  RETURNING id INTO v_new_id;
  
  RETURN v_new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.edit_global_list_item(
  p_item_id UUID,
  p_list_id UUID,
  p_tenant_id TEXT,
  p_data JSONB,
  p_sort_order INT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_new_id UUID;
  v_old_sort_order INT;
BEGIN
  -- Security check
  IF NOT (p_tenant_id = current_setting('app.current_tenant_id', true) OR public.is_platform_member(p_tenant_id)) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Get old sort order if not provided
  IF p_sort_order IS NULL THEN
    SELECT sort_order INTO v_old_sort_order FROM public.global_list_items WHERE id = p_item_id;
  ELSE
    v_old_sort_order := p_sort_order;
  END IF;

  -- 1. Retire the old version
  UPDATE public.global_list_items
  SET is_active = false, valid_to = now()
  WHERE id = p_item_id AND is_active = true;

  -- 2. Create the new version
  INSERT INTO public.global_list_items (list_id, tenant_id, data, sort_order)
  VALUES (p_list_id, p_tenant_id, p_data, v_old_sort_order)
  RETURNING id INTO v_new_id;
  
  RETURN v_new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.retire_global_list_item(
  p_item_id UUID,
  p_tenant_id TEXT
) RETURNS VOID AS $$
BEGIN
  -- Security check
  IF NOT (p_tenant_id = current_setting('app.current_tenant_id', true) OR public.is_platform_member(p_tenant_id)) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.global_list_items
  SET is_active = false, valid_to = now()
  WHERE id = p_item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.reorder_global_list_items(
  p_list_id UUID,
  p_tenant_id TEXT,
  p_order_map JSONB -- array of objects: [{id: '...', sort_order: 0}]
) RETURNS VOID AS $$
DECLARE
  v_item RECORD;
BEGIN
  -- Security check
  IF NOT (p_tenant_id = current_setting('app.current_tenant_id', true) OR public.is_platform_member(p_tenant_id)) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_order_map) AS x(id UUID, sort_order INT)
  LOOP
    -- Perform SCD Type 2 update for each reordered item
    -- This ensures historical list state is preserved
    PERFORM public.edit_global_list_item(
      v_item.id, 
      p_list_id, 
      p_tenant_id, 
      (SELECT data FROM public.global_list_items WHERE id = v_item.id), 
      v_item.sort_order
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
