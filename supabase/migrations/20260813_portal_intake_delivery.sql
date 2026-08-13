-- Portal: client intake + delivery tracker, provisioned from the CRM on a won deal.
--
-- Three moving parts:
--   1. intake  - a per-client questionnaire the client fills in, autosaved
--   2. delivery - phases and tasks the team works through, visible to the client
--   3. a trigger on crm.leads that seeds both when a lead is marked WON
--
-- Clients stay read-only everywhere. Intake answers and delivery updates both go
-- through server routes holding the service role, which is also where Slack and
-- the CRM timeline get written.

-- ----------------------------------------------------------------- staff
-- Who is allowed to edit delivery. Checked server-side only; never trusted from
-- the browser.
create table if not exists public.portal_staff (
  email      text primary key,
  name       text,
  created_at timestamptz default now()
);

insert into public.portal_staff (email, name) values
  ('info@podlablv.com', 'Hiram Andino')
on conflict (email) do nothing;

-- ----------------------------------------------------------------- intake
create table if not exists public.portal_intake_items (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.portal_clients(id) on delete cascade,
  section     text not null,
  prompt      text not null,
  help        text,
  kind        text not null default 'longtext',  -- text | longtext | choice | url
  options     jsonb,                             -- choice options
  required    boolean default false,
  sort_order  int default 0,
  created_at  timestamptz default now()
);

create table if not exists public.portal_intake_answers (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references public.portal_clients(id) on delete cascade,
  item_id    uuid not null references public.portal_intake_items(id) on delete cascade,
  value      text,
  updated_at timestamptz default now(),
  unique (item_id)
);

-- ---------------------------------------------------------------- delivery
create table if not exists public.portal_delivery_phases (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.portal_clients(id) on delete cascade,
  title       text not null,
  detail      text,
  status      text not null default 'not started', -- not started | in progress | blocked | done
  owner       text,
  due_label   text,
  sort_order  int default 0,
  updated_at  timestamptz default now(),
  created_at  timestamptz default now()
);

create table if not exists public.portal_delivery_tasks (
  id         uuid primary key default gen_random_uuid(),
  phase_id   uuid not null references public.portal_delivery_phases(id) on delete cascade,
  client_id  uuid not null references public.portal_clients(id) on delete cascade,
  title      text not null,
  status     text not null default 'not started',
  owner      text,                                -- 'PodLab' | 'Client'
  sort_order int default 0,
  updated_at timestamptz default now()
);

-- Phase templates per product, so a won deal seeds a real plan instead of a blank tab.
create table if not exists public.portal_delivery_templates (
  id         uuid primary key default gen_random_uuid(),
  product    text not null,
  title      text not null,
  detail     text,
  owner      text,
  due_label  text,
  sort_order int default 0
);

insert into public.portal_delivery_templates (product, title, detail, owner, due_label, sort_order)
select * from (values
  ('EssentialsLab', 'Kickoff and intake',
   'Intake completed, asset folder filled, compliance confirmed. Nothing else starts until this closes.',
   'Client', 'Week 1', 1),
  ('EssentialsLab', 'Brand assets',
   'Palette, typography, logo system and social templates. Two rounds of iteration.',
   'PodLab', 'Week 1-2', 2),
  ('EssentialsLab', 'Landing page build',
   'The site built and staged for review, with the assessment wired to capture.',
   'PodLab', 'Week 2-3', 3),
  ('EssentialsLab', 'Studio day',
   'Founder video, video sales letter and FAQ films. One filming block, roughly eight hours.',
   'Both', 'Week 3', 4),
  ('EssentialsLab', 'Ads and launch',
   'Five ads cut and pointed at the page. Domain live, tracking on, launch confirmed.',
   'PodLab', 'Week 4', 5)
) as t(product, title, detail, owner, due_label, sort_order)
where not exists (select 1 from public.portal_delivery_templates where product = 'EssentialsLab');

create index if not exists portal_intake_items_client_idx    on public.portal_intake_items(client_id);
create index if not exists portal_intake_answers_client_idx  on public.portal_intake_answers(client_id);
create index if not exists portal_delivery_phases_client_idx on public.portal_delivery_phases(client_id);
create index if not exists portal_delivery_tasks_client_idx  on public.portal_delivery_tasks(client_id);

-- -------------------------------------------------------------------- RLS
do $$
declare t text;
begin
  foreach t in array array['intake_items','intake_answers','delivery_phases','delivery_tasks']
  loop
    execute format('alter table public.portal_%I enable row level security', t);
    execute format('drop policy if exists own_rows on public.portal_%I', t);
    execute format(
      'create policy own_rows on public.portal_%I for select to authenticated '
      'using (client_id in (select id from public.portal_clients where user_id = auth.uid()))', t);
    execute format('grant select on public.portal_%I to authenticated', t);
    execute format('grant all on public.portal_%I to service_role', t);
    execute format('revoke all on public.portal_%I from anon', t);
  end loop;
end $$;

alter table public.portal_staff enable row level security;
alter table public.portal_delivery_templates enable row level security;
grant all on public.portal_staff to service_role;
grant all on public.portal_delivery_templates to service_role;
revoke all on public.portal_staff from anon, authenticated;
revoke all on public.portal_delivery_templates from anon, authenticated;

-- ------------------------------------------------- CRM won -> delivery seed
-- When a lead reaches CLOSED WON, make sure a portal client exists with a real
-- delivery plan. 'CLOSED WON' and the insert-or-update guard match the existing
-- crm.on_lead_won() convention exactly; do not diverge from it.
--
-- The auth user is NOT created here. Supabase auth users can only be made through
-- the admin API, so the row is parked without a user_id and the team provisions
-- the login separately. That is deliberate, not a gap.
create or replace function public.portal_seed_from_won_lead()
returns trigger
language plpgsql
security definer
set search_path = public, crm
as $$
declare
  v_client_id uuid;
  v_product   text := coalesce(nullif(new.products[1], ''), 'EssentialsLab');
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

  return new;
end $$;

drop trigger if exists trg_portal_seed_from_won on crm.leads;
create trigger trg_portal_seed_from_won
  after insert or update of stage on crm.leads
  for each row execute function public.portal_seed_from_won_lead();
