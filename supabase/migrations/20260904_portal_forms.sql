-- ============================================================
-- Portal Phase 4 — Forms
--
-- Today a "form" means one of three unrelated things: portal_intake_items
-- (client-scoped questions in the portal), the six public marketing routes that
-- each hand-roll a write to public.clients + public.leads, and the Typeform
-- webhook. Asking "where did this client stop" means three queries and a guess.
--
-- This adds one engine:
--   portal_forms             the definition        (form_key)
--   portal_form_fields       its questions
--   portal_form_submissions  one per person per form, WITH a status
--   portal_form_answers      the values
--
-- MODELLING NOTE — this is a real change of shape, not a rename.
-- portal_intake_items is per-CLIENT: 25 rows that belong to one client. Fields
-- here are per-FORM and shared, with the per-person data living on the
-- submission. That is the right model (one definition, many respondents) and it
-- is why the migration below dedupes by (section, prompt) rather than copying
-- rows straight across.
--
-- The old intake tables are LEFT IN PLACE and still readable. Nothing that
-- selects from them breaks.
--
-- Run AFTER 20260831_portal_roles.sql and 20260831c_portal_realtime.sql.
-- Safe + additive. Every statement is idempotent.
-- ============================================================

-- ── 1. Definitions ───────────────────────────────────────────────────
create table if not exists public.portal_forms (
  id          uuid primary key default gen_random_uuid(),
  form_key    text not null unique,      -- client-intake | bottleneck | contact | ...
  title       text not null,
  description text,
  audience    text default 'client',     -- client | public
  active      boolean default true,
  created_at  timestamptz default now()
);

