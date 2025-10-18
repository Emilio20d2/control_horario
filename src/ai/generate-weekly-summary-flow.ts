
'use server';
/**
 * @fileOverview A Genkit flow to automatically generate a concise weekly summary comment.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Define the schema for the input data for a single day
const DayDataSchema = z.object({
  dayName: z.string().describe('The name of the day (e.g., Lunes, Martes).'),
  workedHours: z.number().describe('Hours worked on this day.'),
  absence: z.string().describe('The type of absence (abbreviation). "ninguna" if no absence.'),
  absenceHours: z.number().describe('Hours of absence on this day.'),
});

// Define the schema for the flow's input
export const WeeklySummaryInputSchema = z.object({
  days: z.array(DayDataSchema).describe('An array of data for each day of the week.'),
  totalComplementaryHours: z.number().describe('Total complementary (extra) hours for the week.'),
  totalWorkedHours: z.number().describe('Total hours worked during the week.'),
  totalTheoreticalHours: z.number().describe('Total theoretical hours the employee was supposed to work.'),
});
export type WeeklySummaryInput = z.infer<typeof WeeklySummaryInputSchema>;

// Define the schema for the flow's output
export const WeeklySummaryOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the week. Max 50 characters.'),
});
export type WeeklySummaryOutput = z.infer<typeof WeeklySummaryOutputSchema>;

// Define the prompt for the AI
const generateSummaryPrompt = ai.definePrompt({
  name: 'generateWeeklySummaryPrompt',
  input: { schema: WeeklySummaryInputSchema },
  output: { schema: WeeklySummaryOutputSchema },
  prompt: `
    You are an expert HR assistant. Your task is to generate a very brief, neutral, and informative summary for an employee's weekly time record.

    **Instructions:**
    1.  The summary MUST be in Spanish.
    2.  The summary MUST be a maximum of 50 characters. Be concise.
    3.  Prioritize the most important event of the week.
    4.  If there are complementary hours, always mention them. E.g., "Semana con 4.5h comp."
    5.  If there's a significant absence (Baja, Vacaciones), mention it. E.g., "Inicio de Baja" or "Semana de Vacaciones".
    6.  If there's a notable difference between worked and theoretical hours, you can mention it. E.g., "Balance semanal -3.5h".
    7.  If nothing special happened, you can use a generic comment like "Semana normal" or "Jornada completada".
    8.  Do not add any preamble or explanation. Just provide the summary text.

    **Context Data:**
    - Complementary Hours: {{totalComplementaryHours}}h
    - Total Worked: {{totalWorkedHours}}h
    - Theoretical Hours: {{totalTheoreticalHours}}h
    - Daily Details:
      {{#each days}}
      - {{dayName}}: {{workedHours}}h worked, Absence: {{absence}} ({{absenceHours}}h)
      {{/each}}
  `,
});

// Define the flow
const generateWeeklySummaryFlow = ai.defineFlow(
  {
    name: 'generateWeeklySummaryFlow',
    inputSchema: WeeklySummaryInputSchema,
    outputSchema: WeeklySummaryOutputSchema,
  },
  async (input) => {
    // If no significant data, return empty summary to avoid unnecessary AI calls.
    const hasData = input.totalComplementaryHours > 0 || input.days.some(d => d.absence !== 'ninguna');
    if (!hasData && input.totalWorkedHours === 0) {
      return { summary: '' };
    }

    const { output } = await generateSummaryPrompt(input);
    return output || { summary: '' };
  }
);

// Export a wrapper function to be called from server actions
export async function generateWeeklySummary(input: WeeklySummaryInput): Promise<WeeklySummaryOutput> {
  return generateWeeklySummaryFlow(input);
}
