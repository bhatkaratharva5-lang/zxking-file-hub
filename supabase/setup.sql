create extension if not exists pgcrypto;

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  filename text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  content_type text not null default 'application/octet-stream',
  created_at timestamptz not null default now(),
  download_count bigint not null default 0
);

alter table public.files enable row level security;

drop policy if exists "Users can read their own ZXKING files" on public.files;
create policy "Users can read their own ZXKING files"
on public.files for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own ZXKING files" on public.files;
create policy "Users can insert their own ZXKING files"
on public.files for insert to authenticated
with check (
  auth.uid() = user_id
  and storage_path like auth.uid()::text || '/%'
);

drop policy if exists "Users can delete their own ZXKING files" on public.files;
create policy "Users can delete their own ZXKING files"
on public.files for delete to authenticated
using (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit)
values ('zxking-files', 'zxking-files', false, 52428800)
on conflict (id) do update
set public = false, file_size_limit = 52428800;

drop policy if exists "ZXKING users upload to own folder" on storage.objects;
create policy "ZXKING users upload to own folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'zxking-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "ZXKING users read own folder" on storage.objects;
create policy "ZXKING users read own folder"
on storage.objects for select to authenticated
using (
  bucket_id = 'zxking-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "ZXKING users delete own folder" on storage.objects;
create policy "ZXKING users delete own folder"
on storage.objects for delete to authenticated
using (
  bucket_id = 'zxking-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create or replace function public.increment_file_download_count(p_file_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.files
  set download_count = download_count + 1
  where id = p_file_id;
$$;

revoke all on function public.increment_file_download_count(uuid)
from public, anon, authenticated;

grant execute on function public.increment_file_download_count(uuid)
to service_role;
