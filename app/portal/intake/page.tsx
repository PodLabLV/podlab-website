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

  if (loading) return <p className="text-white/40 text-sm">Loading...</p>;

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
          <p className="text-sm text-white">
            {answered} of {intakeItems.length} answered
            {requiredLeft > 0 && (
              <span className="text-white/40"> · {requiredLeft} required left</span>
            )}
          </p>
          <button
            onClick={submit}
            disabled={submitted}
            className="rounded-full bg-[#2ADD1B] px-5 py-2.5 text-[13px] font-semibold text-black transition hover:bg-[#2ADD1B]/90 disabled:opacity-50"
          >
            {submitted ? 'Sent to PodLab' : 'Submit intake'}
          </button>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-[#2ADD1B] transition-[width] duration-500"
            style={{ width: `${(answered / intakeItems.length) * 100}%` }}
          />
        </div>
        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
      </Card>

      <div className="space-y-10">
        {sections.map((section) => (
          <section key={section}>
            <h2 className="font-display mb-4 text-sm uppercase tracking-wider text-[#2ADD1B]">
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
                        <span className="text-[14.5px] font-medium text-white">
                          {item.prompt}
                          {item.required && <span className="text-[#2ADD1B]"> *</span>}
                        </span>
                        {item.help && (
                          <span className="mt-1.5 block text-[13px] leading-relaxed text-white/45">
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
                              className={`block w-full rounded-xl border px-4 py-3 text-left text-[13px] transition ${
                                value === opt
                                  ? 'border-[#2ADD1B]/40 bg-[#2ADD1B]/10 text-white'
                                  : 'border-white/10 text-white/60 hover:border-white/25'
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
                          className="mt-4 w-full rounded-xl border border-white/10 bg-[#0F0F0F] px-4 py-3 text-[14px] text-white placeholder:text-white/25 focus:border-[#2ADD1B]/40 focus:outline-none"
                          placeholder="Your answer"
                        />
                      ) : (
                        <textarea
                          id={item.id}
                          rows={4}
                          value={value}
                          onChange={(e) => save(item.id, e.target.value)}
                          className="mt-4 w-full resize-y rounded-xl border border-white/10 bg-[#0F0F0F] px-4 py-3 text-[14px] leading-relaxed text-white placeholder:text-white/25 focus:border-[#2ADD1B]/40 focus:outline-none"
                          placeholder="Rough and honest beats considered and late."
                        />
                      )}

                      <p className="mt-2 h-4 text-[11px] text-white/30">
                        {state === 'saving' && 'Saving...'}
                        {state === 'saved' && 'Saved'}
                        {state === 'error' && (
                          <span className="text-red-400">Not saved. Check your connection.</span>
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
