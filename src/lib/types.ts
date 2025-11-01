

import type { Timestamp } from 'firebase/firestore';

export interface WorkHoursRecord {
    effectiveDate: string; // YYYY-MM-DD
    weeklyHours: number;
}

export interface DaySchedule {
    hours: number;
    isWorkDay: boolean;
}

/**
 * Represents a single calendar configuration within an employee's history.
 * The `effectiveDate` is the anchor for the 4-week turn rotation calculation.
 */
export interface WeeklyScheduleData {
    effectiveDate: string; // YYYY-MM-DD
    endDate?: string | null;
    shifts: {
        turn1: Record<string, DaySchedule>;
        turn2: Record<string, DaySchedule>;
        turn3: Record<string, DaySchedule>;
        turn4: Record<string, DaySchedule>;
    };
}

export interface ScheduledAbsence {
    id: string;
    absenceTypeId: string;
    startDate: Date; 
    endDate: Date | null;
    isDefinitive: boolean; // True if it's the record to be shown on the planner
    notes?: string | null; // For extra info like appointment time
    originalRequest?: {
        startDate: Date | string;
        endDate: Date | string | null;
    }
}

export interface EmploymentPeriod {
    id: string;
    contractType: string;
    startDate: string | Date; // YYYY-MM-DD from form, Date in state
    endDate: string | Date | null; // YYYY-MM-DD from form, Date in state
    isTransfer?: boolean;
    vacationDaysUsedInAnotherCenter?: number;
    annualComputedHours: number;
    initialOrdinaryHours: number;
    initialHolidayHours: number;
    initialLeaveHours: number;
    vacationDays2024?: number | null;
    workHoursHistory?: WorkHoursRecord[];
    /**
     * Historical log of an employee's work calendars. This array allows for multiple
     * calendars over time. For any given date, the system intelligently finds the
     * most recent calendar whose `effectiveDate` is on or before that date,
     * ensuring the correct turn schedule is always applied.
     */
    weeklySchedulesHistory?: WeeklyScheduleData[];
    scheduledAbsences?: ScheduledAbsence[];
}

export interface Employee {
    id: string;
    name: string;
    employeeNumber?: string;
    dni?: string | null;
    phone?: string | null;
    email?: string | null;
    authId?: string | null;
    employmentPeriods: EmploymentPeriod[];
}
  
export interface Holiday {
    id: string;
    name: string;
    date: Date | Timestamp;
    type: 'Nacional' | 'Regional' | 'Local' | 'Apertura';
}

export interface HolidayFormData {
    id?: string;
    name: string;
    date: string; // YYYY-MM-DD
    type: 'Nacional' | 'Regional' | 'Local' | 'Apertura';
}

export interface ContractType {
    id: string;
    name: string;
    computesOrdinaryBag: boolean;
    computesHolidayBag: boolean;
    computesOffDayBag: boolean;
}
  
export interface AbsenceType {
    id: string;
    name: string;
    abbreviation: string;
    color?: string;
    
    // Columna 1: Cómputo Principal
    computesToWeeklyHours: boolean;
    computesToAnnualHours: boolean;
    suspendsContract: boolean;

    // Columna 2: Lógica Avanzada
    annualHourLimit: number | null;
    deductsHours: boolean;
    computesFullDay: boolean;
    affectedBag: 'ordinaria' | 'festivos' | 'libranza' | 'ninguna';
    isAbsenceSplittable: boolean;
}

export interface AnnualConfiguration {
    id: string; // Usually the year as a string, e.g. "2025"
    year: number;
    maxAnnualHours: number;
    referenceWeeklyHours: number;
}
  
export interface WeeklyRecord {
    id: string; // Format: YYYY-MM-DD (start of week, Monday)
    weekData: Record<string, DailyEmployeeData>; // Key: employeeId
}

export interface WeeklyRecordWithBalances {
    id: string;
    data: DailyEmployeeData;
    initialBalances: {
      ordinary: number;
      holiday: number;
      leave: number;
    };
    impact: {
        ordinary: number;
        holiday: number;
        leave: number;
    };
    finalBalances: {
      ordinary: number;
      holiday: number;
      leave: number;
    };
}

