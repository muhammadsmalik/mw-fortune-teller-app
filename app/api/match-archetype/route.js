// Placeholder for /api/match-archetype/route.js 

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const GEMINI_MODEL_NAME = process.env.GEMINI_MODEL_NAME || "gemini-2.5-flash-preview-04-17";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Define the schema for the archetype matching response (LLM part)
const llmArchetypeMatchSchema = {
  type: "OBJECT",
  properties: {
    userMatchedArchetype: {
      type: "OBJECT",
      properties: {
        name: {
          type: "STRING",
          description: "A creative, insightful, and fitting career archetype name for the user (e.g., 'The Strategic Innovator', 'The Empathetic Connector', 'The Visionary Technologist')."
        },
        explanation: {
          type: "STRING",
          description: "A concise explanation (2-3 sentences) of why this archetype fits the user, directly referencing key aspects of their provided profile (experiences, skills, summary)."
        }
      },
      required: ["name", "explanation"]
    },
    mwEmpowerment: {
      type: "OBJECT",
      properties: {
        title: {
          type: "STRING",
          description: "A catchy title related to Moving Walls empowering this archetype, e.g., 'How Moving Walls Fuels The [Archetype Name]'."
        },
        advice: {
          type: "STRING",
          description: "Specific, actionable advice (2-3 sentences) on how Moving Walls' solutions (OOH Campaign Automation, Location Intelligence, Programmatic DOOH, Advanced Targeting & Measurement) can help this archetype achieve their professional goals or overcome typical challenges. Tailor this to the archetype."
        }
      },
      required: ["title", "advice"]
    },
    suggestedConferenceConnection: {
      type: "OBJECT",
      properties: {
        attendeeName: {
          type: "STRING",
          description: "The full name of a relevant conference attendee from the provided list whose archetype or profile suggests a valuable connection for the user."
        },
        attendeeArchetype: {
          type: "STRING",
          description: "The archetype of the suggested attendee (must be one of the archetypes from the provided conference attendee list)."
        },
        connectionReason: {
          type: "STRING",
          description: "A brief, compelling reason (1-2 sentences) why the user should connect with this specific attendee, highlighting shared interests, complementary expertise, or mutual benefits based on their profiles and archetypes."
        }
        // profileImageURL is removed from LLM's responsibility
      },
      required: ["attendeeName", "attendeeArchetype", "connectionReason"]
    },
    overallNarrative: {
      type: "STRING",
      description: "A short, engaging overall narrative (1-2 sentences) that introduces this archetype discovery and encourages the user to leverage this insight during the conference."
    }
  },
  required: [
    "userMatchedArchetype",
    "mwEmpowerment",
    "suggestedConferenceConnection",
    "overallNarrative"
  ]
};

async function loadArchetypesData() {
  try {
    const filePath = path.join(process.cwd(), 'lib', 'archetypes_data.json');
    const jsonData = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(jsonData);
  } catch (error) {
    console.error("Failed to load or parse archetypes_data.json:", error);
    throw new Error("Could not load conference archetypes data.");
  }
}


