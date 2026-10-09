'use client';

import { useCallback, useRef, useState } from 'react';
import { usePortal } from '@/lib/portal-data';
import { PageHeader, Card, EmptyState } from '@/components/portal/Shared';

export default function IntakePage() {
  const { loading, client, intakeItems, answers, setAnswer, accessToken } = usePortal();
  const [saving, setSaving] = useState<Record<string, 'saving' | 'saved' | 'error'>>({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Debounced autosave. A long form must never lose work to a mistimed click.
  const save = useCallback(
    (itemId: string, value: string) => {
      setAnswer(itemId, value);
      clearTimeout(timers.current[itemId]);
      timers.current[itemId] = setTimeout(async () => {
        setSaving((s) => ({ ...s, [itemId]: 'saving' }));
        try {
          const res = await fetch('/api/portal/intake', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken ?? ''}`,
            },
            body: JSON.stringify({ itemId, value }),
          });
          if (!res.ok) throw new Error('save failed');
          setSaving((s) => ({ ...s, [itemId]: 'saved' }));
        } catch {
          setSaving((s) => ({ ...s, [itemId]: 'error' }));
        }
      }, 700);
    },
    [accessToken, setAnswer],
  );

  if (loading) return <p className="text-p-ink/70 text-base">Loading...</p>;

  if (!client || intakeItems.length === 0) {
    return (
      <>
        <PageHeader title="Intake" />
        <EmptyState
          title="No intake open"
          body="When we need information from you to move a build forward, the questions appear here."
        />
      </>
    );
  }

  const sections = Array.from(new Set(intakeItems.map((i) => i.section)));
  const answered = intakeItems.filter((i) => (answers[i.id] ?? '').trim()).length;
  const requiredLeft = intakeItems.filter(
    (i) => i.required && !(answers[i.id] ?? '').trim(),
  ).length;

  async function submit() {
    setError(null);
    try {
      const res = await fetch('/api/portal/intake', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken ?? ''}`,
        },
        body: JSON.stringify({ submit: true }),
      });
      if (!res.ok) throw new Error('submit failed');
      setSubmitted(true);
    } catch {
      setError('Could not submit. Your answers are saved; try again in a moment.');
    }
  }

  return (
    <>
      <PageHeader
        title="Intake"
        subtitle="Answers save as you type. Leave and come back whenever you like."
      />

      <Card className="sticky top-0 z-10 mb-8 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-base text-p-ink">
            {answered} of {intakeItems.length} answered
            {requiredLeft > 0 && (
              <span className="text-p-ink/70"> · {requiredLeft} required left</span>
            )}
          </p>
          <button
            onClick={submit}
            disabled={submitted}
            className="rounded-full bg-p-brand px-5 py-2.5 text-[16px] font-semibold text-black transition hover:bg-p-brand/90 disabled:opacity-50"
          >
            {submitted ? 'Sent to PodLab' : 'Submit intake'}
          </button>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-p-ink/10">
          <div
            className="h-full bg-p-brand transition-[width] duration-500"
            style={{ width: `${(answered / intakeItems.length) * 100}%` }}
          />
        </div>
        {error && <p className="mt-3 text-sm text-p-bad">{error}</p>}
      </Card>

      <div className="space-y-10">
        {sections.map((section) => (
          <section key={section}>
            <h2 className="font-display mb-4 text-base uppercase tracking-wider text-p-brandink">
              {section}
            </h2>
            <div className="space-y-4">
              {intakeItems
                .filter((i) => i.section === section)
                .map((item) => {
                  const value = answers[item.id] ?? '';
                  const state = saving[item.id];
                  return (
                    <Card key={item.id} className="p-5">
                      <label htmlFor={item.id} className="block">
                        <span className="text-[17px] font-medium text-p-ink">
                          {item.prompt}
                          {item.required && <span className="text-p-brandink"> *</span>}
                        </span>
                        {item.help && (
                          <span className="mt-1.5 block text-[16px] leading-relaxed text-p-ink/70">
                            {item.help}
                          </span>
                        )}
                      </label>

                      {item.kind === 'choice' && item.options ? (
                        <div className="mt-4 space-y-2">
                          {item.options.map((opt) => (
                            <button
                              key={opt}
                              onClick={() => save(item.id, opt)}
                              className={`block w-full rounded-xl border px-4 py-3 text-left text-[16px] transition ${
                                value === opt
                                  ? 'border-p-brandink/40 bg-p-brand/10 text-p-ink'
                                  : 'border-p-ink/10 text-p-ink/80 hover:border-p-ink/25'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      ) : item.kind === 'text' ? (
                        <input
                          id={item.id}
                          value={value}
                          onChange={(e) => save(item.id, e.target.value)}
                          className="mt-4 w-full rounded-xl border border-p-ink/10 bg-p-card px-4 py-3 text-[16px] text-p-ink placeholder:text-p-ink/50 focus:border-p-brandink/40 focus:outline-none"
                          placeholder="Your answer"
                        />
                      ) : (
                        <textarea
                          id={item.id}
                          rows={4}
                          value={value}
                          onChange={(e) => save(item.id, e.target.value)}
                          className="mt-4 w-full resize-y rounded-xl border border-p-ink/10 bg-p-card px-4 py-3 text-[16px] leading-relaxed text-p-ink placeholder:text-p-ink/50 focus:border-p-brandink/40 focus:outline-none"
                          placeholder="Rough and honest beats considered and late."
                        />
                      )}

                      <p className="mt-2 h-4 text-[14px] text-p-ink/65">
                        {state === 'saving' && 'Saving...'}
                        {state === 'saved' && 'Saved'}
                        {state === 'error' && (
                          <span className="text-p-bad">Not saved. Check your connection.</span>
                        )}
                      </p>
                    </Card>
                  );
                })}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
