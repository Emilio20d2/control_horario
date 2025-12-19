import type { Employee, EmployeeFormData, DailyData, EmploymentPeriod, ScheduledAbsence, WeeklyScheduleData } from '../types';
import {
  addDocument,
  updateDocument,
  deleteDocument,
  setDocument,
  getDocumentById,
} from './databaseService';

const generateId = () => {
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const normalizeDateInput = (value: string | Date | null | undefined): string | null => {
  if (!value) return null;
  if (value instanceof Date) {
    return value.toISOString();
  }
  return new Date(value).toISOString();
};

const buildEmploymentPeriod = (formData: EmployeeFormData, existingPeriodId?: string): EmploymentPeriod => {
  const periodId = existingPeriodId ?? `period_${Date.now()}`;
  
  const workHoursHistory = [
    {
      effectiveDate: formData.startDate,
      weeklyHours: formData.initialWeeklyWorkHours,
    },
  ];

  // Add new work hours if provided
  if (formData.newWeeklyWorkHours && formData.newWeeklyWorkHoursDate) {
    workHoursHistory.push({
      effectiveDate: formData.newWeeklyWorkHoursDate,
      weeklyHours: formData.newWeeklyWorkHours,
    });
  }

  const weeklySchedulesHistory: WeeklyScheduleData[] = formData.weeklySchedules?.length > 0 
    ? formData.weeklySchedules 
    : [];

  // Add new schedule if provided
  if (formData.newWeeklySchedule?.effectiveDate) {
    weeklySchedulesHistory.push(formData.newWeeklySchedule);
  }

  return {
    id: periodId,
    contractType: formData.contractType,
    startDate: formData.startDate,
    endDate: formData.endDate ?? null,
    isTransfer: formData.isTransfer ?? false,
    vacationDaysUsedInAnotherCenter: formData.vacationDaysUsedInAnotherCenter ?? 0,
    annualComputedHours: formData.annualComputedHours ?? 0,
    initialOrdinaryHours: formData.initialOrdinaryHours ?? 0,
    initialHolidayHours: formData.initialHolidayHours ?? 0,
    initialLeaveHours: formData.initialLeaveHours ?? 0,
    vacationDays2024: formData.vacationDays2024 ?? 30,
    workHoursHistory,
    weeklySchedulesHistory,
    scheduledAbsences: [],
  };
};

export const createEmployee = async (formData: EmployeeFormData): Promise<string> => {
  const employeeId = formData.employeeNumber || generateId();
  
  const employmentPeriod = buildEmploymentPeriod(formData);

  const employeeData: Employee = {
    id: employeeId,
    name: formData.name,
    employeeNumber: formData.employeeNumber,
    dni: formData.dni ?? null,
    phone: formData.phone ?? null,
    email: formData.email ?? null,
    role: (formData.role as 'admin' | 'employee') ?? 'employee',
    employmentPeriods: [employmentPeriod],
  };

  await setDocument('employees', employeeId, employeeData);
  return employeeId;
};

export const updateEmployee = async (
  id: string,
  currentEmployee: Employee,
  formData: EmployeeFormData,
  _finalBalances: { ordinary: number; holiday: number; leave: number; total: number },
): Promise<void> => {
  // Get the current active period or the most recent one
  const currentPeriod = currentEmployee.employmentPeriods[currentEmployee.employmentPeriods.length - 1];
  
  // Build updated work hours history
  let workHoursHistory = currentPeriod?.workHoursHistory ? [...currentPeriod.workHoursHistory] : [];
  
  // Add new work hours if provided
  if (formData.newWeeklyWorkHours && formData.newWeeklyWorkHoursDate) {
    workHoursHistory.push({
      effectiveDate: formData.newWeeklyWorkHoursDate,
      weeklyHours: formData.newWeeklyWorkHours,
    });
  }

  // Build updated weekly schedules history
  let weeklySchedulesHistory = currentPeriod?.weeklySchedulesHistory ? [...currentPeriod.weeklySchedulesHistory] : [];
  
  // If new schedules are provided in formData, use them
  if (formData.weeklySchedules?.length > 0) {
    weeklySchedulesHistory = formData.weeklySchedules;
  }
  
  // Add new schedule if provided
  if (formData.newWeeklySchedule?.effectiveDate) {
    weeklySchedulesHistory.push(formData.newWeeklySchedule);
  }

  // Update the period
  const updatedPeriod: EmploymentPeriod = {
    ...currentPeriod,
    contractType: formData.contractType,
    startDate: formData.startDate,
    endDate: formData.endDate ?? null,
    isTransfer: formData.isTransfer ?? currentPeriod?.isTransfer ?? false,
    vacationDaysUsedInAnotherCenter: formData.vacationDaysUsedInAnotherCenter ?? currentPeriod?.vacationDaysUsedInAnotherCenter ?? 0,
    annualComputedHours: formData.annualComputedHours ?? currentPeriod?.annualComputedHours ?? 0,
    initialOrdinaryHours: formData.initialOrdinaryHours ?? currentPeriod?.initialOrdinaryHours ?? 0,
    initialHolidayHours: formData.initialHolidayHours ?? currentPeriod?.initialHolidayHours ?? 0,
    initialLeaveHours: formData.initialLeaveHours ?? currentPeriod?.initialLeaveHours ?? 0,
    vacationDays2024: formData.vacationDays2024 ?? currentPeriod?.vacationDays2024 ?? 30,
    workHoursHistory,
    weeklySchedulesHistory,
    scheduledAbsences: currentPeriod?.scheduledAbsences ?? [],
  };

  // Update employment periods array
  const updatedPeriods = [...currentEmployee.employmentPeriods];
  updatedPeriods[updatedPeriods.length - 1] = updatedPeriod;

  const updateData: Partial<Employee> = {
    name: formData.name,
    employeeNumber: formData.employeeNumber,
    dni: formData.dni ?? null,
    phone: formData.phone ?? null,
    email: formData.email ?? null,
    role: (formData.role as 'admin' | 'employee') ?? currentEmployee.role,
    employmentPeriods: updatedPeriods,
  };

  await updateDocument('employees', id, updateData);
};

export const addEmploymentPeriod = async (
  employeeId: string,
  currentEmployee: Employee,
  formData: Omit<EmployeeFormData, 'name'>,
): Promise<void> => {
  const newPeriod = buildEmploymentPeriod(formData as EmployeeFormData);
  
  const updatedPeriods = [...currentEmployee.employmentPeriods, newPeriod];

  await updateDocument('employees', employeeId, {
    employmentPeriods: updatedPeriods,
  });
};

export const updateEmployeeWorkHours = async (
  employeeId: string,
  employee: Employee,
  weeklyHours: number,
  effectiveDate: string,
): Promise<void> => {
  const currentPeriod = employee.employmentPeriods[employee.employmentPeriods.length - 1];
  if (!currentPeriod) return;

  const workHoursHistory = currentPeriod.workHoursHistory ? [...currentPeriod.workHoursHistory] : [];
  workHoursHistory.push({ effectiveDate, weeklyHours });

  const updatedPeriod = {
    ...currentPeriod,
    workHoursHistory,
  };

  const updatedPeriods = [...employee.employmentPeriods];
  updatedPeriods[updatedPeriods.length - 1] = updatedPeriod;

  await updateDocument('employees', employeeId, {
    employmentPeriods: updatedPeriods,
  });
};

export const deleteEmployee = async (id: string): Promise<void> => {
  await deleteDocument('employees', id);
};

export const endIndefiniteAbsence = async (
  employeeId: string,
  dayOfInterruption: Date,
  _dayData: DailyData,
): Promise<boolean> => {
  const employee = await getDocumentById<Employee>('employees', employeeId);
  if (!employee) return false;

  const currentPeriod = employee.employmentPeriods[employee.employmentPeriods.length - 1];
  if (!currentPeriod?.scheduledAbsences) return false;

  const updatedAbsences = currentPeriod.scheduledAbsences.map((absence) => {
    if (!absence.endDate) {
      return {
        ...absence,
        endDate: dayOfInterruption,
      };
    }
    return absence;
  });

  const updatedPeriod = {
    ...currentPeriod,
    scheduledAbsences: updatedAbsences,
  };

  const updatedPeriods = [...employee.employmentPeriods];
  updatedPeriods[updatedPeriods.length - 1] = updatedPeriod;

  await updateDocument('employees', employeeId, {
    employmentPeriods: updatedPeriods,
  });

  return true;
};

export const addScheduledAbsence = async (
  employeeId: string,
  periodId: string,
  absence: Partial<Omit<ScheduledAbsence, 'id'>> & { absenceTypeId: string; startDate: string | Date; endDate?: string | Date | null },
  _employee?: Employee,
  originalRequest?: { startDate: Date; endDate: Date | null } | boolean,
): Promise<void> => {
  const employee = await getDocumentById<Employee>('employees', employeeId);
  if (!employee) return;

  const periodIndex = employee.employmentPeriods.findIndex((p) => p.id === periodId);
  if (periodIndex === -1) return;

  const period = employee.employmentPeriods[periodIndex];
  const scheduledAbsences = period.scheduledAbsences ?? [];

  const newAbsence: ScheduledAbsence = {
    id: generateId(),
    absenceTypeId: absence.absenceTypeId,
    startDate: typeof absence.startDate === 'string' ? new Date(absence.startDate) : absence.startDate,
    endDate: absence.endDate ? (typeof absence.endDate === 'string' ? new Date(absence.endDate) : absence.endDate) : null,
    isDefinitive: absence.isDefinitive ?? true,
    notes: absence.notes ?? null,
    communicatedTo: absence.communicatedTo ?? null,
    originalRequest: (typeof originalRequest === 'object' && originalRequest !== null) ? originalRequest : undefined,
  };

  scheduledAbsences.push(newAbsence);

  const updatedPeriod = {
    ...period,
    scheduledAbsences,
  };

  const updatedPeriods = [...employee.employmentPeriods];
  updatedPeriods[periodIndex] = updatedPeriod;

  await updateDocument('employees', employeeId, {
    employmentPeriods: updatedPeriods,
  });
};

export const updateScheduledAbsence = async (
  employeeId: string,
  periodId: string,
  absenceId: string,
  updatedAbsence: Partial<ScheduledAbsence>,
): Promise<void> => {
  const employee = await getDocumentById<Employee>('employees', employeeId);
  if (!employee) return;

  const periodIndex = employee.employmentPeriods.findIndex((p) => p.id === periodId);
  if (periodIndex === -1) return;

  const period = employee.employmentPeriods[periodIndex];
  const scheduledAbsences = period.scheduledAbsences ?? [];

  const absenceIndex = scheduledAbsences.findIndex((a) => a.id === absenceId);
  if (absenceIndex === -1) return;

  scheduledAbsences[absenceIndex] = {
    ...scheduledAbsences[absenceIndex],
    ...updatedAbsence,
  };

  const updatedPeriod = {
    ...period,
    scheduledAbsences,
  };

  const updatedPeriods = [...employee.employmentPeriods];
  updatedPeriods[periodIndex] = updatedPeriod;

  await updateDocument('employees', employeeId, {
    employmentPeriods: updatedPeriods,
  });
};

export const deleteScheduledAbsence = async (
  employeeId: string,
  periodId: string,
  absenceId: string,
): Promise<void> => {
  const employee = await getDocumentById<Employee>('employees', employeeId);
  if (!employee) return;

  const periodIndex = employee.employmentPeriods.findIndex((p) => p.id === periodId);
  if (periodIndex === -1) return;

  const period = employee.employmentPeriods[periodIndex];
  const scheduledAbsences = (period.scheduledAbsences ?? []).filter((a) => a.id !== absenceId);

  const updatedPeriod = {
    ...period,
    scheduledAbsences,
  };

  const updatedPeriods = [...employee.employmentPeriods];
  updatedPeriods[periodIndex] = updatedPeriod;

  await updateDocument('employees', employeeId, {
    employmentPeriods: updatedPeriods,
  });
};

export const hardDeleteScheduledAbsence = async (
  employeeId: string,
  periodId: string,
  absenceId: string,
): Promise<void> => {
  // Same as deleteScheduledAbsence for this implementation
  await deleteScheduledAbsence(employeeId, periodId, absenceId);
};
