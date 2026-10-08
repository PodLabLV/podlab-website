-- PodLab Portal — video chapters on deliverable versions (Hiram, 2026-10-07)
-- Run AFTER 20261008_portal_scripts_deliverables.sql.
--
-- Chapters are [{ "t": seconds, "title": text }], written by staff in the same
-- "0:00 Hook" lines YouTube reads from a description. Clients jump by chapter
-- and pin revision notes to a moment (portal_asset_comments.time_seconds); the
-- chapter of a note is derived from its time, so re-chaptering orphans nothing.
-- Production cards on the CRM boards keep their chapters in the card description.

alter table public.portal_asset_versions
  add column if not exists chapters jsonb not null default '[]'::jsonb;