create table if not exists public.portal_form_fields (
  id         uuid primary key default gen_random_uuid(),
  form_id    uuid not null references public.portal_forms(id) on delete cascade,
  section    text,
  prompt     text not null,
  help       text,
  kind       text not null default 'longtext',  -- text | longtext | choice | url | number
  options    jsonb,
  required   boolean default false,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- ── 2. Submissions ───────────────────────────────────────────────────
-- The status column is the entire point of this phase: "sent" and "opened" are
-- the states that tell you a form is stuck, and no current table can express
-- either. crm_lead_id is nullable because a public submission arrives long
-- before anyone has a portal account.
create table if not exists public.portal_form_submissions (
  id           uuid primary key default gen_random_uuid(),
  form_id      uuid not null references public.portal_forms(id) on delete cascade,
  client_id    uuid references public.portal_clients(id) on delete cascade,
  crm_lead_id  uuid,
  email        text,
  name         text,
  status       text default 'in progress',  -- sent | opened | in progress | submitted | reviewed
  source       text,                        -- which route recorded it
  /* Whole payload as received. The public routes each collect a different
     shape, and losing that detail to fit a common schema would be worse than
     keeping it. Structured answers still land in portal_form_answers. */
  raw          jsonb,
  sent_at      timestamptz,
  opened_at    timestamptz,
  submitted_at timestamptz,
  reviewed_at  timestamptz,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create table if not exists public.portal_form_answers (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.portal_form_submissions(id) on delete cascade,
  field_id      uuid not null references public.portal_form_fields(id) on delete cascade,
  client_id     uuid references public.portal_clients(id) on delete cascade,
  value         text,
  updated_at    timestamptz default now(),
  unique (submission_id, field_id)
);

create index if not exists portal_form_fields_form_idx
  on public.portal_form_fields(form_id, sort_order);
create index if not exists portal_form_submissions_form_idx
  on public.portal_form_submissions(form_id, created_at desc);
create index if not exists portal_form_submissions_client_idx
  on public.portal_form_submissions(client_id);
create index if not exists portal_form_submissions_email_idx
  on public.portal_form_submissions(lower(email));
create index if not exists portal_form_answers_submission_idx
  on public.portal_form_answers(submission_id);

-- ── 3. Seed the known forms ──────────────────────────────────────────
-- form_key values match what the routes pass. Changing one here without
-- changing the route silently orphans every future submission.
insert into public.portal_forms (form_key, title, description, audience) values
  ('client-intake',           'Client Intake',                'What we need from you before the build starts.', 'client'),
  ('bottleneck',              'Founder Bottleneck Assessment', 'The public lead-magnet assessment.',            'public'),
  ('essentialslab',           'EssentialsLab Assessment',      'Qualification for the EssentialsLab build.',    'public'),
  ('assetslab-intake',        'AssetsLab Intake',              'Deep intake for the AssetsLab deliverable.',    'public'),
  ('contact',                 'Contact',                       'General enquiry from the site.',               'public'),
  ('affiliate-apply',         'Beaker Application',            'Affiliate programme application.',             'public'),
  ('podcast-apply',           'Podcast Application',           'Podcast guest application.',                   'public'),
  ('typeform',                'Typeform Intake',               'Submissions arriving via the Typeform webhook.','public')
on conflict (form_key) do nothing;

-- ── 4. Migrate the existing intake ───────────────────────────────────
-- 25 client-scoped rows become the shared field set for client-intake, deduped
-- on (section, prompt). Guarded so a re-run cannot double the questions.
insert into public.portal_form_fields (form_id, section, prompt, help, kind, options, required, sort_order)
select distinct on (i.section, i.prompt)
       f.id, i.section, i.prompt, i.help, i.kind, i.options, i.required, i.sort_order
from public.portal_intake_items i
cross join (select id from public.portal_forms where form_key = 'client-intake') f
where not exists (
  select 1 from public.portal_form_fields ff
  where ff.form_id = f.id and ff.prompt = i.prompt
    and ff.section is not distinct from i.section
)
order by i.section, i.prompt, i.sort_order;

-- Give every client that had intake items an open submission, so the portal has
-- somewhere to write their answers.
insert into public.portal_form_submissions (form_id, client_id, email, status, source)
select f.id, c.id, c.email, 'in progress', 'migration'
from public.portal_clients c
cross join (select id from public.portal_forms where form_key = 'client-intake') f
where exists (select 1 from public.portal_intake_items i where i.client_id = c.id)
  and not exists (
    select 1 from public.portal_form_submissions s
    where s.form_id = f.id and s.client_id = c.id
  );

-- Carry any answers across, matched by prompt text.
insert into public.portal_form_answers (submission_id, field_id, client_id, value)
select s.id, ff.id, a.client_id, a.value
from public.portal_intake_answers a
join public.portal_intake_items i on i.id = a.item_id
join public.portal_forms f        on f.form_key = 'client-intake'
join public.portal_form_fields ff on ff.form_id = f.id and ff.prompt = i.prompt
join public.portal_form_submissions s on s.form_id = f.id and s.client_id = a.client_id
on conflict (submission_id, field_id) do nothing;

-- ── 5. RLS ───────────────────────────────────────────────────────────
-- Definitions are readable by any signed-in user: a form's questions are not
-- secret, and the portal needs them to render. Submissions and answers are
-- scoped to the caller's own client, like everything else.
alter table public.portal_forms       enable row level security;
alter table public.portal_form_fields enable row level security;

drop policy if exists read_forms on public.portal_forms;
create policy read_forms on public.portal_forms
  for select to authenticated using (true);

drop policy if exists read_fields on public.portal_form_fields;
create policy read_fields on public.portal_form_fields
  for select to authenticated using (true);

grant select on public.portal_forms       to authenticated;
grant select on public.portal_form_fields to authenticated;
grant all    on public.portal_forms       to service_role;
grant all    on public.portal_form_fields to service_role;
revoke all   on public.portal_forms       from anon;
revoke all   on public.portal_form_fields from anon;

do $$
declare t text;
begin
  foreach t in array array['form_submissions','form_answers']
  loop
    execute format('alter table public.portal_%I enable row level security', t);
    execute format('drop policy if exists own_rows on public.portal_%I', t);
    execute format(
      'create policy own_rows on public.portal_%I for select to authenticated '
      'using (client_id in (select client_id from public.portal_client_users where user_id = auth.uid()))', t);
    execute format('grant select on public.portal_%I to authenticated', t);
    execute format('grant all    on public.portal_%I to service_role', t);
    execute format('revoke all   on public.portal_%I from anon', t);
  end loop;
end $$;

-- ── 6. Broadcast ─────────────────────────────────────────────────────
-- Answers only. Submissions carry a nullable client_id (public ones have none),
-- and portal_broadcast() returns early on a null, so attaching there would be
-- silent no-ops for exactly the rows that matter least.
drop trigger if exists trg_portal_broadcast on public.portal_form_answers;
create trigger trg_portal_broadcast
  after insert or update or delete on public.portal_form_answers
  for each row execute function public.portal_broadcast();
