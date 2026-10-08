-- PodLab Portal — Growth Chain (Hiram, 2026-10-07)
--
-- Where each client stands on the eight elements, and what they bought. An
-- element is Locked until a product that unlocks it is bought, Building while
-- it is being delivered, Unlocked once delivered. The product → element map
-- lives in lib/growth-chain.ts, not here, so a change is one code edit.
--
-- Purchases get their own table because crm.leads.products is empty for most
-- clients and portal_clients.plan_label is only the seed trigger's default.

create table if not exists public.portal_client_products (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.portal_clients(id) on delete cascade,
  product      text not null,                          -- catalog key, lib/growth-chain.ts PRODUCTS
  source       text not null default 'staff',          -- staff | whop | crm
  purchased_on date,
  note         text,
  created_at   timestamptz default now(),
  unique (client_id, product)
);

create table if not exists public.portal_client_elements (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references public.portal_clients(id) on delete cascade,
  element        text not null check (element in ('br','ds','tg','mk','ld','sl','nu','op','sc')),
  score          int check (score between 0 and 100),   -- the /diagnostic scoring, recomputed server-side
  answer         jsonb,                                  -- the raw answer that produced the score
  answered_at    timestamptz,
  delivered_at   timestamptz,                            -- staff: built and running
  state_override text check (state_override in ('locked','building','unlocked')),
  updated_at     timestamptz default now(),
  unique (client_id, element)
);

-- Phases say which element they build, so finishing them unlocks it on their own.
-- 'br' is the BrandLab foundation layer under the chain.
alter table public.portal_delivery_phases    add column if not exists elements text[] not null default '{}';
alter table public.portal_delivery_templates add column if not exists elements text[] not null default '{}';

update public.portal_delivery_templates set elements = case title
    when 'Brand assets'       then array['br']
    when 'Landing page build' then array['ds']
    when 'Studio day'         then array['sl']
    when 'Ads and launch'     then array['mk']
    else elements end
  where product = 'EssentialsLab';

update public.portal_delivery_phases p set elements = t.elements
  from public.portal_delivery_templates t
  where t.product = 'EssentialsLab' and p.title = t.title and p.elements = '{}';

-- The seed trigger copies the tags along with the phases. Based on the 20260813
-- body, the newest on main (production unverified from here); PR #21's 20260905 intake-form seed is not
-- applied anywhere and gets merged back in when its Forms module is ported.
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

  if not exists (select 1 from public.portal_delivery_phases where client_id = v_client_id) then
    insert into public.portal_delivery_phases (client_id, title, detail, owner, due_label, sort_order, elements)
    select v_client_id, t.title, t.detail, t.owner, t.due_label, t.sort_order, t.elements
    from public.portal_delivery_templates t
    where t.product = v_product
    order by t.sort_order;
  end if;

  return new;
end $$;

create index if not exists portal_client_products_client_idx on public.portal_client_products(client_id);
create index if not exists portal_client_elements_client_idx on public.portal_client_elements(client_id);

do $$
declare t text;
begin
  foreach t in array array['client_products','client_elements']
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
