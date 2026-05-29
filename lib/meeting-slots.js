// Single source of truth for the networking windows where the Moving Walls booth
// (in the WOO London exhibition areas) can broker a match intro. Rendered as a flat
// list in the matchIntro email + the /confirmation screen. We do NOT reserve a
// specific slot per match, so nothing is persisted — the attendee and match
// coordinate via the email reply-to or by dropping by the booth.
//
// ⚠️ PRELIMINARY times taken from the WOO "Programme at a glance". The schedule is
// indicative until finalised — confirm final local times with Deewakshi before the
// event and edit them HERE; this list is the only place they live.
export const MEETING_SLOTS = [
  'Thu 4 Jun · 10:45–11:15 — coffee break',
  'Thu 4 Jun · 13:00–14:30 — networking lunch',
  'Thu 4 Jun · 19:00–19:45 — pre-gala drinks',
  'Fri 5 Jun · 11:00–11:30 — coffee break',
  'Fri 5 Jun · 14:00–15:00 — networking lunch',
];
