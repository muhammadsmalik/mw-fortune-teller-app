# Agent WALLi — Theme Revamp Plan

_Branch: `integration/woo-e2e` · Pairs with the [brand sheet](#) "Agent WALLi — AI Concierge Wizard"_

> **Status (2026-05-29):** tokens + `<WalliAvatar>` + dark-navy/glow + avatar placement on all 4
> booth screens are **DONE & live** (steps 1–3, +footer bg). **Remaining:** generate the avatar art
> (step 4), mobile pass, footer-wave recolor + favicon (step 5), QA (step 6). The WALLi avatars
> currently render as gold-ring "W" placeholders until the PNGs land in `/public/agent-walli/`.

Goal: move the booth flow from the current **flat blue gradient + bright-yellow buttons** to the
brand sheet's **deep-navy, antique-gold, "Human + Magical" premium** look — and give WALLi an actual
**face** in the flow (right now he's a name, never a character). This doc covers (1) design tokens,
(2) per-screen layout + **where the WALLi avatar goes**, (3) **image-gen prompts** for each avatar
placeholder, and (4) a build sequence.

> Scope note: this is a *visual/character* revamp. The copy is already aligned (see audit) — don't
> reopen it here. Mobile-optimization (a separate REMAINING item in the status doc) should ride
> along with this pass since we're touching every screen's layout.

---

## 1. Design tokens

### Current (tailwind.config.js)
| Token | Value | Used for |
|---|---|---|
| `mw-dark-navy` | `#151E43` | panels |
| `mw-light-blue` | `#5BADDE` | eyebrows, icons |
| `mw-gold` | `#FEDA24` | CTAs (bright yellow) |
| gradient | `#2554A2 → #1B1E2B` | page bg |

### Target (from brand sheet palette)
| Swatch | Hex | Role |
|---|---|---|
| Void navy | `#0A0F1C` | page base / deepest bg |
| Gunmetal | `#111827` | cards, raised surfaces |
| Deep navy | `#1B2740` | panel fills, gradients |
| Electric blue | `#1E88E5` | the "W" glow, links, focus rings, accents |
| **Antique gold** | `#D4AF37` | **primary CTA, WALLi pill, dividers** |
| Parchment | `#F5EAD3` | gold-on-dark text, "magical" highlights |

**Key shift:** retire the bright yellow `#FEDA24/#FAAE25` button gradient → **antique gold `#D4AF37`**
(optionally a subtle `#D4AF37 → #BF9530` gradient). The yellow reads "promo banner"; the antique gold
reads "premium wizard," which is the whole point. Background goes **darker** (`#0A0F1C → #1B2740`
radial/diagonal) so the blue "W" glow and gold can pop.

**Implementation:** add the new hexes as tokens (`mw-gold` → `#D4AF37`, add `mw-navy-void #0A0F1C`,
`mw-navy-gunmetal #111827`, `mw-blue-electric #1E88E5`, `mw-parchment #F5EAD3`). Because `mw-gold` is
referenced literally as `#FEDA24` in a few buttons, do a token sweep (`#FEDA24`, `#FAAE25`) so the
change propagates from one place.

### Texture / "magical" layer (cheap, high-impact)
- Faint **radial glow** behind WALLi avatars (electric-blue, `blur-3xl`, low opacity).
- **Hairline gold dividers** instead of `white/10` borders on hero panels.
- Optional: a low-opacity particle/constellation SVG in page bg (matches the "data → connections" motif).

---

## 2. Per-screen layout + avatar placements

Notation: **`[WALLI:pose]`** marks where a WALLi avatar/portrait image goes. Prompts for each pose are
in §3. All avatars share **one character** (consistency is the brand's explicit ask — see the
expressions grid on the sheet).

### `/select-name` — "Find your name"
- Bg → target dark gradient. Eyebrow "WOO LONDON" stays.
- **`[WALLI:greeting]`** — a circular portrait (96–128px) **above the H1**, with an electric-blue glow
  behind it. This is the first "hello" — WALLi greeting the attendee. Today there's nothing here.
- Confirm sub-screen ("That's you?"): small **`[WALLI:thinking]`** badge next to the LinkedIn row to
  reinforce "WALLi is reading your profile."
- CTA → antique gold.

### `/reveal` — "The people you should meet"
- This is WALLi's big "reveal" moment → make it feel like a presentation.
- Source panel keeps the attendee's headshot. The **"Agent WALLi" pill** stays, but add a small
  **`[WALLI:presenting]`** avatar (48–64px) **inside the pill or beside the narration line**
  ("I peered into your LinkedIn…") so the first-person voice has a face.
- Empty/preparing state ("I'm still preparing your matches…") → swap generic text for
  **`[WALLI:casting]`** + the line, so the wait feels intentional/magical, not broken.

### `/concierge` — "Where should I send it?"
- Eyebrow "Agent WALLi" → put **`[WALLI:presenting]`** (64px) above it, centered, glowing.
- Keeps the match list + email form. CTA → antique gold.

### `/confirmation` — "WALLi's on it."
- Replace the bare `✨` with **`[WALLI:celebrating]`** (waving / staff raised, sparkles) — the
  emotional close. Tagline "Discover. Connect. Transform." (just added) sits below in gold.

### Loading / submit states
- `/concierge` button "WALLi is working…" → pair with a tiny **`[WALLI:casting]`** spinner-avatar if
  we want motion; otherwise a gold ring spinner is fine.

### Footer
- `BrandFooter` wave stays; recolor the wave from `#AFDFF6` toward electric-blue/gold to match.

---

## 3. Avatar image-gen prompts (placeholders)

**Pipeline:** generate these once, drop into `public/agent-walli/<pose>.png` (transparent PNG, square,
≥512px), and render via the existing `Avatar`-style component or a new `<WalliAvatar pose="greeting" />`.
Until generated, ship a **gold-ring placeholder with the "W" mark** so layout is final before art lands.

### Base character (prepend to every prompt — keeps him consistent)
> A friendly South-Asian man in his early 30s, short dark wavy hair, neat beard, round thin-rim
> glasses. He wears a **dark navy futuristic wizard's coat** with **antique-gold trim** and a glowing
> circular **"W" medallion** on the chest. Premium, cinematic, semi-realistic 3D render. Background:
> deep navy (#0A0F1C) with faint electric-blue (#1E88E5) data-glow particles. Soft rim lighting in
> gold and blue. Centered, head-and-shoulders unless noted. Transparent background. Consistent
> character across all images.

### Per-pose prompts
- **`[WALLI:greeting]`** — _select-name hero._
  > `{base}` Warm welcoming smile, one hand raised in a friendly hello, looking directly at the
  > viewer. Approachable and inviting. Head-and-shoulders portrait.

- **`[WALLI:presenting]`** — _reveal narration + concierge eyebrow._
  > `{base}` Confident, slight knowing smile, one open hand gesturing outward as if presenting
  > something, glowing "W" orb-tipped staff faintly visible. "Here's what I found for you" energy.

- **`[WALLI:thinking]`** — _select-name confirm badge._
  > `{base}` Thoughtful expression, looking slightly to the side, a faint holographic LinkedIn-style
  > card glowing near his hand. "Reading your profile" energy. Small badge crop.

- **`[WALLI:casting]`** — _preparing / loading state._
  > `{base}` Eyes calm and focused, both hands conjuring a glowing electric-blue orb of swirling data
  > and connection lines between his palms. Magical, mid-spell. Slightly mysterious.

- **`[WALLI:celebrating]`** — _confirmation._
  > `{base}` Big warm smile, staff raised, golden sparkles and light radiating outward, a sense of
  > "done — magic complete." Celebratory and rewarding. Head-and-shoulders or 3/4 body.

### Optional set (nice-to-have)
- **`[WALLI:mark]`** — the standalone glowing **"W" medallion/orb** alone (no character), for the
  placeholder ring, favicon, and small chrome. Easiest to generate first.

> Tip: generate all five in **one batch with the same seed/character reference** so the face matches.
> The brand sheet's "EXPRESSIONS" grid is effectively the reference set — feed it as an image prompt
> if the generator supports image-to-image.

---

## 4. Build sequence

1. ✅ **Tokens** — added the brand palette to `tailwind.config.js` as **new** tokens
   (`mw-gold-antique` #D4AF37, `mw-gold-antique-deep` #BF9530, `mw-navy-void` #0A0F1C,
   `mw-navy-gunmetal` #111827, `mw-navy-deep` #1B2740, `mw-blue-electric` #1E88E5,
   `mw-parchment` #F5EAD3). **Decision: antique gold is scoped to the WALLi booth flow only** —
   legacy `mw-gold` (#FEDA24) is kept untouched so the deprecated fortune flow stays as-is.
   Swept the 6 WALLi-flow files (gold accents + pale-yellow → `mw-parchment`). Verified in live CSS.
2. ✅ **`<WalliAvatar>` component** — `components/twin-reveal/WalliAvatar.js`. `pose` prop →
   `/public/agent-walli/<pose>.png` with a gold-ring "W" + electric-blue-glow **placeholder** that
   auto-replaces once the PNGs exist.
3. ✅ **Per-screen layout** — dark-navy bg + electric-blue glow on all 4 booth screens; WALLi
   avatars placed (`greeting` on select-name, `presenting` on reveal + concierge, `celebrating`
   on confirmation). ⬜ **Mobile pass still TODO** (stacks but not tuned).
4. ⬜ **Generate art** — run §3 prompts, export transparent PNGs to `public/agent-walli/`; they
   auto-replace the placeholders, no code change.
5. ◑ **Footer + favicon** — footer background recolored to deep navy ✅; **wave-color recolor +
   favicon "W" swap still ⬜**.
6. ⬜ **QA** — full flow on mobile + booth display; gold AA contrast on dark; avatars load offline.

### Files this touches
- `tailwind.config.js` (tokens)
- `app/select-name/page.js`, `app/reveal/page.js`, `app/concierge/page.js`, `app/confirmation/page.js`
- `components/twin-reveal/MatchCard.js` (gold accents only), `components/ui/BrandFooter.js`
- **new:** `components/twin-reveal/WalliAvatar.js`, `public/agent-walli/*.png`
