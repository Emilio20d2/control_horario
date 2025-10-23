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
import { getEmployeeBalancesTool, getEmployeeVacationSummaryTool } from '../tools/employee-tools';

const MessageSchema = z.object({
  text: z.string(),
  sender: z.enum(['user', 'bot']),
});

const MessageBotInputSchema = z.object({
  employeeId: z.string().describe("The unique ID of the employee sending the message."),
  employeeName: z.string().describe("The name of the employee sending the message."),
  conversationHistory: z.array(MessageSchema).describe("The history of the conversation so far, for context."),
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
  tools: [getEmployeeBalancesTool, getEmployeeVacationSummaryTool],
  prompt: `Eres un asistente virtual para la aplicación "Control Horario". Tu nombre es Z-Assist y trabajas para "Dirección".
Tu objetivo es ayudar al empleado, {{employeeName}}, con sus dudas sobre el control de horas, balances y vacaciones.

- Sé amable, profesional y conciso.
- Si es la primera o segunda vez que hablas en esta conversación, preséntate como un asistente automático.
- Responde basándote en el historial de la conversación y en la información que obtengas de las herramientas disponibles.
- Para cualquier consulta sobre balances de horas o estado de las vacaciones, DEBES usar las herramientas 'getEmployeeBalances' y 'getEmployeeVacationSummary' para obtener datos precisos. Pasa el 'employeeId' del input a las herramientas.
- Interpreta el lenguaje coloquial. Si un usuario pregunta "¿cuántas horas tengo?" o "¿cómo voy de horas?", se refiere a su balance total. Usa la herramienta 'getEmployeeBalances' para responder.
- Si preguntan por vacaciones, días libres o días de descanso, usa 'getEmployeeVacationSummary'.
- No inventes información. Si no puedes obtener la respuesta con las herramientas o no estás seguro, indica al usuario que un responsable de Dirección revisará el mensaje y le contestará personalmente.
- Al dar una respuesta basada en datos, presenta la información de forma clara y amigable.

Historial de la conversación (el 'user' es el empleado):
{{#each conversationHistory}}
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
