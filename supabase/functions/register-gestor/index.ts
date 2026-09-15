import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SignupRequest {
  email: string
  password: string
  nome_completo: string
  telefone: string
  nome_empresa: string
  nif: string
  endereco: string
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

    const body: SignupRequest = await req.json()

    // Validate required fields
    if (!body.email || !body.password || !body.nome_completo || !body.nome_empresa || !body.nif) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios faltando' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check if NIF already exists
    const { data: existingTenant } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('nif', body.nif)
      .single()

    if (existingTenant) {
      return new Response(JSON.stringify({ error: 'Este NIF já está cadastrado no sistema' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create user account (email confirmed so they can login)
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: { 
        nome_completo: body.nome_completo,
        pending_approval: true
      }
    })

    if (userError) {
      if (userError.message.includes('already been registered')) {
        return new Response(JSON.stringify({ error: 'Este e-mail já está cadastrado' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      throw userError
    }

    if (!userData.user) {
      throw new Error('Failed to create user')
    }

    // Create tenant (inactive until approved)
    const { data: tenantData, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .insert({
        nome_empresa: body.nome_empresa,
        nif: body.nif,
        endereco: body.endereco,
        email: body.email,
        nome_gerente: body.nome_completo,
        telemovel: body.telefone,
        ativo: false // Inactive until approved
      })
      .select()
      .single()

    if (tenantError) {
      // Rollback: delete created user
      await supabaseAdmin.auth.admin.deleteUser(userData.user.id)
      throw tenantError
    }

    // Update profile with tenant_id and pending status
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        tenant_id: tenantData.id,
        nome_completo: body.nome_completo,
        telefone: body.telefone,
        aprovado: false // Pending approval
      })
      .eq('user_id', userData.user.id)

    if (profileError) {
      console.error('Profile update error:', profileError)
    }

    // Assign admin_empresa role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: userData.user.id, role: 'admin_empresa' })

    if (roleError) {
      console.error('Role assignment error:', roleError)
    }

    // Create notification for super_admin
    const { error: notifError } = await supabaseAdmin
      .from('notificacoes_cadastro')
      .insert({
        user_id: userData.user.id,
        tipo_cadastro: 'admin_empresa',
        status: 'pendente',
        tenant_id: tenantData.id,
        dados_adicionais: {
          nome_empresa: body.nome_empresa,
          nome_gerente: body.nome_completo,
          email: body.email,
          nif: body.nif
        }
      })

    if (notifError) {
      console.error('Notification creation error:', notifError)
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Cadastro realizado com sucesso! Aguarde a aprovação do administrador.',
      user_id: userData.user.id,
      tenant_id: tenantData.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
