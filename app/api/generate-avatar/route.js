import { NextResponse } from 'next/server';
import OpenAI, { toFile } from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
  try {
    const { profileImageUrl, archetypeName } = await request.json();

    if (!profileImageUrl) {
      return NextResponse.json(
        { error: 'Profile image URL is required' },
        { status: 400 }
      );
    }

    // Download the profile image
    const imageResponse = await fetch(profileImageUrl);
    if (!imageResponse.ok) {
      throw new Error('Failed to fetch profile image');
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const imageFile = await toFile(Buffer.from(imageBuffer), 'profile.jpg', {
      type: 'image/jpeg',
    });

    const prompt = `
Generate a clean, flat-style digital vector avatar based on the reference image.
Maintain the person's core facial features, hairstyle, and overall expression, 
but stylize them using bold outlines, flat colors, and minimal shading.

This avatar represents the archetype: "${archetypeName || 'Professional'}".

Use the archetype to infer any thematic symbolism, mood, or digital elements 
that should be subtly reflected in the background or overall composition.

The composition should be head-and-shoulders only, on a light or neutral background. 
Avoid photorealism. Keep the aesthetic modern, professional, and minimalist.
`;

    // Use the new API syntax with array of images
    const images = [imageFile];

    const response = await client.images.edit({
      model: "gpt-image-1",
      image: images,
      prompt,
    });

    // Extract the base64 image data
    const image_base64 = response.data[0].b64_json;

    return NextResponse.json({
      success: true,
      avatarImage: `data:image/png;base64,${image_base64}`
    });

  } catch (error) {
    console.error('Avatar generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate avatar: ' + error.message },
      { status: 500 }
    );
  }
} 