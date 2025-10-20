import { NextRequest, NextResponse } from 'next/server';
import { gemini15Flash, googleAI } from '@genkit-ai/google-genai';
import { genkit } from 'genkit';

// configure a Genkit instance
const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-1.5-flash-latest', // set default model
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name') || 'World';

  const helloFlow = ai.defineFlow('helloFlow', async (name: string) => {
    // make a generation request
    const { text } = await ai.generate(`Hello Gemini, my name is ${name}`);
    return text();
  });

  try {
    const responseText = await helloFlow(name);
    return NextResponse.json({ response: responseText });
  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
