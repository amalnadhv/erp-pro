-- Inter-warehouse stock transfer
create table if not exists warehouses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  is_default boolean default false,
  created_at timestamptz default now()
);

create table if not exists stock_locations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  warehouse_id uuid references warehouses(id) on delete cascade,
  qty integer default 0,
  unique (product_id, warehouse_id)
);

create table if not exists stock_transfers (
  id uuid primary key default gen_random_uuid(),
  transfer_no text,
  from_wh uuid references warehouses(id),
  to_wh uuid references warehouses(id),
  product_id uuid references products(id),
  product_name text,
  qty integer not null,
  status text default 'Requested' check (status in ('Requested','Dispatched','Received','Cancelled')),
  requested_by text,
  dispatched_by text,
  received_by text,
  requested_at timestamptz default now(),
  dispatched_at timestamptz,
  received_at timestamptz,
  notes text,
  created_at timestamptz default now()
);

-- Keep products.stock_quantity as the total across all locations
create or replace function sync_product_stock() returns trigger as $$
begin
  if tg_op = 'DELETE' then
    update products set stock_quantity = (select coalesce(sum(qty),0) from stock_locations where product_id = old.product_id) where id = old.product_id;
    return old;
  else
    update products set stock_quantity = (select coalesce(sum(qty),0) from stock_locations where product_id = new.product_id) where id = new.product_id;
    return new;
  end if;
end;
$$ language plpgsql;

drop trigger if exists trg_sync_product_stock on stock_locations;
create trigger trg_sync_product_stock after insert or update or delete on stock_locations
  for each row execute function sync_product_stock();

-- Seed a default warehouse and move existing product stock into it
insert into warehouses (name, is_default) select 'Main Warehouse', true where not exists (select 1 from warehouses);

insert into stock_locations (product_id, warehouse_id, qty)
select p.id, w.id, p.stock_quantity from products p, (select id from warehouses where is_default limit 1) w
where not exists (select 1 from stock_locations);
