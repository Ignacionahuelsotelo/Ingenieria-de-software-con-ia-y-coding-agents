create table schedule_settings (
  id smallint primary key check (id = 1),
  slot_duration_minutes integer not null check (slot_duration_minutes > 0),
  updated_at timestamptz not null default now()
);

insert into schedule_settings (id, slot_duration_minutes) values (1, 30);
