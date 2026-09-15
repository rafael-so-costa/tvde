import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Check if calling user is super_admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: callingUser }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !callingUser) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check if calling user is super_admin
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', callingUser.id)
      .eq('role', 'super_admin')
      .single()

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Only super_admin can create test users' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const results: any[] = []

    // 1. Create Gestor de Frota (admin_empresa)
    const { data: gestorData, error: gestorError } = await supabaseAdmin.auth.admin.createUser({
      email: 'joaogestor@gmail.com',
      password: 'joao',
      email_confirm: true,
      user_metadata: { nome_completo: 'João Gestor' }
    })

    if (gestorError) {
      results.push({ email: 'joaogestor@gmail.com', error: gestorError.message })
    } else if (gestorData.user) {
      // Create tenant for this gestor
      const { data: tenantData, error: tenantError } = await supabaseAdmin
        .from('tenants')
        .insert({
          nome_empresa: 'Empresa João Gestor',
          nif: '123456789',
          email: 'joaogestor@gmail.com',
          nome_gerente: 'João Gestor'
        })
        .select()
        .single()

      if (tenantError) {
        results.push({ email: 'joaogestor@gmail.com', error: `Tenant error: ${tenantError.message}` })
      } else {
        // Update profile with tenant_id
        await supabaseAdmin
          .from('profiles')
          .update({ 
            tenant_id: tenantData.id,
            nome_completo: 'João Gestor',
            aprovado: true
          })
          .eq('user_id', gestorData.user.id)

        // Assign admin_empresa role
        await supabaseAdmin
          .from('user_roles')
          .insert({ user_id: gestorData.user.id, role: 'admin_empresa' })

        results.push({ 
          email: 'joaogestor@gmail.com', 
          success: true, 
          role: 'admin_empresa',
          tenant_id: tenantData.id,
          user_id: gestorData.user.id
        })

        // 2. Create Motorista linked to this tenant
        const { data: motoristaData, error: motoristaError } = await supabaseAdmin.auth.admin.createUser({
          email: 'joaomotorista@gmail.com',
          password: 'joao',
          email_confirm: true,
          user_metadata: { nome_completo: 'João Motorista' }
        })

        if (motoristaError) {
          results.push({ email: 'joaomotorista@gmail.com', error: motoristaError.message })
        } else if (motoristaData.user) {
          // Update profile with tenant_id
          await supabaseAdmin
            .from('profiles')
            .update({ 
              tenant_id: tenantData.id,
              nome_completo: 'João Motorista',
              aprovado: true
            })
            .eq('user_id', motoristaData.user.id)

          // Assign motorista role
          await supabaseAdmin
            .from('user_roles')
            .insert({ user_id: motoristaData.user.id, role: 'motorista' })

          // Create motorista record
          await supabaseAdmin
            .from('motoristas')
            .insert({
              tenant_id: tenantData.id,
              user_id: motoristaData.user.id,
              nome_completo: 'João Motorista',
              email: 'joaomotorista@gmail.com',
              status_cadastro: 'ativo',
              ativo: true
            })

          results.push({ 
            email: 'joaomotorista@gmail.com', 
            success: true, 
            role: 'motorista',
            tenant_id: tenantData.id,
            user_id: motoristaData.user.id
          })
        }

        // 3. Create Proprietário linked to this tenant
        const { data: proprietarioData, error: proprietarioError } = await supabaseAdmin.auth.admin.createUser({
          email: 'joaoproprietario@gmail.com',
          password: 'joao',
          email_confirm: true,
          user_metadata: { nome_completo: 'João Proprietário' }
        })

        if (proprietarioError) {
          results.push({ email: 'joaoproprietario@gmail.com', error: proprietarioError.message })
        } else if (proprietarioData.user) {
          // Update profile with tenant_id
          await supabaseAdmin
            .from('profiles')
            .update({ 
              tenant_id: tenantData.id,
              nome_completo: 'João Proprietário',
              aprovado: true
            })
            .eq('user_id', proprietarioData.user.id)

          // Assign proprietario role
          await supabaseAdmin
            .from('user_roles')
            .insert({ user_id: proprietarioData.user.id, role: 'proprietario' })

          // Create proprietario record
          await supabaseAdmin
            .from('proprietarios')
            .insert({
              tenant_id: tenantData.id,
              user_id: proprietarioData.user.id,
              nome_completo: 'João Proprietário',
              email: 'joaoproprietario@gmail.com',
              tipo: 'pessoa_fisica',
              status_cadastro: 'ativo',
              ativo: true
            })

          results.push({ 
            email: 'joaoproprietario@gmail.com', 
            success: true, 
            role: 'proprietario',
            tenant_id: tenantData.id,
            user_id: proprietarioData.user.id
          })
        }
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
