

'use client';

import { addDocument, updateDocument, deleteDocument, setDocument } from './firestoreService';
import type { Employee, EmployeeFormData, WorkHoursRecord, ScheduledAbsence, EmploymentPeriod, WeeklyScheduleData, WeeklyRecord } from '../types';
import { isAfter, parseISO, startOfDay, addDays, subDays, format, eachDayOfInterval, startOfWeek, isValid } from 'date-fns';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { createUserAccount } from '../actions/userActions';
import { addHolidayEmployee } from './settingsService';

export const createEmployee = async (formData: EmployeeFormData & { authId: string | null }): Promise<string> => {
    const { name, employeeNumber, dni, phone, email, role, groupId, startDate, isTransfer, vacationDaysUsedInAnotherCenter, contractType, initialWeeklyWorkHours, annualComputedHours, weeklySchedules, initialOrdinaryHours, initialHolidayHours, initialLeaveHours, vacationDays2024 } = formData;
    
    if (!employeeNumber) {
        throw new Error("El número de empleado es obligatorio para crear un nuevo empleado.");
    }

    let authId: string | null = null;
    if (email) {
        const password = Math.random().toString(36).slice(-8); // Generate a random temporary password
        const userResult = await createUserAccount({ email, password });
        if (userResult.success && userResult.uid) {
            authId = userResult.uid;
        } else {
            // Forward the error from the server action
            throw new Error(userResult.error || 'Failed to create authentication user.');
        }
    }


    const newEmployee: Omit<Employee, 'id'> = {
        name,
        employeeNumber: employeeNumber,
        dni: dni || null,
        phone: phone || null,
        email: email || null,
        authId: authId,
        employmentPeriods: [
            {
                id: `period_${Date.now()}`,
                contractType,
                startDate,
                endDate: null,
                isTransfer: isTransfer || false,
                vacationDaysUsedInAnotherCenter: vacationDaysUsedInAnotherCenter ?? 0,
                annualComputedHours: annualComputedHours ?? 0,
                initialOrdinaryHours: initialOrdinaryHours ?? 0,
                initialHolidayHours: initialHolidayHours ?? 0,
                initialLeaveHours: initialLeaveHours ?? 0,
                vacationDays2024: vacationDays2024 ?? 0,
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

    // Use employeeNumber as the document ID
    await setDocument('employees', employeeNumber, newEmployee);
    
    // Also create a record in holidayEmployees to manage group and active status
    if (groupId) {
        await addHolidayEmployee({ id: employeeNumber, name, active: true, groupId });
    }


    // Now update the user document in 'users' collection with the correct employeeId
    if (authId && email) {
        await setDocument('users', authId, { email, employeeId: employeeNumber, role: role || 'employee' });
    }

    return employeeNumber;
};

export const updateEmployee = async (id: string, currentEmployee: Employee, formData: EmployeeFormData, finalBalances: { ordinary: number; holiday: number; leave: number; total: number; }): Promise<void> => {
    const { name, employeeNumber, dni, phone, email, role, groupId, newWeeklyWorkHours, newWeeklyWorkHoursDate, endDate, newContractType, newContractTypeDate, newWeeklySchedule, weeklySchedules, isTransfer, vacationDays2024, vacationDaysUsedInAnotherCenter, annualComputedHours } = formData;

    const updatedPeriods = [...(currentEmployee.employmentPeriods || [])];
    const periodToUpdate = updatedPeriods.sort((a,b) => parseISO(b.startDate as string).getTime() - parseISO(a.startDate as string).getTime())[0];
    
    if (!periodToUpdate) {
        throw new Error("No se encontró un periodo laboral para actualizar.");
    }
    
    // This logic ensures that if endDate is an invalid date or null/undefined, it's set to null.
    // Otherwise, it's formatted correctly.
    let endDateValue: string | null = null;
    if (endDate) {
        const parsedEndDate = endDate instanceof Date ? endDate : parseISO(endDate);
        if (isValid(parsedEndDate)) {
            endDateValue = format(parsedEndDate, 'yyyy-MM-dd');
        }
    }
    periodToUpdate.endDate = endDateValue;

    periodToUpdate.annualComputedHours = annualComputedHours ?? periodToUpdate.annualComputedHours ?? 0;

    if (updatedPeriods.length === 1) { // Only update these for the very first period
        periodToUpdate.isTransfer = isTransfer;
        periodToUpdate.vacationDays2024 = vacationDays2024 ?? periodToUpdate.vacationDays2024 ?? 0;
        periodToUpdate.vacationDaysUsedInAnotherCenter = vacationDaysUsedInAnotherCenter ?? periodToUpdate.vacationDaysUsedInAnotherCenter ?? 0;
    }

    // Handle contract type change - ONLY if fields are valid and provided.
    if (newContractType && newContractTypeDate && newContractTypeDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
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
            vacationDays2024: 0, // Reset for new periods
            workHoursHistory: periodToUpdate.workHoursHistory ? [periodToUpdate.workHoursHistory[periodToUpdate.workHoursHistory.length - 1]] : [],
            weeklySchedulesHistory: periodToUpdate.weeklySchedulesHistory,
            scheduledAbsences: [],
        };
        updatedPeriods.push(newPeriod);
    } else {
        // Only update these if there is no contract change
        periodToUpdate.contractType = formData.contractType;
        // Preserve original initial hours on simple edit
        periodToUpdate.initialOrdinaryHours = periodToUpdate.initialOrdinaryHours ?? formData.initialOrdinaryHours ?? 0;
        periodToUpdate.initialHolidayHours = periodToUpdate.initialHolidayHours ?? formData.initialHolidayHours ?? 0;
        periodToUpdate.initialLeaveHours = periodToUpdate.initialLeaveHours ?? formData.initialLeaveHours ?? 0;
    }

    if (newWeeklyWorkHours && newWeeklyWorkHours > 0 && newWeeklyWorkHoursDate && newWeeklyWorkHoursDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
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
        const effectiveDateString = scheduleToUpdate.effectiveDate;

        if(effectiveDateString && typeof effectiveDateString === 'string' && effectiveDateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const existingScheduleIndex = targetPeriodForSchedules.weeklySchedulesHistory.findIndex(
                s => s.effectiveDate === effectiveDateString
            );
            if (existingScheduleIndex > -1) {
                targetPeriodForSchedules.weeklySchedulesHistory[existingScheduleIndex] = {
                    ...scheduleToUpdate,
                    effectiveDate: effectiveDateString, // Ensure it's stored as a string
                };
            } else {
                targetPeriodForSchedules.weeklySchedulesHistory.push({
                    ...scheduleToUpdate,
                    effectiveDate: effectiveDateString,
                });
            }
        }
    }

    // Add a brand new schedule if provided
    if (newWeeklySchedule && newWeeklySchedule.effectiveDate && newWeeklySchedule.effectiveDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        targetPeriodForSchedules.weeklySchedulesHistory.push(newWeeklySchedule);
    }
    
    targetPeriodForSchedules.weeklySchedulesHistory.sort((a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime());

    const finalData = {
        name,
        employeeNumber: employeeNumber || null,
        dni: dni || null,
        phone: phone || null,
        email: email || null,
        employmentPeriods: updatedPeriods,
        authId: currentEmployee.authId || null,
    };

    await updateDocument('employees', id, finalData);

    // Update group in holidayEmployees collection
    await addHolidayEmployee({ id: id, name: name, groupId: groupId || null, active: true });


    // Update user role if authId exists and role is provided
    if (currentEmployee.authId && role) {
        const userRef = doc(db, "users", currentEmployee.authId);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
            await updateDocument('users', currentEmployee.authId, { role });
        } else if (email) { // Only create if email exists
            await setDocument('users', currentEmployee.authId, { email: email, employeeId: id, role });
        }
    } else if (email && role && currentEmployee.authId) {
        // This handles creating the user doc if it was missing but authId exists
        await setDocument('users', currentEmployee.authId, { email: email, employeeId: id, role });
    }
};


export const addEmploymentPeriod = async (employeeId: string, currentEmployee: Employee, formData: Omit<EmployeeFormData, 'name'>): Promise<void> => {
    const { startDate, contractType, initialWeeklyWorkHours, annualComputedHours, weeklySchedules, initialOrdinaryHours, initialHolidayHours, initialLeaveHours } = formData;
    
    const newPeriod: EmploymentPeriod = {
        id: `period_${Date.now()}`,
        contractType,
        startDate,
        endDate: null,
        annualComputedHours: annualComputedHours ?? 0,
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
    newAbsence: {
        absenceTypeId: string;
        startDate: string; // YYYY-MM-DD
        endDate: string | null;
    },
    currentEmployee: Employee,
    originalRequest?: { startDate: string | Date, endDate: string | Date | null }
): Promise<void> => {
    const period = currentEmployee.employmentPeriods.find(p => p.id === periodId);
    if (!period) throw new Error("Periodo laboral no encontrado");

    if (!period.scheduledAbsences) {
        period.scheduledAbsences = [];
    }
    
    const absenceToAdd: ScheduledAbsence = {
        id: `abs_${Date.now()}`,
        absenceTypeId: newAbsence.absenceTypeId,
        startDate: parseISO(newAbsence.startDate),
        endDate: newAbsence.endDate ? parseISO(newAbsence.endDate) : null,
        originalRequest: originalRequest ? {
            startDate: typeof originalRequest.startDate === 'string' ? parseISO(originalRequest.startDate) : originalRequest.startDate,
            endDate: originalRequest.endDate ? (typeof originalRequest.endDate === 'string' ? parseISO(originalRequest.endDate) : originalRequest.endDate) : null,
        } : undefined
    };
    
    if (!absenceToAdd.originalRequest) {
        absenceToAdd.originalRequest = {
            startDate: absenceToAdd.startDate,
            endDate: absenceToAdd.endDate
        };
    }

    period.scheduledAbsences.push(absenceToAdd);

    await updateDocument('employees', employeeId, { employmentPeriods: currentEmployee.employmentPeriods });
};

/**
 * Updates an existing scheduled absence.
 */
export const updateScheduledAbsence = async (
    employeeId: string,
    periodId: string,
    absenceId: string,
    updatedAbsence: {
        absenceTypeId: string;
        startDate: string; // YYYY-MM-DD
        endDate: string | null;
    },
    currentEmployee: Employee
): Promise<void> => {
    const period = currentEmployee.employmentPeriods.find(p => p.id === periodId);
    if (!period || !period.scheduledAbsences) throw new Error("Periodo laboral o ausencias no encontradas");

    const absenceIndex = period.scheduledAbsences.findIndex(a => a.id === absenceId);
    if (absenceIndex === -1) throw new Error("Ausencia no encontrada para actualizar");

    // Preserve originalRequest if it exists
    const originalRequest = period.scheduledAbsences[absenceIndex].originalRequest;

    // Update the absence in the array
    period.scheduledAbsences[absenceIndex] = {
        ...period.scheduledAbsences[absenceIndex],
        absenceTypeId: updatedAbsence.absenceTypeId,
        startDate: parseISO(updatedAbsence.startDate),
        endDate: updatedAbsence.endDate ? parseISO(updatedAbsence.endDate) : null,
        originalRequest: originalRequest, // Persist the original request data
    };

    await updateDocument('employees', employeeId, { employmentPeriods: currentEmployee.employmentPeriods });
};

/**
 * Performs a "soft delete" by invalidating the absence period.
 * The record is kept for historical/reporting purposes.
 */
export const deleteScheduledAbsence = async (
    employeeId: string, 
    periodId: string, 
    absenceId: string, 
    currentEmployee: Employee,
    weeklyRecords?: Record<string, WeeklyRecord>
): Promise<void> => {
    const period = currentEmployee.employmentPeriods.find(p => p.id === periodId);
    if (!period || !period.scheduledAbsences) throw new Error("Periodo laboral o ausencias no encontradas");

    const absenceIndex = period.scheduledAbsences.findIndex(a => a.id === absenceId);
    if (absenceIndex === -1) throw new Error("Ausencia no encontrada para eliminar");
    
    const absenceToModify = period.scheduledAbsences[absenceIndex];
    
    if (weeklyRecords) {
        const daysInAbsence = eachDayOfInterval({
            start: startOfDay(absenceToModify.startDate),
            end: startOfDay(absenceToModify.endDate || absenceToModify.startDate)
        });

        for(const day of daysInAbsence) {
            const weekId = format(startOfWeek(day, { weekStartsOn: 1 }), 'yyyy-MM-dd');
            const weekRecord = weeklyRecords[weekId]?.weekData?.[employeeId];
            if (weekRecord?.confirmed) {
                throw new Error(`No se puede modificar la ausencia. La semana del ${weekId} ya está confirmada y afecta a este periodo.`);
            }
        }
    }
    
    period.scheduledAbsences[absenceIndex].endDate = period.scheduledAbsences[absenceIndex].startDate;
    
    await updateDocument('employees', employeeId, { employmentPeriods: currentEmployee.employmentPeriods });
};


/**
 * Performs a hard delete of the scheduled absence record.
 * This should only be callable by an admin.
 */
export const hardDeleteScheduledAbsence = async (
    employeeId: string, 
    periodId: string, 
    absenceId: string, 
    currentEmployee: Employee,
    weeklyRecords?: Record<string, WeeklyRecord>
): Promise<void> => {
    const period = currentEmployee.employmentPeriods.find(p => p.id === periodId);
    if (!period || !period.scheduledAbsences) throw new Error("Periodo laboral o ausencias no encontradas");

    const absenceToDelete = period.scheduledAbsences.find(a => a.id === absenceId);
    if (!absenceToDelete) throw new Error("Ausencia no encontrada para eliminar");
    
    if (weeklyRecords) {
        const daysInAbsence = eachDayOfInterval({
            start: startOfDay(absenceToDelete.startDate),
            end: startOfDay(absenceToDelete.endDate || absenceToDelete.startDate)
        });

        for(const day of daysInAbsence) {
            const weekId = format(startOfWeek(day, { weekStartsOn: 1 }), 'yyyy-MM-dd');
            const weekRecord = weeklyRecords[weekId]?.weekData?.[employeeId];
            if (weekRecord?.confirmed) {
                throw new Error(`No se puede eliminar la ausencia. La semana del ${weekId} ya está confirmada y afecta a este periodo.`);
            }
        }
    }

    period.scheduledAbsences = period.scheduledAbsences.filter(a => a.id !== absenceId);
    
    await updateDocument('employees', employeeId, { employmentPeriods: currentEmployee.employmentPeriods });
};
