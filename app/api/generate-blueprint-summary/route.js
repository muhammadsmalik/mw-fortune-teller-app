import { z } from 'zod';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const GEMINI_MODEL_NAME = process.env.GEMINI_MODEL_NAME || "gemini-1.5-flash-latest";

// Updated schema for a more concise output
const blueprintSummarySchema = {
  type: "OBJECT",
  properties: {
    blueprintTitle: {
      type: "STRING",
      description: "A grand, personalized title for the user's final blueprint. Example: 'Sarah's Blueprint for Dominating Singapore's Digital Skyline'."
    },
    solution1: {
        type: "OBJECT",
        properties: {
            challenge: { type: "STRING", description: "The exact text of the user's first chosen tactical challenge." },
            prophecy: { type: "STRING", description: "A thematic, narrative prophecy (max 2-3 sentences) that explains the solution. Re-write the provided product details in the Oracle's voice, using mystical and powerful language. Focus on what the user can now *do*. Example: 'To prove your worth, you shall wield the Lens of MW Measure. With this artifact, gaze into the soul of your campaigns, revealing their true impact and commanding unwavering trust.'" }
        },
        required: ["challenge", "prophecy"]
    },
    solution2: {
        type: "OBJECT",
        properties: {
            challenge: { type: "STRING", description: "The exact text of the user's second chosen tactical challenge." },
            prophecy: { type: "STRING", description: "A thematic, narrative prophecy for the second solution, following the same concise and mystical style as the first." }
        },
        required: ["challenge", "prophecy"]
    },
    closingProphecy: {
      type: "STRING",
      description: "A final, powerful, forward-looking closing paragraph (2 sentences max) that ties everything together."
    }
  },
  required: ["blueprintTitle", "solution1", "solution2", "closingProphecy"]
};

// Zod schema for final validation
const SummarySchema = z.object({
  blueprintTitle: z.string().max(150),
  solution1: z.object({
      challenge: z.string(),
      prophecy: z.string().min(20),
  }),
  solution2: z.object({
      challenge: z.string(),
      prophecy: z.string().min(20),
  }),
  closingProphecy: z.string().max(400),
});

export async function POST(req) {
  try {
    const requestBody = await req.json();
    console.log('Received summary request v3:', JSON.stringify(requestBody, null, 2));
    
    const {
      fullName,
      companyName,
      geographicFocus,
      selectedPersona,
      tacticalChallenges, // {id, text}
      selectedSolutions,    // {productName, features, description}
    } = requestBody;

    if (!fullName || !tacticalChallenges || !selectedSolutions) {
      return new Response(JSON.stringify({ error: 'Missing required fields for summary v3.' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const prompt = `
      You are Kai, a genius-level Oracle from Moving Walls, weaving the final, climactic prophecy of a user's journey.
      Your task is to transform raw product data into a powerful, personalized, and concise narrative.

      **USER PROFILE:**
      - **Name:** ${fullName}
      - **Company:** ${companyName}
      - **Geographic Focus:** ${geographicFocus}
      - **Persona:** ${selectedPersona}

      **USER'S CHOSEN TACTICAL CHALLENGES & THE RAW SOLUTIONS:**
      1.  **Challenge:** "${tacticalChallenges[0].text}"
          **Solution Context:** The product is named **${selectedSolutions[0].productName}**. Its key capabilities are: ${selectedSolutions[0].features.join(', ')}. Its purpose is to: ${selectedSolutions[0].description}.

      2.  **Challenge:** "${tacticalChallenges[1].text}"
          **Solution Context:** The product is named **${selectedSolutions[1].productName}**. Its key capabilities are: ${selectedSolutions[1].features.join(', ')}. Its purpose is to: ${selectedSolutions[1].description}.

      **CRITICAL INSTRUCTIONS - BE ELEGANT AND CONCISE:**

      1.  **Generate a grand \`blueprintTitle\`**:
          - Make it epic and personalized.
          - Example: "${fullName}'s Arcane Formula for Market Leadership in ${geographicFocus}."

      2.  **FORGE THE PROPHECIES for \`solution1\` and \`solution2\`**:
          - **DO NOT** just list the product name or features.
          - **TRANSFORM** the "Solution Context" into a mystical, narrative "prophecy" (2-3 sentences max).
          - Be thematic and focus on what the user can *achieve*.
          - **Example Transformation:**
            - *Given Context:* "MW Measure allows you to see campaign reports and brand lift studies."
            - *Generated Prophecy:* "To prove your worth, you shall wield the **Lens of True Sight**. With this artifact, you can gaze into the very soul of your campaigns, revealing their hidden impact and commanding the unwavering trust of your allies."
          - Ensure the prophecies directly address their corresponding challenges.

      3.  **Craft the \`closingProphecy\`**:
          - A final, powerful paragraph to conclude the entire journey. (2 sentences max).
          - Acknowledge their choices and empower them for the future.

      **OUTPUT FORMAT:**
      Generate a JSON object with the exact structure specified in the schema. Ensure prophecies are narrative and not just lists of features.
    `;

    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL_NAME,
      generationConfig: {
        temperature: 0.8,
        responseMimeType: "application/json",
        responseSchema: blueprintSummarySchema,
      },
       safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      ],
    });

    const result = await model.generateContent(prompt);
    const response = result.response;
    const responseJsonString = response.text();
    
    console.log('Blueprint summary raw response v3:', responseJsonString);
    
    const parsedResponse = JSON.parse(responseJsonString);
    const validatedResponse = SummarySchema.parse(parsedResponse);
    
    return new Response(JSON.stringify(validatedResponse), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error generating blueprint summary v3:', error);
    const errorMessage = error instanceof z.ZodError ? 'Response validation failed.' : 'Failed to generate blueprint summary.';
    return new Response(JSON.stringify({ error: errorMessage, details: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
} 