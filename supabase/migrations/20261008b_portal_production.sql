-- PodLab Portal — Production (Hiram, 2026-10-07)
--
-- Which CRM content boards belong to which portal client, so the portal can show
-- a client their videos moving through the editors' columns (crm.content_cards)
-- and file revision notes onto the cards. The boards stay the editors' system of
-- record; the portal only reads them and adds comments, through server routes
-- holding the service role.
--
-- A link table rather than a column on crm.content_boards: one client can have
-- several boards (clips, podcast, trailers), and the portal schema should not
-- reach into the CRM's tables to add columns.

create table if not exists public.portal_client_boards (
  client_id  uuid not null references public.portal_clients(id) on delete cascade,
  board_id   uuid not null references crm.content_boards(id) on delete cascade,
  linked_by  text,
  created_at timestamptz default now(),
  primary key (client_id, board_id)
);

create index if not exists portal_client_boards_board_idx on public.portal_client_boards(board_id);

-- Clients may see which boards are theirs; the cards themselves are read
-- server-side, since crm.* has no client-facing policies.
alter table public.portal_client_boards enable row level security;
drop policy if exists own_rows on public.portal_client_boards;
create policy own_rows on public.portal_client_boards for select to authenticated
  using (client_id in (select id from public.portal_clients where user_id = auth.uid()));
grant select on public.portal_client_boards to authenticated;
grant all on public.portal_client_boards to service_role;
revoke all on public.portal_client_boards from anon;
