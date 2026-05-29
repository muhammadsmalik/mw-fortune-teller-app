# Agent WALLi — Brand-Sheet Asset Guide & Generation Prompts

_How to use the Agent WALLi theme image as a source, and copy-paste prompts (with aspect ratios +
output specs) to generate every element from it as a standalone asset for the app + booth._

This pairs with **`AGENT_WALLI_THEME_REVAMP.md`** (where the assets get *used* in code). That doc says
*where* the avatars go; this one says *how to make them* and keep them on-model.

---

## 0. First: save the brand sheet into the repo

The theme image (the full "Agent WALLi — AI Concierge Wizard" sheet) is the **single source of truth**
for the character, palette, and props. Commit it so prompts can reference a stable path:

```
MASTER_DOCS/assets/agent-walli-brand-sheet.png      ← the full sheet (reference)
public/walli/                                        ← generated app assets land here
```

Then, when using a generator that accepts an image, point it at the brand sheet (or a **crop** of the
relevant panel — the EXPRESSIONS grid for faces, the DETAILS panel for the medallion/staff).

---

## 1. How to use the theme image as a generation input

The sheet is built to be fed back into an image model. Three modes, by tool:

| Mode | What it does | Tool syntax |
|---|---|---|
| **Character reference** | Locks WALLi's face/outfit across new poses | Midjourney `--cref <url>` (+ `--cw 60–100`); Flux/SDXL IP-Adapter (FaceID); Gemini/Nano-Banana: attach image + "keep this exact person" |
| **Style reference** | Borrows the palette/lighting/render look | Midjourney `--sref <url>`; "in the style of the attached" |
| **Image-to-image** | Redraws a crop (e.g. upscale the staff orb) | denoise/strength 0.3–0.6 to keep structure |

**Practical recipe for the app avatars:**
1. Crop the **EXPRESSIONS** grid (top-right of the sheet) → use as the **character reference**.
2. Use the **STYLE BLOCK** (§2) as the text prompt + the per-asset prompt.
3. **Fix the seed** across all five poses so the face is identical batch-to-batch.
4. Generate at the listed aspect ratio, then export **transparent PNG** (remove background) for any
   asset that sits on the app's dark gradient.

> Character-consistency is the whole game. Always pass the reference + same seed. If a generated face
> drifts, lower creativity / raise `--cw` / increase IP-Adapter weight.

---

## 2. The STYLE BLOCK (prepend to every prompt)

> **Agent WALLi** — a friendly South-Asian man, early 30s, short dark wavy hair, neat trimmed beard,
> round thin-rim glasses. Wears a **dark navy futuristic wizard's coat** with **antique-gold trim and
> filigree**, a glowing circular **"W" medallion** on the chest, and "WALLi" embroidered in gold on
> the lapel. Premium, cinematic, semi-realistic 3D character render. Lighting: soft gold + electric-blue
> rim light. Palette: deep navy `#0A0F1C`/`#1B2740`, electric blue `#1E88E5`, antique gold `#D4AF37`,
> warm parchment `#F5EAD3`. Mood: insightful, wise, approachable, premium, human + magical, slightly
> mysterious. Consistent character across all images.

**Global negative prompt** (append to every gen):
> `text, watermark, logo text, extra fingers, deformed hands, extra limbs, lowres, blurry, jpeg
> artifacts, cartoonish, anime, plastic skin, asymmetric glasses, harsh flat lighting`

---

## 3. App avatars — the priority assets

These feed `components/twin-reveal/WalliAvatar.js` → drop them at `public/walli/<pose>.png`. The
component crops to a circle, so **frame head-and-shoulders, centered, with headroom**, on a
**transparent background**.

- **Aspect ratio: `1:1`** · **Output: transparent PNG, 1024×1024** (`--ar 1:1`)

| File | Pose | Prompt (after STYLE BLOCK) |
|---|---|---|
| `greeting.png` | greeting | `…warm welcoming smile, one hand raised in a friendly hello, looking straight at the viewer. Head-and-shoulders, centered.` |
| `presenting.png` | presenting | `…confident knowing smile, one open hand gesturing outward as if presenting something, faint glowing "W" orb-tipped staff visible. Head-and-shoulders.` |
| `thinking.png` | thinking | `…thoughtful expression, glancing slightly aside, a small holographic LinkedIn-style profile card glowing near his hand. Head-and-shoulders.` |
| `casting.png` | casting | `…calm focused eyes, both hands conjuring a glowing electric-blue orb of swirling data and connection lines between his palms, mid-spell. Head-and-shoulders.` |
| `celebrating.png` | celebrating | `…big warm smile, staff raised, golden sparkles and light radiating outward, "magic complete" energy. Head-and-shoulders or 3/4.` |

> Tip: also export each at **512×512** if booth perf matters; the component scales by the `size` prop.

---

## 4. The "W" mark, medallion & orb

Pull these from the **DETAILS** panel of the sheet. Used for the favicon, the `WalliAvatar`
placeholder, and small chrome.

