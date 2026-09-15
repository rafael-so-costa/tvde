-- 1. Table
CREATE TABLE public.registos_criminais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  motorista_id uuid NOT NULL REFERENCES public.motoristas(id) ON DELETE CASCADE,
  codigo_consulta text,
  data_validade date,
  data_emissao date,
  nome_titular text,
  arquivo_url text NOT NULL,
  arquivo_path text,
  arquivo_nome text,
  arquivo_mime text,
  status text NOT NULL DEFAULT 'pendente_validacao',
  dados_extraidos jsonb NOT NULL DEFAULT '{}'::jsonb,
  observacoes_empresa text,
  validado_por uuid,
  validado_em timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT registos_criminais_status_check CHECK (status IN ('pendente_validacao','validado','rejeitado'))
);

CREATE INDEX idx_registos_criminais_motorista ON public.registos_criminais (motorista_id, created_at DESC);
CREATE INDEX idx_registos_criminais_tenant ON public.registos_criminais (tenant_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.registos_criminais TO authenticated;
GRANT ALL ON public.registos_criminais TO service_role;

ALTER TABLE public.registos_criminais ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_registos_criminais_updated_at
BEFORE UPDATE ON public.registos_criminais
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.motorista_pertence_ao_utilizador(_motorista_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.motoristas m
    WHERE m.id = _motorista_id AND m.user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.motorista_pertence_ao_utilizador(uuid) TO authenticated, anon;

CREATE POLICY "Motorista ve os seus registos criminais"
ON public.registos_criminais FOR SELECT TO authenticated
USING (public.motorista_pertence_ao_utilizador(motorista_id));

CREATE POLICY "Motorista envia os seus registos criminais"
ON public.registos_criminais FOR INSERT TO authenticated
WITH CHECK (
  public.motorista_pertence_ao_utilizador(motorista_id)
  AND tenant_id = public.get_user_tenant_id(auth.uid())
);

CREATE POLICY "Gestores veem registos criminais do tenant"
ON public.registos_criminais FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (tenant_id = public.get_user_tenant_id(auth.uid()) AND NOT public.is_external_profile(auth.uid()))
);

CREATE POLICY "Gestores gerem registos criminais do tenant"
ON public.registos_criminais FOR UPDATE TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (tenant_id = public.get_user_tenant_id(auth.uid()) AND NOT public.is_external_profile(auth.uid()))
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (tenant_id = public.get_user_tenant_id(auth.uid()) AND NOT public.is_external_profile(auth.uid()))
);

CREATE POLICY "Gestores apagam registos criminais do tenant"
ON public.registos_criminais FOR DELETE TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (tenant_id = public.get_user_tenant_id(auth.uid()) AND NOT public.is_external_profile(auth.uid()))
);

-- 2. Storage policies (path: {tenant_id}/{motorista_id}/file)
CREATE POLICY "Registo criminal upload pelo tenant"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'criminal-records'
  AND (storage.foldername(name))[1] = (public.get_user_tenant_id(auth.uid()))::text
);

CREATE POLICY "Registo criminal leitura pelo tenant"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'criminal-records'
  AND (
    public.is_super_admin(auth.uid())
    OR (storage.foldername(name))[1] = (public.get_user_tenant_id(auth.uid()))::text
  )
);

CREATE POLICY "Registo criminal remocao por gestores"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'criminal-records'
  AND NOT public.is_external_profile(auth.uid())
  AND (storage.foldername(name))[1] = (public.get_user_tenant_id(auth.uid()))::text
);

-- 3. Sync validated record into motoristas.registo_criminal_valid_until
CREATE OR REPLACE FUNCTION public.sync_registo_criminal_motorista()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'validado' AND NEW.data_validade IS NOT NULL THEN
    UPDATE public.motoristas
    SET registo_criminal_valid_until = NEW.data_validade
    WHERE id = NEW.motorista_id;

    DELETE FROM public.alertas_sistema
    WHERE entidade_tipo = 'registo_criminal' AND entidade_id = NEW.motorista_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_registo_criminal_motorista
AFTER INSERT OR UPDATE OF status, data_validade ON public.registos_criminais
FOR EACH ROW EXECUTE FUNCTION public.sync_registo_criminal_motorista();

-- 4. Expiry alerts
CREATE OR REPLACE FUNCTION public.gerar_alertas_registo_criminal()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_dias int;
  v_sub text;
  v_titulo text;
  v_msg text;
BEGIN
  FOR r IN
    SELECT m.id, m.tenant_id, m.nome_completo, m.registo_criminal_valid_until AS validade
    FROM public.motoristas m
    WHERE m.ativo = true
  LOOP
    IF r.validade IS NULL THEN
      v_sub := 'sem_documento';
      v_titulo := 'Registo criminal em falta';
      v_msg := r.nome_completo || ' nao tem registo criminal submetido.';
    ELSE
      v_dias := (r.validade - CURRENT_DATE);
      IF v_dias < 0 THEN
        v_sub := 'vencido';
        v_titulo := 'Registo criminal vencido';
        v_msg := 'O registo criminal de ' || r.nome_completo || ' venceu em ' || to_char(r.validade, 'DD/MM/YYYY') || '.';
      ELSIF v_dias = 0 THEN
        v_sub := 'd0';
        v_titulo := 'Registo criminal vence hoje';
        v_msg := 'O registo criminal de ' || r.nome_completo || ' vence hoje.';
      ELSIF v_dias <= 7 THEN
        v_sub := 'd7';
        v_titulo := 'Registo criminal vence em 7 dias';
        v_msg := 'O registo criminal de ' || r.nome_completo || ' vence em ' || v_dias || ' dias.';
      ELSIF v_dias <= 15 THEN
        v_sub := 'd15';
        v_titulo := 'Registo criminal vence em 15 dias';
        v_msg := 'O registo criminal de ' || r.nome_completo || ' vence em ' || v_dias || ' dias.';
      ELSIF v_dias <= 30 THEN
        v_sub := 'd30';
        v_titulo := 'Registo criminal vence em 30 dias';
        v_msg := 'O registo criminal de ' || r.nome_completo || ' vence em ' || v_dias || ' dias.';
      ELSE
        CONTINUE;
      END IF;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.alertas_sistema a
      WHERE a.tenant_id = r.tenant_id
        AND a.entidade_tipo = 'registo_criminal'
        AND a.entidade_id = r.id
        AND a.sub_tipo = v_sub
    ) THEN
      INSERT INTO public.alertas_sistema (tenant_id, titulo, mensagem, tipo, data_vencimento, entidade_tipo, entidade_id, sub_tipo)
      VALUES (r.tenant_id, v_titulo, v_msg, 'documento_vencendo', r.validade, 'registo_criminal', r.id, v_sub);
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.gerar_alertas_registo_criminal() FROM public;
GRANT EXECUTE ON FUNCTION public.gerar_alertas_registo_criminal() TO service_role;

SELECT cron.schedule(
  'gerar-alertas-registo-criminal-diario',
  '15 8 * * *',
  $$SELECT public.gerar_alertas_registo_criminal();$$
);

SELECT public.gerar_alertas_registo_criminal();