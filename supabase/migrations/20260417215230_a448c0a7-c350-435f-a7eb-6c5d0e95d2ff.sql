-- 1. Enums
DO $$ BEGIN
  CREATE TYPE public.modo_distribuicao_chat AS ENUM ('todos', 'rodizio');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.status_conversa AS ENUM ('aberto', 'em_atendimento', 'finalizado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Alter assuntos_chat
ALTER TABLE public.assuntos_chat
  ADD COLUMN IF NOT EXISTS modo_distribuicao public.modo_distribuicao_chat NOT NULL DEFAULT 'todos',
  ADD COLUMN IF NOT EXISTS rodizio_index integer NOT NULL DEFAULT 0;

-- 3. New table: assunto_responsaveis (multi funcionários por assunto)
CREATE TABLE IF NOT EXISTS public.assunto_responsaveis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assunto_id uuid NOT NULL REFERENCES public.assuntos_chat(id) ON DELETE CASCADE,
  funcionario_id uuid NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assunto_id, funcionario_id)
);

CREATE INDEX IF NOT EXISTS idx_assunto_responsaveis_assunto ON public.assunto_responsaveis(assunto_id);
CREATE INDEX IF NOT EXISTS idx_assunto_responsaveis_funcionario ON public.assunto_responsaveis(funcionario_id);

ALTER TABLE public.assunto_responsaveis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users view assunto_responsaveis"
ON public.assunto_responsaveis FOR SELECT TO authenticated
USING (
  assunto_id IN (
    SELECT id FROM public.assuntos_chat
    WHERE tenant_id = public.get_user_tenant_id(auth.uid())
  )
);

CREATE POLICY "Tenant admins manage assunto_responsaveis"
ON public.assunto_responsaveis FOR ALL TO authenticated
USING (
  public.is_tenant_admin(auth.uid()) AND assunto_id IN (
    SELECT id FROM public.assuntos_chat
    WHERE tenant_id = public.get_user_tenant_id(auth.uid())
  )
)
WITH CHECK (
  public.is_tenant_admin(auth.uid()) AND assunto_id IN (
    SELECT id FROM public.assuntos_chat
    WHERE tenant_id = public.get_user_tenant_id(auth.uid())
  )
);

-- 4. Migrate legacy single funcionario_responsavel_id into assunto_responsaveis
INSERT INTO public.assunto_responsaveis (assunto_id, funcionario_id, ordem)
SELECT id, funcionario_responsavel_id, 0
FROM public.assuntos_chat
WHERE funcionario_responsavel_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 5. Alter conversas
ALTER TABLE public.conversas
  ADD COLUMN IF NOT EXISTS status public.status_conversa NOT NULL DEFAULT 'aberto',
  ADD COLUMN IF NOT EXISTS assumido_por uuid REFERENCES public.funcionarios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assumido_em timestamptz,
  ADD COLUMN IF NOT EXISTS finalizado_em timestamptz;

-- Backfill: existing conversas with funcionario_id are considered already assumed
UPDATE public.conversas
SET status = 'em_atendimento',
    assumido_por = funcionario_id,
    assumido_em = COALESCE(assumido_em, created_at)
WHERE funcionario_id IS NOT NULL AND status = 'aberto';

-- 6. Replace routing trigger: handles 'todos' (no auto-assign) and 'rodizio' (round-robin)
CREATE OR REPLACE FUNCTION public.route_conversa_to_funcionario()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_modo public.modo_distribuicao_chat;
  v_count integer;
  v_idx integer;
  v_funcionario_id uuid;
