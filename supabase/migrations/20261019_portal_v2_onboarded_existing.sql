-- Portal v2: every client who existed before onboarding shipped counts as
-- onboarded (Hiram, 2026-10-19), so none of them is walked through it again or
-- gets a second AssetsLab queued. Only accounts created from now on start with
-- onboarding_completed_at null.
update public.portal_clients set onboarding_completed_at = now()
where onboarding_completed_at is null and created_at < '2026-10-19T12:00:00Z';
-- TO UNDO: nothing to undo safely; it only stamps a date.
