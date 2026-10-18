-- Portal v2, track B (docs/PORTAL-V2.md): Projects + Credits.
--
-- portal_submissions — "Submit footage for editing". One row per submission:
--   draft      the client opened the form (a Drive folder exists for uploads)
--   submitted  credits spent, card on their CRM board in Editing
--   failed     something after the debit broke; the credits were refunded
-- portal_credit_spend() — the debit, atomically: lock the client's wallet,
--   check the balance, write the ledger row. Two submissions racing can't
--   both spend the same credits. Same ref twice = the first row, no new debit.
--
-- Additive and idempotent: safe to run twice. Uses the shared ledger from
-- 20261018_portal_v2_core.sql; does not recreate it.

create table if not exists public.portal_submissions (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.portal_clients(id) on delete cascade,
  status          text not null default 'draft' check (status in ('draft', 'submitted', 'failed')),
  title           text,
  notes           text,
  edit_type       text check (edit_type in ('short', 'long', 'premium')),
  rush            boolean not null default false,
  extra_rounds    int not null default 0 check (extra_rounds between 0 and 3),
  cost            int check (cost > 0),
  links           text[] not null default '{}',     -- pasted Drive / Dropbox / Frame links
  files           jsonb not null default '[]',      -- [{ id, name, size }] uploaded to their Drive folder
  drive_folder_id text,                             -- this submission's folder under 03- Content / Raw Videos
  board_id        uuid,                             -- crm.content_boards.id
  card_id         uuid,                             -- crm.content_cards.id
  due_on          date,
  error           text,
  submitted_by    text,
  submitted_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists portal_submissions_client_idx on public.portal_submissions (client_id, created_at desc);

alter table public.portal_submissions enable row level security;
grant all on public.portal_submissions to service_role;
revoke all on public.portal_submissions from anon;
grant select on public.portal_submissions to authenticated;

drop policy if exists own_rows on public.portal_submissions;
create policy own_rows on public.portal_submissions for select to authenticated
  using (client_id in (select public.portal_my_client_ids()));

-- The debit. Raises 'insufficient_credits' (SQLSTATE P0001) when the wallet is
-- short. Returns the balance after the debit.
create or replace function public.portal_credit_spend(
  p_client uuid, p_cost int, p_ref text, p_note text default null, p_by text default null
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance int;
begin
  if p_cost is null or p_cost <= 0 then raise exception 'cost must be positive'; end if;
  if coalesce(p_ref, '') = '' then raise exception 'a debit needs a ref'; end if;
  -- One spender per wallet at a time.
  perform pg_advisory_xact_lock(hashtextextended('portal_credit:' || p_client::text, 0));
  if exists (select 1 from public.portal_credit_ledger where ref = p_ref) then
    select coalesce(sum(delta), 0) into v_balance from public.portal_credit_ledger where client_id = p_client;
    return v_balance;
  end if;
  select coalesce(sum(delta), 0) into v_balance from public.portal_credit_ledger where client_id = p_client;
  if v_balance < p_cost then
    raise exception 'insufficient_credits' using detail = format('balance %s, cost %s', v_balance, p_cost);
  end if;
  insert into public.portal_credit_ledger (client_id, delta, reason, ref, note, created_by)
  values (p_client, -p_cost, 'submission', p_ref, p_note, p_by);
  return v_balance - p_cost;
end $$;
revoke all on function public.portal_credit_spend(uuid, int, text, text, text) from public, anon, authenticated;
grant execute on function public.portal_credit_spend(uuid, int, text, text, text) to service_role;

notify pgrst, 'reload schema';

-- TO UNDO: drop function if exists public.portal_credit_spend(uuid, int, text, text, text);
--   drop table if exists public.portal_submissions;
