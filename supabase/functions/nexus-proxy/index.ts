import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { connectorId, payload, test, tenantId, moduleId } = await req.json()

    if (!tenantId) {
      return new Response(JSON.stringify({ error: 'Missing tenantId' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Initialize Supabase Admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Verify tenant activation
    const { data: tenantConnector, error: tcError } = await supabaseAdmin
      .from('tenant_connectors')
      .select('id, is_active')
      .eq('tenant_id', tenantId)
      .eq('connector_id', connectorId)
      .single()

    if (tcError || !tenantConnector || !tenantConnector.is_active) {
      return new Response(JSON.stringify({ error: 'Connector not active for this tenant' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 2. Fetch secrets
    const { data: secrets, error: sError } = await supabaseAdmin
      .from('tenant_connector_secrets')
      .select('key, value')
      .eq('tenant_connector_id', tenantConnector.id)

    if (sError) {
       return new Response(JSON.stringify({ error: 'Failed to fetch connector secrets' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const secretMap = (secrets || []).reduce((acc: any, s: any) => {
      acc[s.key] = s.value
      return acc
    }, {})

    console.log(`[NexusProxy] Handling call for connector: ${connectorId} (Tenant: ${tenantId})`)

    // 3. Execute Handshake
    let rawData: any = {};
    if (connectorId === 'google-maps-lookup') {
      const address = payload?.address || 'Unknown'
      rawData = {
        formatted_address: `${address}, Mock City, MC 12345`,
        lat: -37.8368,
        lng: 144.928
      }
    } else {
      // Default mock data for other connectors
      rawData = { status: "Success", timestamp: new Date().toISOString() };
    }

    // 4. Fetch Mappings if moduleId is provided
    if (moduleId) {
      const { data: moduleData } = await supabaseAdmin
        .from('modules')
        .select('config')
        .eq('id', moduleId)
        .eq('tenant_id', tenantId)
        .single()

      if (moduleData && moduleData.config?.connectorMappings?.[connectorId]) {
        const mappings = moduleData.config.connectorMappings[connectorId];
        const reshapedData: Record<string, any> = {};
        
        Object.entries(mappings).forEach(([sourceKey, targetFieldId]) => {
          if (targetFieldId && rawData[sourceKey] !== undefined) {
            reshapedData[targetFieldId as string] = rawData[sourceKey];
          }
        });

        return new Response(
          JSON.stringify({
            success: true,
            reshaped: true,
            data: reshapedData,
            _original: rawData
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: rawData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
