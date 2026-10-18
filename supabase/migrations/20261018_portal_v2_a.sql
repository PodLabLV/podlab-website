-- Portal v2, track A (shell, Dashboard, Profile, hot potato). Additive only.
--
-- 1. Clients can read their own notifications and credit ledger (and so the
--    security_invoker balance view). The portal reads them server-side today;
--    the policy keeps direct reads safe for any tab that wants them. Writes stay
--    service-role only (no insert/update/delete policies).
-- 2. Text-update consent trail: when a client switched portal texts on or off
--    (Profile → Notifications). The A2P record; notify_sms itself is in core.

do $$
declare t text;
begin
  foreach t in array array['notifications', 'credit_ledger']
  loop
    if to_regclass(format('public.portal_%s', t)) is null then continue; end if;
    execute format('alter table public.portal_%I enable row level security', t);
    execute format('drop policy if exists own_rows on public.portal_%I', t);
    execute format(
      'create policy own_rows on public.portal_%I for select to authenticated '
      'using (client_id in (select public.portal_my_client_ids()))', t);
    execute format('grant select on public.portal_%I to authenticated', t);
  end loop;
end $$;

grant select on public.portal_credit_balance to authenticated;

alter table public.portal_clients add column if not exists notify_sms_opted_in_at timestamptz;
alter table public.portal_clients add column if not exists notify_sms_opted_out_at timestamptz;

notify pgrst, 'reload schema';

-- TO UNDO:
--   drop policy if exists own_rows on public.portal_notifications;
--   drop policy if exists own_rows on public.portal_credit_ledger;
--   revoke select on public.portal_notifications, public.portal_credit_ledger, public.portal_credit_balance from authenticated;
--   alter table public.portal_clients drop column if exists notify_sms_opted_in_at, drop column if exists notify_sms_opted_out_at;
