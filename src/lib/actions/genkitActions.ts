
'use server';

import { calculateWeeklyImpactFlow } from '@/ai/calculate-hours';
import type { Employee, AbsenceType, DailyData, ContractType } from '@/lib/types';


interface CalculateWeeklyImpactParams {
    employee: Employee;
    weekData: Record<string, DailyData>;
    initialBalances: {
        ordinary: number;
        holiday: number;
        leave: number;
    };
    weeklyHoursOverride?: number | null;
    totalComplementaryHours?: number | null;
    allAbsenceTypes: AbsenceType[];
    allContractTypes: ContractType[];
}

export async function calculateWeeklyImpact(params: CalculateWeeklyImpactParams) {
    // Call the flow function directly instead of using `run`
    const flowResult = await calculateWeeklyImpactFlow(params);
    return flowResult;
}
