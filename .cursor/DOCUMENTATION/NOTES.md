PROD NOTES:
- Set domain
- Set API Keys
- Double check whether lead gets saved when email is extracted from LI


1. Make fortune more concise & relevant
    a. Either capture more information to personalize it
    b. Or explicitly mention that it needs to be more tailored
2. Loading screen should be appear while it is being generated
3. States reload upon form filling and loading screen text looping
4. Nice to have: Mystic trail following mouse cursor
5. Fallback LLM
6. Modify the email/WA QR button to save lead as soon as it’s clicked.
7. Retry mechanism
8. Thank you page
9. Fix formatting on WA & Email
10. Add branding to email and pages.


---


- fix double logos
- replace CEO with MW logo
- add training data




---



# 19th May 2025:
1. After sending email automatically, should clear the variable (or maybe shouldn't set it in the first place)



Email looks like this:
Hello Sal Malik,

Here's your business fortune as requested:

The data streams reveal your path, Sal...

Your AI solutions impact the physical world; target innovation hubs where your code meets concrete.

Reach decision-makers gathering at industry events or tech corridors, ripe for automation insights.

Use dynamic screens to showcase real-time AI capabilities, boosting demo requests by 40%.

Secure larger enterprise contracts by demonstrating AI's real-world impact via tailored OOH narratives.

Oracle AI suggests: Use location data to pinpoint ideal OOH zones for maximum tech adoption potential. Leverage Moving Walls' platform for data-driven placement and proof of impact. Connect with Moving Walls to elevate your reach!

I'd love to book a meeting to learn more...

Learn more about Moving Walls: https://www.movingwalls.com/contact-us/

Best regards,
Your AI Fortune Teller at Moving Walls



---

Checkpoint: 

1. Fixed manual flow routing to ensure fortunes are generated correctly before display. Both manual and LinkedIn flows now follow a unified path through generating-fortune, enhancing user experience and maintainability.

2. Added bg music that's persistent across all the screens.

3. Added captioning to both welcome screen and display fortune screen

4. Implemented streaming audio to reduce delay from 6+ seconds to 2-3 seconds



⸻

🔴 High Priority (Immediate - Blockers / User Experience Issues)
	1.	Add captions/subtitles for the fortune teller’s voice across all relevant screens.
	•	Needed due to audibility issues in live environments.
	•	Should be styled like a dialogue, but format is up to creative freedom.
	2.	Add mild background music/soundscape throughout the journey.
	•	Mystic chimes or ambient audio to maintain immersion and engagement.
	•	Should play continuously and not abruptly cut off.
	3.	Fix delay before audio playback (approx. 6 seconds delay before audio starts).
	•	Audio should begin more smoothly or at least align better with screen transitions.
	4.	Ensure voice continues during idle/instruction moments (e.g., while waiting to tap door).
	•	Add light narration or filler comments (“I’m looking into it…” etc.) to avoid dead air.
	5.	Fix sound enable issue where voice only plays after user enables audio.
	•	Investigate auto-play or alternative UX triggers.
	6.	Add a “Back” button at every stage.
	•	So users can return without completing the whole flow again.

⸻

🟠 Medium Priority (Important - Feature Refinement or Flow Logic)
	7.	Insert a screen before the scenario selection screen to ask:
	•	“Are you a media owner or agency?”
	•	Explore toggle vs. two-screen layout depending on screen real estate.
	•	Validate if LinkedIn data can answer this instead to avoid asking explicitly.
	8.	Explore enhancing the scenario selection screen:
	•	Conditional display based on user type (media owner vs agency).
	•	Use mirror-image layout of the fortune teller if presented on one screen.
	9.	Ensure layout is not too cluttered (especially if using both types on one screen).
	•	Prefer clean UI with left/right layout or toggle, depending on feasibility.
	10.	Improve final fortune reveal sequence:
	•	Smooth transition from question screen to reveal.
	•	Ensure music and captions are consistent here too.

⸻

🟡 Low Priority (Quality of Life / Infrastructure)
	11.	Improve email template system:
	•	Make it configurable so it can be updated without code changes.
	•	Match email visuals more closely with what’s shown in the app.
	12.	Log LinkedIn profile data (if available):
	•	If scraping is possible, store as a blob for later use.
	•	Check proxy/curl logs to determine if current data can be used.

⸻

Let me know if you’d like a task board format (e.g., for Notion, Trello, or Jira), or if you’d like these converted into engineering tickets with acceptance criteria.