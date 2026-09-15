import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PermissionInput {
  menu_key: string;
  nivel: "nenhum" | "visualizar" | "configurar";
}

interface RequestBody {
  nome: string;
  email: string;
  password: string;
  tipo: string;
  permissoes?: PermissionInput[];
  funcionario_id?: string; // optional: update existing
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    // Caller client — to verify caller is tenant admin
    const callerClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Verify caller is tenant admin
    const { data: callerProfile } = await admin
      .from("profiles").select("tenant_id").eq("user_id", caller.id).maybeSingle();
    const { data: callerRoles } = await admin
      .from("user_roles").select("role").eq("user_id", caller.id);
    const isAdmin = (callerRoles || []).some(
      (r: { role: string }) => r.role === "super_admin" || r.role === "admin_empresa"
    );
    if (!isAdmin || !callerProfile?.tenant_id) {
      return new Response(JSON.stringify({ error: "Sem permissão" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tenantId = callerProfile.tenant_id;
    const body: RequestBody = await req.json();
    const { nome, email, password, tipo, permissoes = [], funcionario_id } = body;

    if (!nome || !email || (!funcionario_id && !password)) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios em falta" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    let userId: string | null = null;
    let funcionarioId = funcionario_id ?? null;

    if (funcionario_id) {
      // UPDATE flow
      const { data: existingFunc } = await admin
        .from("funcionarios").select("user_id").eq("id", funcionario_id).maybeSingle();
      userId = existingFunc?.user_id ?? null;

      if (password && userId) {
        await admin.auth.admin.updateUserById(userId, { password });
      }
      await admin.from("funcionarios").update({
        nome, email: normalizedEmail, tipo,
      }).eq("id", funcionario_id);
    } else {
      // CREATE flow — try create user
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
        user_metadata: { nome_completo: nome },
      });

      if (createErr) {
        // Maybe user already exists — find them
        const { data: list } = await admin.auth.admin.listUsers();
        const existing = list.users.find((u) => u.email?.toLowerCase() === normalizedEmail);
        if (!existing) {
          return new Response(JSON.stringify({ error: createErr.message }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        userId = existing.id;
        if (password) {
          await admin.auth.admin.updateUserById(userId, { password });
        }
      } else {
        userId = created.user.id;
      }

      // Ensure profile + tenant link
      await admin.from("profiles").upsert({
        user_id: userId, email: normalizedEmail, nome_completo: nome,
        tenant_id: tenantId, ativo: true, aprovado: true,
      }, { onConflict: "user_id" });

      // Ensure role admin_empresa
      await admin.from("user_roles").upsert({
        user_id: userId, role: "admin_empresa",
      }, { onConflict: "user_id,role" });

      // Create funcionario record
      const { data: newFunc, error: funcErr } = await admin.from("funcionarios").insert({
        tenant_id: tenantId, user_id: userId, nome, email: normalizedEmail, tipo, ativo: true,
      }).select("id").single();
      if (funcErr) {
        return new Response(JSON.stringify({ error: funcErr.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      funcionarioId = newFunc.id;
    }

    // Sync permissions
    if (funcionarioId && permissoes.length > 0) {
      await admin.from("permissoes_funcionario").delete().eq("funcionario_id", funcionarioId);
      const rows = permissoes.map((p) => ({
        funcionario_id: funcionarioId, menu_key: p.menu_key, nivel: p.nivel,
      }));
      await admin.from("permissoes_funcionario").insert(rows);
    }

    return new Response(JSON.stringify({ success: true, funcionario_id: funcionarioId, user_id: userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
