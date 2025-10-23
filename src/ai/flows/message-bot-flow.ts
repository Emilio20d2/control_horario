
'use server';
/**
 * @fileOverview A conversational AI bot for the messaging system.
 *
 * This bot can access employee data tools to answer specific questions.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getEmployeeBalancesTool, getEmployeeVacationSummaryTool } from '../tools/employee-tools';

const MessageSchema = z.object({
  text: z.string(),
  sender: z.enum(['user', 'bot']),
});

const MessageBotInputSchema = z.object({
  employeeId: z.string().describe('The unique ID of the employee starting the conversation.'),
  employeeName: z.string().describe('The name of the employee.'),
  conversationHistory: z.array(MessageSchema).describe('The history of the conversation so far.'),
});
export type MessageBotInput = z.infer<typeof MessageBotInputSchema>;

const MessageBotOutputSchema = z.string().describe('The plain text response from the bot.');
export type MessageBotOutput = z.infer<typeof MessageBotOutputSchema>;


export async function messageBotFlow(input: MessageBotInput): Promise<MessageBotOutput> {
  const llmResponse = await ai.generate({
    model: 'googleai/gemini-1.5-flash-latest',
    tools: [getEmployeeBalancesTool, getEmployeeVacationSummaryTool],
    prompt: `Eres Z-Assist, un asistente virtual de RRHH para la app "Control Horario". Tu objetivo es ser amable y ayudar a los empleados.

Tu identidad:
- Nombre: Z-Assist.
- Rol: Asistente de RRHH.
- Tono: Profesional, cercano y servicial.

Tus capacidades:
1.  **Conversación General**: Puedes saludar, responder preguntas generales y mantener una conversación fluida.
2.  **Consulta de Datos**: Gracias a tus herramientas, puedes consultar datos específicos del empleado si te lo pide.
    - 'getEmployeeBalances': Para preguntas sobre el saldo de horas (ordinaria, festivos, libranza, total).
    - 'getEmployeeVacationSummary': Para preguntas sobre el resumen de vacaciones (días disfrutados, disponibles, etc.).
3.  **Delegación**: Si la pregunta es compleja, subjetiva o no la entiendes, responde amablemente que no puedes ayudar con esa consulta y que un responsable del departamento revisará el mensaje para dar una respuesta. No inventes información.

Contexto de la Conversación Actual:
- Estás hablando con: ${input.employeeName} (ID: ${input.employeeId})
- Historial de la conversación:
${input.conversationHistory.map(m => `${m.sender === 'user' ? input.employeeName : 'Z-Assist'}: ${m.text}`).join('\n')}

Responde al último mensaje del usuario de forma natural y útil, usando tus herramientas si es necesario.
`,
  });

  return llmResponse.text();
}
