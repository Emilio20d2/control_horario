
'use server';

import { generateWeeklySummary, WeeklySummaryInput } from '@/ai/generate-weekly-summary-flow';

export async function getAIWeeklySummary(params: WeeklySummaryInput): Promise<string> {
    try {
        const result = await generateWeeklySummary(params);
        return result.summary;
    } catch (error) {
        console.error("Error generating AI summary:", error);
        return ""; // Return empty string on error to not break the UI
    }
}
