import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';
import { PassThrough } from 'stream';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
  console.log('[API /generate-narration] Received request');
  try {
    const { textInput, instructions } = await request.json();
    console.log('[API /generate-narration] Parsed request body:', { textInputLength: textInput?.length, instructionsLength: instructions?.length });

    if (!textInput) {
      console.error('[API /generate-narration] Error: Missing textInput');
      return NextResponse.json({ error: "Missing textInput" }, { status: 400 });
    }
    if (!instructions) {
      console.error('[API /generate-narration] Error: Missing instructions');
      return NextResponse.json({ error: "Missing instructions" }, { status: 400 });
    }
    if (!process.env.OPENAI_API_KEY) {
        console.error('[API /generate-narration] Error: OpenAI API key not configured.');
        return NextResponse.json({ error: "OpenAI API key not configured." }, { status: 500 });
    }

    console.log('[API /generate-narration] Calling OpenAI API with model gpt-4o-mini-tts, voice ballad.');
    const response = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "ballad",
      input: textInput,
      instructions: instructions,
      response_format: "pcm",
    });

    console.log('[API /generate-narration] OpenAI API response status:', response.status);
    if (!response.ok) {
      const errorData = await response.text();
      console.error('[API /generate-narration] OpenAI TTS API Error:', response.status, errorData);
      return NextResponse.json({ error: "Failed to generate audio from OpenAI", details: errorData }, { status: response.status });
    }

    console.log('[API /generate-narration] Streaming audio response back to client.');
    return new NextResponse(response.body, {
      status: 200,
      headers: {
        'Content-Type': 'audio/pcm',
      },
    });

  } catch (error) {
    console.error('[API /generate-narration] Internal server error:', error);
    return NextResponse.json({ error: "Internal server error", details: error.message || String(error) }, { status: 500 });
  }
}

// Optional: Add a GET handler or OPTIONS handler if needed for CORS or testing
export async function OPTIONS() {
  console.log('[API /generate-narration] Received OPTIONS request');
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
} 