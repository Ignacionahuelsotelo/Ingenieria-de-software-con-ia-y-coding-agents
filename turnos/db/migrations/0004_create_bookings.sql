create table bookings (
  id bigint generated always as identity primary key,
  booking_code char(8) not null unique,
  slot_start timestamptz not null,
  slot_end timestamptz not null,
  customer_name text not null check (length(btrim(customer_name)) > 0),
  customer_phone text not null check (length(btrim(customer_phone)) > 0),
  status text not null check (status in ('active', 'completed', 'no_show', 'cancelled')),
  cancelled_reason text check (cancelled_reason in ('customer', 'owner', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_cancelled_reason_consistency check (
    (status = 'cancelled' and cancelled_reason is not null)
    or (status <> 'cancelled' and cancelled_reason is null)
  )
);

create unique index bookings_one_active_per_slot
  on bookings (slot_start)
  where status = 'active';

create index bookings_slot_start_idx on bookings (slot_start);
