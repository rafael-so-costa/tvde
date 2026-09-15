-- Listas de transmissão (broadcast lists) for mass messaging
CREATE TABLE public.listas_transmissao (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL,
  nome text NOT NULL,
  destinatarios_ids uuid[] NOT NULL DEFAULT '{}',
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.listas_transmissao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Manage listas_transmissao"
ON public.listas_transmissao
FOR ALL
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  AND (public.is_tenant_admin(auth.uid())
       OR public.has_permission(auth.uid(), 'mensagens_massa', 'configurar'))
)
WITH CHECK (
  tenant_id = public.get_user_tenant_id(auth.uid())
  AND (public.is_tenant_admin(auth.uid())
       OR public.has_permission(auth.uid(), 'mensagens_massa', 'configurar'))
);

CREATE TRIGGER update_listas_transmissao_updated_at
BEFORE UPDATE ON public.listas_transmissao
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_listas_transmissao_tenant ON public.listas_transmissao(tenant_id);