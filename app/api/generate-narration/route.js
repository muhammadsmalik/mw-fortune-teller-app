import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';
// PassThrough is not strictly needed if we directly return OpenAI's response body stream.
// import { PassThrough } from 'stream';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define the voice instructions server-side for specific voices
const BALLAD_TTS_INSTRUCTIONS = `**Tone & Timbre:**
A genie&apos;s voice carries an *otherworldly resonance*, like it reverberates from a place beyond the physical world. It has layers—deep and velvety in one breath, then sharp and crystalline the next. The lower tones might rumble like distant thunder, while higher notes shimmer with a metallic echo, like wind chimes in an empty temple.

**Cadence & Rhythm:**
The speech has a *deliberate elegance*, often flowing like ancient poetry or song, with rhythmic pauses that make each word feel significant—*measured, but not slow*. It can shift instantly, becoming quick and unpredictable, like a spark leaping from fire when the genie is amused, annoyed, or impatient.

**Accents & Inflections:**
There might be traces of archaic or exotic accents, difficult to place—part Middle Eastern, part celestial, part something entirely unearthly. The vowels stretch luxuriously, and the consonants often land with a whispered crispness, like dry leaves brushing against stone. When casting spel`; // Truncated for brevity if it was longer

async function handler(request) {
  console.log(`[API /generate-narration] Received ${request.method} request`);
  let textInput = '';
  let voice = 'ballad'; // Default voice
  let instructions = '';

  try {
    if (request.method === 'POST') {
      const body = await request.json();
      textInput = body.textInput;
      voice = body.voice || voice; // Use voice from body if provided, else default
      instructions = body.instructions; // POST requests can provide their own instructions
      console.log('[API /generate-narration] Parsed POST request body:', { textInputLength: textInput?.length, voice, instructionsLength: instructions?.length });
    } else if (request.method === 'GET') {
      const { searchParams } = new URL(request.url);
      textInput = searchParams.get('textInput');
      voice = searchParams.get('voice') || voice; // Use voice from query if provided, else default
      console.log('[API /generate-narration] Parsed GET request query params:', { textInputLength: textInput?.length, voice });
      // For GET requests, instructions are determined server-side based on voice
      if (voice === 'ballad') {
        instructions = BALLAD_TTS_INSTRUCTIONS;
      } else {
        // Potentially handle other voices or default/no instructions
        // For now, if not ballad, instructions will be empty unless we define more.
        console.warn(`[API /generate-narration] No specific server-side instructions for voice: ${voice} on GET request.`);
      }
    }

    if (!textInput) {
      console.error('[API /generate-narration] Error: Missing textInput');
      return NextResponse.json({ error: "Missing textInput" }, { status: 400 });
    }
    // Voice is defaulted, so it will always be present. Instructions might be empty for non-ballad GET.
    // Let's allow empty instructions for flexibility if OpenAI API permits.
    // if (!instructions && voice === 'ballad') { // Only strictly require instructions for ballad if that's intended
    //   console.error('[API /generate-narration] Error: Missing instructions for ballad voice');
    //   return NextResponse.json({ error: "Missing instructions for ballad voice" }, { status: 400 });
    // }
    if (!process.env.OPENAI_API_KEY) {
        console.error('[API /generate-narration] Error: OpenAI API key not configured.');
        return NextResponse.json({ error: "OpenAI API key not configured." }, { status: 500 });
    }

    console.log(`[API /generate-narration] Calling OpenAI API with model gpt-4o-mini-tts, voice ${voice}.`);
    const response = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: voice,
      input: textInput,
      instructions: instructions, // Can be empty if not ballad/custom
      response_format: "mp3",
    });

    console.log('[API /generate-narration] OpenAI API response status:', response.status);
    if (!response.ok) {
      const errorData = await response.text(); // Use .text() for more robust error parsing
      console.error('[API /generate-narration] OpenAI TTS API Error:', response.status, errorData);
      return NextResponse.json({ error: "Failed to generate audio from OpenAI", details: errorData }, { status: response.status });
    }

    console.log('[API /generate-narration] Streaming audio response back to client.');
    // Directly use response.body which is a ReadableStream
    return new NextResponse(response.body, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-cache', 
      },
    });

  } catch (error) {
    console.error('[API /generate-narration] Internal server error:', error);
    return NextResponse.json({ error: "Internal server error", details: error.message || String(error) }, { status: 500 });
  }
}

export { handler as GET, handler as POST };

// Optional: Add a GET handler or OPTIONS handler if needed for CORS or testing
// The main handler now covers GET, so this specific OPTIONS might still be useful.
export async function OPTIONS() {
  console.log('[API /generate-narration] Received OPTIONS request');
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*', // Adjust for production
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization', // Added Authorization if needed in future
    }
  });
} 