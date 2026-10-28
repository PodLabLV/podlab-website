// Beaker page helpers (lib/portal/beaker-share.ts): the referral track, the
// share links, quick-refer parsing, the next points goal and the get-paid count.
//
//   npm run test:beaker

import assert from 'node:assert/strict';
import { test as t } from 'node:test';
import {
  trackStep, referralStep, shortName, shareText, smsHref, mailtoHref, primaryLink,
  contactField, nextGoal, lockedText, payoutSetup,
} from '@/lib/portal/beaker-share';



t("stages map onto Sent / Applied / Filmed / Bought", () => {
  assert.equal(trackStep("NEW LEAD"), 0);
  assert.equal(trackStep("VSL-INVITED"), 0);
  assert.equal(trackStep(null), 0);
  assert.equal(trackStep("S0-APPLIED"), 1);
  assert.equal(trackStep("s2-booked"), 1);
  assert.equal(trackStep("DISCOVERY CALL BOOKED"), 1);
  assert.equal(trackStep("S6-FILMED"), 2);
  assert.equal(trackStep("S7-FINISH"), 2);
  assert.equal(trackStep("SHOT PODCAST"), 2);
  assert.equal(trackStep("CLOSED-WON"), 3);
  assert.equal(trackStep("CLOSED WON"), 3);
  assert.equal(trackStep("NEW LEAD", 5000), 3, "any commission means they bought");
});

t("points events move a lagging card forward, never back", () => {
  const recent: Array<{ name: string; kind: "filmed" | "bought" }> = [{ name: "Ashley H.", kind: "filmed" }, { name: "Bo", kind: "bought" }];
  assert.equal(referralStep({ name: "Ashley Hall — Flame Ent", stage: "S0-APPLIED" }, recent), 2);
  assert.equal(referralStep({ name: "Bo", stage: "NEW LEAD" }, recent), 3);
  assert.equal(referralStep({ name: "Ashley Hall", stage: "CLOSED-WON" }, recent), 3);
  assert.equal(referralStep({ name: "Cal Ray", stage: "NEW LEAD" }, recent), 0);
  assert.equal(shortName("ashley  hall"), "ashley H.");
  assert.equal(shortName(""), "Someone you sent");
});

t("share links carry the link and the disclosure", () => {
  const url = "https://podlablv.com/diagnostic?ref=BK-1";
  assert.match(shareText(url), /BK-1/);
  assert.match(shareText(url), /referral fee/);
  assert.ok(smsHref(url).startsWith("sms:?&body="));
  assert.ok(decodeURIComponent(smsHref(url)).includes(url));
  const m = mailtoHref(url, "Dana");
  assert.ok(m.startsWith("mailto:?subject=Worth%205%20minutes&body="));
  assert.ok(decodeURIComponent(m).endsWith("\n\nDana"));
  assert.ok(!/[—–]/.test(shareText(url) + decodeURIComponent(m)), "no dashes in share copy");
});

t("primary link prefers the Diagnostic", () => {
  assert.equal(primaryLink([{ label: "Homepage", url: "a" }, { label: "Free Business Diagnostic", url: "b" }]), "b");
  assert.equal(primaryLink([{ label: "Homepage", url: "a" }]), "a");
  assert.equal(primaryLink([]), null);
});

t("one contact box splits into email or phone", () => {
  assert.deepEqual(contactField(" a@b.co "), { email: "a@b.co", phone: "" });
  assert.deepEqual(contactField("702 555 0100"), { email: "", phone: "702 555 0100" });
});

const rewards = [
  { key: "edit", label: "Free Standard Edit", points: 3, ok: false },
  { key: "lead_magnet", label: "Free lead magnet", points: 3, ok: false },
  { key: "session", label: "Free second studio session", points: 6, ok: false },
  { key: "funnel", label: "Free funnel", points: 12, ok: false },
];

t("next goal is the cheapest reward still out of reach", () => {
  assert.deepEqual(nextGoal({ balance: 1, buyers: 0, funnelLockedUntil: null, rewards }), { label: "Free Standard Edit", points: 3, toGo: 2, pct: 1 / 3 });
  assert.equal(nextGoal({ balance: 4, buyers: 0, funnelLockedUntil: null, rewards })!.label, "Free second studio session");
  assert.equal(nextGoal({ balance: 12, buyers: 0, funnelLockedUntil: null, rewards }), null);
  assert.equal(nextGoal({ balance: 0, buyers: 0, funnelLockedUntil: null, rewards })!.pct, 0);
});

t("locked badges say what is missing", () => {
  const p = { balance: 2, buyers: 1, funnelLockedUntil: null, rewards };
  assert.equal(lockedText(rewards[0], p), "1 more point");
  assert.equal(lockedText(rewards[2], p), "4 more points");
  assert.equal(lockedText(rewards[3], { ...p, balance: 12 }), "1 more buyer");
  assert.equal(lockedText(rewards[3], { ...p, balance: 12, buyers: 0 }), "2 more buyers");
  assert.equal(lockedText(rewards[3], { ...p, balance: 12, buyers: 2, funnelLockedUntil: "2027-03-01T00:00:00Z" }), "Again Mar 1, 2027");
});

t("get-paid checklist counts agreement, W-9 and Whop", () => {
  assert.equal(payoutSetup({ termsCurrent: false, w9: "missing", whopLinked: false }).done, 0);
  const s = payoutSetup({ termsCurrent: true, w9: "received", whopLinked: false });
  assert.equal(s.done, 2); assert.equal(s.total, 3); assert.equal(s.complete, false);
  assert.equal(payoutSetup({ termsCurrent: true, w9: "verified", whopLinked: true }).complete, true);
});


