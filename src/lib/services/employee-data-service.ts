
'use server';

import { 
    getDocs, 
    collection, 
    query, 
    where, 
    Timestamp,
    getDoc,
    doc
} from 'firebase/firestore';
import { getDbAdmin } from '@/lib/firebase-admin'; // Using admin SDK for server-side logic
import type { 
    Employee, 
    AbsenceType, 
    WeeklyRecord, 
    EmploymentPeriod 
} from '@/lib/types';
import { 
    getYear, 
    isAfter, 
    parseISO, 
    startOfDay, 
    endOfYear, 
    startOfYear, 
    differenceInDays, 
    eachDayOfInterval,
    endOfDay,
    isBefore,
    getISOWeekYear
} from 'date-fns';
import { calculateBalancePreview as calculateBalancePreviewInternal } from '../calculators/balance-calculator';

// --- Data Fetching ---

async function getCollectionData<T>(collectionName: string): Promise<T[]> {
    const db = getDbAdmin();
    const snapshot = await db.collection(collectionName).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
}

async function getDocumentData<T>(collectionName: string, docId: string): Promise<T | null> {
    const db = getDbAdmin();
    const docRef = db.collection(collectionName).doc(docId);
    const docSnap = await docRef.get();
    return docSnap.exists ? { id: docSnap.id, ...docSnap.data() } as T : null;
}

// --- Main Service Functions ---

export async function getFinalBalancesForEmployee(employeeId: string): Promise<{ ordinary: number, holiday: number, leave: number, total: number }> {
    const [employees, weeklyRecords, absenceTypes, contractTypes] = await Promise.all([
        getCollectionData<Employee>('employees'),
        getCollectionData<WeeklyRecord>('weeklyRecords'),
        getCollectionData<AbsenceType>('absenceTypes'),
        getCollectionData<any>('contractTypes'), // Using any to match the calculator's expectation
    ]);

    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return { ordinary: 0, holiday: 0, leave: 0, total: 0 };
    
    const weeklyRecordsObject = weeklyRecords.reduce((acc, record) => {
        acc[record.id] = record;
        return acc;
    }, {} as Record<string, WeeklyRecord>);

    const getEmployeeBalancesForWeek = (empId: string, weekId: string) => {
        const targetWeekStartDate = startOfDay(parseISO(weekId));
        const previousConfirmedRecords = Object.values(weeklyRecordsObject)
            .filter(record => 
                record.weekData?.[empId]?.confirmed && 
                isBefore(parseISO(record.id), targetWeekStartDate)
            )
            .sort((a, b) => a.id.localeCompare(b.id));

        const firstPeriod = [...(employee.employmentPeriods || [])]
            .sort((a, b) => parseISO(a.startDate as string).getTime() - parseISO(b.startDate as string).getTime())[0];
            
        let currentBalances = {
            ordinary: firstPeriod?.initialOrdinaryHours ?? 0,
            holiday: firstPeriod?.initialHolidayHours ?? 0,
            leave: firstPeriod?.initialLeaveHours ?? 0,
        };

        for (const record of previousConfirmedRecords) {
            const weekData = record.weekData[empId];
            const preview = calculateBalancePreviewInternal(
                empId, weekData.days, currentBalances, absenceTypes, contractTypes, 
                employee.employmentPeriods.map(p => ({
                    ...p,
                    startDate: (p.startDate as any)?.toDate ? (p.startDate as any).toDate() : parseISO(p.startDate as string),
                    endDate: p.endDate ? ((p.endDate as any)?.toDate ? (p.endDate as any).toDate() : parseISO(p.endDate as string)) : null,
                })), 
                weekData.weeklyHoursOverride, weekData.totalComplementaryHours
            );
            if (preview) {
                currentBalances = {
                    ordinary: preview.resultingOrdinary,
                    holiday: preview.resultingHoliday,
                    leave: preview.resultingLeave,
                };
            }
        }
        return currentBalances;
    };
    
    const allConfirmedRecords = Object.values(weeklyRecordsObject)
      .filter(record => record.weekData?.[employeeId]?.confirmed)
      .sort((a, b) => b.id.localeCompare(a.id)); 

    if (allConfirmedRecords.length > 0) {
        const latestRecordWeekId = allConfirmedRecords[0].id;
        const initialBalances = getEmployeeBalancesForWeek(employeeId, latestRecordWeekId);
        
        const latestRecordData = allConfirmedRecords[0].weekData[employeeId];
        const preview = calculateBalancePreviewInternal(
            employeeId,
            latestRecordData.days,
            { ordinary: initialBalances.ordinary, holiday: initialBalances.holiday, leave: initialBalances.leave },
            absenceTypes, contractTypes, 
             employee.employmentPeriods.map(p => ({
                ...p,
                startDate: (p.startDate as any)?.toDate ? (p.startDate as any).toDate() : parseISO(p.startDate as string),
                endDate: p.endDate ? ((p.endDate as any)?.toDate ? (p.endDate as any).toDate() : parseISO(p.endDate as string)) : null,
            })),
            latestRecordData.weeklyHoursOverride,
            latestRecordData.totalComplementaryHours
        );

        if (preview) {
             const finalBalance = {
                ordinary: preview.resultingOrdinary,
                holiday: preview.resultingHoliday,
                leave: preview.resultingLeave,
            };
            return { ...finalBalance, total: finalBalance.ordinary + finalBalance.holiday + finalBalance.leave };
        }
    }
    
    const earliestPeriod = [...(employee.employmentPeriods || [])]
        .sort((a, b) => parseISO(a.startDate as string).getTime() - parseISO(b.startDate as string).getTime())[0];

    if (earliestPeriod) {
        const balances = {
            ordinary: earliestPeriod.initialOrdinaryHours ?? 0,
            holiday: earliestPeriod.initialHolidayHours ?? 0,
            leave: earliestPeriod.initialLeaveHours ?? 0,
        };
        return { ...balances, total: balances.ordinary + balances.holiday + balances.leave };
    }

    return { ordinary: 0, holiday: 0, leave: 0, total: 0 };
}


