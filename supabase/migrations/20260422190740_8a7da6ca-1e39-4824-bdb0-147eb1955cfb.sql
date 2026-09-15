-- Substituir política de INSERT em mensagens_chat para cobrir responsáveis do assunto
DROP POLICY IF EXISTS "Send messages with claim rules" ON public.mensagens_chat;

CREATE POLICY "Send messages with claim rules"
ON public.mensagens_chat
FOR INSERT
TO authenticated
WITH CHECK (
  autor_user_id = auth.uid()
  AND conversa_id IN (
    SELECT c.id
    FROM public.conversas c
    WHERE c.status <> 'finalizado'
      AND (
        c.iniciador_user_id = auth.uid()
        OR c.destinatario_user_id = auth.uid()
        OR (public.is_tenant_admin(auth.uid()) AND c.tenant_id = public.get_user_tenant_id(auth.uid()))
        OR c.assumido_por IN (SELECT id FROM public.funcionarios WHERE user_id = auth.uid())
        OR c.funcionario_id IN (SELECT id FROM public.funcionarios WHERE user_id = auth.uid())
        OR c.assunto_id IN (
          SELECT ar.assunto_id
          FROM public.assunto_responsaveis ar
          JOIN public.funcionarios f ON f.id = ar.funcionario_id
          WHERE f.user_id = auth.uid()
        )
      )
  )
);