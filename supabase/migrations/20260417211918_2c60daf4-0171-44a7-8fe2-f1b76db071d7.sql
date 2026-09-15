-- Create table for chat configuration (welcome message per tenant)
CREATE TABLE IF NOT EXISTS public.chat_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE,
  welcome_message text NOT NULL DEFAULT 'Olá 👋 Bem-vindo ao suporte!\n\nSelecione o assunto abaixo para continuar.',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users view chat config"
ON public.chat_config FOR SELECT TO authenticated
USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant admins manage chat config"
ON public.chat_config FOR ALL TO authenticated
USING (public.is_tenant_admin(auth.uid()) AND tenant_id = public.get_user_tenant_id(auth.uid()))
WITH CHECK (public.is_tenant_admin(auth.uid()) AND tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE TRIGGER trg_chat_config_updated_at
BEFORE UPDATE ON public.chat_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();