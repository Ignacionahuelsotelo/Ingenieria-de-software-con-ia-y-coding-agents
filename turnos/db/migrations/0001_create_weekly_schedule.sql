create table weekly_schedule (
  weekday smallint primary key check (weekday between 0 and 6),
  is_open boolean not null,
  start_time time,
  end_time time,
  updated_at timestamptz not null default now(),
  constraint weekly_schedule_open_hours check (
    (is_open and start_time is not null and end_time is not null and end_time > start_time)
    or (not is_open and start_time is null and end_time is null)
  )
);

insert into weekly_schedule (weekday, is_open, start_time, end_time)
values (0, false, null, null),
       (1, false, null, null),
       (2, false, null, null),
       (3, false, null, null),
       (4, false, null, null),
       (5, false, null, null),
       (6, false, null, null);
