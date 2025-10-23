'use server';
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getFinalBalancesForEmployee, getVacationSummaryForEmployee } from '@/lib/services/employee-data-service';

// Tool to get employee's hour balances
export const getEmployeeBalancesTool = ai.defineTool(
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
export const getEmployeeVacationSummaryTool = ai.defineTool(
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
