-- ============================================================
-- Portal Phase 5 — CRM sync
--
-- crm.leads is canonical. It holds 893 rows and backs crm.podlablv.com;
-- public.leads holds 81 written by the marketing routes. Same humans, two
-- tables, no key between them.
--
-- What this migration does:
--   1. indexes crm.leads by lowercased email so matching is not a scan
--   2. backfills the public.leads captures that never reached the CRM
--   3. extends the CLOSED WON trigger to seed the intake submission too
--
-- What it deliberately does NOT do:
--   - drop or stop writing public.leads. The routes still write it. Removing
--     that is a follow-up once parity has been watched in production, because a
--     lead lost in a cutover is lost for good.
--   - add a unique index on email. IT WOULD FAIL: crm.leads already contains a
--     duplicated address (charles@nanocove.com), and 752 of its 893 rows have no
--     email at all. Matching is done in app code against the oldest match.
--
-- Run AFTER 20260904_portal_forms.sql.
-- Safe + additive. Every statement is idempotent.
-- ============================================================

-- ── 1. Matching index ────────────────────────────────────────────────
-- NOT unique, for the reason above. Clean the duplicate up by hand first if a
-- unique constraint is ever wanted:
--   select email, count(*) from crm.leads where email is not null
--   group by 1 having count(*) > 1;
create index if not exists leads_lower_email_idx
  on crm.leads (lower(email))
  where email is not null;

-- ── 2. Backfill website captures into the CRM ────────────────────────
-- Only rows with an email that the CRM has never seen. Stage and pipeline match
-- the conventions already in the table — NEW LEAD, sales — so these appear
-- where the team already looks, and `source` keeps them filterable.
--
-- UTM detail has no column in crm.leads and is folded into notes rather than
-- dropped; losing attribution to fit a schema would be the wrong trade.
insert into crm.leads (name, company, email, phone, source, stage, pipeline, notes, created_at)
select
  coalesce(nullif(trim(coalesce(l.first_name,'') || ' ' || coalesce(l.last_name,'')), ''), l.email),
  nullif(l.company, ''),
  lower(l.email),
  nullif(l.phone, ''),
  'website:backfill/' || coalesce(nullif(l.source, ''), 'form'),
  'NEW LEAD',
  'sales',
  nullif(concat_ws(E'\n',
    '[backfilled from public.leads]',
    nullif(concat_ws(' / ',
      nullif('utm_source=' || l.utm_source, 'utm_source='),
      nullif('utm_medium=' || l.utm_medium, 'utm_medium='),
      nullif('utm_campaign=' || l.utm_campaign, 'utm_campaign=')
    ), ''),
    nullif(l.business_context, ''),
    nullif(l.pains, '')
  ), ''),
  l.created_at
from public.leads l
where l.email is not null
  and l.email <> ''
  and not exists (
    select 1 from crm.leads c where lower(c.email) = lower(l.email)
  );

-- ── 3. Extend the won-lead seed ──────────────────────────────────────
-- The original (20260813) creates the portal client and its delivery phases.
-- It now also opens the client-intake submission, so a won deal arrives with
-- somewhere to put intake answers instead of the portal creating it lazily on
-- first keystroke.
--
-- Everything from the original is preserved verbatim. The auth user is still
-- NOT created here — Supabase auth users can only be made through the admin
-- API, and that remains deliberate rather than a gap.
create or replace function public.portal_seed_from_won_lead()
returns trigger
language plpgsql
security definer
set search_path = public, crm
as $$
declare
  v_client_id uuid;
  v_product   text := coalesce(nullif(new.products[1], ''), 'EssentialsLab');
  v_form_id   uuid;
begin
  if new.stage <> 'CLOSED WON'
     or (tg_op = 'UPDATE' and old.stage is not distinct from 'CLOSED WON') then
    return new;
  end if;

  select id into v_client_id from public.portal_clients where crm_lead_id = new.id;

  if v_client_id is null then
    insert into public.portal_clients (email, business_name, first_name, plan_label, stage, crm_lead_id)
    values (
      coalesce(nullif(new.email, ''), new.id::text || '@unassigned.invalid'),
      coalesce(nullif(new.company, ''), new.name, 'New client'),
      nullif(split_part(coalesce(new.name, ''), ' ', 1), ''),
      v_product,
      'active',
      new.id
    )
    on conflict (email) do update
      set crm_lead_id = excluded.crm_lead_id,
          stage       = 'active',
          plan_label  = excluded.plan_label
    returning id into v_client_id;
  else
    update public.portal_clients set stage = 'active', plan_label = v_product where id = v_client_id;
  end if;

  -- Seed once. Re-winning a lead must never wipe live delivery progress.
  if not exists (select 1 from public.portal_delivery_phases where client_id = v_client_id) then
    insert into public.portal_delivery_phases (client_id, title, detail, owner, due_label, sort_order)
    select v_client_id, t.title, t.detail, t.owner, t.due_label, t.sort_order
    from public.portal_delivery_templates t
    where t.product = v_product
    order by t.sort_order;
  end if;

  -- Phase 5 addition: open the intake submission. Wrapped because the forms
  -- tables are newer than this trigger — on a database where 20260904 has not
  -- run, a won deal must still seed the client and its delivery plan.
  begin
    select id into v_form_id from public.portal_forms where form_key = 'client-intake';
    if v_form_id is not null
       and not exists (
         select 1 from public.portal_form_submissions
         where form_id = v_form_id and client_id = v_client_id
       ) then
      insert into public.portal_form_submissions (form_id, client_id, email, status, source, sent_at)
      values (v_form_id, v_client_id, nullif(new.email, ''), 'sent', 'won-lead-trigger', now());
    end if;
  exception when others then
    raise warning '[portal] intake seed skipped: %', sqlerrm;
  end;

  return new;
end $$;

-- Trigger definition unchanged; recreated so the new function body is bound.
drop trigger if exists trg_portal_seed_from_won on crm.leads;
create trigger trg_portal_seed_from_won
  after insert or update of stage on crm.leads
  for each row execute function public.portal_seed_from_won_lead();

-- ── 4. Deprecation marker ────────────────────────────────────────────
-- Kept readable and still written to. Remove the write from the routes only
-- after watching parity in production for a full capture cycle.
comment on table public.leads is
  'SUPERSEDED by crm.leads (Phase 5, 2026-08-31). Still written by the marketing routes during the parity window. Read-only thereafter — do not build new reporting on this table.';
