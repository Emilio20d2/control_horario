/**
 * @fileoverview This file initializes and a new Genkit instance.
 */
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';


export const ai = genkit({
  plugins: [
    googleAI({
      apiVersion: 'v1beta',
    }),
  ],
  // The `logLevel` option is deprecated in Genkit v1.x.
  // Logging can be configured in your environment.
  enableTracingAndMetrics: true,
});
