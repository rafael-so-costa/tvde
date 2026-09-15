-- ===========================================
-- STORAGE BUCKETS FOR DOCUMENTS AND MEDIA
-- ===========================================

-- Bucket for profile photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']);

-- Bucket for vehicle photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('vehicle-photos', 'vehicle-photos', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']);

-- Bucket for documents (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('documents', 'documents', false, 20971520, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']);

-- Bucket for contract templates
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('contract-templates', 'contract-templates', false, 20971520, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']);

-- Bucket for digital signatures
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('signatures', 'signatures', false, 1048576, ARRAY['image/png', 'image/jpeg']);

-- Bucket for checklist media (photos/videos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('checklist-media', 'checklist-media', false, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']);

-- Bucket for maintenance invoices
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('invoices', 'invoices', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png']);

-- Bucket for tenant logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('tenant-logos', 'tenant-logos', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']);

-- ===========================================
-- STORAGE POLICIES
-- ===========================================

-- AVATARS: Public read, authenticated upload for own folder
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- VEHICLE PHOTOS: Public read, tenant admins can manage
CREATE POLICY "Vehicle photos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'vehicle-photos');

CREATE POLICY "Tenant admins can upload vehicle photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'vehicle-photos' AND public.is_tenant_admin(auth.uid()));

CREATE POLICY "Tenant admins can update vehicle photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'vehicle-photos' AND public.is_tenant_admin(auth.uid()));

CREATE POLICY "Tenant admins can delete vehicle photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'vehicle-photos' AND public.is_tenant_admin(auth.uid()));

-- DOCUMENTS: Private, tenant admins can manage
CREATE POLICY "Tenant admins can view documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'documents' AND public.is_tenant_admin(auth.uid()));

CREATE POLICY "Tenant admins can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'documents' AND public.is_tenant_admin(auth.uid()));

CREATE POLICY "Tenant admins can update documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'documents' AND public.is_tenant_admin(auth.uid()));

CREATE POLICY "Tenant admins can delete documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'documents' AND public.is_tenant_admin(auth.uid()));

-- CONTRACT TEMPLATES: Private, tenant admins only
CREATE POLICY "Tenant admins can view contract templates"
ON storage.objects FOR SELECT
USING (bucket_id = 'contract-templates' AND public.is_tenant_admin(auth.uid()));

CREATE POLICY "Tenant admins can upload contract templates"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'contract-templates' AND public.is_tenant_admin(auth.uid()));

CREATE POLICY "Tenant admins can update contract templates"
ON storage.objects FOR UPDATE
USING (bucket_id = 'contract-templates' AND public.is_tenant_admin(auth.uid()));

CREATE POLICY "Tenant admins can delete contract templates"
ON storage.objects FOR DELETE
USING (bucket_id = 'contract-templates' AND public.is_tenant_admin(auth.uid()));

-- SIGNATURES: Private, authenticated users can upload their own
CREATE POLICY "Users can view their own signatures"
ON storage.objects FOR SELECT
USING (bucket_id = 'signatures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Tenant admins can view all signatures"
ON storage.objects FOR SELECT
USING (bucket_id = 'signatures' AND public.is_tenant_admin(auth.uid()));

CREATE POLICY "Users can upload their own signatures"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'signatures' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CHECKLIST MEDIA: Private, tenant admins can manage
CREATE POLICY "Tenant admins can view checklist media"
ON storage.objects FOR SELECT
USING (bucket_id = 'checklist-media' AND public.is_tenant_admin(auth.uid()));

CREATE POLICY "Authenticated users can view their checklist media"
ON storage.objects FOR SELECT
USING (bucket_id = 'checklist-media' AND auth.role() = 'authenticated');

CREATE POLICY "Tenant admins can upload checklist media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'checklist-media' AND public.is_tenant_admin(auth.uid()));

CREATE POLICY "Tenant admins can delete checklist media"
ON storage.objects FOR DELETE
USING (bucket_id = 'checklist-media' AND public.is_tenant_admin(auth.uid()));

-- INVOICES: Private, tenant admins only
CREATE POLICY "Tenant admins can view invoices"
ON storage.objects FOR SELECT
USING (bucket_id = 'invoices' AND public.is_tenant_admin(auth.uid()));

CREATE POLICY "Tenant admins can upload invoices"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'invoices' AND public.is_tenant_admin(auth.uid()));

CREATE POLICY "Tenant admins can delete invoices"
ON storage.objects FOR DELETE
USING (bucket_id = 'invoices' AND public.is_tenant_admin(auth.uid()));

-- TENANT LOGOS: Public read, super admins can manage
CREATE POLICY "Tenant logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'tenant-logos');

CREATE POLICY "Super admins can upload tenant logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'tenant-logos' AND public.is_super_admin(auth.uid()));

CREATE POLICY "Tenant admins can upload their logo"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'tenant-logos' AND public.is_tenant_admin(auth.uid()));

CREATE POLICY "Tenant admins can update their logo"
ON storage.objects FOR UPDATE
USING (bucket_id = 'tenant-logos' AND public.is_tenant_admin(auth.uid()));