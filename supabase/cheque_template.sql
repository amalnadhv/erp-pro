-- Cheque printing template support
alter table company_profile add column if not exists cheque_bg_url text;
alter table company_profile add column if not exists cheque_w_mm numeric default 215;
alter table company_profile add column if not exists cheque_h_mm numeric default 95;
alter table company_profile add column if not exists cheque_pos jsonb default '{}'::jsonb;

-- Storage bucket for scanned cheque leaves (public so the image is printable)
insert into storage.buckets (id, name, public) values ('cheques', 'cheques', true)
on conflict (id) do nothing;
