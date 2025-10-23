

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { firebaseConfig } from '@/lib/firebase';

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: firebaseConfig.apiKey,
    }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
