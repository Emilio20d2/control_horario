
'use client';

import { addDocument, updateDocument, deleteDocument } from './firestoreService';
import type { Employee, EmployeeFormData, WorkHoursRecord, ScheduledAbsence, EmploymentPeriod, WeeklyScheduleData } from '../types';
import { isAfter, parseISO, startOfDay, addDays, subDays, format } from 'date-fns';

export const createEmployee = async (formData: EmployeeFormData): Promise<string> => {
    const { name, startDate, contractType, initialWeeklyWorkHours, annualComputedHours, weeklySchedules, initialOrdinaryHours, initialHolidayHours, initialLeaveHours } = formData;
    
    const newEmployee = {
        name,
        employmentPeriods: [
            {
                id: `period_${Date.now()}`,
                contractType,
                startDate,
                endDate: null,
                annualComputedHours,
                initialOrdinaryHours: initialOrdinaryHours ?? 0,
                initialHolidayHours: initialHolidayHours ?? 0,
                initialLeaveHours: initialLeaveHours ?? 0,
                workHoursHistory: [
                    {
                        effectiveDate: startDate,
                        weeklyHours: initialWeeklyWorkHours
                    }
                ],
                weeklySchedulesHistory: weeklySchedules,
                scheduledAbsences: [],
            }
        ]
    };

    const docRef = await addDocument('employees', newEmployee);
    return docRef.id;
};

