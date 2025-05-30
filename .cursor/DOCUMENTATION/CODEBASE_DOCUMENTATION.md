# Fortune Teller Application Documentation

## Table of Contents

1.  [Overview](#overview)
2.  [Project Structure](#project-structure)
3.  [Core Components (`components/`)](#core-components)
    *   [fortune-journey/DisplayFortune.js](#componentsfortune-journeydisplayfortunejs)
    *   [fortune-journey/ScenarioSelection.js](#componentsfortune-journeyscenarioselectionjs)
    *   [AudioPlayer.js](#componentsaudioplayerjs)
    *   [BackgroundMusic.js](#componentsbackgroundmusicjs)
    *   [theme-provider.js](#componentstheme-providerjs)
4.  [API Routes (`app/api/`)](#api-routes)
    *   [generate-fortune/route.js](#apigenerate-fortuneroutejs)
    *   [generate-narration/route.js](#apigenerate-narrationroutejs)
    *   [generate-scenario-answers/route.js](#apigenerate-scenario-answersroutejs)
    *   [get-linkedin-company-details/route.js](#apiget-linkedin-company-detailsroutejs)
    *   [send-email/route.js](#apisend-emailroutejs)
    *   [submit-lead/route.js](#apisubmit-leadroutejs)
    *   [transcribe-audio/route.js](#apitranscribe-audioroutejs)
5.  [Page Components (`app/`)](#page-components)
    *   [layout.js](#applayoutjs)
    *   [globals.css](#appglobalscss)
    *   [favicon.ico](#appfaviconico)
    *   [page.js (WelcomeScreen)](#apppagejs-welcomescreen)
    *   [collect-info/page.js](#appcollect-infopagejs)
    *   [linkedin-interlude/page.js](#applinkedin-interludepagejs)
    *   [generating-fortune/page.js](#appgenerating-fortunepagejs)
    *   [fortune-journey/page.js](#appfortune-journeypagejs)
    *   [scenario-selection/page.js](#appscenario-selectionpagejs)
    *   [display-fortune/page.js](#appdisplay-fortunepagejs)
    *   [scenario-answers/page.js](#appscenario-answerspagejs)
    *   [contact-details/page.js](#appcontact-detailspagejs)
6.  [Libraries and Data (`lib/`)](#libraries-and-data)
    *   [predefined_scenarios.json](#libpredefined_scenariosjson)

---

## 1. Overview

This application is an interactive fortune teller designed to provide users with a mystical business fortune. It incorporates various technologies including Next.js for the frontend and backend API routes, AI models (Gemini/OpenAI) for fortune generation and TTS, LinkedIn integration for user data, and various UI/UX enhancements like particle effects and audio narration.

The user journey typically involves:
1.  Welcome screen.
2.  Information collection (via LinkedIn QR or manual input).
3.  An optional interlude page for LinkedIn flow.
4.  A loading screen while the fortune is generated.
5.  Scenario selection to tailor the experience.
6.  Display of the generated fortune with narration.
7.  Display of scenario-specific answers/insights.
8.  Option to receive the fortune via email and submit lead details.

---

## 1.5. User Journey / Application Flow

The application offers two primary user journeys for obtaining a fortune:

**A. LinkedIn QR Code Flow (Automated Data Input)**

1.  **Welcome (`app/page.js` - WelcomeScreen)**:
    *   User lands on the welcome screen.
    *   Clicks "Begin Your Journey."

2.  **Information Collection (`app/collect-info/page.js`)**:
    *   Defaults to the LinkedIn QR code scanning view.
    *   User scans their LinkedIn QR code using their mobile app.
    *   The `Scanner` component in `collect-info/page.js` captures the LinkedIn profile URL.
    *   `initiateLinkedInFlowAndRedirect()` is called:
        *   The LinkedIn URL is stored in `localStorage` (`userLinkedInProfile`).
        *   `forceRefreshLinkedInData` is set to 'true' in `localStorage`.
        *   The system navigates to `/generating-fortune`. (Alternatively, older flows might have gone to `/linkedin-interlude`).

3.  **Generating Fortune (`app/generating-fortune/page.js`)**:
    *   This page displays loading messages.
    *   `processFortuneGeneration()` is triggered:
        *   It retrieves `userLinkedInProfile` from `localStorage`.
        *   Calls `/api/get-linkedin-company-details` with the URL to fetch profile and latest company data. This data is stored in `localStorage` as `fetchedLinkedInData`.
        *   It then constructs a request body using `fetchedLinkedInData` (full name, company name, industry, etc.).
        *   Calls `/api/generate-fortune` to get the personalized fortune.
        *   On success, the fortune object is stored in `localStorage` (`fortuneData`), along with other helper items like `fortuneApp_fullName`, `fortuneApp_industry`, `fortuneApp_companyName`, `fortuneApp_fortuneText`, and `fortuneApp_structuredFortune`.
        *   Navigates to `/display-fortune`. (Note: If the `FortuneJourneyPage` orchestrator is used, this might be a direct render within that page rather than a separate navigation after scenario selection).

4.  **Scenario Selection & Fortune Display (Orchestrated by `app/fortune-journey/page.js`)**:
    *   The `FortuneJourneyPage` likely starts by showing the `ScenarioSelection` component (`components/fortune-journey/ScenarioSelection.js`).
    *   **Scenario Selection**:
        *   User selects their role (Media Owner/Agency).
        *   User selects initial general scenarios (e.g., 2 out of 5).
        *   User selects role-specific scenarios (e.g., 2 out of N).
        *   Audio cues (greetings, transitions) may play.
        *   `onScenariosConfirmed` is called by `ScenarioSelection` with the chosen scenario IDs.
    *   **Fortune Generation (Re-evaluation/Refinement - if scenarios influence the main fortune)**:
        *   The `handleScenariosConfirmed` function in `FortuneJourneyPage` receives the scenario data.
        *   It might re-trigger or refine the fortune generation by calling `/api/generate-fortune` again, possibly including scenario context or just confirming that the previously fetched/generated fortune (from step 3) is now ready to be displayed alongside scenarios. (The current API for `generate-fortune` doesn't explicitly take scenario IDs, so it's more likely the fortune from step 3 is used, and scenarios are for the *next* step).
        *   `fortuneApiResponse` is populated.
    *   **Display Fortune**:
        *   `FortuneJourneyPage` switches its view to render the `DisplayFortune` component (`components/fortune-journey/DisplayFortune.js`).
        *   `DisplayFortune` receives `fortuneApiResponse` (the fortune data) and `userAudioPreference`.
        *   It renders the fortune text and imagery.
        *   Handles audio narration (opening line via TTS, CEO message via pre-recorded audio with captions).
        *   Manages visual transitions (avatar to CEO image).
        *   User clicks "Click to Realize Your Dreams" (or similar button).

5.  **Scenario Answers (`app/scenario-answers/page.js`)**:
    *   Navigated to from `DisplayFortune`.
    *   Retrieves `selectedScenarioIDs` (set during `ScenarioSelection`) from `localStorage`.
    *   Calls `/api/generate-scenario-answers` to get detailed insights for these scenarios.
    *   Displays these answers (often in an accordion).
    *   Offers options to share the fortune (Email, WhatsApp, Copy).
    *   User clicks "Proceed to Save & Share" or similar to go to contact details.

6.  **Contact Details (`app/contact-details/page.js`)**:
    *   Retrieves user data (name, email if available from LinkedIn, fortune text) from `localStorage`.
    *   **Automated Processing**: If `linkedInEmail` is available, it attempts to:
        *   Automatically submit lead details to `/api/submit-lead`.
        *   Automatically send the fortune email via `/api/send-email`.
    *   **Manual Input**: If no email is pre-filled, or if automation fails/is not configured, prompts the user for their email.
    *   On submission:
        *   Calls `/api/submit-lead` to save details to Google Sheets.
        *   Calls `/api/send-email` to send the fortune.
    *   Displays success/error messages.

**B. Manual Input Flow**

1.  **Welcome (`app/page.js` - WelcomeScreen)**:
    *   Same as LinkedIn flow.

2.  **Information Collection (`app/collect-info/page.js`)**:
    *   User might initially see the QR scanner but can click a link like "No LinkedIn QR? Enter details manually."
    *   The view switches to the manual input form.
    *   User fills in: Full Name, Industry Type, Company Name.
    *   Optionally: Geographic Focus, Business Objective (can use voice input via `/api/transcribe-audio`).
    *   User can select a debug LLM provider if debug mode is active.
    *   User clicks "Generate My Fortune!"
    *   `handleProceed()` is called:
        *   User info (including any debug provider preference) is stored in `localStorage` (`userInfoForFortune`).
        *   Navigates to `/generating-fortune`.

3.  **Generating Fortune (`app/generating-fortune/page.js`)**:
    *   Displays loading messages.
    *   `processFortuneGeneration()` is triggered:
        *   It retrieves `userInfoForFortune` from `localStorage`.
        *   Constructs a request body using this manual data.
        *   Calls `/api/generate-fortune`.
        *   On success, stores `fortuneData` and helper items in `localStorage`.
        *   Navigates to `/display-fortune`. (Again, `FortuneJourneyPage` might intercept this for its orchestrated flow).

4.  **Scenario Selection & Fortune Display (Orchestrated by `app/fortune-journey/page.js`)**:
    *   Same as step 4 in the LinkedIn flow. The fortune data used by `DisplayFortune` comes from what was generated in step 3 of this manual flow.

5.  **Scenario Answers (`app/scenario-answers/page.js`)**:
    *   Same as step 5 in the LinkedIn flow.

6.  **Contact Details (`app/contact-details/page.js`)**:
    *   Retrieves user data (manually entered name, industry, company, fortune text) from `localStorage`.
    *   Prompts the user for their email (as it wouldn't be pre-filled from LinkedIn).
    *   On submission:
        *   Calls `/api/submit-lead`.
        *   Calls `/api/send-email`.
    *   Displays success/error messages.

**C. Alternative Scenario Selection Flow (using `app/scenario-selection/page.js` directly)**

This flow might be an older or alternative path, perhaps if `app/fortune-journey/page.js` is not the sole orchestrator.

1.  **Information Collection (Manual or LinkedIn via `/collect-info`, leading to `/generating-fortune`)**:
    *   User data (`userInfoForFortune` or `fetchedLinkedInData`) and the initial `fortuneData` are stored in `localStorage` as per flows A or B.

2.  **Navigation to Scenario Selection Page**:
    *   User is somehow navigated to `/scenario-selection` *after* initial fortune generation (this part of the trigger is less clear from the direct page analysis if not coming from `fortune-journey`).

3.  **Scenario Selection (`app/scenario-selection/page.js`)**:
    *   User selects role and scenarios.
    *   `handleProceedToFortune()`:
        *   Stores selected scenario IDs in `localStorage` (`selectedScenarioIDs`).
        *   **Crucially, stores a `pendingFortuneRequestBody` in `localStorage`. This object includes user details (from `userInfoForFortune` or `fetchedLinkedInData`) AND the `selectedScenarioIDs`.**
        *   Navigates to `/linkedin-interlude`.

4.  **LinkedIn Interlude (`app/linkedin-interlude/page.js`)**:
    *   This page seems to be designed to handle the `pendingFortuneRequestBody`.
    *   It might play narration.
    *   It listens for `localStorage` changes (`fortuneDataReadyTimestamp`).
    *   The actual API call using the `pendingFortuneRequestBody` (which includes scenario IDs for context) to `/api/generate-fortune` (or a similar endpoint that processes scenarios) is expected to happen here or be triggered from here, potentially by a background process or another script that reads this "pending" request.
    *   Once the (potentially scenario-refined) fortune is ready and `fortuneData` is updated in `localStorage`, it navigates to `/display-fortune`.

5.  **Display Fortune, Scenario Answers, Contact Details**:
    *   Follows from `/display-fortune` as in flows A and B.

**Key Data Flow via `localStorage`:**

*   `userLinkedInProfile`: Stores raw LinkedIn URL.
*   `userInfoForFortune`: Stores manually entered user data.
*   `fetchedLinkedInData`: Stores data from `/api/get-linkedin-company-details`.
*   `fortuneData`: The primary structured fortune object from `/api/generate-fortune`.
*   `fortuneApp_structuredFortune`: Also stores the structured fortune, likely for easier access by later pages.
*   `fortuneApp_fortuneText`: Stores the HTML version of the fortune.
*   `fortuneApp_fullName`, `fortuneApp_industry`, `fortuneApp_companyName`: Helper items for quick access.
*   `selectedScenarioIDs`: Array of chosen scenario IDs.
*   `pendingFortuneRequestBody`: (In flow C) Object containing user data and scenario IDs, intended for a delayed/contextual API call.
*   `forceRefreshLinkedInData`: Flag to ensure fresh LinkedIn data fetch.
*   `fortuneDataReadyTimestamp`: Timestamp to signal interlude page that fortune is ready.

This section outlines the main paths. Specific UI interactions within components (like enabling audio) are detailed in their respective component documentation.

---

## 2. Project Structure

The project follows a standard Next.js App Router structure:

*   `app/`: Contains all UI (pages, layouts) and API routes.
    *   `api/`: Backend API endpoints.
    *   Other directories (e.g., `collect-info/`, `display-fortune/`) represent different pages/routes.
*   `components/`: Reusable React components.
    *   `fortune-journey/`: Components specific to the core fortune journey flow.
    *   `ui/`: UI Primitives (likely from Shadcn/ui).
*   `lib/`: Utility functions, data files (e.g., `predefined_scenarios.json`).
*   `public/`: Static assets (images, audio files, animations).
*   Configuration files (e.g., `next.config.mjs`, `tailwind.config.js`, `.env`).

---

## 3. Core Components (`components/`)

### `components/fortune-journey/DisplayFortune.js`

*   **Purpose**: This component is responsible for rendering the generated fortune, playing audio narrations for the fortune's opening line and a subsequent CEO message, and managing visual transitions between the fortune teller avatar and a CEO/company image.
*   **Props**:
    *   `fortuneData` (Object): The fortune data object. Can also be an error object `{ error: string, openingLine?: string }`.
    *   `onGoBack` (Function): Callback function to handle navigation back.
    *   `audioPlaybackAllowed` (Boolean): Prop indicating if audio playback is permitted by the parent/user interaction.
*   **State Variables**:
    *   `init` (Boolean): Tracks if the particles engine has initialized.
    *   `fortune` (String): HTML string of the formatted fortune to display.
    *   `isLoadingFortune` (Boolean): Indicates if the fortune data is being processed.
    *   `audioPlaybackAllowed` (Boolean): Internal state reflecting the prop, potentially for local UI elements.
    *   `openingLineToNarrate` (String): The opening line of the fortune to be narrated.
    *   `isNarrating` (Boolean): True if audio narration is currently playing.
    *   `narrationError` (String | null): Stores any error message related to narration.
    *   `currentCeoCaption` (String): Current caption text for the CEO audio.
    *   `narrationStage` (Enum: 'idle', 'openingLine', 'ceoNarration', 'transitioning', 'done'): Controls the sequence of narration and visual changes.
    *   `hasPreRevealed` (Boolean): True if the fortune card should be visible (content is ready or an error is displayed).
    *   `isTransitioningToCeo` (Boolean): True during the smoke effect transition to the CEO image.
    *   `showCeoImage` (Boolean): True to display the CEO/company image.
*   **Key Functions & Logic**:
    *   **Particle Effects**: Initializes and displays `tsparticles` for background visual effects.
    *   **Audio Context Management**: Uses `getAudioContext` to initialize and manage the Web Audio API context, primarily for ensuring playback readiness.
    *   **Data Processing**:
        *   Receives `propFortuneData`. If it's an error, displays the error.
        *   Otherwise, parses `propFortuneData` (expected to be an object) and constructs an HTML string for display.
        *   Sets `openingLineToNarrate` from the data.
    *   **Narration**:
        *   Uses `Howler.js` for streaming Text-To-Speech (TTS) audio for the `openingLineToNarrate` by calling the `/api/generate-narration` endpoint.
        *   Plays a pre-recorded CEO message (`/audio/reach_out_to_mw.mp3`) using an HTML5 `<audio>` element after the opening line narration.
        *   Displays synchronized captions (`CEO_TRANSCRIPT`) during the CEO audio playback.
        *   Manages `narrationStage` to control the flow: opening line -> CEO audio -> transition -> done.
    *   **Visual Transitions**:
        *   Uses `framer-motion` for animating the appearance of the fortune card and the transition between the fortune teller avatar and the CEO image.
        *   A smoke effect (`SMOKE_EFFECT_DURATION_MS`) is simulated during the avatar-to-CEO image transition.
        *   Plays a chime sound (`/audio/reveal_chime.mp3`) during this transition.
    *   **User Interaction**:
        *   `handleSaveAndShare()`: Navigates to `/scenario-answers`.
        *   `handleEnableAudio()`: Allows the user to enable audio playback if it wasn't automatically allowed (e.g., due to browser restrictions). This attempts to resume the audio context and "primes" audio elements.
        *   `onGoBack`: Prop-based navigation.
*   **Dependencies**: `react`, `next/navigation`, `next/image`, `@/components/ui/button`, `@/components/ui/card`, `@tsparticles/react`, `@tsparticles/slim`, `lucide-react`, `framer-motion`, `howler`.

### `components/fortune-journey/ScenarioSelection.js`

*   **Purpose**: Guides the user through a multi-step process of selecting scenarios that will influence their fortune or subsequent insights. It handles user type selection (Media Owner/Agency), selection of initial general scenarios, and then role-specific scenarios. It also plays audio cues for transitions and greetings.
*   **Props**:
    *   `onScenariosConfirmed` (Function): Callback function invoked when the user has finalized all scenario selections. Passes an object `{ scenarios: string[], transitionError?: string }`.
*   **State Variables**:
    *   `init` (Boolean): Tracks if the particles engine has initialized.
    *   `allScenarios` (Array): The current list of scenarios being displayed.
    *   `selectedScenarioIds` (Array): IDs of the scenarios currently selected by the user.
    *   `error` (String | null): Stores any error message related to scenario selection.
    *   `currentView` (Enum: 'initialAndUserTypeSelection', 'roleSpecificScenarioSelection', 'userTypeSelection'): Controls which part of the selection process is visible.
    *   `userType` (Enum: 'mediaOwner', 'agency' | null): The selected role of the user.
    *   `initialSelections` (Array): Stores the IDs of scenarios selected in the first step.
    *   `hasPlayedGreetingForSession` (Boolean): Tracks if the avatar greeting audio has been played in the current session for the role-specific view.
    *   `isTransitionAudioPlaying` (Boolean): True if the transition audio sequence is playing.
    *   `transitionAudioError` (String | null): Error message for transition audio.
    *   `isGreetingAudioPlaying` (Boolean): True if the avatar greeting audio is playing.
    *   `greetingAudioError` (String | null): Error message for greeting audio.
*   **Key Functions & Logic**:
    *   **Particle Effects**: Initializes and displays `tsparticles`.
    *   **Scenario Management**:
        *   Loads initial general scenarios (`initialGeneralScenarios`) and role-specific questions (`mediaOwnerQuestions`, `agencyQuestions`).
        *   Updates `allScenarios` based on `currentView` and `userType`.
        *   `handleScenarioToggle()`: Manages adding/removing scenario IDs from `selectedScenarioIds`, respecting `MAX_SELECTIONS`.
    *   **View Navigation**:
        *   `handleProceedFromInitialAndUserType()`: Validates initial selections and user type, then transitions to `roleSpecificScenarioSelection`.
        *   `handleUserTypeSelect()`: Sets the `userType`.
        *   `handleBack()`: Navigates to the previous view or to `/collect-info` if on the first step.
    *   **Audio Playback (Web Audio API)**:
        *   `getAudioContext()`: Initializes and manages the Web Audio API context (sets `sampleRate` to 24000).
        *   `playAudioFile()`: Fetches, decodes, and plays an audio file. Manages `AudioBufferSourceNode`.
        *   `playGreetingAudio()`: Plays a greeting sound (`AVATAR_GREETING_AUDIO_PATH`) when entering the role-specific view.
        *   `playTransitionSequence()`: Plays a sequence of audio files (`TRANSITION_VOICE_PATH`, `TRANSITION_SHIMMER_PATH`) for transitions.
    *   **Confirmation**:
        *   `handleProceedToFortune()`: Validates final selections, combines them with initial selections, stores them in `localStorage`, plays the transition audio sequence, and then calls `onScenariosConfirmed` with the final list of scenario IDs and any transition audio error.
*   **Data**:
    *   Uses `initialGeneralScenarios`, `mediaOwnerQuestions`, `agencyQuestions` defined internally. (Note: `scenariosData` from `@/lib/predefined_scenarios.json` is imported but not directly used in the provided snippet for populating these lists, might be a leftover or for a different purpose).
*   **Dependencies**: `react`, `next/navigation`, `next/image`, `@/components/ui/button`, `@/components/ui/card`, `lucide-react`, `@tsparticles/react`, `@tsparticles/slim`, `@/lib/predefined_scenarios.json` (imported but usage unclear in this specific component's logic for scenario listing), `framer-motion`.

### `components/AudioPlayer.js`

*   **Purpose**: A simple, reusable component to play a list of audio files sequentially with a specified delay between tracks. Playback can be controlled externally.
*   **Props**:
    *   `audioFiles` (Array<String>): An array of audio file names (e.g., `['track1.mp3', 'track2.mp3']`). The component prepends `/audio/` to these names.
    *   `delayBetweenTracks` (Number, optional, default: 3000): Delay in milliseconds between tracks.
    *   `isPlaying` (Boolean): Controls whether the audio should be playing or paused.
*   **State Variables**:
    *   `currentTrackIndex` (Number): Index of the current audio file being played from the `audioSources` array.
*   **Key Functions & Logic**:
    *   **Audio Source Management**: Prepends `/audio/` to each file name in `audioFiles` to create full paths.
    *   **Playback Control**:
        *   Uses an HTML5 `<audio>` element (hidden by default).
        *   When `currentTrackIndex` or `isPlaying` changes, it updates the `audioRef.current.src`, loads it, and plays/pauses based on the `isPlaying` prop.
        *   `handleAudioEnded()`: When a track finishes, it waits for `delayBetweenTracks` and then advances to the next track (or loops back to the first).
*   **Dependencies**: `react`.

### `components/BackgroundMusic.js`

*   **Purpose**: Provides background music for the application, with a user control to mute/unmute. It handles browser autoplay restrictions by waiting for user interaction.
*   **State Variables**:
    *   `isPlaying` (Boolean): True if the music is currently playing.
    *   `isMuted` (Boolean): True if the music is muted by the user.
    *   `hasInteracted` (Boolean): True once the user has interacted with the document (click/keydown), allowing audio to play.
*   **Key Functions & Logic**:
    *   **Audio Element**: Uses an HTML5 `<audio>` element with `loop` enabled and a default `volume` (0.3). The audio source is `/audio/bg-music.mp3`.
    *   **Autoplay Handling**:
        *   Initially, music won't play until `hasInteracted` is true.
        *   Event listeners for 'click' and 'keydown' are set up on the document to detect the first user interaction, which then sets `hasInteracted` to true.
    *   **Playback Control**:
        *   `toggleMute()`: Toggles the `isMuted` state. If unmuting and `hasInteracted` is true, it attempts to play the audio. If muting, it pauses the audio.
        *   A `useEffect` hook manages playing or pausing the audio when `hasInteracted` or `isMuted` changes.
    *   **UI**:
        *   Displays a fixed-position button with a `Volume2` (playing/unmuted) or `VolumeX` (muted) icon to toggle mute.
        *   Shows an "Click anywhere to enable background music" hint if `!hasInteracted`.
*   **Dependencies**: `react`, `lucide-react`.

### `components/theme-provider.js`

*   **Purpose**: A simple wrapper component that provides theme management capabilities to the application using the `next-themes` library.
*   **Props**:
    *   `children` (ReactNode): The child components to be wrapped by the theme provider.
    *   `...props` (Object): Any other props to be passed down to the `NextThemesProvider` (e.g., `attribute="class"`, `defaultTheme="system"`).
*   **Functionality**: It renders the `NextThemesProvider` from `next-themes`, passing along all props and children. This enables features like light/dark mode switching throughout the application.
*   **Dependencies**: `react`, `next-themes`.

---

## 4. API Routes (`app/api/`)

All API routes are defined within the `app/api/` directory, with each sub-directory typically containing a `route.js` file that exports handlers for HTTP methods (e.g., `GET`, `POST`).

### `api/generate-fortune/route.js`

*   **Purpose**: Generates a personalized business fortune for the user using a Large Language Model (LLM), either Google's Gemini or OpenAI's GPT models.
*   **Method**: `POST`
*   **Request Body (JSON)**:
    *   `fullName` (String, required): User's full name.
    *   `industryType` (String, required): User's industry.
    *   `companyName` (String, required): User's company name.
    *   `geographicFocus` (String, optional): Primary geographic focus of the business.
    *   `businessObjective` (String, optional): User's primary business objective.
    *   `debugProvider` (String, optional, values: "GEMINI", "OPENAI"): Allows client to force a specific LLM provider if server is in debug mode.
*   **Response Body (JSON)**:
    *   **Success (200)**: An object matching the `fortuneSchema` (for Gemini) or `openAIFortuneSchema` (for OpenAI). Includes fields like:
        *   `openingLine` (String)
        *   `locationInsight` (String)
        *   `audienceOpportunity` (String)
        *   `engagementForecast` (String)
        *   `transactionsPrediction` (String)
        *   `aiAdvice` (String)
    *   **Error (400, 500)**: `{ error: String, details?: String, provider?: String }`
*   **Key Logic**:
    *   **LLM Provider Configuration**:
        *   Uses environment variables `LLM_PROVIDER` (default "GEMINI"), `GEMINI_MODEL_NAME`, `GEMINI_API_KEY`, `OPENAI_MODEL_NAME`, `OPENAI_API_KEY`.
        *   Supports fallback to OpenAI if Gemini fails and `ENABLE_LLM_FALLBACK` is true.
    *   **Schema Definition**: Defines detailed JSON schemas (`fortuneSchema` for Gemini, `openAIFortuneSchema` for OpenAI) to structure the LLM's output, including descriptions and required fields. Emojis are specified in descriptions for certain fields.
    *   **Prompt Engineering**: Constructs a detailed prompt (`masterPrompt`, with `geminiSpecificInstructions` or fed into OpenAI's system message/schema) including user details, core instructions, context about "Moving Walls", and examples of desired output style. Emphasizes originality and tailoring to the user.
    *   **API Interaction**:
        *   `generateFortuneWithOpenAI()`: Interacts with OpenAI's Chat Completions API, using `response_format: { type: "json_schema" }`.
        *   For Gemini, uses `GoogleGenerativeAI` SDK with `responseMimeType: "application/json"` and `responseSchema`.
    *   **Error Handling**: Validates input, checks API keys, handles API errors (e.g., rate limits, auth issues, invalid responses), and manages fallback logic.
*   **Dependencies**: `openai`, `@google/generative-ai`.

### `api/generate-narration/route.js`

*   **Purpose**: Generates audio narration from text input using OpenAI's Text-To-Speech (TTS) API.
*   **Methods**: `GET`, `POST`, `OPTIONS`
*   **Request**:
    *   **GET Query Parameters**:
        *   `textInput` (String, required): The text to be converted to speech.
        *   `voice` (String, optional, default: "ballad"): The voice to use (e.g., "alloy", "echo", "fable", "onyx", "nova", "shimmer", or custom like "ballad" if it implies specific instructions).
    *   **POST Request Body (JSON)**:
        *   `textInput` (String, required)
        *   `voice` (String, optional, default: "ballad")
        *   `instructions` (String, optional): Custom instructions for the TTS model (e.g., defining tone, cadence).
*   **Response Body**:
    *   **Success (200)**: An MP3 audio stream (`Content-Type: audio/mpeg`).
    *   **Error (400, 500)**: `{ error: String, details?: String }`
*   **Key Logic**:
    *   **Input Handling**: Parses `textInput` and `voice` from GET params or POST body.
    *   **Instructions**:
        *   For POST, can accept custom `instructions`.
        *   For GET, if `voice` is "ballad", it uses predefined `BALLAD_TTS_INSTRUCTIONS`.
    *   **OpenAI TTS API**: Calls `openai.audio.speech.create()` with `model: "gpt-4o-mini-tts"`, `voice`, `input` (textInput), `instructions`, and `response_format: "mp3"`.
    *   **Streaming**: Directly streams the `response.body` from OpenAI back to the client.
    *   **CORS**: Includes an `OPTIONS` handler for CORS.
*   **Dependencies**: `openai`, `next/server`.

### `api/generate-scenario-answers/route.js`

*   **Purpose**: Retrieves predefined detailed answers or insights for a list of user-selected scenario IDs.
*   **Method**: `POST`
*   **Request Body (JSON)**:
    *   `selectedScenarios` (Array<String>, required): An array of scenario IDs (max 4).
*   **Response Body (JSON)**:
    *   **Success (200)**: `{ scenarioAnswers: Array<Object> }` where each object is:
        *   `id` (String): The scenario ID.
        *   `scenario` (String): The display text of the scenario.
        *   `insight` (Object): Detailed insight, typically `{ subQuestion: String, howMWHelps: Array<String>, businessImpact: String }`.
    *   **Error (400, 500)**: `{ error: String, details?: String }`
*   **Key Logic**:
    *   **Input Validation**: Checks if `selectedScenarios` is provided and is an array with a valid length.
    *   **Data Fetching**:
        *   Reads scenario data from `lib/predefined_scenarios.json`.
        *   Maps the input `selectedScenarios` (IDs) to the full scenario objects and their details from the JSON file.
    *   **Future Enhancement Note**: The code includes a TODO comment indicating that this could be replaced with dynamic insight generation via an LLM in the future.
*   **Dependencies**: `fs/promises`, `path`, `next/server`.

### `api/get-linkedin-company-details/route.js`

*   **Purpose**: Fetches a user's LinkedIn profile information and details about their latest company using the Proxycurl API.
*   **Method**: `POST`
*   **Request Body (JSON)**:
    *   `linkedinUrl` (String, required): The user's LinkedIn profile URL.
*   **Response Body (JSON)**:
    *   **Success (200)**: `{ profileData: Object, latestCompanyData: Object | null, message?: String }`
        *   `profileData`: Data from Proxycurl's profile endpoint.
        *   `latestCompanyData`: Data from Proxycurl's company endpoint for the latest company, or `null` if not found/applicable.
        *   `message`: Optional message, e.g., if latest company URL wasn't found.
    *   **Error (400, 500, Proxycurl status codes)**: `{ error: String }` or `{ profileData, latestCompanyData: null, error: String }`
*   **Key Logic**:
    *   **URL Normalization**: `normalizeLinkedInUrl()` cleans and validates the input LinkedIn URL.
    *   **API Key**: Uses `PROXYCURL_API_KEY` from environment variables.
    *   **Sequential API Calls**:
        1.  Fetches profile data from Proxycurl (`https://nubela.co/proxycurl/api/v2/linkedin`).
        2.  Identifies the latest experience from `profileData.experiences`:
            *   Sorts experiences: current roles first (no `ends_at`), then by `ends_at` (descending), then by `starts_at` (descending).
            *   `parseLinkedInDate()` helper converts LinkedIn date objects to JS `Date`.
        3.  If a latest company LinkedIn URL (`company_linkedin_profile_url`) is found, fetches company data from Proxycurl (`https://nubela.co/proxycurl/api/linkedin/company`) with various parameters (`categories=include`, `funding_data=include`, etc.).
    *   **Error Handling**: Manages errors from Proxycurl API responses and network issues.
*   **Dependencies**: `next/server`.

### `api/send-email/route.js`

*   **Purpose**: Sends an email to the user with their generated fortune using the Resend API.
*   **Method**: `POST`
*   **Request Body (JSON)**:
    *   `emailTo` (String, required): Recipient's email address.
    *   `subject` (String, required): Email subject.
    *   `fortuneText` (String, required): The plain text content of the fortune.
    *   `fullName` (String, optional): User's full name for personalization.
*   **Response Body (JSON)**:
    *   **Success (200)**: `{ message: String, data: Object }` (Resend API response data).
    *   **Error (400, 500)**: `{ message: String, error?: String }`
*   **Key Logic**:
    *   **Configuration**: Uses `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `EMAIL_FOOTER_IMAGE_URL` from environment variables.
    *   **Content Formatting**:
        *   Modifies the Call To Action (CTA) in the `fortuneText`.
        *   Converts the `fortuneText` (which may contain newlines) into simple HTML paragraphs for better email formatting.
        *   Constructs a full HTML email body with a header, the fortune, a signature, and a footer image.
    *   **Resend API**: Uses `resend.emails.send()` to send the email.
*   **Dependencies**: `resend`, `next/server`.

### `api/submit-lead/route.js`

*   **Purpose**: Submits the user's details and their fortune as a new lead to a Google Sheet.
*   **Method**: `POST`
*   **Request Body (JSON)**:
    *   `fullName` (String, required)
    *   `email` (String, required)
    *   `industry` (String, required)
    *   `companyName` (String, required)
    *   `fortuneText` (String, required)
*   **Response Body (JSON)**:
    *   **Success (200)**: `{ message: String, data: Object }` (Google Sheets API response data).
    *   **Error (400, 405, 500)**: `{ message: String, details?: String }`
*   **Key Logic**:
    *   **Authentication**: Uses Google Cloud service account credentials (`GOOGLE_SHEETS_CLIENT_EMAIL`, `GOOGLE_SHEETS_PRIVATE_KEY`) for Google Sheets API authentication.
    *   **Google Sheets API**:
        *   Uses `googleapis` library.
        *   Appends a new row to the specified Google Sheet (`GOOGLE_SHEET_ID`) and range (e.g., `Sheet1!A:F`).
        *   The row includes a timestamp, and the fields from the request body.
    *   **Input Validation**: Checks for required fields.
*   **Dependencies**: `googleapis`, `next/server`.

### `api/transcribe-audio/route.js`

*   **Purpose**: Transcribes audio input (e.g., voice notes from the user) into text using the Deepgram API.
*   **Method**: `POST`
*   **Request Body (FormData)**:
    *   `audio` (File, required): The audio file to be transcribed.
*   **Response Body (JSON)**:
    *   **Success (200)**: `{ transcript: String }`
    *   **Error (400, 500)**: `{ error: String, details?: String }`
*   **Key Logic**:
    *   **API Key**: Uses `DEEPGRAM_API_KEY` from environment variables.
    *   **File Handling**:
        *   Receives the audio file as FormData.
        *   Converts the file to a Buffer.
        *   Saves the buffer to a temporary file in the OS's temporary directory (e.g., `/tmp/temp_audio_TIMESTAMP.webm`). This is done because Deepgram's `transcribeFile` method can be more robust with file paths/streams for certain formats.
    *   **Deepgram API**:
        *   Uses `@deepgram/sdk`.
        *   Calls `deepgram.listen.prerecorded.transcribeFile()` with a readable stream from the temporary file.
        *   Specifies parameters: `model: 'nova-3'`, `language: 'en'`, `smart_format: true`, `punctuate: true`.
    *   **Cleanup**: Deletes the temporary audio file in a `finally` block.
*   **Dependencies**: `@deepgram/sdk`, `node:fs/promises`, `node:fs`, `node:path`, `node:os`, `next/server`.

---

## 5. Page Components (`app/`)

These are the main pages of the application, typically found in directories under `app/` with a `page.js` file.

### `app/layout.js`

*   **Purpose**: The root layout for the entire application. It wraps all page content.
*   **Key Features**:
    *   Imports global CSS (`./globals.css`).
    *   Sets up metadata (title, description).
    *   Wraps children with `ThemeProvider` (from `components/theme-provider.js`) to enable light/dark mode.
    *   Includes `BackgroundMusic` component to provide ambient sound.
    *   Defines the basic HTML structure (`<html>`, `<body>`).
*   **Dependencies**: `next/font/google`, `../components/theme-provider`, `../components/BackgroundMusic`, `./globals.css`.

### `app/globals.css`

*   **Purpose**: Contains global styles, Tailwind CSS base directives (`@tailwind base; @tailwind components; @tailwind utilities;`), and custom global CSS classes.
*   **Key Features**:
    *   Defines CSS variables for theming (e.g., `--background`, `--foreground`, color palette for `mw-dark-navy`, `mw-light-blue`, etc.).
    *   Basic body styling.
    *   Custom font classes (e.g., `.font-caveat`).
    *   Custom utility classes (e.g., `.text-shadow`, `.animate-pulse-glow`).
    *   Styles for specific components like `PhoneInput` (likely from `react-phone-number-input`).

### `app/favicon.ico`

*   **Purpose**: Standard website icon displayed in browser tabs and bookmarks.
*   **File Type**: ICO (Image icon file).

### `app/page.js` (WelcomeScreen)

*   **Purpose**: The main landing page of the application. It introduces the experience and prompts the user to begin their fortune-telling journey.
*   **State Variables**:
    *   `init` (Boolean): Tracks particles engine initialization.
    *   `videoLoaded` (Boolean): Tracks if the introductory video has loaded.
    *   `showVideo` (Boolean): Controls the visibility of the video.
*   **Key Functions & Logic**:
    *   **Particle Effects**: Initializes and displays `tsparticles`.
    *   **Introductory Video**:
        *   Attempts to play a video (`/animations/MW-Abstract-Loop-Optimised-Stutter.mp4`) as a background or intro element.
        *   Handles video loading and click events.
    *   **Navigation**:
        *   `handleStart()`: Navigates the user to `/collect-info` to begin the information collection process.
        *   Uses `useRouter` from `next/navigation`.
    *   **UI**: Uses `framer-motion` for animations. Displays a welcome message, Moving Walls logo, and a "Begin Your Journey" button.
*   **Dependencies**: `react`, `next/navigation`, `next/image`, `@/components/ui/button`, `@tsparticles/react`, `@tsparticles/slim`, `framer-motion`, `lucide-react`.

### `app/collect-info/page.js`

*   **Purpose**: This page is responsible for collecting the necessary information from the user to generate their fortune. It offers two distinct flows: LinkedIn QR code scanning or manual data entry.
*   **State Variables**:
    *   `init` (Boolean): Particles engine initialization status.
    *   `isGenerating` (Boolean): True when processing information or navigating.
    *   `currentFlow` (Enum: 'linkedin', 'manual'): Determines which input method is active.
    *   **LinkedIn Flow**:
        *   `linkedinUrl` (String): Stores the scanned or manually entered LinkedIn URL.
        *   `qrError` (String): Error messages related to QR scanning.
    *   **Manual Input Flow**:
        *   `fullName`, `industryType`, `companyName`, `geographicFocus`, `businessObjective` (Strings): Store manually entered user data.
    *   **Voice Input (Manual Flow)**:
        *   `mediaRecorder` (MediaRecorder | null): Stores the MediaRecorder instance.
        *   `recordingTargetField` (String | null): Name of the field being recorded for.
        *   `isRecording` (Boolean): True if audio recording is active.
        *   `isTranscribing` (Boolean): True if audio is being transcribed.
        *   `transcriptionError` (String): Errors from the transcription process.
    *   **Debug Mode (Manual Flow)**:
        *   `debugForceProvider` (String | null, values: 'GEMINI', 'OPENAI'): Allows forcing a specific LLM provider if `NEXT_PUBLIC_DEBUG` is true.
*   **Key Functions & Logic**:
    *   **Particle Effects**: Initializes and displays `tsparticles`.
    *   **Flow Control**: Switches between `linkedin` and `manual` input methods.
    *   **LinkedIn Flow**:
        *   `normalizeLinkedInUrl()`: Validates and standardizes LinkedIn profile URLs.
        *   `initiateLinkedInFlowAndRedirect()`: Stores the LinkedIn URL in `localStorage`, clears any manual form data, and navigates to `/generating-fortune`.
        *   `handleScan()`: Callback for the `Scanner` component. On a successful scan of a valid LinkedIn QR, it auto-proceeds.
        *   Uses `@yudiel/react-qr-scanner` for QR code scanning.
    *   **Manual Input Flow**:
        *   Standard input fields for `fullName`, `companyName`. `Select` component for `industryType`. `Textarea` for `businessObjective`.
        *   **Voice Input**:
            *   `startRecording()`, `stopRecording()`, `handleVoiceInput()`: Manage audio recording using `navigator.mediaDevices.getUserMedia()` and `MediaRecorder`.
            *   Recorded audio (as WebM) is sent to `/api/transcribe-audio`.
            *   The transcribed text populates the corresponding input field (`geographicFocus` or `businessObjective`).
            *   `renderMicButton()`: Renders a microphone button for relevant fields, showing recording/transcribing state.
    *   **Proceed Logic**:
        *   `handleProceed()`:
            *   If `currentFlow` is 'linkedin', calls `initiateLinkedInFlowAndRedirect`.
            *   If `currentFlow` is 'manual', validates required fields, stores user info (including `debugForceProvider`) in `localStorage` (`userInfoForFortune`), clears LinkedIn data, and navigates to `/generating-fortune`.
    *   **UI**: Uses `Card` components for layout, `Input`, `Label`, `Select`, `Textarea`, `Button` from `shadcn/ui`.
*   **Dependencies**: `react`, `next/navigation`, `@/components/ui/*`, `@tsparticles/react`, `@tsparticles/slim`, `lucide-react`, `@yudiel/react-qr-scanner`, `next/image`.

### `app/linkedin-interlude/page.js`

*   **Purpose**: Serves as an intermediate screen specifically for the LinkedIn flow. It plays a narration while potentially fetching or processing LinkedIn data in the background before proceeding to the main fortune generation or display.
*   **State Variables**:
    *   `init` (Boolean): Particles engine initialization.
    *   `isLoading` (Boolean): General loading state.
    *   `narrationText` (String): Text for narration.
    *   `narrationStage` (Enum: 'idle', 'playing', 'finished'): Controls narration playback.
    *   `narrationError` (String | null): Errors during narration.
    *   `showContent` (Boolean): Controls visibility of the main content after potential delays/narration.
    *   `isBrowser` (Boolean): Tracks if the component is running in a browser environment.
    *   `interactionMade` (Boolean): Tracks if user has interacted with the page (for audio autoplay).
    *   `fortuneDataExists` (Boolean): Checks if `fortuneData` is already in localStorage.
*   **Key Functions & Logic**:
    *   **Particle Effects**: Initializes and displays `tsparticles`.
    *   **Data Check**: On mount, checks if `fetchedLinkedInData` and `fortuneData` exist in `localStorage`. If `fortuneData` exists, it might directly navigate to display the fortune, bypassing some interlude steps.
    *   **Audio Context & Narration**:
        *   `getAudioContext()`: Manages Web Audio API context.
        *   `getNarrationText()`: Provides the text for narration based on whether fortune data is already present.
        *   `playNarration()`: Plays a sequence of audio files (`/audio/interlude-linkedin-1.mp3`, `/audio/interlude-linkedin-2.mp3`) using Web Audio API. It fetches, decodes, and plays these files.
        *   `handleInitiateNarration()`: Called on user interaction to start narration if conditions are met.
    *   **Storage Listener**: `handleStorageChange()` listens for changes in `localStorage` (specifically for `fortuneDataReadyTimestamp`), which might be set by a background process, to trigger navigation or content reveal.
    *   **Navigation/Content Reveal**:
        *   `handleRevealDestiny()`: Navigates to `/generating-fortune` or `/display-fortune` based on whether `fortuneData` is already available.
        *   Content (`showContent`) is revealed after a delay or when narration finishes.
    *   **UI**: Uses `framer-motion` for animations. Displays messages like "The Oracle is attuning to your LinkedIn presence..." and a "Reveal Your Destiny" button.
*   **Dependencies**: `react`, `next/navigation`, `next/image`, `@/components/ui/button`, `@tsparticles/react`, `@tsparticles/slim`, `lucide-react`, `framer-motion`.

### `app/generating-fortune/page.js`

*   **Purpose**: This page acts as a loading or intermediate screen displayed to the user while their personalized fortune is being generated by the backend API.
*   **State Variables**:
    *   `init` (Boolean): Particles engine initialization.
    *   `generationError` (String | null): Error messages from the fortune generation process.
    *   `currentMessageIndex` (Number): Index for cycling through loading messages.
    *   `debugProviderOverride` (String | null): Stores the debug provider preference from localStorage.
*   **Key Functions & Logic**:
    *   **Particle Effects**: Initializes `tsparticles`.
    *   **Loading Messages**: Displays a cycle of animated messages (e.g., "Consulting the cosmic energies...", "Decoding your unique path...").
    *   **Fortune Generation Process (`processFortuneGeneration`)**:
        1.  Retrieves user information:
            *   Checks `localStorage` for `userLinkedInProfile`. If present, it calls `/api/get-linkedin-company-details` to fetch LinkedIn data. It stores this data in `localStorage` as `fetchedLinkedInData`.
            *   If no LinkedIn profile, it uses `userInfoForFortune` from `localStorage` (set by the manual collect-info flow).
        2.  Constructs `requestBody` for the `/api/generate-fortune` API using the collected user details (name, company, industry, etc.) and any `debugProviderOverride`.
        3.  Calls `/api/generate-fortune` with the `requestBody`.
        4.  **Handles Response**:
            *   On success, stores the generated fortune object in `localStorage` as `fortuneData`. It also stores user's name, industry, company name, and the HTML fortune text in `localStorage` for later use (e.g., on the contact details page). Then, navigates to `/display-fortune`.
            *   On failure, sets `generationError` to display an error message to the user.
    *   **Error Display**: If `generationError` is set, it shows the error and a button to retry or go back.
*   **Dependencies**: `react`, `next/navigation`, `next/image`, `@/components/ui/button`, `@tsparticles/react`, `@tsparticles/slim`, `lucide-react`, `framer-motion`.

### `app/fortune-journey/page.js`

*   **Purpose**: This page acts as an orchestrator for a multi-step fortune telling journey. It likely manages the flow between selecting scenarios and displaying the fortune, using the reusable `ScenarioSelection` and `DisplayFortune` components.
*   **State Variables**:
    *   `currentView` (Enum: 'scenarioSelection', 'displayFortune'): Controls which component/view is active.
    *   `selectedScenariosData` (Object | null): Stores data from `ScenarioSelection` (e.g., `{ scenarios: string[], transitionError?: string }`).
    *   `fortuneApiResponse` (Object | null): Stores the response from the fortune generation API (or an error object).
    *   `isGeneratingFortune` (Boolean): True while the fortune is being fetched.
    *   `userAudioPreference` (Boolean): Tracks if the user has allowed audio (e.g., by interaction on ScenarioSelection).
*   **Key Functions & Logic**:
    *   **View Management**: Switches between `ScenarioSelection` and `DisplayFortune` components based on `currentView`.
    *   `handleScenariosConfirmed(confirmedScenariosData)`:
        *   Called by `ScenarioSelection` component when scenarios are chosen.
        *   Sets `selectedScenariosData`.
        *   Sets `userAudioPreference` to true (assuming interaction happened in ScenarioSelection).
        *   Sets `isGeneratingFortune` to true and `currentView` to 'displayFortune'.
        *   **Initiates fortune generation**: It calls `/api/generate-fortune`. The request body is constructed using data from `localStorage` (likely `userInfoForFortune` or `fetchedLinkedInData`) and the `confirmedScenariosData.scenarios` might be used to refine the prompt or context (though the API route itself doesn't explicitly show scenario IDs as input).
        *   Sets `fortuneApiResponse` with the result or error from the API call.
        *   Sets `isGeneratingFortune` to false.
    *   `handleGoBackToScenarios()`: Sets `currentView` back to 'scenarioSelection', allowing the user to change their scenario choices. Resets `fortuneApiResponse`.
    *   **Audio Preference**: `userAudioPreference` is passed to `DisplayFortune` to control audio playback.
*   **Rendering**: Conditionally renders `<ScenarioSelection>` or `<DisplayFortune>` based on `currentView`. The `DisplayFortune` component receives `fortuneApiResponse` as `fortuneData`.
*   **Note**: This page seems to use the *reusable components* `ScenarioSelection` and `DisplayFortune` from the `components/fortune-journey/` directory.

### `app/scenario-selection/page.js`

*   **Purpose**: This is the page-level component for scenario selection, likely providing the main UI for this step if not using the `FortuneJourneyPage` orchestrator for this specific view. It allows users to select their role (Media Owner/Agency) and then choose from general and role-specific scenarios.
*   **State Variables**: Similar to `components/fortune-journey/ScenarioSelection.js`, including:
    *   `init`, `allScenarios`, `selectedScenarioIds`, `error`, `currentView`, `userType`, `initialSelections`, `isTransitionAudioPlaying`, `transitionAudioError`, `isGreetingAudioPlaying`, `greetingAudioError`, `hasPlayedGreetingForSession`.
    *   `isNavigationInProgress` (Boolean): Tracks if navigation to the next step is in progress.
*   **Key Functions & Logic**:
    *   Manages the same multi-step scenario selection logic as `components/fortune-journey/ScenarioSelection.js`.
    *   `handleProceedToFortune()`:
        *   Validates selections.
        *   Combines initial and role-specific scenario IDs.
        *   Stores selected IDs in `localStorage` (`selectedScenarioIDs`).
        *   **Crucially, it also stores a `pendingFortuneRequestBody` in `localStorage`. This body contains user details (from `userInfoForFortune` or `fetchedLinkedInData`) and the `selectedScenarioIDs`.** This suggests that the actual fortune generation might happen on a subsequent page (like `/generating-fortune` or `/linkedin-interlude`) which reads this pending request body.
        *   Plays a transition audio sequence.
        *   Navigates to `/linkedin-interlude` after the audio sequence.
    *   Other handlers (`handleScenarioToggle`, `handleProceedFromInitialAndUserType`, `handleUserTypeSelect`, `handleBack`) are similar to the component version.
    *   Audio playback for transitions and greetings uses Web Audio API.
*   **Data**: Defines `initialGeneralScenarios`, `mediaOwnerQuestions`, `agencyQuestions` internally.
*   **Differences from Component Version**:
    *   Handles its own navigation (e.g., to `/linkedin-interlude` or `/collect-info`).
    *   Sets `pendingFortuneRequestBody` in localStorage, indicating it prepares data for a later API call rather than making it directly.
*   **Dependencies**: `react`, `next/navigation`, `next/image`, `@/components/ui/*`, `lucide-react`, `@tsparticles/react`, `@tsparticles/slim`, `@/lib/predefined_scenarios.json` (imported), `framer-motion`.

### `app/display-fortune/page.js`

*   **Purpose**: This is the primary page for displaying the generated fortune to the user. It fetches fortune data from `localStorage`, handles complex audio narration (TTS for opening line, pre-recorded CEO message with captions), and manages visual effects and transitions.
*   **State Variables**:
    *   `init` (Boolean): Particles engine initialization.
    *   `fortune` (String): HTML string of the fortune.
    *   `isLoadingFortune` (Boolean): True while loading/processing fortune data.
    *   `audioPlaybackAllowed` (Boolean): Tracks if user has allowed audio playback.
    *   `openingLineToNarrate` (String): The opening line for TTS.
    *   `isNarrating` (Boolean): True if any narration is active.
    *   `narrationError` (String | null): Narration errors.
    *   `currentCeoCaption` (String): Current caption for CEO audio.
    *   `narrationStage` (Enum: 'idle', 'openingLine', 'ceoNarration', 'transitioning', 'done'): Controls narration/visual sequence.
    *   `hasPreRevealed` (Boolean): True if the fortune card content is ready to be shown.
    *   `isTransitioningToCeo` (Boolean): True during the avatar-to-CEO image transition.
    *   `showCeoImage` (Boolean): True to display the CEO image.
*   **Key Functions & Logic**:
    *   **Data Fetching**:
        *   On mount (after `init`), retrieves `fortuneData` from `localStorage`.
        *   Parses it and constructs an HTML string for display, also storing the structured fortune and HTML text in `localStorage` (`fortuneApp_structuredFortune`, `fortuneApp_fortuneText`).
        *   Sets `openingLineToNarrate`.
    *   **Audio Playback**:
        *   `getAudioContext()`: Manages Web Audio API context.
        *   Uses `Howler.js` for streaming TTS of `openingLineToNarrate` via `/api/generate-narration`.
        *   Plays a pre-recorded CEO message (`/audio/reach_out_to_mw.mp3`) using an HTML5 `<audio>` element.
        *   `handleCeoTimeUpdate()`: Updates `currentCeoCaption` based on `CEO_TRANSCRIPT` and current audio time.
        *   Manages `narrationStage` for sequential playback.
    *   **Visuals & Transitions**:
        *   `tsparticles` for background effects.
        *   `framer-motion` for card animations and avatar/CEO image transitions.
        *   A chime (`/audio/reveal_chime.mp3`) plays during the CEO image transition.
    *   **User Interaction**:
        *   `handleEnableAudio()`: Allows user to enable audio.
        *   `handleSaveAndShare()`: Navigates to `/scenario-answers`.
        *   Back button navigates using `router.back()`.
*   **Dependencies**: `react`, `next/navigation`, `next/image`, `@/components/ui/*`, `@tsparticles/react`, `@tsparticles/slim`, `lucide-react`, `framer-motion`, `howler`.

### `app/scenario-answers/page.js`

*   **Purpose**: Displays detailed answers or insights related to the scenarios previously selected by the user. It also provides options for sharing the fortune.
*   **State Variables**:
    *   `scenarioAnswers` (Array): Stores the fetched answers for the selected scenarios.
    *   `isLoading` (Boolean): True while fetching answers.
    *   `error` (String | null): Error messages.
    *   `shareMethod` (String | null): Currently selected method for sharing (e.g., 'email', 'whatsapp').
    *   `emailAddress` (String): Email address for sharing.
    *   `emailStatus` (String | null): Status of email sending.
    *   `shareableFortuneText` (String): Plain text version of the fortune for sharing.
    *   `userName` (String): User's name, retrieved from localStorage.
*   **Key Functions & Logic**:
    *   **Data Fetching (`fetchAnswers`)**:
        *   Retrieves `selectedScenarioIDs` from `localStorage`.
        *   Calls `/api/generate-scenario-answers` with these IDs.
        *   Updates `scenarioAnswers` with the response.
    *   **Fortune Text for Sharing**:
        *   On mount, constructs `shareableFortuneText` from `fortuneApp_structuredFortune` (if available) or `fortuneApp_fortuneText` from `localStorage`. It aims to create a clean, readable text version.
    *   **Sharing Functionality**:
        *   `handleShare()`:
            *   If `shareMethod` is 'email', calls `/api/send-email` with `emailAddress`, `userName`, and `shareableFortuneText`.
            *   If `shareMethod` is 'whatsapp', constructs a WhatsApp share URL.
            *   If `shareMethod` is 'copy', copies `shareableFortuneText` to clipboard.
    *   **Navigation**:
        *   `handleNavigateToContacts()`: Navigates to `/contact-details`.
    *   **UI**: Displays scenarios and their insights in expandable `Accordion` components. Provides buttons for different sharing methods and an input for email address.
*   **Dependencies**: `react`, `next/navigation`, `next/image`, `@/components/ui/*`, `lucide-react`, `framer-motion`.

### `app/contact-details/page.js`

*   **Purpose**: This page allows the user to enter their email address to receive their fortune via email. It also submits their details (including the fortune) as a lead. For users coming from the LinkedIn flow with an email already available, this process can be automated.
*   **State Variables**:
    *   `email` (String): The email address entered by the user or pre-filled.
    *   `error` (String): Error messages related to submission or email sending.
    *   `successMessage` (String): Success messages.
    *   `isLoading` / `isProcessing` (Boolean): Indicates if an operation is in progress.
    *   `shareableFortuneText` (String): Plain text version of the fortune (for email).
    *   `isLeadSaved` (Boolean): True if lead details have been successfully submitted.
    *   `isEmailSent` (Boolean): True if the fortune email has been successfully sent.
    *   `emailSendStatus` (Object: `{ message: String, type: String }`): Detailed status of email sending.
    *   `leadData` (Object): Stores user details (`fullName`, `industry`, `companyName`, `fortuneText`) retrieved from `localStorage`.
    *   `isLinkedInFlow` (Boolean): True if the user came through the LinkedIn flow.
    *   `linkedInEmail` (String): Email extracted from LinkedIn data.
    *   `autoProcessAttempted` (Boolean): Tracks if automatic processing for LinkedIn flow has been tried.
    *   `isEverythingDone` (Boolean): Computed state, true if both lead is saved and email is sent.
*   **Key Functions & Logic**:
    *   **Data Retrieval**: On mount, retrieves `fortuneApp_fullName`, `fortuneApp_industry`, `fortuneApp_companyName`, `fortuneApp_fortuneText`, and `fortuneApp_structuredFortune` from `localStorage`. If `fetchedLinkedInData` exists, it attempts to extract user details and email from it.
    *   `shareableFortuneText` is constructed similarly to `scenario-answers/page.js`.
    *   **Email Sending (`sendFortuneEmail`)**:
        *   A `useCallback` memoized function that calls `/api/send-email`.
        *   Takes `emailToSendTo`, `userFullName`, `fortuneContentForEmail` as arguments.
        *   Updates `emailSendStatus` and `isEmailSent`.
    *   **Automatic Processing (LinkedIn Flow)**:
        *   A `useEffect` hook attempts to auto-submit lead and send email if `isLinkedInFlow`, `linkedInEmail` is available, operations haven't been completed yet, and necessary data is present.
    *   **Manual Submission (`handleSubmit`)**:
        *   Validates email.
        *   Calls `/api/submit-lead` with `leadData` and the entered `email`. Sets `isLeadSaved`.
        *   If lead submission is successful, calls `sendFortuneEmail`.
    *   **UI**:
        *   Conditionally shows the email input form if not a LinkedIn flow with a pre-filled email or if everything isn't already done.
        *   Displays loading states, error messages, and success messages.
        *   Once `isEverythingDone`, shows a confirmation and a button to "Start New Fortune".
*   **Dependencies**: `react`, `next/navigation`, `@/components/ui/*`, `lucide-react`, `next/image`.

---

## 6. Libraries and Data (`lib/`)

### `lib/predefined_scenarios.json`

*   **Purpose**: A JSON file containing predefined scenarios, their display text, and detailed insights. This file is used by `/api/generate-scenario-answers/route.js` to provide answers when users select scenarios.
*   **Structure (Example Array Element)**:
    ```json
    {
      "id": "unique_scenario_id",
      "displayText": "Scenario question or statement presented to the user.",
      "category": "e.g., general, media_owner, agency",
      "details": {
        "subQuestion": "A more focused question related to the scenario.",
        "howMWHelps": [
          "Point 1 on how Moving Walls can help.",
          "Point 2 on how Moving Walls can help."
        ],
        "businessImpact": "Description of the potential business impact."
      }
    }
    ```
*   **Usage**: The `id` is used for selection, `displayText` is shown to the user, and `details` are provided as the "answer" or insight for that scenario.

---