export async function POST(request) {
  if (!GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY not configured.");
    return new Response(JSON.stringify({ error: "API key for Gemini not configured. Please set the GEMINI_API_KEY environment variable." }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }

  let conferenceArchetypes;
  try {
    conferenceArchetypes = await loadArchetypesData();
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const requestBody = await request.json();
    const { userData } = requestBody;

    if (!userData || (!userData.linkedInProfileSummary && !userData.manualData)) {
      return new Response(JSON.stringify({ error: "Missing required field: userData (either linkedInProfileSummary or manualData)" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let userProfileContext = "";
    if (userData.linkedInProfileSummary) {
      userProfileContext = `
        User LinkedIn Profile Summary:
        - Full Name: ${userData.linkedInProfileSummary.fullName || 'N/A'}
        - Headline: ${userData.linkedInProfileSummary.headline || 'N/A'}
        - Summary: ${userData.linkedInProfileSummary.summary || 'N/A'}
        - Occupation: ${userData.linkedInProfileSummary.occupation || 'N/A'}
        - Industry: ${userData.linkedInProfileSummary.industry || 'N/A'}
        - Experiences:
          ${userData.linkedInProfileSummary.experiences && userData.linkedInProfileSummary.experiences.length > 0
            ? userData.linkedInProfileSummary.experiences.map(exp =>
              `- Title: ${exp.title}, Company: ${exp.company}, Duration: ${exp.duration || 'N/A'}\n              Description: ${exp.description || 'N/A'}`).join('\n')
            : '  No experiences listed.'
          }
        - Education:
          ${userData.linkedInProfileSummary.education && userData.linkedInProfileSummary.education.length > 0
            ? userData.linkedInProfileSummary.education.map(edu =>
              `- Degree: ${edu.degree}, Field: ${edu.fieldOfStudy}, School: ${edu.school}`).join('\n')
            : '  No education listed.'
          }
        - Skills: ${userData.linkedInProfileSummary.skills && userData.linkedInProfileSummary.skills.length > 0 ? userData.linkedInProfileSummary.skills.join(', ') : 'No skills listed.'}
        - Key Accomplishments: ${userData.linkedInProfileSummary.keyAccomplishments && userData.linkedInProfileSummary.keyAccomplishments.length > 0 ? userData.linkedInProfileSummary.keyAccomplishments.join('; ') : 'No accomplishments listed.'}
      `;
    } else if (userData.manualData) {
      userProfileContext = `
        User Manual Data:
        - Full Name: ${userData.manualData.fullName || 'N/A'}
        - Industry: ${userData.manualData.industryType || 'N/A'}
        - Company: ${userData.manualData.companyName || 'N/A'}
        - Geographic Focus: ${userData.manualData.geographicFocus || 'N/A'}
        - Business Objective: ${userData.manualData.businessObjective || 'N/A'}
      `;
    }

    // LLM is still aware of profileImageURL for context, but not asked to return it.
    const conferenceArchetypesContext = `
      Available Conference Attendee Archetypes (for connection suggestions):
      ${conferenceArchetypes.map(att =>
      `- Name: ${att.name}, Archetype: ${att.archetype}, ProfileImageURL: ${att.profileImageURL || 'N/A'}\n  Summary: ${att.summary}\n  Connection Context: ${att.archetype_connection_llm_context}`).join('\n\n')}
    `;

    const prompt = `
You are an insightful career and networking advisor for the "Moving Walls Digital Fortune Teller" application, specializing in the media and advertising technology space. You have deep knowledge of Moving Walls' capabilities.

Your task is to analyze the provided user profile, determine a fitting career archetype, explain how Moving Walls can empower this archetype, and suggest a relevant connection from the list of conference attendees. Output your response in JSON format according to the provided schema.

User Profile Information:
${userProfileContext}

Context on Moving Walls:
Moving Walls is a global advertising technology leader. Key solutions include:
- OOH Campaign Automation: Modernizing campaign management.
- Location Intelligence (Moving Audiences): Multi-sensor data for precise audience understanding, planning, and verification.
- Programmatic DOOH DSP: Real-time, data-driven campaign optimization.
- Advanced Targeting & Measurement: Ensuring precise audience reach and trackable campaign performance (foot traffic, sales).
- Interactive OOH: Enabling engaging experiences that bridge physical ads with digital engagement.

Conference Attendee Information (use this to find a suitable connection):
${conferenceArchetypesContext}

Instructions:
1.  **Determine User's Archetype**: Based on their profile, define a "userMatchedArchetype" with a "name" (e.g., "The Data-Driven Growth Hacker") and an "explanation" of why it fits, referencing their profile. This archetype can be inspired by, but not necessarily identical to, the conference attendees' archetypes if a direct match isn't perfect.
2.  **Explain MW Empowerment**: For "mwEmpowerment", provide a "title" and "advice" on how Moving Walls' solutions specifically help this archetype.
3.  **Suggest Conference Connection**: For "suggestedConferenceConnection", thoughtfully select ONE attendee from the provided list. Your selection must be strategic:
    a.  **Prioritize Diversity**: Do not just select the first or most obvious match. Analyze the entire list of attendees.
    b.  **Foster International Connection**: If the user has a "Geographic Focus" specified in their profile, you MUST prioritize suggesting an attendee from a DIFFERENT country or region. Scan the attendee summaries for geographic clues (e.g., "Mexico City", "ANZ", "South Africa", "Dubai", "LATAM") to facilitate this. A domestic match is a last resort.
    c.  **Compelling Reason**: Provide their "attendeeName", their exact "attendeeArchetype" from the list, and a compelling "connectionReason" that clearly explains the value of this specific international connection.
    d.  **Tie-Breaker**: If multiple attendees are an equally good fit, prioritize suggesting someone who is NOT 'The DOOH Monetization Maverick' to ensure variety in suggestions.
    e.  Do NOT include profileImageURL in this part of the JSON.
4.  **Overall Narrative**: Craft a brief "overallNarrative" to introduce the archetype discovery.

Ensure your response is concise, insightful, and strictly adheres to the JSON schema provided.
    `;

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL_NAME,
      generationConfig: {
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: llmArchetypeMatchSchema, // Use the modified schema for LLM
      },
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      ],
    });

    const result = await model.generateContent(prompt);
    const llmResponse = result.response;

    if (!llmResponse || !llmResponse.text) {
      let debugInfo = "Gemini response object was null or undefined.";
       if (llmResponse && llmResponse.promptFeedback) {
         debugInfo += ` Prompt Feedback: ${JSON.stringify(llmResponse.promptFeedback, null, 2)}`;
       }
      console.error("Invalid response structure from Gemini API.", debugInfo);
      throw new Error(`Received no valid text response from Gemini API. ${debugInfo}`);
    }

    const responseJsonString = llmResponse.text();
    let llmMatchedData;
    try {
      llmMatchedData = JSON.parse(responseJsonString);
    } catch (jsonError) {
      console.error("Gemini response was not valid JSON:", responseJsonString, jsonError);
      throw new Error("Archetype data received from Gemini AI was not in the expected JSON format.");
    }
    
    // Basic validation of the parsed JSON structure from LLM
    const requiredTopLevelFields = llmArchetypeMatchSchema.required;
    for (const field of requiredTopLevelFields) {
        if (!(field in llmMatchedData)) {
            throw new Error(`Missing top-level required field '${field}' in Gemini response.`);
        }
    }
    if (!llmMatchedData.suggestedConferenceConnection || !llmMatchedData.suggestedConferenceConnection.attendeeName) {
        throw new Error("Gemini response missing suggestedConferenceConnection.attendeeName.")
    }

    // Manually look up and add profileImageURL
    const finalResponseData = { ...llmMatchedData };
    const suggestedAttendeeName = finalResponseData.suggestedConferenceConnection.attendeeName;
    const attendeeFromFile = conferenceArchetypes.find(att => att.name === suggestedAttendeeName);

    if (attendeeFromFile) {
        finalResponseData.suggestedConferenceConnection.profileImageURL = attendeeFromFile.profileImageURL || null;
         // Ensure attendeeArchetype matches the one from the file if LLM provided a slightly different one
        finalResponseData.suggestedConferenceConnection.attendeeArchetype = attendeeFromFile.archetype;
    } else {
        // Fallback if LLM suggests an attendee not in our list (should be rare with good prompting)
        finalResponseData.suggestedConferenceConnection.profileImageURL = null;
        console.warn(`LLM suggested attendee '${suggestedAttendeeName}' not found in archetypes_data.json.`) 
    }

    return new Response(JSON.stringify(finalResponseData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Error in /api/match-archetype:", error.message, error.stack);
    return new Response(JSON.stringify({ error: "Failed to match archetype due to an internal error.", details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 