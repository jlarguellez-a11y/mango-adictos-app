-- ============================================================
-- MANGO ADICTOS - Esquema de base de datos para Supabase
-- ============================================================
-- Ejecutar este script completo en el SQL Editor de Supabase
-- (Project > SQL Editor > New query)
-- ============================================================

-- Extensión necesaria para UUIDs
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 1. PERFILES (extiende auth.users con rol)
-- ------------------------------------------------------------
create type user_role as enum ('admin', 'empleado');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role user_role not null default 'empleado',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Crea automáticamente un perfil "empleado" cuando alguien se registra.
-- El admin puede luego cambiarle el rol manualmente desde Supabase
-- (tabla profiles) o desde el panel de administración de la app.
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'empleado');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ------------------------------------------------------------
-- 2. CATEGORÍAS Y PRODUCTOS
-- ------------------------------------------------------------
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category_id uuid references categories(id) on delete set null,
  price numeric(12,2) not null default 0,
  cost numeric(12,2) not null default 0, -- costo interno del producto (opcional, útil para margen)
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 3. VENTAS (estilo POS) — una venta con uno o varios productos
-- ------------------------------------------------------------
create table sales (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references profiles(id),
  total numeric(12,2) not null default 0,
  payment_method text default 'efectivo', -- efectivo, transferencia, etc.
  sold_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales(id) on delete cascade,
  product_id uuid not null references products(id),
  quantity integer not null default 1,
  unit_price numeric(12,2) not null,
  subtotal numeric(12,2) not null
);

-- ------------------------------------------------------------
-- 4. INGRESOS Y EGRESOS (contabilidad general)
-- ------------------------------------------------------------
create type movement_type as enum ('ingreso', 'egreso');

create table movement_categories (
  id uuid primary key default gen_random_uuid(),
  type movement_type not null,
  name text not null, -- ej: VENTAS, INSUMOS, PAGO EMPLEADO, SERVICIOS, ARRIENDO, OTRO
  created_at timestamptz not null default now(),
  unique (type, name)
);

create table movements (
  id uuid primary key default gen_random_uuid(),
  type movement_type not null,
  category_id uuid references movement_categories(id),
  amount numeric(12,2) not null,
  description text,
  related_sale_id uuid references sales(id), -- se llena automático cuando el ingreso viene de una venta
  related_shift_id uuid, -- se llena automático cuando el egreso es pago de turno
  created_by uuid references profiles(id),
  movement_date date not null default current_date,
  created_at timestamptz not null default now()
);

-- Categorías por defecto
insert into movement_categories (type, name) values
  ('ingreso', 'VENTAS DEL DIA'),
  ('ingreso', 'OTRO INGRESO'),
  ('egreso', 'INSUMOS'),
  ('egreso', 'PAGO EMPLEADO'),
  ('egreso', 'SERVICIOS'),
  ('egreso', 'ARRIENDO'),
  ('egreso', 'OTRO EGRESO');

-- Trigger: cuando se cierra una venta, se crea automáticamente
-- un movimiento de tipo ingreso categoría "VENTAS DEL DIA"
create or replace function register_sale_income()
returns trigger as $$
declare
  cat_id uuid;
begin
  select id into cat_id from movement_categories
    where type = 'ingreso' and name = 'VENTAS DEL DIA' limit 1;

  insert into movements (type, category_id, amount, description, related_sale_id, created_by, movement_date)
  values ('ingreso', cat_id, new.total, 'Venta POS', new.id, new.employee_id, (new.sold_at)::date);

  return new;
end;
$$ language plpgsql security definer;

create trigger on_sale_created
  after insert on sales
  for each row execute procedure register_sale_income();

-- ------------------------------------------------------------
-- 5. TURNOS DE EMPLEADOS (control de horas y pago)
-- ------------------------------------------------------------
create table shift_settings (
  id int primary key default 1,
  rate_per_shift numeric(12,2) not null default 50000, -- tarifa turno completo 2pm-7pm
  reference_start time not null default '14:00',
  reference_end time not null default '19:00',
  check (id = 1) -- fila única de configuración
);
insert into shift_settings (id) values (1);

create table shifts (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references profiles(id),
  shift_date date not null default current_date,
  start_time timestamptz not null default now(),
  end_time timestamptz,
  hours_worked numeric(6,2), -- se calcula al cerrar el turno
  amount_to_pay numeric(12,2), -- se calcula al cerrar el turno
  paid boolean not null default false,
  created_at timestamptz not null default now()
);

