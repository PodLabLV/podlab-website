-- ============================================================
-- Beaker affiliate agreements — signing evidence + PDF archive
--
-- Adds what an executed click-wrap needs to survive a dispute: the version of
-- the text that was actually shown, proof the signer consented to transact
-- electronically, and the network/browser fingerprint at the moment of signing.
-- Also lands the SMS consent record the affiliate form has been collecting
-- since the A2P 10DLC pass but the API route was silently dropping.
--
-- Safe + additive. Every statement is idempotent — re-running changes nothing.
-- ============================================================

-- ── 1. Signing evidence ──────────────────────────────────────────────
-- Nullable on purpose: rows signed before this migration have no evidence to
-- backfill, and inventing values for them would be worse than leaving them null.
alter table public.beaker_applications
  add column if not exists agreement_version   text,
  add column if not exists electronic_consent  boolean not null default false,
  add column if not exists signed_ip           text,
  add column if not exists signed_user_agent   text,
  add column if not exists agreement_pdf_path  text;

comment on column public.beaker_applications.agreement_version is
  'AGREEMENT_VERSION from lib/affiliate-terms.ts at signing. Identifies which text was executed.';
comment on column public.beaker_applications.electronic_consent is
  'ESIGN/UETA consent to transact electronically, captured as its own affirmative act.';
comment on column public.beaker_applications.agreement_pdf_path is
  'Object path inside the affiliate-agreements bucket. Never a public URL.';

-- ── 2. SMS consent (A2P 10DLC) ───────────────────────────────────────
-- Same three-column shape the other six forms write, so a carrier audit reads
-- one pattern instead of seven.
alter table public.beaker_applications
  add column if not exists sms_consent         boolean not null default false,
  add column if not exists sms_consent_at      timestamptz,
  add column if not exists sms_consent_source  text;

-- ── 3. Lookups ───────────────────────────────────────────────────────
-- The API updates evidence by (beaker_id, email) immediately after insert.
create index if not exists beaker_applications_beaker_id_idx
  on public.beaker_applications (beaker_id);
create index if not exists beaker_applications_email_idx
  on public.beaker_applications (lower(email));

-- ── 4. Private bucket for executed contracts ─────────────────────────
-- public = false: these carry legal names, home addresses, and payout details.
-- The app hands out short-lived signed URLs; nothing here is ever guessable.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'affiliate-agreements',
  'affiliate-agreements',
  false,
  10485760,                      -- 10 MB ceiling; a real agreement is ~60 KB
  array['application/pdf']
)
on conflict (id) do update
  set public             = false,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- No RLS policies are granted to anon or authenticated on this bucket. Access
-- is service-role only (the API route) plus signed URLs it mints. Adding a
-- read policy here would quietly make every affiliate's address readable by any
-- logged-in user of the site.
