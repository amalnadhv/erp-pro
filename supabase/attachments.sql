-- Storage bucket for attachments (public so preview/print links work)
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict (id) do update set public = true;

-- Attachments table: links files to any entity (customer, supplier, product, invoice, etc.)
create table if not exists attachments (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id text not null,
  file_name text not null,
  file_path text not null,
  file_url text,
  file_size bigint,
  mime_type text,
  uploaded_at timestamptz not null default now(),
  uploaded_by text
);

create index if not exists idx_attachments_entity on attachments (entity_type, entity_id);
