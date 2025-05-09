## Project Checkpoints

### Phase 1: Initial Setup & Welcome Experience

- **[DONE]** Basic Next.js project structure established.
- **[DONE]** `globals.css` configured:
    - Moving Walls color palette (HEX and HSL variables).
    - Tailwind theme extensions for colors (`mw-dark-navy`, `mw-light-blue`, etc.).
    - Base styles for body, headings.
- **[DONE]** `Roboto` font configured and applied globally (`app/layout.js`):
    - `Inter`, `Nunito`, `Caveat` fonts configured and applied globally (`app/layout.js`, `app/globals.css`).
- **[DONE]** ShadCN `ThemeProvider` setup (`components/theme-provider.js`, `app/layout.js`) with dark theme as default.
- **[DONE]** Particle animation background (`tsparticles`) integrated for welcome screen.

- **[DONE]** **Screen 1: Welcome Screen (`app/page.js`)**
    - UI implemented as per `PLAN.md` (dark navy bg, white text, light blue cookie icon).
    - Particle animation background active.
    - Moving Walls logo displayed (bottom-left).
    - "Reveal My Fortune!" CTA button styled with gradient, hover effects.
    - Navigation from Welcome Screen to Input Info Screen implemented.

### Phase 2: Data Collection & Fortune Generation Flow

- **[DONE]** **Screen 2: Input Information (`app/collect-info/page.js`)**
    - Page created with consistent particle background and logo.
    - Centered `Card` (ShadCN) for the form.
    - Form fields implemented using ShadCN `Input`, `Label`, `Select`:
        - Full Name (text input).
        - Industry Type (select dropdown with predefined options).
        - Company Name (text input).
    - Styling aligns with Moving Walls theme (e.g., `bg-card`, themed inputs).
    - State management for form inputs (`useState`).
    - "Consult the Oracle" button navigates to `/generating-fortune`.

- **[DONE]** **Screen 2.5: Fortune Generation Animation (`app/generating-fortune/page.js`)**
    - Page created with consistent particle background and logo.
    - Custom Lottie animation (`public/animations/fortune-cookie-animation.json`) integrated using `lottie-react`.
    - Loading message displayed (e.g., "Consulting the data streams...").
    - Automatic navigation to `/display-fortune` after a 2.5-second delay.

### Phase 3: Fortune Display & Lead Capture (Pending)

- **[DONE]** **Screen 3: Display Fortune (`app/display-fortune/page.js`)**
    - Purpose: Present the generated fortune.
    - Layout: Centered Card on dark navy background.
    - Visuals: Header, fortune display area, CTA button ("Save & Share This Wisdom").
    - API route `/api/generate-fortune` created with Gemini integration for dynamic, structured fortune generation.

- **[DONE]** **Screen 4: Prompt for Contact & Sharing (`app/contact-details/page.js`)**
    - Purpose: Capture mandatory contact details and offer sharing.
    - Layout: Centered Card.
    - Visuals: Header, instructional text, form fields (Email/Phone), sharing buttons (WhatsApp, Email).
    - Backend: API route `/api/submit-lead` created to capture lead data and store it in Google Sheets.

- **[TODO]** **Screen 5: Completion/Thank You & Reset (`app/thank-you/page.js` - or similar route)**
    - Purpose: Confirm actions, thank user, promote demo, reset.
    - Visuals: Confirmation icon, headline, body text, CTA for demo, reset info.

### General UI/UX Considerations (Ongoing)

- **[IN PROGRESS]** Consistency in styling, typography, whitespace, and hierarchy.
- **[IN PROGRESS]** Interactive states (focus, hover, active) for UI elements.
- **[DONE]** Loading states for buttons/actions (implemented in contact details page).
- **[TODO]** Error handling (form validation, API errors if any in future).
