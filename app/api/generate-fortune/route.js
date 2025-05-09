import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

const MODEL_NAME = "gemini-2.5-flash-preview-04-17"; // Or your preferred Gemini model
const API_KEY = process.env.GEMINI_API_KEY;

// Define the schema for the fortune
const fortuneSchema = {
  type: "OBJECT",
  properties: {
    openingLine: {
      type: "STRING",
      description: "A creative, engaging opening line for the fortune. Make it sound mystical or exciting. Should not include emojis."
    },
    locationInsight: {
      type: "STRING",
      description: "An insightful statement about the user's business location or operational context, relevant to OOH advertising potential. Start with a relevant emoji like 📍."
    },
    audienceOpportunity: {
      type: "STRING",
      description: "A projection of the audience they can reach or the market opportunities available, particularly with OOH media. Start with a relevant emoji like 👀."
    },
    engagementForecast: {
      type: "STRING",
      description: "A prediction of how their engagement could improve, ideally tying into OOH strategies. Start with a relevant emoji like 💥."
    },
    transactionsPrediction: {
      type: "STRING",
      description: "A forecast related to business growth, sales, or conversions, hinting at how OOH could contribute. Start with a relevant emoji like 💸."
    },
    aiAdvice: {
      type: "STRING",
      description: "Actionable advice, presented as if from an AI oracle. Start with a relevant emoji like 🔮. This advice should subtly highlight how Moving Walls' expertise or solutions can help. End with a call to action to connect with Moving Walls."
    }
  },
  required: [
    "openingLine",
    "locationInsight",
    "audienceOpportunity",
    "engagementForecast",
    "transactionsPrediction",
    "aiAdvice"
  ],
  propertyOrdering: [
    "openingLine",
    "locationInsight",
    "audienceOpportunity",
    "engagementForecast",
    "transactionsPrediction",
    "aiAdvice"
  ]
};

export async function POST(request) {
  if (!API_KEY) {
    console.error("GEMINI_API_KEY not configured");
    return new Response(JSON.stringify({ error: "API key not configured. Please set the GEMINI_API_KEY environment variable." }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { fullName, industryType, companyName } = await request.json();

    if (!fullName || !industryType || !companyName) {
      return new Response(JSON.stringify({ error: "Missing required fields: fullName, industryType, or companyName" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let prompt = `You are a witty and insightful business fortune teller for the "Moving Walls Digital Fortune Teller" application.
User Details:
- Name: ${fullName}
- Company: ${companyName}
- Industry: ${industryType}

Generate a unique, optimistic, and slightly mystical business fortune tailored to this user. The fortune should focus on potential success and opportunities, especially highlighting how Out-of-Home (OOH) advertising and related technologies can play a role.

Company Context (Moving Walls - the provider of this fortune):
Moving Walls is a global advertising technology leader specializing in OOH media. Key services include:
- OOH Campaign Automation: Streamlining planning, buying, execution, and measurement.
- Location Intelligence (Moving Audiences): Using multi-sensor data for precise planning and verification.
- Programmatic DOOH DSP: Enabling real-time, data-driven campaign optimization.
- Advanced Targeting & Measurement: Ensuring precise audience reach and campaign performance tracking.

Instructions for Fortune Sections (follow the provided JSON schema):
- openingLine: Craft a captivating hook. No emojis here.
- locationInsight: Provide an observation about their operational context, linking to OOH.
- audienceOpportunity: Describe the potential audience reach via OOH.
- engagementForecast: Predict improvements in engagement, perhaps through innovative OOH.
- transactionsPrediction: Forecast business growth/conversions, with a nod to OOH impact.
- aiAdvice: Offer actionable advice as if from an AI oracle. Subtly integrate how Moving Walls' solutions (from the Company Context) are key to achieving the fortune's promise. Conclude this section with a positive call to action like, "To unlock this future and explore how Moving Walls can guide your ascent, reach out to our experts!" or a similar encouraging phrase.

Ensure each insight section (locationInsight, audienceOpportunity, engagementForecast, transactionsPrediction, aiAdvice) begins its text with the specific emoji mentioned in its schema description.
`;

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        // temperature: 0.75, // Slightly more creative
        // topK: 40,
        // topP: 0.95,
        responseMimeType: "application/json",
        responseSchema: fortuneSchema,
      },
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      ],
    });

    // console.log("Sending prompt to Gemini:", prompt);

    const result = await model.generateContent(prompt);
    const response = result.response;

    // console.log("Raw response from Gemini:", JSON.stringify(response, null, 2));

    if (!response || !response.text) {
      console.error("Invalid response from Gemini API", response);
      throw new Error("Received no text response from Gemini API.");
    }

    const responseJsonString = response.text();
    // console.log("Gemini response (JSON string):", responseJsonString);
    
    // Validate if the response is parsable JSON (optional, but good practice)
    try {
      JSON.parse(responseJsonString);
    } catch (jsonError) {
      console.error("Gemini response was not valid JSON:", responseJsonString, jsonError);
      throw new Error("Fortune received from AI was not in the expected format.");
    }

    return new Response(responseJsonString, { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error("Error in /api/generate-fortune:", error);
    let errorMessage = "Failed to generate fortune due to an internal error.";
    let errorDetails = error.message || error.toString();

    if (error.message && error.message.includes("responseSchema")) {
      errorMessage = "Fortune generation failed due to a schema mismatch. Please contact support.";
    } else if (error.message && error.message.includes("API key not valid")) {
        errorMessage = "Fortune generation failed due to an API key issue. Please check server configuration.";
    }

    return new Response(JSON.stringify({ error: errorMessage, details: errorDetails }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 