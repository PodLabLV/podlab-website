-- PodLab Portal — link existing CRM content boards to their portal clients.
-- Run AFTER 20261008b_portal_production.sql. Matched by board name (2026-10-07);
-- check the pairs before running. Re-running is harmless.
--
--   Zohar Global Security      -> Zohar Global Security
--   Parowan Gap Dog Sancuary   -> Zohar Lahav - Parowan Gap Dog Rescue & Sanctuary
--   101 PLus                   -> Uday Akkaraju - 101 plus
--   Loren Clips / Q and A / Tracker -> True Legacy Collective (Loren Lahav)
--
-- Not linked: the Power Of Influence boards (John Haremza's team watches them in
-- the CRM today; POI has no portal client yet) and PodLab's own shows.

insert into public.portal_client_boards (client_id, board_id, linked_by) values
  ('57df84d7-a953-41f1-b9ee-3a855db919a3', '18306d9b-2197-4a83-ae1a-17f3f8971130', 'migration 20261008c'),
  ('7c7df08e-2e06-4804-b375-982615d3c4b4', 'fa22fb56-312d-47fe-b7b1-685725072ca1', 'migration 20261008c'),
  ('a56e9edc-d9b5-4b1c-9425-be8a7ef7000d', '41379ec2-f6ca-4f7f-9b47-6ed729265656', 'migration 20261008c'),
  ('38bb88e3-010b-419b-8939-e2c172c04b0b', 'e0c2ace1-72ba-4001-8c84-180bda5346ad', 'migration 20261008c'),
  ('38bb88e3-010b-419b-8939-e2c172c04b0b', 'a9c3259f-84f3-4849-8445-ad7319453fa9', 'migration 20261008c'),
  ('38bb88e3-010b-419b-8939-e2c172c04b0b', 'cee56979-881f-4f87-b2f1-c9e5550946e6', 'migration 20261008c')
on conflict (client_id, board_id) do nothing;
