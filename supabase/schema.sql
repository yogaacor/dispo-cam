-- Jalankan sekali di Supabase Dashboard -> SQL Editor.
-- Aman dijalankan ulang.

-- 1. Tabel metadata foto
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  guest_name text not null check (char_length(guest_name) between 1 and 60),
  filter text not null default 'classic' check (char_length(filter) <= 30),
  storage_path text not null unique check (char_length(storage_path) <= 200),
  width int,
  height int
);

create index if not exists photos_created_at_idx on public.photos (created_at desc);

alter table public.photos enable row level security;

-- Tamu (tanpa login) boleh melihat & menambah foto, tapi tidak bisa mengubah/menghapus.
drop policy if exists "photos are viewable by everyone" on public.photos;
create policy "photos are viewable by everyone"
  on public.photos for select
  to anon, authenticated
  using (true);

drop policy if exists "guests can add photos" on public.photos;
create policy "guests can add photos"
  on public.photos for insert
  to anon, authenticated
  with check (true);

-- 2. Bucket storage publik, maksimal 5 MB per file, hanya JPEG
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 5242880, array['image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "guests can upload photos" on storage.objects;
create policy "guests can upload photos"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'photos');

drop policy if exists "photos are public" on storage.objects;
create policy "photos are public"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'photos');

-- 3. Realtime: galeri langsung bertambah saat tamu memotret
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'photos'
  ) then
    alter publication supabase_realtime add table public.photos;
  end if;
end $$;
