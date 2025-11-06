

'use client';

import { addDocument, updateDocument, deleteDocument } from './firestoreService';
import type { Employee, EmployeeFormData, WorkHoursRecord, ScheduledAbsence, EmploymentPeriod, WeeklyScheduleData, WeeklyRecord, DailyData } from '../types';
import { isAfter, parseISO, startOfDay, addDays, subDays, format, eachDayOfInterval, startOfWeek, isValid, isWithinInterval, endOfDay, isBefore } from 'date-fns';
import { getDoc, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { createUserAccount } from '../actions/userActions';
import { addHolidayEmployee } from './settingsService';

export const createEmployee = async (formData: EmployeeFormData): Promise<string> => {
    const { name, employeeNumber, dni, phone, email, role, groupId, startDate, isTransfer, vacationDaysUsedInAnotherCenter, contractType, initialWeeklyWorkHours, annualComputedHours, weeklySchedules, initialOrdinaryHours, initialHolidayHours, initialLeaveHours, vacationDays2024 } = formData;
    
    if (!employeeNumber) {
        throw new Error("El número de empleado es obligatorio para crear un nuevo empleado.");
    }

    let authId: string | null = null;
    if (email) {
        const password = Math.random().toString(36).slice(-8); // Generate a random temporary password
        const userResult = await createUserAccount({ email, password, name });
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
                weeklySchedulesHistory: (weeklySchedules || []).map(ws => ({
                    ...ws,
                    effectiveDate: format(parseISO(ws.effectiveDate), 'yyyy-MM-dd'),
                })),
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
        await setDoc(doc(db, 'users', authId), { email, employeeId: employeeNumber, role: formData.role || 'employee' });
    }

    return employeeNumber;
};

export const updateEmployee = async (
    id: string, 
    _currentEmployee: Employee, // No longer used, will fetch fresh data
    formData: EmployeeFormData, 
    finalBalances: { ordinary: number; holiday: number; leave: number; total: number; }
): Promise<void> => {

    const { 
        name, dni, phone, email, role, groupId, endDate,
        newContractType, newContractTypeDate, newWeeklyWorkHours, newWeeklyWorkHoursDate, newWeeklySchedule, 
        weeklySchedules, contractType, annualComputedHours, isTransfer, vacationDaysUsedInAnotherCenter, vacationDays2024,
        initialOrdinaryHours, initialHolidayHours, initialLeaveHours
    } = formData;

    // Fetch the most recent employee data directly from Firestore to avoid stale data
    const employeeDocRef = doc(db, 'employees', id);
    const employeeSnap = await getDoc(employeeDocRef);
    if (!employeeSnap.exists()) {
        throw new Error("El empleado que intentas actualizar no existe.");
    }
    const currentEmployee = employeeSnap.data() as Employee;


    // Create a deep copy to avoid direct state mutation
    const updatedEmployeeData: Omit<Employee, 'id'> = JSON.parse(JSON.stringify({
        ...currentEmployee,
        name,
        dni: dni || null,
        phone: phone || null,
        email: email || null,
    }));
    
    // Always find the latest period to modify
    const latestPeriod = updatedEmployeeData.employmentPeriods.sort((a: EmploymentPeriod, b: EmploymentPeriod) => new Date(b.startDate as string).getTime() - new Date(a.startDate as string).getTime())[0];

    if (!latestPeriod) {
        throw new Error("No se encontró un periodo laboral para actualizar.");
    }
    
    // 1. Handle Contract Change - This takes precedence
    if (newContractType && newContractTypeDate && newContractTypeDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const changeDate = parseISO(newContractTypeDate);
        latestPeriod.endDate = format(subDays(changeDate, 1), 'yyyy-MM-dd');

        const newPeriod: EmploymentPeriod = {
            id: `period_${Date.now()}`,
            contractType: newContractType,
            startDate: newContractTypeDate,
            endDate: null,
            annualComputedHours: 0,
            initialOrdinaryHours: finalBalances.ordinary,
            initialHolidayHours: finalBalances.holiday,
            initialLeaveHours: finalBalances.leave,
            vacationDays2024: 0,
            workHoursHistory: latestPeriod.workHoursHistory ? [latestPeriod.workHoursHistory[latestPeriod.workHoursHistory.length - 1]] : [],
            weeklySchedulesHistory: latestPeriod.weeklySchedulesHistory,
            scheduledAbsences: [],
        };
        updatedEmployeeData.employmentPeriods.push(newPeriod);
    } else {
        // 2. Handle Simple Edits on the latest period if no contract change
        latestPeriod.endDate = endDate ? format(parseISO(endDate), 'yyyy-MM-dd') : null;
        latestPeriod.contractType = contractType;
        latestPeriod.annualComputedHours = annualComputedHours ?? latestPeriod.annualComputedHours ?? 0;
        
        // Only allow editing these on the very first period of an employee
        if (currentEmployee.employmentPeriods.length <= 1) {
            latestPeriod.isTransfer = isTransfer;
            latestPeriod.vacationDays2024 = vacationDays2024 ?? latestPeriod.vacationDays2024 ?? 0;
            latestPeriod.vacationDaysUsedInAnotherCenter = vacationDaysUsedInAnotherCenter ?? latestPeriod.vacationDaysUsedInAnotherCenter ?? 0;
            latestPeriod.initialOrdinaryHours = initialOrdinaryHours ?? latestPeriod.initialOrdinaryHours ?? 0;
            latestPeriod.initialHolidayHours = initialHolidayHours ?? latestPeriod.initialHolidayHours ?? 0;
            latestPeriod.initialLeaveHours = initialLeaveHours ?? latestPeriod.initialLeaveHours ?? 0;
        }

        // Add new weekly work hours if provided
        if (newWeeklyWorkHours && newWeeklyWorkHours > 0 && newWeeklyWorkHoursDate && newWeeklyWorkHoursDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const newRecord: WorkHoursRecord = {
                effectiveDate: format(parseISO(newWeeklyWorkHoursDate), 'yyyy-MM-dd'),
                weeklyHours: newWeeklyWorkHours
            };
            if (!latestPeriod.workHoursHistory) latestPeriod.workHoursHistory = [];
            
            const existingIndex = latestPeriod.workHoursHistory.findIndex(wh => wh.effectiveDate === newRecord.effectiveDate);
            if(existingIndex > -1) {
                latestPeriod.workHoursHistory[existingIndex] = newRecord;
            } else {
                 latestPeriod.workHoursHistory.push(newRecord);
            }
            latestPeriod.workHoursHistory.sort((a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime());
        }

        // Update current schedule
        if (weeklySchedules && weeklySchedules.length > 0) {
            const currentSchedule = weeklySchedules[0];
            if (!latestPeriod.weeklySchedulesHistory) latestPeriod.weeklySchedulesHistory = [];
            
            const existingIndex = latestPeriod.weeklySchedulesHistory.findIndex(s => s.effectiveDate === currentSchedule.effectiveDate);
            
            if (existingIndex > -1) {
                latestPeriod.weeklySchedulesHistory[existingIndex] = currentSchedule;
            } else if (newWeeklySchedule?.effectiveDate !== currentSchedule.effectiveDate) { // Avoid duplication
                 latestPeriod.weeklySchedulesHistory.push(currentSchedule);
            }
            latestPeriod.weeklySchedulesHistory.sort((a: WeeklyScheduleData, b: WeeklyScheduleData) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime());
        }

        // Add new schedule if provided
        if (newWeeklySchedule && newWeeklySchedule.effectiveDate && newWeeklySchedule.effectiveDate.match(/^\d{4-}-\d{2}-\d{2}$/)) {
            const formattedNewSchedule = {
                ...newWeeklySchedule,
                effectiveDate: format(parseISO(newWeeklySchedule.effectiveDate), 'yyyy-MM-dd')
            };
            if (!latestPeriod.weeklySchedulesHistory) latestPeriod.weeklySchedulesHistory = [];
            
            const existingIndex = latestPeriod.weeklySchedulesHistory.findIndex(s => s.effectiveDate === formattedNewSchedule.effectiveDate);
            if(existingIndex > -1) {
                latestPeriod.weeklySchedulesHistory[existingIndex] = formattedNewSchedule;
            } else {
                 latestPeriod.weeklySchedulesHistory.push(formattedNewSchedule);
            }
            latestPeriod.weeklySchedulesHistory.sort((a: WeeklyScheduleData, b: WeeklyScheduleData) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime());
        }
    }

    await updateDocument('employees', id, updatedEmployeeData);

    // Update group in holidayEmployees collection
    await addHolidayEmployee({ id: id, name: name, groupId: groupId || null, active: true });

    // Update user role if authId exists and role is provided
    if (currentEmployee.authId && formData.role) {
        const userRef = doc(db, "users", currentEmployee.authId);
        await setDoc(userRef, { role: formData.role }, { merge: true });
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
    const employeeDataCopy = JSON.parse(JSON.stringify(currentEmployee));
    const currentPeriod = employeeDataCopy.employmentPeriods.find((p: EmploymentPeriod) => !p.endDate);
    
    if (!currentPeriod) {
        throw new Error("No se encontró un periodo laboral activo para el empleado.");
    }

    const newRecord: WorkHoursRecord = { 
        effectiveDate: format(parseISO(effectiveDate), 'yyyy-MM-dd'),
        weeklyHours
    };

    if (!currentPeriod.workHoursHistory) {
        currentPeriod.workHoursHistory = [];
    }

    const recordIndex = currentPeriod.workHoursHistory.findIndex(
        (record: WorkHoursRecord) => record.effectiveDate === newRecord.effectiveDate
    );

    if (recordIndex !== -1) {
        currentPeriod.workHoursHistory[recordIndex] = newRecord;
    } else {
        currentPeriod.workHoursHistory.push(newRecord);
    }
    
    currentPeriod.workHoursHistory.sort((a: WorkHoursRecord, b: WorkHoursRecord) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime());

    const updatedEmployeeData = {
        employmentPeriods: employeeDataCopy.employmentPeriods,
    };
    
    await updateDocument('employees', employeeId, updatedEmployeeData);
};


export const deleteEmployee = async (id: string): Promise<void> => {
    await deleteDocument('employees', id);
};

export const endIndefiniteAbsence = async (employeeId: string, dayOfInterruption: Date, currentDayData: DailyData | undefined): Promise<boolean> => {
    const employeeDocRef = doc(db, 'employees', employeeId);
    const employeeDoc = await getDoc(employeeDocRef);
    if (!employeeDoc.exists() || !currentDayData) return false;
  
    const employeeData = employeeDoc.data() as Employee;
    const employeeCopy = JSON.parse(JSON.stringify(employeeData)); // Deep copy
  
    const period = employeeCopy.employmentPeriods.find((p: EmploymentPeriod) => 
      isWithinInterval(dayOfInterruption, { 
        start: startOfDay(parseISO(p.startDate as string)), 
        end: p.endDate ? endOfDay(parseISO(p.endDate as string)) : new Date('9999-12-31') 
      })
    );
  
    if (!period || !period.scheduledAbsences) return false;
  
    const absenceToEnd = period.scheduledAbsences.find((a: ScheduledAbsence) =>
      a.endDate === null && // Is indefinite
      isBefore(startOfDay(parseISO(a.startDate as string)), startOfDay(addDays(dayOfInterruption, 1))) // Starts on or before the interruption day
    );
  
    if (!absenceToEnd) return false;
  
    // Now check if it was truly interrupted
    const wasAbsenceInterrupted = currentDayData.absence !== absenceToEnd.absenceTypeId || currentDayData.workedHours > 0;
    
    if (wasAbsenceInterrupted) {
      absenceToEnd.endDate = format(subDays(dayOfInterruption, 1), 'yyyy-MM-dd');
      await updateDoc(employeeDocRef, { employmentPeriods: employeeCopy.employmentPeriods });
      return true; // Indicates an update was made
    }
    
    return false; // No interruption detected
};

export const addScheduledAbsence = async (
    employeeId: string,
    periodId: string,
    newAbsence: {
      absenceTypeId: string;
      startDate: string; // YYYY-MM-DD
      endDate: string | null;
      notes?: string | null;
      communicatedTo?: string | null;
    },
    currentEmployee: Employee,
    isEmployeeRequest: boolean = false
  ): Promise<void> => {
    
    const startDateObj = parseISO(newAbsence.startDate);
    await endIndefiniteAbsence(employeeId, startDateObj, undefined); // This call needs fixing or removal
      
    await new Promise(resolve => setTimeout(resolve, 250));

    const employeeDoc = await getDoc(doc(db, 'employees', employeeId));
    if (!employeeDoc.exists()) throw new Error("Employee not found after refetch");
    const employeeCopy = JSON.parse(JSON.stringify(employeeDoc.data()));

    const period = employeeCopy.employmentPeriods.find((p: EmploymentPeriod) => p.id === periodId);
    if (!period) throw new Error("Periodo laboral no encontrado");
  
    if (!period.scheduledAbsences) {
      period.scheduledAbsences = [];
    }
  
    const finalEndDate = newAbsence.endDate || newAbsence.startDate;
  
    const newRecord: any = {
        id: `abs_${Date.now()}_${Math.random()}`,
        absenceTypeId: newAbsence.absenceTypeId,
        startDate: newAbsence.startDate,
        endDate: newAbsence.endDate, // Store null if it's open-ended
        notes: newAbsence.notes || null,
        communicatedTo: newAbsence.communicatedTo || null,
        isDefinitive: !isEmployeeRequest, // It's definitive if an admin adds it, not definitive if it's an employee request.
        originalRequest: {
            startDate: newAbsence.startDate,
            endDate: newAbsence.endDate,
        },
    };
  
    period.scheduledAbsences.push(newRecord);
  
    await updateDocument('employees', employeeId, { employmentPeriods: employeeCopy.employmentPeriods });
  };



export const updateScheduledAbsence = async (
    employeeId: string,
    periodId: string,
    absenceId: string,
    newData: { 
        startDate: string; 
        endDate: string; 
        absenceTypeId: string;
    },
    currentEmployee: Employee
): Promise<void> => {
    const employeeCopy = JSON.parse(JSON.stringify(currentEmployee));
    const period = employeeCopy.employmentPeriods.find((p: EmploymentPeriod) => p.id === periodId);
    if (!period || !period.scheduledAbsences) throw new Error("Periodo o ausencias no encontrados.");

    const absenceIndex = period.scheduledAbsences.findIndex((a: ScheduledAbsence) => a.id === absenceId);
    if (absenceIndex === -1) throw new Error("Ausencia no encontrada para actualizar.");

    const absenceToUpdate = period.scheduledAbsences[absenceIndex];

    absenceToUpdate.isDefinitive = true;
    absenceToUpdate.startDate = newData.startDate as any;
    absenceToUpdate.endDate = newData.endDate as any;
    absenceToUpdate.absenceTypeId = newData.absenceTypeId;

    await updateDocument('employees', employeeId, { employmentPeriods: employeeCopy.employmentPeriods });
};


export const deleteScheduledAbsence = async (
    employeeId: string, 
    periodId: string, 
    absenceId: string, 
    weeklyRecords?: Record<string, WeeklyRecord>
): Promise<void> => {
    const employeeDoc = await getDoc(doc(db, 'employees', employeeId));
    if (!employeeDoc.exists()) throw new Error("Employee not found");
    
    const employeeCopy = JSON.parse(JSON.stringify(employeeDoc.data()));
    const period = employeeCopy.employmentPeriods.find((p: EmploymentPeriod) => p.id === periodId);
    if (!period || !period.scheduledAbsences) throw new Error("Periodo laboral o ausencias no encontradas");

    const absenceIndex = period.scheduledAbsences.findIndex((a: ScheduledAbsence) => a.id === absenceId);
    if (absenceIndex === -1) {
        console.warn(`Absence with id ${absenceId} not found for hard delete.`);
        return; // Exit if not found
    }

    const absenceToModify = period.scheduledAbsences[absenceIndex];
    
    if (weeklyRecords) {
        const startDate = absenceToModify.startDate instanceof Date ? absenceToModify.startDate : parseISO(absenceToModify.startDate as string);
        const endDate = absenceToModify.endDate ? (absenceToModify.endDate instanceof Date ? absenceToModify.endDate : parseISO(absenceToModify.endDate as string)) : startDate;
        
        const daysInAbsence = eachDayOfInterval({
            start: startOfDay(startDate),
            end: startOfDay(endDate)
        });

        for(const day of daysInAbsence) {
            const weekId = format(startOfWeek(day, { weekStartsOn: 1 }), 'yyyy-MM-dd');
            const weekRecord = weeklyRecords[weekId]?.weekData?.[employeeId];
            if (weekRecord?.confirmed) {
                const dayKey = format(day, 'yyyy-MM-dd');
                const docRef = doc(db, 'weeklyRecords', weekId);
                await updateDoc(docRef, {
                    [`weekData.${employeeId}.days.${dayKey}.absence`]: 'ninguna',
                    [`weekData.${employeeId}.days.${dayKey}.absenceHours`]: 0,
                });
            }
        }
    }

    period.scheduledAbsences[absenceIndex].endDate = period.scheduledAbsences[absenceIndex].startDate;
    
    await updateDocument('employees', employeeId, { employmentPeriods: employeeCopy.employmentPeriods });
};


export const hardDeleteScheduledAbsence = async (
    employeeId: string,
    periodId: string,
    absenceId: string,
    originalRequest?: any
): Promise<void> => {
    const employeeDocRef = doc(db, 'employees', employeeId);
    const employeeDoc = await getDoc(employeeDocRef);
    if (!employeeDoc.exists()) throw new Error("Employee not found");

    const employeeData = employeeDoc.data();
    const employeeCopy = JSON.parse(JSON.stringify(employeeData));

    const period = employeeCopy.employmentPeriods.find((p: EmploymentPeriod) => p.id === periodId);
    if (!period || !period.scheduledAbsences) {
        console.warn(`Period with id ${periodId} not found. No changes made.`);
        return;
    }
    
    const originalLength = period.scheduledAbsences.length;
    period.scheduledAbsences = period.scheduledAbsences.filter((a: ScheduledAbsence) => a.id !== absenceId);

    if (period.scheduledAbsences.length === originalLength) {
        console.warn(`Absence with id ${absenceId} not found for hard delete. No changes made.`);
        return; 
    }

    await updateDoc(employeeDocRef, { employmentPeriods: employeeCopy.employmentPeriods });
};
    


    
