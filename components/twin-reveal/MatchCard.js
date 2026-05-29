'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MatchCard({ match }) {
  const [open, setOpen] = useState(false);
  const { name, role, company, headshotUrl, talkingPoints = [] } = match || {};
  const hasPoints = Array.isArray(talkingPoints) && talkingPoints.length > 0;

  return (
    <div className="bg-white/10 border border-white/15 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => hasPoints && setOpen((v) => !v)}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-white/5 transition"
        aria-expanded={open}
      >
        {headshotUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={headshotUrl} alt={name} className="h-14 w-14 rounded-full object-cover bg-white/10" />
        ) : (
          <div className="h-14 w-14 rounded-full bg-white/10 flex items-center justify-center text-lg font-bold">
            {(name || '?').slice(0, 1)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-white truncate">{name}</div>
          <div className="text-xs text-white/60 truncate">{[role, company].filter(Boolean).join(' — ')}</div>
        </div>
        {hasPoints && (
          <span className="text-white/60 text-sm">{open ? '−' : '+'}</span>
        )}
      </button>

      <AnimatePresence initial={false}>
        {open && hasPoints && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1">
              <p className="text-xs uppercase tracking-wider text-mw-light-blue mb-2">Talking points</p>
              <ul className="space-y-1.5">
                {talkingPoints.map((t, i) => (
                  <li key={i} className="text-sm text-white/85 leading-relaxed">• {t}</li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
