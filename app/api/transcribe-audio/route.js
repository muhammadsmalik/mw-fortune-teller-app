import { createClient } from '@deepgram/sdk';
import { NextResponse } from 'next/server';
// Use fsPromises for modern async/await file operations like writeFile and unlink.
import fsPromises from 'node:fs/promises'; 
// Use the standard fs module for stream-based operations like createReadStream.
import fs from 'node:fs';                 
import path from 'node:path';         
import os from 'node:os';           

export async function POST(request) {
  // Securely access the Deepgram API key from environment variables.
  const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

  if (!DEEPGRAM_API_KEY) {
    console.error('DEEPGRAM_API_KEY not configured');
    return NextResponse.json({ error: 'Deepgram API key not configured.' }, { status: 500 });
  }

  let tempFilePath = null; 

  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio');

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided.' }, { status: 400 });
    }

    console.log(`Received audio file: name='${audioFile.name}', type='${audioFile.type}', size=${audioFile.size} bytes`);

    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());

    // Strategy: Save the audio buffer to a temporary file on the server.
    // Deepgram's 'transcribeFile' method can be more robust with file paths/streams 
    // for certain formats (like webm/opus from MediaRecorder) than direct buffer processing.
    const tempDir = os.tmpdir();
    tempFilePath = path.join(tempDir, `temp_audio_${Date.now()}.${audioFile.name.split('.').pop() || 'webm'}`);
    
    console.log('Saving audio to temporary file:', tempFilePath);
    await fsPromises.writeFile(tempFilePath, audioBuffer);
    console.log('Temporary file saved successfully.');

    const deepgram = createClient(DEEPGRAM_API_KEY);

    console.log('Attempting to transcribe file from path:', tempFilePath);
    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      // Pass the audio as a readable stream from the temporary file.
      fs.createReadStream(tempFilePath), 
      {
        model: 'nova-3',
        language: 'en',
        smart_format: true,
        punctuate: true,
      }
    );

    if (error) {
      console.error('Deepgram API Error (from file transcription):', error);
      return NextResponse.json({ error: 'Failed to transcribe audio from file.', details: error.message }, { status: 500 });
    }

    if (result && result.results && result.results.channels && result.results.channels.length > 0 &&
        result.results.channels[0].alternatives && result.results.channels[0].alternatives.length > 0) {
      const transcript = result.results.channels[0].alternatives[0].transcript;
      console.log('Transcription successful from file. Transcript:', transcript);
      return NextResponse.json({ transcript }, { status: 200 });
    } else {
      console.error('Deepgram: No transcript in result (from file transcription)', JSON.stringify(result, null, 2));
      return NextResponse.json({ transcript: "" }, { status: 200 });
    }

  } catch (err) {
    console.error('Error in /api/transcribe-audio:', err);
    return NextResponse.json({ error: 'Internal server error.', details: err.message }, { status: 500 });
  } finally {
    // Ensure the temporary file is deleted regardless of transcription success or failure.
    if (tempFilePath) {
      try {
        console.log('Deleting temporary file:', tempFilePath);
        await fsPromises.unlink(tempFilePath);
        console.log('Temporary file deleted successfully.');
      } catch (unlinkError) {
        console.error('Error deleting temporary file:', tempFilePath, unlinkError);
      }
    }
  }
} 