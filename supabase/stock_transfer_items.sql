-- Allow a transfer to carry multiple products
alter table stock_transfers alter column product_id drop not null;
alter table stock_transfers alter column qty drop not null;

create table if not exists stock_transfer_items (
  id uuid primary key default gen_random_uuid(),
  transfer_id uuid references stock_transfers(id) on delete cascade,
  product_id uuid references products(id),
  product_name text,
  qty integer not null
);
