'use client';

import { useState } from 'react';

// Headshot with graceful initials fallback (on missing url OR image load error).
// `className` sets the shared box (size/shape/border); `fallbackClassName` styles
// the initials circle (bg/text). `initialsCount` = how many name parts to use.
export default function Avatar({ name, headshotUrl, initialsCount = 1, className = '', fallbackClassName = '' }) {
  const [imgOk, setImgOk] = useState(true);

  if (headshotUrl && imgOk) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={headshotUrl}
        alt={name}
        onError={() => setImgOk(false)}
        className={`${className} object-cover`}
      />
    );
  }

  const initials = (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, initialsCount)
    .map((part) => part[0])
    .join('');

  return (
    <div className={`${className} ${fallbackClassName} flex items-center justify-center font-bold`}>
      {initials}
    </div>
  );
}