BEGIN
  IF NEW.assunto_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT modo_distribuicao, rodizio_index
    INTO v_modo, v_idx
  FROM public.assuntos_chat
  WHERE id = NEW.assunto_id;

  IF v_modo = 'rodizio' THEN
    SELECT count(*) INTO v_count
    FROM public.assunto_responsaveis
    WHERE assunto_id = NEW.assunto_id;

    IF v_count > 0 THEN
      SELECT funcionario_id INTO v_funcionario_id
      FROM public.assunto_responsaveis
      WHERE assunto_id = NEW.assunto_id
      ORDER BY ordem, created_at
      OFFSET (v_idx % v_count) LIMIT 1;

      NEW.funcionario_id := v_funcionario_id;
      NEW.assumido_por := v_funcionario_id;
      NEW.assumido_em := now();
      NEW.status := 'em_atendimento';

      UPDATE public.assuntos_chat
        SET rodizio_index = (v_idx + 1) % GREATEST(v_count, 1)
        WHERE id = NEW.assunto_id;
    END IF;
  END IF;
  -- Modo 'todos': não atribui automaticamente; status fica 'aberto'
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_route_conversa ON public.conversas;
CREATE TRIGGER trg_route_conversa
BEFORE INSERT ON public.conversas
FOR EACH ROW EXECUTE FUNCTION public.route_conversa_to_funcionario();

-- 7. Atomic claim function (primeiro a clicar "Responder" assume)
CREATE OR REPLACE FUNCTION public.assumir_conversa(_conversa_id uuid)
RETURNS public.conversas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_funcionario_id uuid;
  v_row public.conversas;
BEGIN
  SELECT id INTO v_funcionario_id
  FROM public.funcionarios
  WHERE user_id = auth.uid() LIMIT 1;

  IF v_funcionario_id IS NULL AND NOT public.is_tenant_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  UPDATE public.conversas
    SET assumido_por = COALESCE(v_funcionario_id, assumido_por),
        funcionario_id = COALESCE(v_funcionario_id, funcionario_id),
        assumido_em = now(),
        status = 'em_atendimento'
  WHERE id = _conversa_id
    AND status = 'aberto'
    AND assumido_por IS NULL
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Conversa já foi assumida ou não está aberta';
  END IF;

  RETURN v_row;
END;
$$;

-- 8. Finalize function
CREATE OR REPLACE FUNCTION public.finalizar_conversa(_conversa_id uuid)
RETURNS public.conversas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_funcionario_id uuid;
  v_row public.conversas;
BEGIN
  SELECT id INTO v_funcionario_id
  FROM public.funcionarios
  WHERE user_id = auth.uid() LIMIT 1;

  UPDATE public.conversas
    SET status = 'finalizado',
        finalizado_em = now()
  WHERE id = _conversa_id
    AND (
      assumido_por = v_funcionario_id
      OR public.is_tenant_admin(auth.uid())
    )
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Sem permissão para finalizar esta conversa';
  END IF;

  RETURN v_row;
END;
$$;

-- 9. RLS update on conversas: funcionários listados como responsáveis veem conversas abertas
DROP POLICY IF EXISTS "Funcionario views assigned conversas" ON public.conversas;
CREATE POLICY "Funcionario views assigned and assunto conversas"
ON public.conversas FOR SELECT TO authenticated
USING (
  funcionario_id IN (SELECT id FROM public.funcionarios WHERE user_id = auth.uid())
  OR assumido_por IN (SELECT id FROM public.funcionarios WHERE user_id = auth.uid())
  OR assunto_id IN (
    SELECT ar.assunto_id FROM public.assunto_responsaveis ar
    JOIN public.funcionarios f ON f.id = ar.funcionario_id
    WHERE f.user_id = auth.uid()
  )
);

-- 10. Restrict message INSERT: only assumido_por (or admin/iniciador on aberto for iniciador) can write after assumed
DROP POLICY IF EXISTS "Send messages on accessible conversas" ON public.mensagens_chat;
CREATE POLICY "Send messages with claim rules"
ON public.mensagens_chat FOR INSERT TO authenticated
WITH CHECK (
  autor_user_id = auth.uid()
  AND conversa_id IN (
    SELECT c.id FROM public.conversas c
    WHERE c.status <> 'finalizado'
    AND (
      -- iniciador sempre pode escrever (aberto ou em atendimento)
      c.iniciador_user_id = auth.uid()
      -- admin sempre pode
      OR (public.is_tenant_admin(auth.uid()) AND c.tenant_id = public.get_user_tenant_id(auth.uid()))
      -- funcionário que assumiu
      OR c.assumido_por IN (SELECT id FROM public.funcionarios WHERE user_id = auth.uid())
    )
  )
);

-- 11. Realtime
ALTER TABLE public.assunto_responsaveis REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.assunto_responsaveis;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;