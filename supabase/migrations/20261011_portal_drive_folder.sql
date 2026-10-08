-- PodLab Portal — each client's folder in the PodLab OS Shared Drive (Hiram, 2026-10-08)
-- Staff-only: shown and edited on /portal/clients/[id]. Clients are not given the
-- link, since Shared Drive folders aren't shared with them.

alter table public.portal_clients add column if not exists drive_folder_url text;

-- PodLab OS → 08- Clients → <client>, created 2026-10-08. Fill-only: never
-- overwrites a link staff have since changed.
update public.portal_clients c set drive_folder_url = v.url
from (values
  ('d87e89ed-aad7-401d-9f6c-eb0cef552c4f'::uuid, 'https://drive.google.com/drive/folders/1KIGdnIsLADohoSXuGAF196ewcd00Z2KT'), -- Sharlene Ruiz / The Collected View
  ('38bb88e3-010b-419b-8939-e2c172c04b0b'::uuid, 'https://drive.google.com/drive/folders/1oBZGhIcO0X2PksWo09d58v-iGCD-iG4V'), -- Loren Lahav / True Legacy Collective
  ('a56e9edc-d9b5-4b1c-9425-be8a7ef7000d'::uuid, 'https://drive.google.com/drive/folders/1IxH9cGbY-WOL0uouEcAVcwksargu6nJD'), -- Uday Akkaraju / 101 plus
  ('57df84d7-a953-41f1-b9ee-3a855db919a3'::uuid, 'https://drive.google.com/drive/folders/1WwHK3ekNU50CoUANimIs9ZT4qN2EuAlm'), -- Zohar Global Security
  ('7c7df08e-2e06-4804-b375-982615d3c4b4'::uuid, 'https://drive.google.com/drive/folders/1eGLQl2eSMZgJ2ve6k0Q7V6rmNKDRKaO-'), -- Zohar Lahav / Parowan Gap Dog Rescue
  ('f6f04004-6fff-4239-a1f8-f0ddefdaaf56'::uuid, 'https://drive.google.com/drive/folders/1O5rUpYA8VDY8-V2makmbBSlPBLiYH6EP'), -- John Garbino / Bluehili
  ('f598c349-ee69-4676-8db2-584c9d995b99'::uuid, 'https://drive.google.com/drive/folders/1TmNmT2LPQ2W3rcMVtfM4QCVbpJWaDf5B')  -- Aoife Roche
) as v(id, url)
where c.id = v.id and c.drive_folder_url is null;