export const updateEmployee = async (id: string, currentEmployee: Employee, formData: EmployeeFormData, finalBalances: { ordinary: number; holiday: number; leave: number; total: number; }): Promise<void> => {
    const { name, newWeeklyWorkHours, newWeeklyWorkHoursDate, endDate, newContractType, newContractTypeDate, newWeeklySchedule, weeklySchedules } = formData;

    const updatedPeriods = [...(currentEmployee.employmentPeriods || [])];
    const periodToUpdate = updatedPeriods.sort((a,b) => parseISO(b.startDate as string).getTime() - parseISO(a.startDate as string).getTime())[0];
    
    if (!periodToUpdate) {
        throw new Error("No se encontró un periodo laboral para actualizar.");
    }
    
    periodToUpdate.endDate = endDate || null;

    // Handle contract type change
    if (newContractType && newContractTypeDate) {
        const changeDate = parseISO(newContractTypeDate);
        periodToUpdate.endDate = format(subDays(changeDate, 1), 'yyyy-MM-dd');

        const newPeriod: EmploymentPeriod = {
            id: `period_${Date.now()}`,
            contractType: newContractType,
            startDate: newContractTypeDate,
            endDate: null,
            annualComputedHours: 0,
            initialOrdinaryHours: finalBalances.ordinary,
            initialHolidayHours: finalBalances.holiday,
            initialLeaveHours: finalBalances.leave,
            workHoursHistory: periodToUpdate.workHoursHistory ? [periodToUpdate.workHoursHistory[periodToUpdate.workHoursHistory.length - 1]] : [],
            weeklySchedulesHistory: periodToUpdate.weeklySchedulesHistory,
            scheduledAbsences: [],
        };
        updatedPeriods.push(newPeriod);
    } else {
        // Only update these if there is no contract change
        periodToUpdate.contractType = formData.contractType;
        periodToUpdate.annualComputedHours = formData.annualComputedHours;
        // Preserve original initial hours on simple edit
        periodToUpdate.initialOrdinaryHours = periodToUpdate.initialOrdinaryHours ?? formData.initialOrdinaryHours ?? 0;
        periodToUpdate.initialHolidayHours = periodToUpdate.initialHolidayHours ?? formData.initialHolidayHours ?? 0;
        periodToUpdate.initialLeaveHours = periodToUpdate.initialLeaveHours ?? formData.initialLeaveHours ?? 0;
    }

    if (newWeeklyWorkHours && newWeeklyWorkHours > 0 && newWeeklyWorkHoursDate) {
        const newRecord: WorkHoursRecord = {
            effectiveDate: newWeeklyWorkHoursDate,
            weeklyHours: newWeeklyWorkHours
        };
        
        const targetPeriod = updatedPeriods.sort((a,b) => parseISO(b.startDate as string).getTime() - parseISO(a.startDate as string).getTime())[0];

        if (!targetPeriod.workHoursHistory) {
            targetPeriod.workHoursHistory = [];
        }

        const recordExists = targetPeriod.workHoursHistory.some(
            record => record.effectiveDate === newRecord.effectiveDate
        );

        if (recordExists) {
             targetPeriod.workHoursHistory = targetPeriod.workHoursHistory.map(r => r.effectiveDate === newRecord.effectiveDate ? newRecord : r);
        } else {
            targetPeriod.workHoursHistory.push(newRecord);
        }
        
        targetPeriod.workHoursHistory.sort((a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime());
    }

    // This handles both updating the current schedule and adding a new one.
    const targetPeriodForSchedules = updatedPeriods.sort((a,b) => parseISO(b.startDate as string).getTime() - parseISO(a.startDate as string).getTime())[0];
    if (!targetPeriodForSchedules.weeklySchedulesHistory) {
        targetPeriodForSchedules.weeklySchedulesHistory = [];
    }

    // Update existing schedule from `weeklySchedules` array (it's the most recent one)
    if (weeklySchedules && weeklySchedules.length > 0) {
        const scheduleToUpdate = weeklySchedules[0];
        const existingScheduleIndex = targetPeriodForSchedules.weeklySchedulesHistory.findIndex(
            s => s.effectiveDate === scheduleToUpdate.effectiveDate
        );
        if (existingScheduleIndex > -1) {
            targetPeriodForSchedules.weeklySchedulesHistory[existingScheduleIndex] = scheduleToUpdate;
        } else {
            // This case shouldn't happen if form is setup correctly, but as a fallback
            targetPeriodForSchedules.weeklySchedulesHistory.push(scheduleToUpdate);
        }
    }

    // Add a brand new schedule if provided
    if (newWeeklySchedule && newWeeklySchedule.effectiveDate) {
        targetPeriodForSchedules.weeklySchedulesHistory.push(newWeeklySchedule);
    }
    
    targetPeriodForSchedules.weeklySchedulesHistory.sort((a, b) => parseISO(a.effectiveDate).getTime() - parseISO(b.effectiveDate).getTime());

    const finalData = {
        name,
        employmentPeriods: updatedPeriods,
    };

    await updateDocument('employees', id, finalData);
};


export const addEmploymentPeriod = async (employeeId: string, currentEmployee: Employee, formData: Omit<EmployeeFormData, 'name'>): Promise<void> => {
    const { startDate, contractType, initialWeeklyWorkHours, annualComputedHours, weeklySchedules, initialOrdinaryHours, initialHolidayHours, initialLeaveHours } = formData;
    
    const newPeriod: EmploymentPeriod = {
        id: `period_${Date.now()}`,
        contractType,
        startDate,
        endDate: null,
        annualComputedHours,
        initialOrdinaryHours: initialOrdinaryHours ?? 0,
        initialHolidayHours: initialHolidayHours ?? 0,
        initialLeaveHours: initialLeaveHours ?? 0,
        workHoursHistory: [
            {
                effectiveDate: startDate,
                weeklyHours: initialWeeklyWorkHours
            }
        ],
        weeklySchedulesHistory: weeklySchedules,
        scheduledAbsences: [],
    };

    currentEmployee.employmentPeriods.push(newPeriod);

    await updateDocument('employees', employeeId, {
        employmentPeriods: currentEmployee.employmentPeriods,
    });
};


export const updateEmployeeWorkHours = async (
    employeeId: string,
    currentEmployee: Employee,
    weeklyHours: number,
    effectiveDate: string
): Promise<void> => {
    const currentPeriod = currentEmployee.employmentPeriods.find(p => !p.endDate);
    if (!currentPeriod) {
        throw new Error("No se encontró un periodo laboral activo para el empleado.");
    }

    const newRecord: WorkHoursRecord = { effectiveDate, weeklyHours };

    if (!currentPeriod.workHoursHistory) {
        currentPeriod.workHoursHistory = [];
    }

    const recordIndex = currentPeriod.workHoursHistory.findIndex(
        record => record.effectiveDate === newRecord.effectiveDate
    );

    if (recordIndex !== -1) {
        currentPeriod.workHoursHistory[recordIndex] = newRecord;
    } else {
        currentPeriod.workHoursHistory.push(newRecord);
    }
    
    currentPeriod.workHoursHistory.sort((a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime());

    const updatedEmployeeData = {
        employmentPeriods: currentEmployee.employmentPeriods,
    };
    
    await updateDocument('employees', employeeId, updatedEmployeeData);
};


export const deleteEmployee = async (id: string): Promise<void> => {
    await deleteDocument('employees', id);
};


export const addScheduledAbsence = async (
    employeeId: string, 
    periodId: string, 
    newAbsence: Omit<ScheduledAbsence, 'id'>, 
    currentEmployee: Employee
): Promise<void> => {
    const period = currentEmployee.employmentPeriods.find(p => p.id === periodId);
    if (!period) throw new Error("Periodo laboral no encontrado");

    if (!period.scheduledAbsences) {
        period.scheduledAbsences = [];
    }

    period.scheduledAbsences.push({ ...newAbsence, id: `abs_${Date.now()}` });

    await updateDocument('employees', employeeId, { employmentPeriods: currentEmployee.employmentPeriods });
};


export const deleteScheduledAbsence = async (
    employeeId: string, 
    periodId: string, 
    absenceId: string, 
    currentEmployee: Employee
): Promise<void> => {
    const period = currentEmployee.employmentPeriods.find(p => p.id === periodId);
    if (!period || !period.scheduledAbsences) throw new Error("Periodo laboral o ausencias no encontradas");

    period.scheduledAbsences = period.scheduledAbsences.filter(a => a.id !== absenceId);
    
    await updateDocument('employees', employeeId, { employmentPeriods: currentEmployee.employmentPeriods });
};
