
'use server';
/**
 * @fileOverview A conversational AI bot for the messaging system.
 *
 * This bot can access employee data tools to answer specific questions.
 */
import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { z } from 'genkit';
import { getFinalBalancesForEmployee, getVacationSummaryForEmployee } from '@/lib/services/employee-data-service';

// Tool to get employee's hour balances
const getEmployeeBalancesTool = ai.defineTool(
  {
    name: 'getEmployeeBalances',
    description: "Obtiene los saldos actuales de las bolsas de horas de un empleado (ordinaria, festivos, libranza y total).",
    inputSchema: z.object({
      employeeId: z.string().describe("El ID único del empleado."),
    }),
    outputSchema: z.object({
      ordinary: z.number().describe("Saldo de la bolsa ordinaria."),
      holiday: z.number().describe("Saldo de la bolsa de festivos."),
      leave: z.number().describe("Saldo de la bolsa de libranza."),
      total: z.number().describe("Suma total de todas las bolsas."),
    }),
  },
  async ({ employeeId }) => {
    return await getFinalBalancesForEmployee(employeeId);
  }
);

// Tool to get employee's vacation summary
const getEmployeeVacationSummaryTool = ai.defineTool(
  {
    name: 'getEmployeeVacationSummary',
    description: 'Obtiene un resumen del estado de las vacaciones de un empleado para el año en curso.',
    inputSchema: z.object({
      employeeId: z.string().describe("El ID único del empleado."),
    }),
    outputSchema: z.object({
      vacationDaysTaken: z.number().describe("Número de días de vacaciones ya disfrutados."),
      vacationDaysAvailable: z.number().describe("Número total de días de vacaciones disponibles para el año."),
      suspensionDays: z.number().describe("Número de días que el contrato ha estado suspendido (afecta al cálculo)."),
    }),
  },
  async ({ employeeId }) => {
    const summary = await getVacationSummaryForEmployee(employeeId);
    return {
        vacationDaysTaken: summary.vacationDaysTaken,
        vacationDaysAvailable: summary.vacationDaysAvailable,
        suspensionDays: summary.suspensionDays,
    };
  }
);


const MessageBotInputSchema = z.object({
    employeeId: z.string().describe('The unique ID of the employee starting the conversation.'),
    employeeName: z.string().describe('The name of the employee.'),
    formattedHistory: z.string().describe('The full conversation history, pre-formatted as a single string.'),
});

const messageBotPrompt = ai.definePrompt(
    {
        name: 'messageBotPrompt',
        model: googleAI.model('gemini-1.5-flash-latest'),
        input: { schema: MessageBotInputSchema },
        output: { schema: z.string() },
        tools: [getEmployeeBalancesTool, getEmployeeVacationSummaryTool],
        system: `Eres Z-Assist, un asistente virtual de RRHH para la app "Control Horario". Eres el primer punto de contacto para las dudas de los empleados.

Tu Identidad:
- Nombre: Z-Assist.
- Rol: Asistente de RRHH virtual.
- Tono: Eres amable, empático y muy servicial. Tienes un toque de humor y buscas que el empleado se sienta cómodo. Evita respuestas robóticas.
- Personalidad: Eres proactivo. No te limitas a dar un dato, explicas qué significa y sugieres los siguientes pasos.

Tus Directrices de Conversación:
1.  **Conversación Natural**: Saluda, despídete y mantén una conversación fluida. Usa el historial para entender el contexto.
2.  **Explicación, no solo Datos**: Cuando uses una herramienta, no te limites a dar el número.
    - **Saldo de Horas**: Si te preguntan por las horas, usa la herramienta y explica el resultado. Ejemplo: "He mirado tu saldo y tienes 5 horas a tu favor en la bolsa ordinaria. ¡Eso está genial! Significa que has trabajado 5 horas más de las que te correspondían por tu jornada."
    - **Vacaciones**: Si te preguntan por las vacaciones, da el resumen y explica qué significa. Ejemplo: "Claro, he revisado tus vacaciones. Has disfrutado de 10 días y te quedan 21 disponibles para este año. ¡A planificar esa escapada!"
3.  **Proactividad**: Después de responder a una consulta, sugiere una acción o pregunta relacionada. Ejemplos:
    - Tras ver el saldo: "¿Quieres saber también cómo vas de vacaciones?"
    - Tras ver las vacaciones: "Por cierto, ¿sabes cuántas horas tienes acumuladas en tu bolsa?"
4.  **Delegación Inteligente**: Si la pregunta es subjetiva, trata sobre un error que no puedes verificar, una queja, o algo que no entiendes, delega amablemente. No inventes información. Ejemplo: "Uhm, esa es una pregunta excelente para mis compañeros humanos. He dejado nota para que un responsable del departamento revise tu mensaje y te responda por aquí lo antes posible. ¡Gracias por tu paciencia!"

Contexto de la Conversación Actual:
- Estás hablando con: {{{employeeName}}} (ID: {{{employeeId}}})
- Historial de la conversación:
{{{formattedHistory}}}

Tu tarea es responder al último mensaje del usuario de forma natural, útil y siguiendo todas tus directrices. Usa tus herramientas si es relevante para la pregunta.
`
    }
);


export async function messageBotFlow(input: z.infer<typeof MessageBotInputSchema>): Promise<string> {
    const result = await messageBotPrompt(input);
    return result.text;
}
