
'use server';
/**
 * @fileOverview A conversational AI bot for the messaging system.
 *
 * This bot can access employee data tools to answer specific questions.
 */
import { ai } from '@/ai/genkit';
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


export async function messageBotFlow(input: any): Promise<string> {
    const MessageBotInputSchema = z.object({
        employeeId: z.string().describe('The unique ID of the employee starting the conversation.'),
        employeeName: z.string().describe('The name of the employee.'),
        formattedHistory: z.string().describe('The full conversation history, pre-formatted as a single string.'),
    });

    const messageBotPrompt = ai.definePrompt(
        {
            name: 'messageBotPrompt',
            input: { schema: MessageBotInputSchema },
            output: { schema: z.string() },
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
- Estás hablando con: {{{employeeName}}} (ID: {{{employeeId}}})
- Historial de la conversación:
{{{formattedHistory}}}

Responde al último mensaje del usuario de forma natural y útil, usando tus herramientas si es necesario.
`
        }
    );

    const { text } = await ai.generate({
        model: 'googleai/gemini-1.5-pro-latest',
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
${input.formattedHistory}

Responde al último mensaje del usuario de forma natural y útil, usando tus herramientas si es necesario.`,
        tools: [getEmployeeBalancesTool, getEmployeeVacationSummaryTool],
    });
    return text;
}
