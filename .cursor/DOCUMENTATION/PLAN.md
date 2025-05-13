Main Background: Dark Navy Blue (#151E43 / bg-mw-dark-navy).
Text on Dark Backgrounds: White (#FFFFFF / text-mw-white).
Accent/Highlight Color: Light Blue (#5BADDE / text-mw-light-blue or for backgrounds bg-mw-light-blue).
Gradients: Blue gradients from Light Blue (#5BADDE) to a darker shade (#3A7BBF / from-mw-light-blue to-mw-gradient-blue-darker) for CTAs and potentially card accents.
Typography: 'Roboto'. Headings are bold with increased letter spacing. Body text is regular.
UI Elements:
Buttons: Rounded corners, blue gradient backgrounds, dark text for contrast, subtle drop shadows.
Cards/Containers: Subtle rounded corners. The primary card background will be a slightly lighter shade of the Dark Navy Blue (e.g., bg-card which we defined as hsl(230 50% 22%) or bg-mw-dark-navy/90 if using opacity for variation, or a distinct darker shade like bg-slate-800 if it still fits). We need to be careful not to make it too busy if every card has a gradient. Let's aim for solid, slightly lighter navy cards, with gradients reserved for primary CTAs.
Input Fields (ShadCN): Will inherit styling from our updated globals.css (dark background, light text, light blue accent/ring).
Layout: Spacious, clear hierarchy, ample whitespace.
Shadows: Subtle drop shadows for depth on cards and buttons.
Moving Walls Logo: Discreetly placed, likely white or light blue, on most screens.
Screen-by-Screen UI/UX Plan (Moving Walls Theme):

Screen 1: Welcome Screen (Already Implemented)

Covered: Dark navy background, white text, light blue cookie icon, gradient CTA button.
Screen 2: Input Information (Pre-Fortune)

Purpose: Collect Full Name, Industry Type, Company Name.
Layout:
Main Background: bg-mw-dark-navy.
Content Container: A centered Card (ShadCN <Card>) with bg-card (our slightly lighter navy, hsl(230 50% 22%)), rounded-lg, shadow-lg.
Visuals within Card:
Header (H2): "A Glimpse Into Your World..." (Text: text-mw-white, font-bold, tracking-wide).
Instructional Text: "To tailor your fortune, please share a few details." (Text: text-mw-white/80).
Form Fields (ShadCN <Input>, <Select>):
Labels: text-mw-white/90.
Inputs: Will use themed styles (dark input background, white text, ring-mw-light-blue on focus).
CTA Button: "Consult the Oracle"
Styling: bg-gradient-to-r from-mw-light-blue to-mw-gradient-blue-darker, text-mw-dark-navy, rounded-lg, shadow-md. Full width within the card or centered.
Moving Walls Logo: Bottom-left of the screen, text-mw-white/70.
Screen 2.5: Fortune Generation Animation (Brief & Engaging)

Purpose: Minimal gamification, build anticipation.
Visuals:
Main Background: bg-mw-dark-navy.
Animation: A Lottie animation of a fortune cookie (`public/animations/fortune-cookie-animation.json`) is displayed.
Text: A series of engaging loading phrases (e.g., "Consulting the data streams...", "Aligning the digital stars...") are cycled through (Text: text-mw-white/80).
Duration: 2-3 seconds (currently ~2.8 seconds before auto-navigation).
Screen 3: Display Fortune

Purpose: Present the generated fortune.
Layout:
Main Background: bg-mw-dark-navy.
Content Container: Centered Card (bg-card, rounded-lg, shadow-lg).
Visuals within Card:
Header (H2): "Your Fortune Reveals..." (Text: text-mw-white, font-bold, tracking-wide).
Fortune Display Area:
The layout presents the fortune alongside an image of the CEO:
  Image Area: Displays a picture of "Srikanth Ramachandran, Founder CEO, Moving Walls".
  Fortune Text Area: A distinct sub-panel (bg-mw-dark-navy, border-mw-light-blue/30) displays the structured fortune:
    - Opening Line: Creative and engaging (font-caveat, text-2xl sm:text-3xl).
    - Detailed Insights: Location Insight, Audience Opportunity, Engagement Forecast, Transactions Prediction, and AI Oracle's Guidance are presented as labeled sections. The AI Oracle's Guidance includes a call to action to connect with Moving Walls.
    (Text: text-mw-white, text-sm sm:text-base, with strong tags for labels colored text-mw-light-blue/90).
CTA Button: "Save & Share This Wisdom"
Styling: bg-gradient-to-r from-mw-light-blue to-mw-gradient-blue-darker, text-mw-dark-navy, rounded-lg, shadow-md.
Moving Walls Logo: Bottom-left of the screen, text-mw-white/70.
Screen 4: Prompt for Contact & Sharing

Purpose: Capture mandatory contact details and offer sharing.
Layout:
Main Background: bg-mw-dark-navy.
Content Container: Centered Card (bg-card, rounded-lg, shadow-lg).
Visuals within Card:
Header (H2): "Keep Your Fortune & Connect!" (Text: text-mw-white, font-bold, tracking-wide).
Instructional Text: "Enter your details to receive your fortune and learn how Moving Walls can help you achieve it." (Text: text-mw-white/80). Mandatory fields are indicated with an asterisk (*) and validated with error messages.
Form Fields (ShadCN <Input>):
Labels: text-mw-white/90.
Inputs: Themed (dark input, white text, ring-mw-light-blue on focus) for Email and Phone Number (using `react-phone-number-input` for phone).
Main CTA (Form Submission):
  Button initially labeled "Send My Fortune" (Styling: bg-gradient-to-r from-mw-light-blue to-mw-gradient-blue-darker, text-mw-dark-navy). This action saves the user's details and the fortune, then enables sharing options.
  Upon successful submission, the button text changes to "Finish & Continue" and navigates to the thank-you page.
Sharing Options Header: "Share Your Insight:" (text-mw-white/70, displayed after details are saved or if already saved).
Sharing Buttons (WhatsApp, Email):
Styled using an outlined approach: `border-mw-light-blue text-mw-light-blue hover:bg-mw-light-blue/10`.
Include Lucide icons (Mail for Email, QrCode for WhatsApp QR) colored text-mw-light-blue.
Rounded corners, subtle shadow.
Moving Walls Logo: Bottom-left of the screen, text-mw-white/70.
Screen 5: Completion/Thank You & Reset

Purpose: Confirm actions, thank the user, promote demo, and reset.
Layout:
Main Background: bg-mw-dark-navy.
Content: Centered, can be outside a card for a more "full-screen success" feel, or within a slightly larger, more presentational card.
Visuals:
Confirmation Icon: Large CheckCircle2 from Lucide, colored text-mw-light-blue, size w-20 h-20 or w-24 h-24.
Headline (H1/H2): "Success!" or "Your Fortune is on its Way!" (Text: text-mw-white, font-bold, tracking-wide).
Body Text: "Thank you! We've sent your business fortune to [Contact Method]. Check your messages!" (Text: text-mw-white/90).
Secondary CTA (Moving Walls Demo):
Text: "Ready to make this fortune a reality?" (text-mw-white/90).
Button: "Book a Demo with Moving Walls"
Styling: Prominent gradient CTA: bg-gradient-to-r from-mw-light-blue to-mw-gradient-blue-darker, text-mw-dark-navy, rounded-lg, shadow-lg.
Moving Walls Logo: More prominent here, perhaps text-mw-white and slightly larger, or the actual SVG logo.
Reset Info: "This screen will reset for the next visionary in [X] seconds..." (text-mw-white/60).
General UI/UX Considerations (Moving Walls Theme):

Consistency: Strict adherence to the color palette and typography.
Whitespace: Maintain generous spacing within cards and between elements for a clean, professional look.
Clarity: Ensure all text is highly readable against its background.
Hierarchy: Use font weight, size, color (e.g., text-mw-white vs text-mw-white/80), and spacing to establish clear visual hierarchy.
Interactions:
Focus states for inputs should use ring-mw-light-blue.
Button hover/active states should be subtle but clear (e.g., slight brightness change on gradient, slight scale).
Loading states on buttons (spinners) should use mw-light-blue or mw-white.
Error Handling:
Inline error messages for forms: Displayed in a themed div (e.g., `text-red-400 bg-red-900/30 border-red-400/50`) with an `AlertCircle` icon.
Success messages are similarly displayed in a themed div with a `CheckCircle2` icon.
This revised plan ensures that every step of the user journey is infused with the Moving Walls brand identity, providing a professional and cohesive experience.
