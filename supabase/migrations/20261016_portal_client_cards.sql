-- PodLab Portal — share single CRM cards with a client (Hiram, 2026-10-09)
--
-- A client normally sees whole boards (portal_client_boards). A podcast guest's
-- clips live on the show's shared boards (Deal Flow Radio, Power of Influence),
-- next to every other guest's, so linking the board would show them everyone's.
-- This shares individual cards instead: they appear on the client's Production
-- page, take notes and "Looks good", stream inline and count for Hot Potato,
-- exactly like cards on a linked board.
--
-- Server routes read and write it with the service role; clients never read
-- it directly. Additive and idempotent: safe to run twice.

create table if not exists public.portal_client_cards (
  client_id  uuid not null references public.portal_clients(id) on delete cascade,
  card_id    uuid not null,              -- crm.content_cards.id
  linked_by  text,
  created_at timestamptz default now(),
  primary key (client_id, card_id)
);

create index if not exists portal_client_cards_card_idx on public.portal_client_cards(card_id);

alter table public.portal_client_cards enable row level security;
grant all on public.portal_client_cards to service_role;
revoke all on public.portal_client_cards from anon, authenticated;
