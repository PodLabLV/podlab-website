-- PodLab Portal — invites (Hiram, 2026-10-07)
-- When a client was last sent a portal access link, and by whom. The login
-- itself is portal_clients.user_id, set when the invite is created.

alter table public.portal_clients
  add column if not exists invited_at timestamptz,
  add column if not exists invited_by text;
