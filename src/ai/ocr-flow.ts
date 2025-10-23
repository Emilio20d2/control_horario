
'use server';
/**
 * @fileOverview An image OCR (Optical Character Recognition) AI agent.
 *
 * - extractTextFromImage - A function that handles the text extraction process.
 * - OCRInput - The input type for the extractTextFromImage function.
 * - OCROutput - The return type for the extractTextFromImage function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const OCRInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a document or scene with text, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
type OCRInput = z.infer<typeof OCRInputSchema>;

const OCROutputSchema = z.object({
  text: z.string().describe('The text extracted from the image.'),
});
type OCROutput = z.infer<typeof OCROutputSchema>;

export async function extractTextFromImage(input: OCRInput): Promise<OCROutput> {
  return ocrFlow(input);
}

const prompt = ai.definePrompt({
  name: 'ocrPrompt',
  input: { schema: OCRInputSchema },
  output: { schema: OCROutputSchema },
  prompt: `Extract the text from the following image.
Photo: {{media url=photoDataUri}}`,
});

const ocrFlow = ai.defineFlow(
  {
    name: 'ocrFlow',
    inputSchema: OCRInputSchema,
    outputSchema: OCROutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
