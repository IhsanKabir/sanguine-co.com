-- Sanguine — Admin-uploadable ambient audio (EXECUTION-PLAN 4.2)
--
-- New `audio` Storage bucket holding up to three short ambient files
-- (gong / chime / seal) that replace the synthesised WebAudio tones in
-- public/atier.js. The storefront reads the file URLs from the
-- `site_settings.audio` row (no schema change — site_settings is key/jsonb)
-- and falls back to the synth tones whenever a file is absent or fails.
--
-- Writes are gated on the `settings` permission per the execution plan —
-- audio is house-infrastructure, not day-to-day editorial copy. Owner and
-- admin pass implicitly; a subadmin needs `settings` in their JWT
-- app_metadata.permissions (same idiom as 0012).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'audio',
  'audio',
  true,                                   -- public read: storefront <audio> needs no signed URLs
  262144,                                 -- 256 KB ceiling; the action enforces 250 KB
  array['audio/ogg', 'audio/mpeg']        -- .ogg / .mp3 only, per plan 4.2
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "audio_admin_insert" on storage.objects;
create policy "audio_admin_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'audio'
    and (
      (auth.jwt()->'app_metadata'->>'role') in ('owner', 'admin')
      or (
        (auth.jwt()->'app_metadata'->>'role') = 'subadmin'
        and (auth.jwt()->'app_metadata'->'permissions') ? 'settings'
      )
    )
  );

drop policy if exists "audio_admin_update" on storage.objects;
create policy "audio_admin_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'audio'
    and (
      (auth.jwt()->'app_metadata'->>'role') in ('owner', 'admin')
      or (
        (auth.jwt()->'app_metadata'->>'role') = 'subadmin'
        and (auth.jwt()->'app_metadata'->'permissions') ? 'settings'
      )
    )
  );

drop policy if exists "audio_admin_delete" on storage.objects;
create policy "audio_admin_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'audio'
    and (
      (auth.jwt()->'app_metadata'->>'role') in ('owner', 'admin')
      or (
        (auth.jwt()->'app_metadata'->>'role') = 'subadmin'
        and (auth.jwt()->'app_metadata'->'permissions') ? 'settings'
      )
    )
  );

-- Public read is implicit because the bucket is public.