| Asset | Use | Prompt | Aspect | Output |
|---|---|---|---|---|
| `mark-gold.png` | favicon, wordmark lockup | `A stylized gold letter "W" logomark with a small dot like the "i" in WALLi, antique gold #D4AF37 on transparent background, clean vector-style emblem, subtle bevel.` | `1:1` | transparent PNG 512² + `.ico` 32/64 |
| `mark-orb.png` | hero accent, staff topper, loading | `A glowing electric-blue "W" emblem inside a luminous crystal orb / lightbulb, #1E88E5 glow, gold filigree cap, dark transparent background, magical.` | `1:1` | transparent PNG 1024² |
| `medallion.png` | chest pendant, premium chrome | `An ornate circular gold medallion pendant engraved with a glowing blue "W", antique gold rim, hanging on a fine gold chain, studio product render, transparent background.` | `1:1` | transparent PNG 1024² |

---

## 5. Full character & turnaround (splash / attract screen)

For a booth **standby/attract loop** or a web splash where WALLi appears full-body.

| Asset | Use | Prompt | Aspect | Output |
|---|---|---|---|---|
| `walli-hero.png` | splash, standby | `…full-body, holding an ornate gold staff topped with a glowing "W" orb, standing on a circle of golden light rings, futuristic out-of-home cityscape with glowing ad screens behind, holographic data swirling from his open palm.` | `2:3` (portrait) or `9:16` for vertical DOOH | transparent PNG 1536×2304 |
| `walli-turnaround.png` | model reference only | `…full-body character turnaround, 5 views (front, 3/4, side, back, action pose with staff), neutral dark studio backdrop, consistent outfit.` | `16:9` | PNG (reference, not shipped) |

---

## 6. "In Action" chat scene (marketing / social)

Recreates the IN ACTION panel — WALLi with a speech bubble. Good for decks, social, onboarding.

- **Prompt (after STYLE BLOCK):** `…half-body, gesturing welcomingly, beside a glowing chat bubble
  that reads "Hello! I'm Agent WALLi, your AI Concierge Wizard." plus a "Suggested match" card,
  futuristic UI, dark navy background.`
- **Aspect ratio:** `4:5` (social) or `1:1` · **Output:** PNG 1280×1600
- _Note:_ models render in-image text poorly — generate **without** the text, then overlay the copy in
  Figma/Canva for crisp type. (The real copy lives in the app; see the copy audit.)

---

## 7. Brand applications — booth DOOH & phone

From the BRAND APPLICATIONS panel. The **DOOH** one is directly useful as the booth attract screen.

| Asset | Use | Prompt | Aspect | Output |
|---|---|---|---|---|
| `booth-dooh.png` | booth standby screen | `Vertical digital out-of-home screen mockup in a premium expo hall, screen shows "Meet Agent WALLi — Your AI Concierge Wizard" with WALLi character and the Moving Walls logo, dark navy + gold, cinematic.` | **`9:16`** (portrait DOOH) | PNG 1080×1920 |
| `app-phone.png` | deck / store shots | `Smartphone mockup, screen shows the Agent WALLi app, WALLi portrait on a deep-navy gradient with gold accents, "Agent WALLi / AI Concierge Wizard", Moving Walls logo footer.` | **`9:19.5`** (≈`1080×2340`) | PNG |

> Match the booth display's **native resolution** — confirm the panel's pixel size and re-export at
> exactly that (most portrait DOOH is 1080×1920).

---

## 8. Backgrounds & textures

The app currently uses a CSS deep-navy gradient + a blur glow (no image needed). If you want a richer
hero background image:

| Asset | Use | Prompt | Aspect | Output |
|---|---|---|---|---|
| `bg-cityscape.png` | web hero / splash bg | `Futuristic out-of-home cityscape at night, glowing digital billboards and screens, deep navy #0A0F1C, floating blue holographic data particles and gold sparks, bokeh depth, cinematic, no people.` | `16:9` (web) / `21:9` (wide) | JPG/PNG 2560×1440 |
| `bg-particles.png` | seamless overlay | `Subtle seamless dark texture, deep navy, faint electric-blue constellation/network lines and gold dust, very low contrast, tileable.` | `1:1` tileable | PNG 1024² |

---

## 9. Color & type reference (from the sheet)

**Palette** (use the tokens already in `tailwind.config.js`):

| Swatch | Hex | Token | Role |
|---|---|---|---|
| ⬛ | `#0A0F1C` | `mw-navy-void` | page base |
| ⬛ | `#111827` | `mw-navy-gunmetal` | cards/surfaces |
| 🟦 | `#1B2740` | `mw-navy-deep` | panels, gradient mid |
| 🔵 | `#1E88E5` | `mw-blue-electric` | the "W" glow, links, focus |
| 🟡 | `#D4AF37` | `mw-gold-antique` | CTAs, WALLi accents |
| ⬜ | `#F5EAD3` | `mw-parchment` | gold-on-dark text |

**Type:** heavy/bold sans for "WALLi" (the "i" dot is **electric blue**); wide letter-spaced caps for
"AI CONCIERGE WIZARD"; tagline **"Discover. Connect. Transform. I'll guide you."** Keep the app's
existing font; reserve this styling for marketing lockups.

---

## 10. Quick checklist per asset

- [ ] Prepend the **STYLE BLOCK** + attach the brand sheet (or a crop) as character reference.
- [ ] Set the **aspect ratio** and **fixed seed** from the table.
- [ ] Append the **global negative prompt**.
- [ ] Export **transparent PNG** for anything overlaying the app's dark gradient (avatars, marks).
- [ ] Drop app avatars at `public/walli/<pose>.png` — they auto-replace the placeholders.
- [ ] Verify the face matches the sheet; if it drifts, raise reference weight / lower creativity.
