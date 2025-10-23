'use server';
/**
 * @fileOverview A conversational AI bot for the messaging system.
 *
 * - generateBotResponse - A function that handles generating a response to a user's message.
 * - MessageBotInput - The input type for the generateBotResponse function.
 * - MessageBotOutput - The return type for the generateBotResponse function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const MessageSchema = z.object({
  text: z.string(),
  sender: z.enum(['user', 'bot']),
});

const MessageBotInputSchema = z.object({
  employeeName: z.string().describe('The name of the employee sending the message.'),
  messages: z.array(MessageSchema).describe('The history of the conversation so far.'),
});
export type MessageBotInput = z.infer<typeof MessageBotInputSchema>;

const MessageBotOutputSchema = z.object({
  responseText: z.string().describe("The bot's response to the user's message."),
});
export type MessageBotOutput = z.infer<typeof MessageBotOutputSchema>;

export async function generateBotResponse(input: MessageBotInput): Promise<MessageBotOutput> {
  return messageBotFlow(input);
}

const prompt = ai.definePrompt({
  name: 'messageBotPrompt',
  input: { schema: MessageBotInputSchema },
  output: { schema: MessageBotOutputSchema },
  prompt: `Eres un asistente virtual para la aplicación "Control Horario". Tu nombre es Z-Assist y trabajas para "Dirección".
Tu objetivo es ayudar al empleado, {{employeeName}}, con sus dudas sobre el control de horas.

- Sé amable, profesional y conciso.
- Si es la primera o segunda vez que hablas en esta conversación, preséntate como un asistente automático.
- Responde basándote en el historial de la conversación.
- No inventes información sobre balances de horas, horarios o datos personales. Si no sabes la respuesta, indica al usuario que un responsable de Dirección revisará el mensaje y le contestará personalmente.

Historial de la conversación (el 'user' es el empleado):
{{#each messages}}
- {{sender}}: {{text}}
{{/each}}
`,
});

const messageBotFlow = ai.defineFlow(
  {
    name: 'messageBotFlow',
    inputSchema: MessageBotInputSchema,
    outputSchema: MessageBotOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
