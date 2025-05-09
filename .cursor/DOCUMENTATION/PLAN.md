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
Animation: Focus on subtle, professional animations.
A stylized data-stream or network graphic converging (using mw-light-blue lines on the mw-dark-navy background).
Or, a simple loading spinner/pulsing circle using mw-light-blue. The "cookie cracking" might feel a bit off-brand with the stricter Moving Walls theme, so a more abstract "processing" animation is better.
Text (Optional): "Consulting the data streams..." or "Your insight is being generated..." (Text: text-mw-white/80).
Duration: 2-3 seconds.
Screen 3: Display Fortune

Purpose: Present the generated fortune.
Layout:
Main Background: bg-mw-dark-navy.
Content Container: Centered Card (bg-card, rounded-lg, shadow-lg).
Visuals within Card:
Header (H2): "Your Fortune Reveals..." (Text: text-mw-white, font-bold, tracking-wide).
Fortune Display Area:
A distinct sub-panel within the card, perhaps with a very subtle border border-mw-light-blue/30 or a slightly different shade like bg-mw-dark-navy (if card is lighter).
Fortune Text: "[Positive Business Prediction related to Industry]. To know more, reach out to Moving Walls." (Text: text-mw-white, font-roboto, perhaps slightly larger body text). The "Moving Walls" part could be font-bold or text-mw-light-blue for subtle emphasis.
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
Instructional Text: "Enter your details to receive your fortune and learn how Moving Walls can help you achieve it." (Text: text-mw-white/80). Include "(Mandatory)" clearly.
Form Fields (ShadCN <Input>):
Labels: text-mw-white/90.
Inputs: Themed (dark input, white text, ring-mw-light-blue).
Sharing Options Header: "Choose how you'd like to receive it:" (text-mw-white/70).
Sharing Buttons (WhatsApp, Email):
These could be secondary-style buttons to differentiate from the main gradient CTA.
Option 1 (Subtler Gradient/Solid): Solid bg-mw-light-blue with text-mw-dark-navy, or a less prominent gradient.
Option 2 (Outlined): border-mw-light-blue text-mw-light-blue hover:bg-mw-light-blue/10.
Include Lucide icons (MessageCircleMore for WhatsApp, Mail for Email) colored text-mw-light-blue if outlined, or text-mw-dark-navy if solid background.
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
Inline error messages for forms: text-red-400 (or a theme-aligned destructive color if defined).
Toast/Alerts (ShadCN): Style these to fit the theme (dark background, white text, potentially a mw-light-blue accent for info/success, red for error).
This revised plan ensures that every step of the user journey is infused with the Moving Walls brand identity, providing a professional and cohesive experience.