-- Al cerrar el turno (end_time se llena) se calcula horas y pago
-- pago = horas_trabajadas * (rate_per_shift / horas_referencia)
create or replace function close_shift()
returns trigger as $$
declare
  ref_hours numeric;
  rate numeric;
begin
  if new.end_time is not null and old.end_time is null then
    select rate_per_shift, extract(epoch from (reference_end - reference_start))/3600
      into rate, ref_hours
      from shift_settings where id = 1;

    new.hours_worked := round(extract(epoch from (new.end_time - new.start_time))/3600, 2);
    new.amount_to_pay := round(new.hours_worked * (rate / ref_hours), 0);
  end if;
  return new;
end;
$$ language plpgsql;

create trigger on_shift_closed
  before update on shifts
  for each row execute procedure close_shift();

-- ------------------------------------------------------------
-- 6. INSUMOS Y ALERTAS DE AGOTADO
-- ------------------------------------------------------------
create table supplies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true
);

insert into supplies (name) values
  ('Pitillos'), ('Vasos'), ('Mango'), ('Hielo'), ('Limón'),
  ('Siropes'), ('Sodas'), ('Sales'), ('Toppings'), ('Servilletas');

create type alert_status as enum ('pendiente', 'atendido');

create table supply_alerts (
  id uuid primary key default gen_random_uuid(),
  supply_id uuid not null references supplies(id),
  reported_by uuid not null references profiles(id),
  status alert_status not null default 'pendiente',
  note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references profiles(id)
);

-- ------------------------------------------------------------
-- 7. ROW LEVEL SECURITY
-- ------------------------------------------------------------
alter table profiles enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table sales enable row level security;
alter table sale_items enable row level security;
alter table movement_categories enable row level security;
alter table movements enable row level security;
alter table shifts enable row level security;
alter table shift_settings enable row level security;
alter table supplies enable row level security;
alter table supply_alerts enable row level security;

-- Función helper: ¿el usuario actual es admin?
create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- profiles: cada quien ve su propio perfil, admin ve todos
create policy "profiles_select" on profiles for select
  using (id = auth.uid() or is_admin());
create policy "profiles_update_admin" on profiles for update
  using (is_admin());

-- categorías y productos: todos los autenticados pueden leer,
-- solo admin puede escribir
create policy "categories_select" on categories for select using (auth.uid() is not null);
create policy "categories_write" on categories for all using (is_admin()) with check (is_admin());

create policy "products_select" on products for select using (auth.uid() is not null);
create policy "products_write" on products for all using (is_admin()) with check (is_admin());

-- ventas: cualquier autenticado puede crear e insertar sus propias ventas,
-- admin ve todas, empleado ve las suyas
create policy "sales_select" on sales for select
  using (employee_id = auth.uid() or is_admin());
create policy "sales_insert" on sales for insert
  with check (employee_id = auth.uid());

create policy "sale_items_select" on sale_items for select
  using (exists (select 1 from sales s where s.id = sale_id and (s.employee_id = auth.uid() or is_admin())));
create policy "sale_items_insert" on sale_items for insert
  with check (exists (select 1 from sales s where s.id = sale_id and s.employee_id = auth.uid()));

-- movimientos (ingresos/egresos): solo admin gestiona manualmente,
-- pero todos pueden ver (o restringir a admin si se prefiere)
create policy "movement_categories_select" on movement_categories for select using (auth.uid() is not null);
create policy "movement_categories_write" on movement_categories for all using (is_admin()) with check (is_admin());

create policy "movements_select" on movements for select using (is_admin());
create policy "movements_write" on movements for all using (is_admin()) with check (is_admin());

-- turnos: empleado gestiona los suyos, admin ve y gestiona todos
create policy "shifts_select" on shifts for select
  using (employee_id = auth.uid() or is_admin());
create policy "shifts_insert" on shifts for insert
  with check (employee_id = auth.uid());
create policy "shifts_update" on shifts for update
  using (employee_id = auth.uid() or is_admin());

create policy "shift_settings_select" on shift_settings for select using (auth.uid() is not null);
create policy "shift_settings_write" on shift_settings for all using (is_admin()) with check (is_admin());

-- insumos y alertas
create policy "supplies_select" on supplies for select using (auth.uid() is not null);
create policy "supplies_write" on supplies for all using (is_admin()) with check (is_admin());

create policy "supply_alerts_select" on supply_alerts for select using (auth.uid() is not null);
create policy "supply_alerts_insert" on supply_alerts for insert
  with check (reported_by = auth.uid());
create policy "supply_alerts_update" on supply_alerts for update
  using (is_admin());
