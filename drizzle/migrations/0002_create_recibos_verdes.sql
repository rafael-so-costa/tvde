CREATE TABLE public.recibos_verdes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  motorista_id uuid NOT NULL REFERENCES public.motoristas(id) ON DELETE CASCADE,
  numero_documento text,
  data_emissao date,
  ano integer,
  mes integer,
  nif_emitente text,
  nome_emitente text,
  nif_adquirente text,
  nome_adquirente text,
  valor_base numeric,
  valor_iva numeric,
  retencao_irs numeric,
  valor_total numeric,
  arquivo_url text NOT NULL,
  arquivo_path text,
  arquivo_nome text,
  arquivo_mime text,
  status text NOT NULL DEFAULT 'pendente_validacao' CHECK (status IN ('pendente_validacao','validado','rejeitado')),
  dados_extraidos jsonb NOT NULL DEFAULT '{}'::jsonb,
  avisos_validacao jsonb NOT NULL DEFAULT '[]'::jsonb,
  observacoes_empresa text,
  validado_por uuid,
  validado_em timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_recibos_verdes_numero_unico
  ON public.recibos_verdes (tenant_id, motorista_id, numero_documento)
  WHERE numero_documento IS NOT NULL;
CREATE INDEX idx_recibos_verdes_periodo ON public.recibos_verdes (tenant_id, ano DESC, mes DESC);
CREATE INDEX idx_recibos_verdes_motorista ON public.recibos_verdes (motorista_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.recibos_verdes TO authenticated;
GRANT ALL ON public.recibos_verdes TO service_role;

ALTER TABLE public.recibos_verdes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Motorista ve os seus recibos verdes"
ON public.recibos_verdes FOR SELECT TO authenticated
USING (public.motorista_pertence_ao_utilizador(motorista_id));

CREATE POLICY "Gestores veem recibos verdes do tenant"
ON public.recibos_verdes FOR SELECT TO authenticated
USING (tenant_id = public.get_user_tenant_id(auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Motorista cria os seus recibos verdes"
ON public.recibos_verdes FOR INSERT TO authenticated
WITH CHECK (public.motorista_pertence_ao_utilizador(motorista_id));

CREATE POLICY "Gestores criam recibos verdes"
ON public.recibos_verdes FOR INSERT TO authenticated
WITH CHECK (
  (tenant_id = public.get_user_tenant_id(auth.uid()) AND NOT public.is_external_profile(auth.uid()))
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Gestores validam recibos verdes"
ON public.recibos_verdes FOR UPDATE TO authenticated
USING (
  (tenant_id = public.get_user_tenant_id(auth.uid()) AND NOT public.is_external_profile(auth.uid()))
  OR public.is_super_admin(auth.uid())
)
WITH CHECK (
  (tenant_id = public.get_user_tenant_id(auth.uid()) AND NOT public.is_external_profile(auth.uid()))
  OR public.is_super_admin(auth.uid())
);

CREATE TRIGGER trg_recibos_verdes_updated_at
BEFORE UPDATE ON public.recibos_verdes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage policies para o bucket privado recibos-verdes
CREATE POLICY "Recibos verdes upload pelo tenant"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'recibos-verdes'
  AND (storage.foldername(name))[1] = (public.get_user_tenant_id(auth.uid()))::text
);

CREATE POLICY "Recibos verdes leitura pelo tenant"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'recibos-verdes'
  AND (
    public.is_super_admin(auth.uid())
    OR (storage.foldername(name))[1] = (public.get_user_tenant_id(auth.uid()))::text
  )
);

CREATE POLICY "Recibos verdes remocao por gestores"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'recibos-verdes'
  AND NOT public.is_external_profile(auth.uid())
  AND (storage.foldername(name))[1] = (public.get_user_tenant_id(auth.uid()))::text
);