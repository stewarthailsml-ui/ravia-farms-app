-- Ravia Farms — Storage bucket for health-log photo proof.
-- Public read (photos are just farm record evidence, not sensitive), but
-- writes/updates require the caller to be an authenticated member of the farm
-- whose id is the first path segment (`<farm_id>/<file>`), and archiving a
-- photo (delete from the bucket) is admin-only — mirrors the DB archive model.

insert into storage.buckets (id, name, public)
values ('health-photos', 'health-photos', true)
on conflict (id) do nothing;

create policy "health_photos_public_read"
  on storage.objects for select
  using (bucket_id = 'health-photos');

create policy "health_photos_farm_upload"
  on storage.objects for insert
  with check (
    bucket_id = 'health-photos'
    and (storage.foldername(name))[1] = public.farm_id()
  );

create policy "health_photos_admin_manage"
  on storage.objects for update
  using (bucket_id = 'health-photos' and (storage.foldername(name))[1] = public.farm_id() and public.is_admin())
  with check (bucket_id = 'health-photos' and (storage.foldername(name))[1] = public.farm_id() and public.is_admin());

-- No delete policy — photo evidence is retained like every other record. An
-- admin who no longer wants a photo referenced simply archives the health log
-- entry that points to it.
