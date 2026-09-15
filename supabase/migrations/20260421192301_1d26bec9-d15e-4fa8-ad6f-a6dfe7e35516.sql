-- Add attachment columns to mensagens_chat
ALTER TABLE public.mensagens_chat
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'texto',
  ADD COLUMN IF NOT EXISTS anexo_url text,
  ADD COLUMN IF NOT EXISTS anexo_nome text,
  ADD COLUMN IF NOT EXISTS anexo_mime text,
  ADD COLUMN IF NOT EXISTS anexo_tamanho integer;

-- Allow empty conteudo when sending only an attachment
ALTER TABLE public.mensagens_chat
  ALTER COLUMN conteudo DROP NOT NULL;

-- Create private bucket for chat attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: authenticated users in same tenant can read/insert their conversation files.
-- File path convention: {tenant_id}/{conversa_id}/{filename}
CREATE POLICY "Chat attachments select for tenant users"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND (storage.foldername(name))[1] = public.get_user_tenant_id(auth.uid())::text
);

CREATE POLICY "Chat attachments insert for tenant users"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND (storage.foldername(name))[1] = public.get_user_tenant_id(auth.uid())::text
);

CREATE POLICY "Chat attachments delete for tenant admins"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND (storage.foldername(name))[1] = public.get_user_tenant_id(auth.uid())::text
  AND public.is_tenant_admin(auth.uid())
);

-- Ensure realtime is enabled for chat tables
ALTER TABLE public.mensagens_chat REPLICA IDENTITY FULL;
ALTER TABLE public.conversas REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.mensagens_chat';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.conversas';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;