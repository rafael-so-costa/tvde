ALTER TABLE public.assinaturas_digitais
ADD COLUMN IF NOT EXISTS signatario_user_id uuid;

CREATE INDEX IF NOT EXISTS idx_assinaturas_digitais_signatario_user_status
ON public.assinaturas_digitais (signatario_user_id, status);

CREATE OR REPLACE FUNCTION public.preencher_assinatura_signatario_user_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_email text;
BEGIN
  v_email := lower(trim(COALESCE(NEW.signatario_email::text, '')));
  NEW.signatario_email := v_email;

  IF NEW.signatario_user_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF lower(COALESCE(NEW.signatario_tipo::text, '')) = 'motorista' THEN
    SELECT m.user_id INTO v_user_id
    FROM public.motoristas m
    WHERE m.tenant_id = NEW.tenant_id
      AND m.user_id IS NOT NULL
      AND (
        m.id = NEW.signatario_id
        OR (v_email <> '' AND lower(COALESCE(m.email::text, '')) = v_email)
      )
    ORDER BY CASE WHEN m.id = NEW.signatario_id THEN 0 ELSE 1 END
    LIMIT 1;
  ELSIF lower(COALESCE(NEW.signatario_tipo::text, '')) = 'proprietario' THEN
    SELECT p.user_id INTO v_user_id
    FROM public.proprietarios p
    WHERE p.tenant_id = NEW.tenant_id
      AND p.user_id IS NOT NULL
      AND (
        p.id = NEW.signatario_id
        OR (v_email <> '' AND lower(COALESCE(p.email::text, '')) = v_email)
      )
    ORDER BY CASE WHEN p.id = NEW.signatario_id THEN 0 ELSE 1 END
    LIMIT 1;
  ELSIF lower(COALESCE(NEW.signatario_tipo::text, '')) = 'funcionario' THEN
    SELECT f.user_id INTO v_user_id
    FROM public.funcionarios f
    WHERE f.tenant_id = NEW.tenant_id
      AND f.user_id IS NOT NULL
      AND (
        f.id = NEW.signatario_id
        OR (v_email <> '' AND lower(COALESCE(f.email::text, '')) = v_email)
      )
    ORDER BY CASE WHEN f.id = NEW.signatario_id THEN 0 ELSE 1 END
    LIMIT 1;
  END IF;

  IF v_user_id IS NULL AND v_email <> '' THEN
    SELECT pr.user_id INTO v_user_id
    FROM public.profiles pr
    WHERE pr.tenant_id = NEW.tenant_id
      AND lower(COALESCE(pr.email::text, '')) = v_email
    LIMIT 1;
  END IF;

  NEW.signatario_user_id := v_user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_preencher_assinatura_signatario_user_id ON public.assinaturas_digitais;
CREATE TRIGGER trg_preencher_assinatura_signatario_user_id
BEFORE INSERT OR UPDATE ON public.assinaturas_digitais
FOR EACH ROW
EXECUTE FUNCTION public.preencher_assinatura_signatario_user_id();

UPDATE public.assinaturas_digitais ad
SET signatario_user_id = m.user_id,
    signatario_email = lower(trim(ad.signatario_email::text))
FROM public.motoristas m
WHERE ad.signatario_user_id IS NULL
  AND lower(COALESCE(ad.signatario_tipo::text, '')) = 'motorista'
  AND m.tenant_id = ad.tenant_id
  AND m.user_id IS NOT NULL
  AND (
    m.id = ad.signatario_id
    OR lower(COALESCE(m.email::text, '')) = lower(trim(ad.signatario_email::text))
  );

UPDATE public.assinaturas_digitais ad
SET signatario_user_id = p.user_id,
    signatario_email = lower(trim(ad.signatario_email::text))
FROM public.proprietarios p
WHERE ad.signatario_user_id IS NULL
  AND lower(COALESCE(ad.signatario_tipo::text, '')) = 'proprietario'
  AND p.tenant_id = ad.tenant_id
  AND p.user_id IS NOT NULL
  AND (
    p.id = ad.signatario_id
    OR lower(COALESCE(p.email::text, '')) = lower(trim(ad.signatario_email::text))
  );

