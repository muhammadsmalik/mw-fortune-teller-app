# Fortune Experience Flow Breakdown

## I. LinkedIn Flow

### 1. **Start (`/generating-fortune`)**
- The user lands on `generating-fortune/page.js`.
- The system detects a `userLinkedInProfile` in `localStorage`.
- It fetches LinkedIn data (from cache or via the `/api/get-linkedin-company-details` API endpoint).
- A `fortuneRequestBody` is constructed using this LinkedIn data.
- This `fortuneRequestBody` is stored in `localStorage` under the key `PENDING_FORTUNE_REQUEST_BODY_LOCAL_STORAGE_KEY`.
- **Crucially, a background API call to `/api/generate-fortune` is initiated.**
- The user is **immediately redirected to `/linkedin-interlude`** *before* the background fortune generation completes.

### 2. **Interlude (`/linkedin-interlude`)**
- This page loads. It retrieves profile information from `localStorage` (using `PENDING_FORTUNE_REQUEST_BODY_LOCAL_STORAGE_KEY` and `FETCHED_LINKEDIN_DATA_LOCAL_STORAGE_KEY`) to display the user's name, company, etc., and to prepare for narration.
- Initially, an overlay prompting "Tap on the door to reveal Oracle's Greeting" is shown.

#### User Interaction:
- The user clicks the "door" (or an equivalent interaction).
  - The `handleInitiateNarration` function is called.
  - The `userManuallyInitiatedNarration` state is set to `true`.

#### Narration - Part 1 (Greeting):
- The page calls the `/api/generate-narration` endpoint with a dynamically constructed text including the user's name and company (e.g., "Ah, seeker... They call you \[fullName]... You are from \[companyName]...").
- The Oracle's audio greeting plays.
- The `greetingHeardOnce` state becomes `true` after the narration completes.

#### Transition Audio:
- After the greeting narration ends successfully, the `playTransitionSequence` function is called.
  - Audio from `TRANSITION_VOICE_PATH` (e.g., "Ah, seeker... I've peered into your past, present, and future…") plays first.
  - Then, audio from `TRANSITION_SHIMMER_PATH` (a shimmer sound) plays.
- The `isTransitionAudioPlaying` state controls UI elements, potentially showing messages like "Shhh… the veil thins…".

