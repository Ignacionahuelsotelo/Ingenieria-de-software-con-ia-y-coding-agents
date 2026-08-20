create table blocks (
  id bigint generated always as identity primary key,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  created_at timestamptz not null default now(),
  constraint blocks_ends_after_starts check (ends_at > starts_at)
);

create index blocks_starts_at_idx on blocks (starts_at);
