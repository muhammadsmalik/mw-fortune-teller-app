'use client';

import Link from 'next/link';
import { ArrowUpRight, Globe2 } from 'lucide-react';
import Avatar from '@/components/twin-reveal/Avatar';

function ConfidencePill({ confidence }) {
  if (!confidence) return null;
  const high = confidence === 'High';
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
        high
          ? 'border-emerald-300/40 bg-emerald-300/15 text-emerald-100'
          : 'border-mw-gold-antique/40 bg-mw-gold-antique/15 text-mw-parchment'
      }`}
    >
      {confidence}
    </span>
  );
}

export default function MatchCard({ match, selectable = false, selected = false, onToggleSelect }) {
  const {
    name,
    role,
    company,
    country,
    headshotUrl,
    confidence,
    matchReason,
    linkedinUrl,
    talkingPoints = [],
  } = match || {};
  const hasPoints = Array.isArray(talkingPoints) && talkingPoints.length > 0;
  const meta = [role, company].filter(Boolean).join(' — ');

  return (
    <div
      className={`bg-white/10 border rounded-xl overflow-hidden transition ${
        selectable && selected ? 'border-mw-gold-antique ring-1 ring-mw-gold-antique/60' : 'border-white/15'
      }`}
    >
      <div className="flex items-start gap-3 p-4">
        {selectable && (
          <button
            type="button"
            role="checkbox"
            aria-checked={selected}
            aria-label={`${selected ? 'Deselect' : 'Select'} ${name || 'this match'} for an intro`}
            onClick={() => onToggleSelect?.()}
            className={`mt-0.5 h-6 w-6 shrink-0 rounded-md border flex items-center justify-center text-sm font-bold transition ${
              selected
                ? 'bg-mw-gold-antique border-mw-gold-antique text-mw-dark-navy'
                : 'border-white/40 text-transparent hover:border-white/70'
            }`}
          >
            ✓
          </button>
        )}

        <Avatar
          name={name}
          headshotUrl={headshotUrl}
          initialsCount={1}
          className="h-14 w-14 shrink-0 rounded-full bg-white/10"
          fallbackClassName="text-lg"
        />

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-white">{name}</span>
            <ConfidencePill confidence={confidence} />
          </div>
          {meta && <div className="text-xs text-white/60 mt-0.5">{meta}</div>}
          {(country || matchReason) && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/70">
              {country && (
                <span className="inline-flex items-center gap-1">
                  <Globe2 className="h-3.5 w-3.5 text-mw-light-blue" />
                  {country}
                </span>
              )}
              {matchReason && (
                <span className="rounded-full bg-mw-light-blue/15 px-2.5 py-1 font-medium text-[#D8F2FF]">
                  {matchReason}
                </span>
              )}
            </div>
          )}
        </div>

        {linkedinUrl && (
          <Link
            href={linkedinUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open ${name || 'profile'} on LinkedIn`}
            className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/15 bg-white/5 text-white/80 transition hover:border-mw-gold-antique/60 hover:text-mw-gold-antique"
          >
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      {hasPoints && (
        <div className="border-t border-white/10 px-4 py-3">
          <p className="text-xs uppercase tracking-wider text-mw-light-blue mb-2">Talking points</p>
          <ul className="space-y-1.5">
            {talkingPoints.map((t, i) => (
              <li key={i} className="flex gap-2 text-sm text-white/85 leading-relaxed">
                <span className="text-mw-gold-antique">•</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