#### Waiting for Fortune (Concurrent with Narration/Transition):
- While the narration and transition audios are playing (or even before, if the user interacts slowly), the page is implicitly waiting for the background fortune generation (started in step 1) to complete.
- A `storage` event listener is active, watching for changes to `fortuneData` or `fortuneGenerationError` in `localStorage`.
- The "Reveal My Destiny" button is present. Its `disabled` state changes based on whether narration/transition audio is playing or if `isGeneratingFortune` is true (meaning fortune data hasn't arrived from the background task yet).

#### Fortune Ready (`checkForFortuneAndProceed` is triggered):
- This function is called at several points:
  - When the transition audio sequence (voice and shimmer) successfully finishes.
  - When the `storage` event listener detects that `fortuneData` or `fortuneGenerationError` has been set in `localStorage` by the background task (and narration/transition isn't currently blocking a check).
  - When the user clicks the "Reveal My Destiny" button (which might interrupt ongoing audio and then proceed to check for the fortune).

- **If `fortuneData` is found in `localStorage`**:
  - The page redirects the user to `/display-fortune`.

- **If `fortuneGenerationError` is found in `localStorage`**:
  - An error message is displayed directly on the `linkedin-interlude` page.
  - After a timeout, the user is redirected to `/collect-info`.

- **If neither `fortuneData` nor `fortuneGenerationError` is found yet**:
  - The UI shows a loading state, such as "Consulting the oracles..." (this state is typically managed by `isGeneratingFortune`).

### 3. **Display Fortune (`/display-fortune`)**
- The page loads `fortuneData` from `localStorage`.
- It parses this data and displays the fortune text (opening line, location insight, audience opportunity, etc.).
- The Fortune Teller image is initially shown.

#### Narration - Part 2 (Fortune Opening & CEO Introduction):
- If audio playback isn't already allowed, the user might need to click an "Enable Sound" button.
- The `openingLine` of the generated fortune is narrated (using the `/api/generate-narration` endpoint).
- After the opening line narration finishes, the `CEO_NARRATION_TEXT` ("But fate does not speak idly. It brings you to those you're meant to meet...") is narrated.

#### CEO Image Transition:
- After the CEO narration concludes:
  - A reveal chime audio (`/audio/reveal_chime.mp3`) plays.
  - A visual transition (likened to a smoke effect, managed by `isTransitioningToCeo` and `showCeoImage` states) occurs.
  - The Fortune Teller image fades out or transforms into an image of the CEO.
  - The caption below the image changes from "Fortune Teller" to "Srikanth Ramachandran, Founder and CEO of Moving Walls".

- The user has the option to click "Save & Share This Wisdom," which redirects to `/contact-details`.

---

## II. Manual Flow

### 1. **Start (`/generating-fortune`)**
- The user lands on `generating-fortune/page.js`.
- The system does *not* find a `userLinkedInProfile` but *does* find `storedManualUserInfo` in `localStorage`.
- A `fortuneRequestBody` is constructed using this manually entered information.
- Any LinkedIn-related keys (`FETCHED_LINKEDIN_DATA_LOCAL_STORAGE_KEY`, `PENDING_FORTUNE_REQUEST_BODY_LOCAL_STORAGE_KEY`) are cleared from `localStorage`.
- **A direct (foreground) API call to `/api/generate-fortune` is made.** The page actively waits for this API call to complete.
- During this wait, loading messages like "Consulting the ancient scrolls (your provided details)..." and "Weaving your destiny... This might take a moment." are displayed.

#### If the `generate-fortune` API call is successful:
- The returned `fortuneData` is stored in `localStorage`.
- The user is redirected directly to `/display-fortune`.

#### If the `generate-fortune` API call fails:
- An API error message is displayed on the `generating-fortune` page.
- After a timeout, the user is redirected to `/collect-info`.

### 2. **Display Fortune (`/display-fortune`)**
- This step is identical to Step 3 in the LinkedIn Flow.
- The page loads `fortuneData` from `localStorage`.
- It displays the fortune text.
- The Fortune Teller image is shown initially.

#### Narration (Fortune Opening & CEO Introduction):
- The user may need to enable sound.
- The `openingLine` of the fortune is narrated.
- The `CEO_NARRATION_TEXT` is narrated.

#### CEO Image Transition:
- A reveal chime plays.
- The Fortune Teller image visually transitions to the CEO image.

- The user can click "Save & Share This Wisdom," which redirects to `/contact-details`.

---

## Key Differences Summarized:

### Fortune Generation & Initial Redirection:
- **LinkedIn**: Fortune generation is a *background* task initiated from `generating-fortune`. The user is immediately sent to `/linkedin-interlude` to experience an interactive waiting period.
- **Manual**: Fortune generation is a *foreground* task in `generating-fortune`. The user waits on this page until the generation is complete, then goes directly to `/display-fortune`.

### Interlude Screen (`/linkedin-interlude`):
- **LinkedIn**: This screen is a core part of the experience, featuring initial narration, transition audio, and managing the wait for the background fortune generation.
- **Manual**: This screen is entirely bypassed.

### Data for Interlude Narration:
- The `PENDING_FORTUNE_REQUEST_BODY_LOCAL_STORAGE_KEY` is specifically used by the LinkedIn flow to provide the necessary profile details (like name and company) to the `linkedin-interlude` page for its initial display and greeting narration.

### Handling of Fortune Generation Outcome:
- **LinkedIn**: If background fortune generation succeeds, `fortuneData` is put in `localStorage`. If it fails, `fortuneGenerationError` is set. The `linkedin-interlude` page listens for these and reacts accordingly (redirects to display or shows error).
- **Manual**: The `generating-fortune` page directly handles the success or failure of the foreground API call, then redirects.