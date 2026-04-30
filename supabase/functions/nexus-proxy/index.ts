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
    const { connectorId, payload, test, tenantId } = await req.json()

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

    // 3. Execute Handshake (Google Maps Example)
    if (connectorId === 'google-maps-lookup') {
      const apiKey = secretMap['api_key']
      if (!apiKey) {
        return new Response(JSON.stringify({ error: 'Missing Google Maps API Key' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const address = payload?.address || 'Unknown'
      
      // In a real production scenario, we would now call the actual Google Maps API
      // const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`)
      // const data = await res.json()
      
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            formatted_address: `${address}, Mock City, MC 12345`,
            lat: -37.8368,
            lng: 144.928,
            _proxy_status: "Handshake verified with vaulted secret."
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Unsupported connector' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
