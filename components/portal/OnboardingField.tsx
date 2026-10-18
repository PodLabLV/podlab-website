'use client';

import { useRef, useState } from 'react';
import { parseFileEntry, type OnboardingQuestion } from '@/lib/portal/onboarding-questions';

interface OnboardingFieldProps {
  q: OnboardingQuestion;
  value: string | string[] | undefined;
  prefilled?: boolean;
  missing?: boolean;
  onChange: (v: string | string[]) => void;
  /** Files questions: upload one file to the client's Drive; resolves to the answer's new list. */
  onUpload?: (q: OnboardingQuestion, file: File, onProgress: (pct: number) => void) => Promise<string[] | null>;
}

const inputCls =
  'mt-3 w-full border border-p-line bg-p-paper px-4 py-3 text-[16px] text-p-ink placeholder:text-p-ink/50 focus:border-p-brandink focus:outline-none';

/** One onboarding question: text, long text, url, single choice or multi-select chips. */
export default function OnboardingField({ q, value, prefilled, missing, onChange, onUpload }: OnboardingFieldProps) {
  const str = Array.isArray(value) ? value.join(', ') : value ?? '';
  const list = Array.isArray(value) ? value : [];

  return (
    <div className={`border-l-2 py-1 pl-5 ${missing ? 'border-p-warn' : 'border-p-line'}`}>
      <label htmlFor={`q-${q.id}`} className="block">
        <span className="text-[17px] font-medium text-p-ink">
          {q.prompt}
          {q.required && <span className="text-p-brandink"> *</span>}
        </span>
        {prefilled && (
          <span className="portal-label ml-3 inline-block border border-p-brandink/40 px-2 py-0.5 align-middle !text-[11px] text-p-brandink">
            From your application
          </span>
        )}
        {q.help && <span className="mt-1.5 block text-[15px] leading-relaxed text-p-ink/70">{q.help}</span>}
      </label>

      {q.kind === 'choice' && (
        <div role="radiogroup" aria-label={q.prompt} className="mt-3 flex flex-wrap gap-2">
          {(q.options ?? []).map((o) => (
            <button
              key={o}
              type="button"
              role="radio"
              aria-checked={str === o}
              onClick={() => onChange(str === o ? '' : o)}
              className={`border px-4 py-2.5 text-left text-[15px] transition ${
                str === o ? 'border-p-brandink bg-p-brand/10 text-p-ink' : 'border-p-line text-p-ink/80 hover:border-p-ink/40'
              }`}
            >
              {o}
            </button>
          ))}
        </div>
      )}

      {q.kind === 'files' && <FilesInput q={q} list={list} onChange={onChange} onUpload={onUpload} />}

      {q.kind === 'multi' && (
        <div className="mt-3 flex flex-wrap gap-2">
          {q.max && <p className="w-full text-sm text-p-ink/60">Up to {q.max}{list.length ? ` · ${list.length} picked` : ''}</p>}
          {(q.options ?? []).map((o) => {
            const on = list.includes(o);
            const full = !on && q.max !== undefined && list.length >= q.max;
            return (
              <button
                key={o}
                type="button"
                aria-pressed={on}
                disabled={full}
                onClick={() => onChange(on ? list.filter((x) => x !== o) : [...list, o])}
                className={`border px-4 py-2.5 text-[15px] transition disabled:opacity-40 ${
                  on ? 'border-p-brandink bg-p-brand/10 text-p-ink' : 'border-p-line text-p-ink/80 hover:border-p-ink/40'
                }`}
              >
                {o}
              </button>
            );
          })}
        </div>
      )}

      {(q.kind === 'text' || q.kind === 'url') && (
        <input
          id={`q-${q.id}`}
          type={q.kind === 'url' ? 'url' : 'text'}
          inputMode={q.kind === 'url' ? 'url' : undefined}
          value={str}
          onChange={(e) => onChange(e.target.value)}
          placeholder={q.placeholder ?? 'Your answer'}
          className={inputCls}
        />
      )}

      {q.kind === 'long' && (
        <textarea
          id={`q-${q.id}`}
          rows={3}
          value={str}
          onChange={(e) => onChange(e.target.value)}
          placeholder={q.placeholder ?? 'Rough and honest beats polished and late.'}
          className={`${inputCls} resize-y leading-relaxed`}
        />
      )}
    </div>
  );
}

/** Upload to Drive (when the client has a folder) or paste a link. Entries are "name::url". */
function FilesInput({
  q,
  list,
  onChange,
  onUpload,
}: {
  q: OnboardingQuestion;
  list: string[];
  onChange: (v: string[]) => void;
  onUpload?: OnboardingFieldProps['onUpload'];
}) {
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState<{ name: string; pct: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const picker = useRef<HTMLInputElement>(null);

  async function pick(files: FileList | null) {
    if (!files?.length || !onUpload) return;
    setErr(null);
    for (const f of Array.from(files)) {
      setBusy({ name: f.name, pct: 0 });
      try {
        const next = await onUpload(q, f, (pct) => setBusy({ name: f.name, pct }));
        if (next === null) {
          setErr('Uploads are not switched on for your account yet. Paste a link instead.');
          break;
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Upload failed. Paste a link instead.');
        break;
      }
    }
    setBusy(null);
    if (picker.current) picker.current.value = '';
  }

  function addLink() {
    const url = link.trim().startsWith('http') ? link.trim() : `https://${link.trim()}`;
    if (!/^https:\/\/\S+\.\S+/.test(url)) {
      setErr('That does not look like a link.');
      return;
    }
    setErr(null);
    onChange([...list, `${url.replace(/^https:\/\//, '').slice(0, 80)}::${url}`]);
    setLink('');
  }

  return (
    <div className="mt-3 space-y-3">
      {list.length > 0 && (
        <ul className="divide-y divide-p-line border border-p-line">
          {list.map((e) => {
            const f = parseFileEntry(e);
            return (
              <li key={e} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[15px]">
                <span className="min-w-0 truncate text-p-ink">{f.name}</span>
                <button type="button" onClick={() => onChange(list.filter((x) => x !== e))} className="portal-label shrink-0 !text-[11px] text-p-ink/60 hover:text-p-bad">
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        {onUpload && (
          <>
            <input ref={picker} type="file" multiple className="hidden" onChange={(e) => pick(e.target.files)} aria-label={`Upload for: ${q.prompt}`} />
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => picker.current?.click()}
              className="portal-label border border-p-line px-4 py-3 !text-[12px] text-p-ink/85 transition hover:border-p-brandink hover:text-p-brandink disabled:opacity-40"
            >
              {busy ? `Uploading ${busy.pct}%` : 'Upload files'}
            </button>
          </>
        )}
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLink())}
          placeholder="Or paste a Google Drive, Dropbox or web link"
          className="min-w-0 flex-1 border border-p-line bg-p-paper px-4 py-3 text-[15px] text-p-ink placeholder:text-p-ink/50 focus:border-p-brandink focus:outline-none"
        />
        <button type="button" onClick={addLink} disabled={!link.trim()} className="portal-label border border-p-line px-4 py-3 !text-[12px] text-p-ink/85 transition hover:border-p-brandink disabled:opacity-40">
          Add link
        </button>
      </div>
      {busy && <p className="text-sm text-p-ink/65">{busy.name}</p>}
      {err && <p className="text-sm text-p-bad">{err}</p>}
    </div>
  );
}
