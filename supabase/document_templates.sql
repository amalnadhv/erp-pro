-- Document template designer storage
create table if not exists document_templates (
  id uuid primary key default gen_random_uuid(),
  doc_type text not null,
  name text not null,
  layout jsonb not null default '[]'::jsonb,
  header text,
  footer text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (doc_type, name)
);

-- Safe to re-run even if the table already exists (e.g. created before header/footer were added)
alter table document_templates add column if not exists header text;
alter table document_templates add column if not exists footer text;

create index if not exists idx_doc_templates_type on document_templates (doc_type);

alter table document_templates enable row level security;