export interface DailyEmployeeData {
    days: Record<string, DailyData>; // Key: YYYY-MM-DD
    confirmed: boolean;
    totalComplementaryHours?: number | null;
    generalComment?: string | null;
    weeklyHoursOverride?: number | null; // Nullable to distinguish between 0 and not set
    isDifference?: boolean;
    previousBalances?: { // Used to revert on un-confirm
        ordinary: number;
        holiday: number;
        leave: number;
    };
    impact?: {
        ordinary: number;
        holiday: number;
        leave: number;
    };
    hasPreregistration?: boolean;
    // Campos para auditoría desde Excel
    expectedOrdinaryImpact?: number;
    expectedHolidayImpact?: number;
    expectedLeaveImpact?: number;
}

export interface DailyData {
    theoreticalHours: number;
    workedHours: number;
    absence: string; // 'ninguna' or abbreviation of AbsenceType
    absenceHours: number;
    leaveHours: number;
    doublePay: boolean;
    isHoliday: boolean;
    holidayType: 'Nacional' | 'Regional' | 'Local' | 'Apertura' | null;
}

export interface EmployeeFormData {
    name: string;
    employeeNumber?: string;
    dni?: string;
    phone?: string;
    email?: string;
    role?: string;
    groupId?: string;
    startDate: string;
    endDate?: string | null;
    isTransfer?: boolean;
    vacationDaysUsedInAnotherCenter?: number;
    contractType: string;
    newContractType?: string;
    newContractTypeDate?: string;
    initialWeeklyWorkHours: number;
    newWeeklyWorkHours?: number;
    newWeeklyWorkHoursDate?: string;
    annualComputedHours: number;
    initialOrdinaryHours?: number;
    initialHolidayHours?: number;
    initialLeaveHours?: number;
    vacationDays2024?: number;
    weeklySchedules: WeeklyScheduleData[];
    newWeeklySchedule?: WeeklyScheduleData;
};

export interface AbsenceTypeFormData {
    name: string;
    abbreviation: string;
    computesToWeeklyHours: boolean;
    computesToAnnualHours: boolean;
    suspendsContract: boolean;
    annualHourLimit?: number;
    deductsHours: boolean;
    computesFullDay: boolean;
    affectedBag: 'ordinaria' | 'festivos' | 'libranza' | 'ninguna';
    isAbsenceSplittable: boolean;
}

export interface AppUser {
    id: string; // Corresponds to Firebase Auth UID
    email: string;
    employeeId: string;
    role: 'admin' | 'employee';
    trueRole?: 'admin' | 'employee';
}


export interface PrefilledEmployeeData {
    expectedOrdinaryImpact?: number;
    expectedHolidayImpact?: number;
    expectedLeaveImpact?: number;
}

export interface PrefilledWeeklyRecord {
    weekData: Record<string, PrefilledEmployeeData>;
}

export interface HolidayEmployee {
    id: string;
    name: string;
    active: boolean;
    groupId?: string | null;
    workShift?: string;
    employeeNumber?: string;
}

export type HolidayReportAssignment = 'doublePay' | 'dayOff' | 'ninguna';

export interface HolidayReport {
    id: string; // weekId_employeeId
    weekId: string;
    weekDate: Timestamp;
    employeeId: string;
    substituteId: string;
    substituteName: string;
}

export interface EmployeeGroup {
    id: string;
    name: string;
    order: number;
    color?: string; // Add color property
}

export interface Ausencia {
    id: string;
    startDate: Date;
    endDate: Date;
    absenceTypeId: string;
    absenceAbbreviation: string;
    periodId?: string;
    originalRequest?: {
        startDate: Date;
        endDate: Date | null;
    },
    isDefinitive: boolean;
    color?: string;
  }

export interface Conversation {
    id: string;
    employeeId: string;
    employeeName: string;
    lastMessageText: string;
    lastMessageTimestamp: Timestamp;
    unreadByAdmin: boolean;
    unreadByEmployee: boolean;
}

export interface Message {
    id: string;
    text: string;
    senderId: string;
    timestamp: Date;
}

export interface VacationCampaign {
    id: string;
    title: string;
    description: string;
    submissionStartDate: Date | Timestamp;
    submissionEndDate: Date | Timestamp;
    absenceStartDate: Date | Timestamp;
    absenceEndDate: Date | Timestamp;
    allowedAbsenceTypeIds: string[];
    isActive: boolean;
}

export interface CorrectionRequest {
    id: string; // weekId_employeeId
    weekId: string;
    employeeId: string;
    employeeName: string;
    reason: string;
    status: 'pending' | 'resolved';
    requestedAt: Timestamp;
}
    

    