UPDATE public.assinaturas_digitais ad
SET signatario_user_id = f.user_id,
    signatario_email = lower(trim(ad.signatario_email::text))
FROM public.funcionarios f
WHERE ad.signatario_user_id IS NULL
  AND lower(COALESCE(ad.signatario_tipo::text, '')) = 'funcionario'
  AND f.tenant_id = ad.tenant_id
  AND f.user_id IS NOT NULL
  AND (
    f.id = ad.signatario_id
    OR lower(COALESCE(f.email::text, '')) = lower(trim(ad.signatario_email::text))
  );

UPDATE public.assinaturas_digitais ad
SET signatario_user_id = pr.user_id,
    signatario_email = lower(trim(ad.signatario_email::text))
FROM public.profiles pr
WHERE ad.signatario_user_id IS NULL
  AND pr.tenant_id = ad.tenant_id
  AND lower(COALESCE(pr.email::text, '')) = lower(trim(ad.signatario_email::text));

CREATE OR REPLACE FUNCTION public.assinatura_pertence_ao_utilizador(
  _signatario_user_id uuid,
  _signatario_email text,
  _signatario_tipo text,
  _signatario_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      _signatario_user_id = auth.uid()
      OR lower(COALESCE(_signatario_email, '')) = lower(current_setting('request.jwt.claim.email', true))
      OR (
        lower(COALESCE(_signatario_tipo, '')) = 'motorista'
        AND EXISTS (
          SELECT 1 FROM public.motoristas m
          WHERE m.id = _signatario_id
            AND m.user_id = auth.uid()
        )
      )
      OR (
        lower(COALESCE(_signatario_tipo, '')) = 'proprietario'
        AND EXISTS (
          SELECT 1 FROM public.proprietarios p
          WHERE p.id = _signatario_id
            AND p.user_id = auth.uid()
        )
      )
      OR (
        lower(COALESCE(_signatario_tipo, '')) = 'funcionario'
        AND EXISTS (
          SELECT 1 FROM public.funcionarios f
          WHERE f.id = _signatario_id
            AND f.user_id = auth.uid()
        )
      )
    )
$$;

DROP POLICY IF EXISTS "Signatories can view their signatures" ON public.assinaturas_digitais;
CREATE POLICY "Signatories can view their signatures"
ON public.assinaturas_digitais
FOR SELECT
TO authenticated
USING (
  public.assinatura_pertence_ao_utilizador(signatario_user_id, signatario_email::text, signatario_tipo::text, signatario_id)
);

DROP POLICY IF EXISTS "Signatarios can update their own signatures" ON public.assinaturas_digitais;
CREATE POLICY "Signatarios can update their own signatures"
ON public.assinaturas_digitais
FOR UPDATE
TO authenticated
USING (
  public.assinatura_pertence_ao_utilizador(signatario_user_id, signatario_email::text, signatario_tipo::text, signatario_id)
)
WITH CHECK (
  public.assinatura_pertence_ao_utilizador(signatario_user_id, signatario_email::text, signatario_tipo::text, signatario_id)
);

CREATE OR REPLACE FUNCTION public.proteger_assinatura_remota_signatario()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF public.is_tenant_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF public.assinatura_pertence_ao_utilizador(OLD.signatario_user_id, OLD.signatario_email::text, OLD.signatario_tipo::text, OLD.signatario_id) THEN
    NEW.id := OLD.id;
    NEW.contrato_id := OLD.contrato_id;
    NEW.tenant_id := OLD.tenant_id;
    NEW.signatario_tipo := OLD.signatario_tipo;
    NEW.signatario_id := OLD.signatario_id;
    NEW.signatario_user_id := OLD.signatario_user_id;
    NEW.signatario_nome := OLD.signatario_nome;
    NEW.signatario_email := OLD.signatario_email;
    NEW.placeholder := OLD.placeholder;
    NEW.solicitado_por := OLD.solicitado_por;
    NEW.solicitado_em := OLD.solicitado_em;
    NEW.created_at := OLD.created_at;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Sem permissão para alterar esta assinatura';
END;
$$;