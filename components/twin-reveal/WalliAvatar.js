'use client';

import { useState } from 'react';

/**
 * Agent WALLi's face in the booth flow.
 *
 * Renders `/public/walli/<pose>.png` when the art exists; until it's generated
 * (see MASTER_DOCS/AGENT_WALLI_THEME_REVAMP.md §3 for the gen prompts), it falls
 * back to a gold-ring "W" placeholder with an electric-blue glow — so layouts are
 * final and WALLi "appears" at each step before the real art lands. Drop the PNGs
 * into /public/walli/ and they take over automatically, no code change.
 *
 * Poses: greeting · presenting · thinking · casting · celebrating
 */
export default function WalliAvatar({ pose = 'presenting', size = 64, glow = true, className = '' }) {
  const [errored, setErrored] = useState(false);

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {glow && (
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-2 rounded-full bg-mw-blue-electric/25 blur-2xl"
        />
      )}

      {!errored ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/walli/${pose}.png`}
          alt="Agent WALLi"
          onError={() => setErrored(true)}
          className="relative h-full w-full rounded-full border-2 border-mw-gold-antique/70 object-cover"
        />
      ) : (
        <div className="relative flex h-full w-full items-center justify-center rounded-full border-2 border-mw-gold-antique/70 bg-gradient-to-br from-mw-navy-deep to-mw-navy-gunmetal">
          <span
            className="font-extrabold leading-none text-mw-gold-antique"
            style={{ fontSize: size * 0.5 }}
          >
            W
          </span>
        </div>
      )}
    </div>
  );
}
