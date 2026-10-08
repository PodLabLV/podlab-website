-- PodLab Portal — tie a deliverable to the editor's CRM card (Hiram, 2026-10-07)
-- When a client sends notes on a video deliverable that has a card, the notes are
-- copied onto that card (tagged with time and chapter) and a card already past
-- review goes back to Revising, the same as notes left on the Production page.

alter table public.portal_assets
  add column if not exists crm_card_id uuid references crm.content_cards(id) on delete set null;

create index if not exists portal_assets_crm_card_idx on public.portal_assets(crm_card_id);
