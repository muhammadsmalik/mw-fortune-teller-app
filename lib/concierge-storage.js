// Single source of truth for the concierge idempotency marker, so the page that
// sets it (concierge) and the two that clear it (confirmation "Start over",
// select-name mount-reset) can't drift out of sync.
//
// Marks the one lead row already appended to the sheet for an attendee (value =
// their slug). Lets a retry or page refresh skip a duplicate sheet write.
export const LEAD_SAVED_KEY = 'conciergeLeadSaved';
