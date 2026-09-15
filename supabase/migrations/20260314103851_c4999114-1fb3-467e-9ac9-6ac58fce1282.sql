
CREATE TABLE public.checklist_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  record_id text NOT NULL,
  type text NOT NULL CHECK (type IN ('entrega', 'recolha')),
  driver_name text,
  driver_id text,
  vehicle_id text,
  plate text,
  model text,
  operation_date date,
  operation_time text,
  total_penalty numeric DEFAULT 0,
  linked_delivery_record_id text,
  company_signature_url text,
  driver_signature_url text,
  data jsonb NOT NULL DEFAULT '{}',
  security_metadata jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.checklist_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins can manage checklist_records"
ON public.checklist_records
FOR ALL
TO authenticated
USING (is_tenant_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()))
WITH CHECK (is_tenant_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));

CREATE INDEX idx_checklist_records_tenant ON public.checklist_records(tenant_id);
CREATE INDEX idx_checklist_records_type ON public.checklist_records(type);
CREATE INDEX idx_checklist_records_record_id ON public.checklist_records(record_id);
