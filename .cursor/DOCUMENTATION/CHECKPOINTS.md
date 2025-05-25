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
    - **[DONE]** Ensured correct user data and fortune text are passed to `/api/submit-lead` by fixing `localStorage` population in `collect-info` and `display-fortune` pages.

- **[TODO]** **Screen 5: Completion/Thank You & Reset (`app/thank-you/page.js` - or similar route)**
    - Purpose: Confirm actions, thank user, promote demo, reset.
    - Visuals: Confirmation icon, headline, body text, CTA for demo, reset info.

### General UI/UX Considerations (Ongoing)

- **[IN PROGRESS]** Consistency in styling, typography, whitespace, and hierarchy.
- **[IN PROGRESS]** Interactive states (focus, hover, active) for UI elements.
- **[DONE]** Loading states for buttons/actions (e.g., `contact-details`, `collect-info` pages).
- **[DONE]** Error handling (form validation on client-side, API error handling on server-side, and display of API errors on client-side).

### Phase 4: LinkedIn Interlude & Enhanced Audio Narration (New)

- **[DONE]** **Screen: LinkedIn Interlude (`app/linkedin-interlude/page.js`)**
    - Purpose: Provide a waiting screen while background LinkedIn data fetching and initial fortune generation occurs. Displays user's company and job title.
    - Features:
        - Particle animation background.
        - Displays user's name, company, and job title derived from `localStorage`.
        - Includes a "Hear Oracle's Greeting" interaction, which triggers TTS narration of a dynamic greeting.
        - "Reveal My Destiny" button becomes active after narration or if fortune data is ready.
        - Handles recovery of `pendingFortuneRequestBody` if missing and triggers background fortune generation if necessary.
        - Listens for `storage` events to react to `fortuneData` or `fortuneGenerationError` set by background processes.
    - **Streaming Audio Narration (Howler.js Implementation):**
        - **Decision:** Switched from PCM streaming with Web Audio API to MP3 streaming with Howler.js for better browser compatibility, easier stream handling, and reduced complexity. PCM was proving difficult to manage reliably for seeking/pausing/error handling across browsers. MP3 is a well-supported format for streaming.
        - **Backend (`app/api/generate-narration/route.js`):**
            - Modified to support both `POST` (for ad-hoc narration like in `display-fortune`) and `GET` (for streaming narration where text is passed as a query parameter).
            - `response_format` for OpenAI TTS API explicitly set to `mp3`.
            - `Content-Type` header set to `audio/mpeg`.
            - The API now directly streams the response body from the OpenAI API to the client.
            - Handles voice selection and predefined instructions server-side for GET requests.
        - **Frontend (`app/linkedin-interlude/page.js` & `app/display-fortune/page.js`):**
            - Integrated `howler` npm package.
            - When narration is triggered:
                - A `GET` request is made to `/api/generate-narration` with the text and voice parameters.
                - A `new Howl()` instance is created with the API endpoint as the `src`.
                - `html5: true` is used for Howler to enable true streaming.
                - Event handlers (`onplay`, `onend`, `onloaderror`, `onplayerror`) are used to manage loading states, narration status (`isNarrating`), and errors.
                - `howlInstanceRef.current.unload()` is called on cleanup or before playing a new sound to release resources.
            - User interaction (e.g., button click) is required to initiate audio playback due to browser autoplay policies. This is handled by the `userManuallyInitiatedNarration` state.
            - Ensured `isNarrating` state logic prevents re-entrant calls and correctly handles effect hook dependencies to avoid premature cleanup of the Howler instance.

- **[DONE]** **Screen 3: Display Fortune (`app/display-fortune/page.js`) - Audio Update**
    - **Dynamic Narration Update:**
        - The initial narration of the `openingLine` of the fortune has been refactored to use the same Howler.js streaming MP3 approach as the LinkedIn Interlude page.
        - This replaces the previous Web Audio API implementation that fetched and decoded PCM data.
        - The pre-recorded CEO audio (`/audio/reach_out_to_mw.mp3`) continues to be played using an HTML `<audio>` element, as it's a static file.
    - Other functionalities (displaying fortune text, CEO image transition) remain as previously implemented.
