create table if not exists public.users (
  id uuid references auth.users(id) primary key,
  email text unique not null,
  is_admin boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up RLS policies
alter table public.users enable row level security;

create policy "Users can view their own data" on public.users
  for select using (auth.uid() = id);

create policy "Admin users can view all data" on public.users
  for all using (
    exists (
      select 1 from public.users
      where id = auth.uid() and is_admin = true
    )
  );

-- Create trigger to update updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger users_updated_at
  before update on public.users
  for each row
  execute procedure public.handle_updated_at(); 