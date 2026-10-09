-- PodLab Portal — Content plan (Hiram, 2026-10-08)
--
-- The client's content calendar: what goes out when, in what format, and what
-- each piece is for. A piece moves planned → scripted → recorded → in edit →
-- posted. It only becomes a CRM card (editing work) once it's recorded and
-- staff send it to the editors, so ideas never clutter the editors' boards.
--
-- Clients read their own rows through RLS and never write; TipTop and staff
-- write through server routes. Additive and idempotent: safe to run twice.

create table if not exists public.portal_content_plan (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.portal_clients(id) on delete cascade,
  publish_on   date not null,
  pillar       text not null,              -- their content pillar, e.g. "The whole picture"
  format       text not null check (format in ('short', 'hook', 'faq', 'authority', 'story', 'ad', 'long', 'carousel', 'email')),
  title        text not null,
  hook         text,                       -- the first line
  job          text not null check (job in ('attract', 'educate', 'convert', 'retain')),
  cta          text,
  status       text not null default 'planned' check (status in ('planned', 'scripted', 'recorded', 'in edit', 'posted', 'skipped')),
  script_id    uuid references public.portal_scripts(id) on delete set null,
  crm_card_id  uuid,                       -- crm.content_cards, once sent to the editors
  notes        text,
  created_by   text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create index if not exists portal_content_plan_client_idx on public.portal_content_plan(client_id, publish_on);

alter table public.portal_content_plan enable row level security;
drop policy if exists own_rows on public.portal_content_plan;
create policy own_rows on public.portal_content_plan for select to authenticated
  using (client_id in (select id from public.portal_clients where user_id = auth.uid()));
grant select on public.portal_content_plan to authenticated;
grant all on public.portal_content_plan to service_role;
revoke all on public.portal_content_plan from anon;
