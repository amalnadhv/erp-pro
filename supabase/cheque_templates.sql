-- Per-bank cheque templates (different banks = different formats)
create table if not exists cheque_templates (
  id uuid primary key default gen_random_uuid(),
  bank_name text not null,
  leaf_w_mm numeric default 215,
  leaf_h_mm numeric default 95,
  bg_url text,
  positions jsonb,
  is_default boolean default false,
  created_at timestamptz default now()
);

-- Allow the app's anon/service key to read/write templates
alter table cheque_templates enable row level security;
drop policy if exists "public_all_cheque_templates" on cheque_templates;
create policy "public_all_cheque_templates" on cheque_templates for all to anon using (true) with check (true);
