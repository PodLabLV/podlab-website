-- Portal v2: notifications for logins that aren't a client (Hiram, 2026-10-19).
--
-- A Beaker who only refers (no portal client record) still signs in to the
-- portal and should hear when a referral moves or a commission lands. Until
-- now every notification hung off a client. A row now belongs to EITHER a
-- client (client_id) OR a login (user_id = auth.users.id). Client rows are
-- unchanged.

alter table public.portal_notifications alter column client_id drop not null;
alter table public.portal_notifications add column if not exists user_id uuid;
alter table public.portal_notifications drop constraint if exists portal_notifications_owner_chk;
alter table public.portal_notifications add constraint portal_notifications_owner_chk
  check (client_id is not null or user_id is not null);
-- One row per login per event, the same dedupe client rows get from (client_id, ref).
alter table public.portal_notifications drop constraint if exists portal_notifications_user_ref_key;
alter table public.portal_notifications add constraint portal_notifications_user_ref_key unique (user_id, ref);
create index if not exists portal_notifications_user_feed_idx on public.portal_notifications (user_id, created_at desc) where user_id is not null;

-- A login reads its own rows (client rows keep their existing policy).
drop policy if exists own_user_rows on public.portal_notifications;
create policy own_user_rows on public.portal_notifications for select to authenticated using (user_id = auth.uid());

notify pgrst, 'reload schema';

-- TO UNDO (only once no user-only rows exist):
--   drop policy if exists own_user_rows on public.portal_notifications;
--   alter table public.portal_notifications drop constraint if exists portal_notifications_user_ref_key,
--     drop constraint if exists portal_notifications_owner_chk, drop column if exists user_id;
--   alter table public.portal_notifications alter column client_id set not null;
