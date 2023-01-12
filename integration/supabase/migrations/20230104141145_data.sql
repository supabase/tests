create table if not exists profiles (
  id uuid references auth.users not null,
  updated_at timestamp with time zone,
  username text unique,
  avatar_url text,
  website text,

  primary key (id),
  unique(username),
  constraint username_length check (char_length(username) >= 3)
);

alter table profiles enable row level security;

create policy "Public profiles are viewable by the owner."
  on profiles for select
  using ( auth.uid() = id );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

create policy "Users can delete own profile."
  on profiles for delete
  using ( auth.uid() = id );

-- Set up Realtime
drop publication if exists supabase_realtime;
create publication supabase_realtime;
alter publication supabase_realtime add table profiles;

-- Set up Storage
insert into storage.buckets (id, name)
values ('avatars', 'avatars') on conflict do nothing;

create policy "Avatar images are publicly accessible."
  on storage.objects for select
  using ( bucket_id = 'avatars' );

create policy "Anyone can upload an avatar."
  on storage.objects for insert
  with check ( bucket_id = 'avatars' );

create policy "Anyone can update an avatar."
  on storage.objects for update
  with check ( bucket_id = 'avatars' );

create table if not exists profile_inserts (
  id serial,
  user_id uuid,
  username text,
  inserted_at timestamp with time zone default now(),

  primary key (id)
);

create or replace function insert_log() 
returns trigger as $$
begin
    insert into profile_inserts ("user_id", "username")
        values (NEW.id, NEW.username);
    return NEW;
end;
$$ language plpgsql;

create trigger profile_insert
    before insert on profiles
    for each row
    execute function insert_log();