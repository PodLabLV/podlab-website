'use client'

// The A2P 10DLC opt-in checkbox.
//
// One component, used by every form on this site that collects a phone number,
// because the disclosure is the thing carriers actually read and six hand-typed
// copies of it would drift. The wording matches the PodLab CRM's apply form
// (podlab-crm/src/components/ApplyForm.tsx) verbatim — the registered campaign
// quotes this text, so changing it here means amending the campaign.
//
// Three rules that are not style choices:
//   1. It starts UNCHECKED. A pre-ticked box is not consent.
//   2. It is never `required`. Consent cannot be a condition of submitting the
//      form or of buying anything, and saying so out loud is part of the
//      disclosure.
//   3. The whole disclosure ships with it. Trimming it to "I agree to texts"
//      makes the resulting consent record worthless.

interface SmsConsentProps {
  checked: boolean
  onChange: (checked: boolean) => void
  /** Set when more than one instance can appear on a page. */
  id?: string
}

export default function SmsConsent({ checked, onChange, id = 'sms-consent' }: SmsConsentProps) {
  return (
    <label
      htmlFor={id}
      className="flex items-start gap-3 cursor-pointer text-text-tertiary text-xs leading-relaxed"
    >
      <input
        type="checkbox"
        id={id}
        name="sms_consent"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-accent cursor-pointer"
      />
      <span>
        I agree to receive text messages from PodLab LV at the number provided,
        including appointment reminders and follow-up about my inquiry. Consent is
        not a condition of purchase. Msg &amp; data rates may apply. Msg frequency
        varies. Reply STOP to opt out, HELP for help. See our{' '}
        <a href="/privacy" className="underline hover:text-accent">Privacy Policy</a> and{' '}
        <a href="/terms" className="underline hover:text-accent">Terms</a>.
      </span>
    </label>
  )
}
