# Design Decisions - Tier 1 Branding Enhancements

This document outlines the design decisions made during the initial phase of aligning the web application with the Moving Walls brand guidelines.

## 1. Typography: Consistent Use of Poppins

**Decision:**
*   The primary typeface for the entire application was changed to "Poppins."
*   This involved:
    *   Importing the Poppins font in `app/layout.js` and making its CSS variable (`--font-poppins`) available globally.
    *   Updating `app/globals.css` to set `var(--font-poppins)` as the default `font-family` for the `body` and heading elements (`h1`-`h6`).

**Reasoning (Style Guide Alignment):**
*   The Moving Walls Style Guide (Section 4: Typography) explicitly states: "**Primary Typeface: Poppins**."
*   The rationale provided in the guide is that Poppins "Embodies modernity, adaptability, approachability. Clean, geometric, contemporary, energetic feel. Versatile for digital interfaces."
*   Previously, the application used Inter for body text and Nunito for headings. Switching to Poppins ensures adherence to the core brand identity and leverages the intended typographical feel.
*   The style guide also specifies a hierarchy for Poppins weights (Bold for H1/H2, Semibold for H3/H4, etc.), which should be applied at the component level going forward. This change establishes the correct base font family.

## 2. Primary Call-to-Action (CTA) Button Styling: Accent Gradient

**Decision:**
*   Key primary CTA buttons across the application were updated to use the "Sunburst (Yellow/Orange)" accent gradient.
*   The specific gradient applied for dark backgrounds is `#FEDA24` to `#FAAE25`.
*   Affected buttons:
    *   "Reveal My Fortune!" on `app/page.js`
    *   "Generate My Fortune!" on `app/collect-info/page.js`
    *   "Save & Share This Wisdom" on `app/display-fortune/page.js`
*   Text color on these buttons was initially kept as `text-mw-dark-navy`. This can be reviewed for contrast.
*   Hover states were simplified to `hover:opacity-90` for the new gradient.

**Reasoning (Style Guide Alignment):**
*   The Style Guide (Section 3: Color Palette - Accent Color Gradients) defines specific gradients for UI elements, highlights, and CTAs. The "Sunburst (Yellow/Orange)" is described as conveying "Enlightenment, curiosity, uplifting."
*   Using these distinct accent gradients for primary CTAs makes them visually prominent, guides user interaction effectively, and injects the brand's specified vitality and energy into the UI.
*   This moves away from a generic blue gradient for CTAs, aligning more closely with the detailed color strategy in the style guide.

## 3. Consistent Logo Display (Foundation for Footer Enhancement)

**Decision:**
*   The display of the Moving Walls logo was standardized across all pages.
*   Specifically, the plain text "Moving Walls Logo" paragraph at the bottom of `app/contact-details/page.js` was replaced with the standard SVG logo and company name component, positioned at the bottom-left. This component is already used on other pages like `app/page.js`, `app/collect-info/page.js`, etc.

**Reasoning (Style Guide Alignment & Consistency):**
*   The Style Guide (Section 2: Logo Guidelines) emphasizes the importance of the official logo. Consistent display ensures brand recognition and professionalism.
*   While the style guide also references `Footer: public/email_footer.jpg` and implies the use of the "Wave Motif" in footers (Section 5), directly using the JPG is not suitable for a responsive web footer.
*   This change provides immediate consistency in logo presentation.
*   It serves as a foundational step. Future enhancements (Tier 2 or 3) can build upon this by developing a dedicated footer component that incorporates a web-friendly version of the wave motif (e.g., as an SVG or CSS element), as inspired by the `email_footer.jpg` and other brand visuals.