export async function getVacationSummaryForEmployee(employeeId: string): Promise<{ vacationDaysTaken: number; suspensionDays: number; vacationDaysAvailable: number; baseDays: number; carryOverDays: number; suspensionDeduction: number; proratedDays: number; vacationDays2024: number; }> {
    const [employees, weeklyRecords, absenceTypes] = await Promise.all([
        getCollectionData<Employee>('employees'),
        getCollectionData<WeeklyRecord>('weeklyRecords'),
        getCollectionData<AbsenceType>('absenceTypes'),
    ]);

    const weeklyRecordsObject = weeklyRecords.reduce((acc, record) => {
        acc[record.id] = record;
        return acc;
    }, {} as Record<string, WeeklyRecord>);

    const emp = employees.find(e => e.id === employeeId);
    
    const currentYear = new Date().getFullYear();
    const vacationType = absenceTypes.find(at => at.name === 'Vacaciones');
    const suspensionTypeIds = new Set(absenceTypes.filter(at => at.suspendsContract).map(at => at.id));
    const suspensionAbbrs = new Set(absenceTypes.filter(at => at.suspendsContract).map(at => at.abbreviation));

    const defaultReturn = { vacationDaysTaken: 0, suspensionDays: 0, vacationDaysAvailable: 31, baseDays: 31, carryOverDays: 0, suspensionDeduction: 0, proratedDays: 0, vacationDays2024: 0 };

    if (!vacationType || !emp) return defaultReturn;

    let vacationDaysTaken = 0;
    let suspensionDays = 0;
    let contractDaysInYear = 0;
    let isTransfer = false;
    let vacationDays2024 = 0;
    let vacationDaysUsedInAnotherCenter = 0;

    const yearStart = startOfYear(new Date(currentYear, 0, 1));
    const yearEnd = endOfYear(new Date(currentYear, 11, 31));

    const activePeriodsThisYear = emp.employmentPeriods?.filter(p => {
        const pStart = parseISO(p.startDate as string);
        const pEnd = p.endDate ? parseISO(p.endDate as string) : yearEnd;
        return getYear(pStart) <= currentYear && getYear(pEnd) >= currentYear;
    });

    if (!activePeriodsThisYear || activePeriodsThisYear.length === 0) return defaultReturn;
    
    const firstPeriod = activePeriodsThisYear[0];
    isTransfer = firstPeriod.isTransfer || false;
    vacationDays2024 = firstPeriod.vacationDays2024 || 0;
    vacationDaysUsedInAnotherCenter = firstPeriod.vacationDaysUsedInAnotherCenter || 0;

    activePeriodsThisYear.forEach(p => {
        const pStart = parseISO(p.startDate as string);
        const pEnd = p.endDate ? parseISO(p.endDate as string) : yearEnd;
        const effectiveStart = isAfter(pStart, yearStart) ? pStart : yearStart;
        const effectiveEnd = isBefore(pEnd, yearEnd) ? pEnd : yearEnd;
        if (isAfter(effectiveStart, effectiveEnd)) return;
        contractDaysInYear += differenceInDays(effectiveEnd, effectiveStart) + 1;
    });

    const yearDayMap = new Map<string, 'V' | 'S'>();

    emp.employmentPeriods?.forEach(period => {
        const scheduledAbsences = (period.scheduledAbsences || []).map(a => ({
            ...a,
            startDate: (a.startDate as any)?.toDate ? (a.startDate as any).toDate() : parseISO(a.startDate as string),
            endDate: a.endDate ? ((a.endDate as any)?.toDate ? (a.endDate as any).toDate() : parseISO(a.endDate as string)) : null,
        }));
        scheduledAbsences?.forEach(absence => {
            if (!absence.endDate) return;
            const absenceCode = suspensionTypeIds.has(absence.absenceTypeId) ? 'S' : (absence.absenceTypeId === vacationType.id ? 'V' : null);
            if (!absenceCode) return;
            eachDayOfInterval({ start: startOfDay(absence.startDate), end: endOfDay(absence.endDate) }).forEach(day => {
                if (getYear(day) === currentYear) {
                    const dayKey = format(day, 'yyyy-MM-dd');
                    if (!yearDayMap.has(dayKey) || absenceCode === 'S') yearDayMap.set(dayKey, absenceCode);
                }
            });
        });
    });

    Object.values(weeklyRecordsObject).forEach(record => {
        const empWeekData = record.weekData[emp.id];
        if (!empWeekData?.days) return;
        Object.entries(empWeekData.days).forEach(([dayStr, dayData]) => {
            if (getISOWeekYear(parseISO(dayStr)) !== currentYear) return;
            const dayKey = format(parseISO(dayStr), 'yyyy-MM-dd');
            if (yearDayMap.has(dayKey)) return;
            if (dayData.absence && dayData.absence !== 'ninguna') {
                if (suspensionAbbrs.has(dayData.absence)) yearDayMap.set(dayKey, 'S');
                else if (dayData.absence === vacationType.abbreviation) yearDayMap.set(dayKey, 'V');
            }
        });
    });
    
    vacationDaysTaken = vacationDaysUsedInAnotherCenter;

    yearDayMap.forEach(value => {
        if (value === 'S') suspensionDays++;
        else if (value === 'V') vacationDaysTaken++;
    });

    const baseDays = 31;
    const daysInCurrentYear = differenceInDays(yearEnd, yearStart) + 1;
    const proratedDays = isTransfer ? baseDays : (baseDays / daysInCurrentYear) * contractDaysInYear;
    const suspensionDeduction = (suspensionDays / 30) * 2.5;
    
    const carryOverDays = 0; 
    
    const totalAvailable = proratedDays - suspensionDeduction + carryOverDays + vacationDays2024;
    
    return {
        vacationDaysTaken: Math.round(vacationDaysTaken),
        suspensionDays,
        vacationDaysAvailable: Math.ceil(totalAvailable),
        baseDays,
        carryOverDays,
        suspensionDeduction,
        proratedDays,
        vacationDays2024,
    };
}

    