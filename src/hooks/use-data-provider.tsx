

'use client';
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type {
  Employee,
  Holiday,
  AbsenceType,
  ContractType,
  AnnualConfiguration,
  WeeklyRecord,
  DailyData,
  DailyEmployeeData,
  AppUser,
  EmploymentPeriod,
  WeeklyRecordWithBalances,
  HolidayFormData,
  EmployeeFormData,
  PrefilledWeeklyRecord,
  HolidayEmployee,
  HolidayReport,
  EmployeeGroup,
} from '../types';
import { onCollectionUpdate } from '@/lib/services/firestoreService';
import { 
    createAbsenceType as createAbsenceTypeService, 
    updateAbsenceType as updateAbsenceTypeService, 
    deleteAbsenceType as deleteAbsenceTypeService,
    createHoliday as createHolidayService,
    updateHoliday as updateHolidayService,
    deleteHoliday as deleteHolidayService,
    createAnnualConfig as createAnnualConfigService,
    updateAnnualConfig as updateAnnualConfigService,
    deleteAnnualConfig as deleteAnnualConfigService,
    createContractType as createContractTypeService,
    updateContractType as updateContractTypeService,
    deleteContractType as deleteContractTypeService,
    addHolidayEmployee,
    updateHolidayEmployee,
    deleteHolidayEmployee,
    createEmployeeGroup,
    updateEmployeeGroup,
    deleteEmployeeGroup,
    updateEmployeeGroupOrder,
} from '../lib/services/settingsService';
import { addDays, addWeeks, differenceInCalendarWeeks, differenceInDays, endOfWeek, endOfYear, eachDayOfInterval, format, getISODay, getISOWeek, getWeeksInMonth, getYear, isAfter, isBefore, isSameDay, isSameWeek, isWithinInterval, max, min, parse, parseFromISO, parseISO, startOfDay, startOfWeek, startOfYear, subDays, subWeeks, endOfDay, differenceInWeeks } from 'date-fns';
import { addDocument, setDocument } from '@/lib/services/firestoreService';
import { updateEmployeeWorkHours as updateEmployeeWorkHoursService } from '@/lib/services/employeeService';
import { Timestamp } from 'firebase/firestore';
import prefilledData from '@/lib/prefilled_data.json';
import { calcularJornadaAnualTeorica, SegmentoJornada, Suspension } from '@/lib/jornadaCalc';
import { calculateBalancePreview as calculateBalancePreviewIsolated } from '@/lib/calculators/balance-calculator';


interface DataContextType {
  employees: Employee[];
  holidays: Holiday[];
  absenceTypes: AbsenceType[];
  contractTypes: ContractType[];
  annualConfigs: AnnualConfiguration[];
  weeklyRecords: Record<string, WeeklyRecord>;
  users: AppUser[];
  holidayEmployees: HolidayEmployee[];
  holidayReports: HolidayReport[];
  employeeGroups: EmployeeGroup[];
  loading: boolean;
  unconfirmedWeeksDetails: { weekId: string; employeeNames: string[] }[];
  loadData: () => void;
  refreshData: () => void;
  refreshUsers: () => void;
  getEmployeeById: (id: string) => Employee | undefined;
  getActivePeriod: (employeeId: string, date: Date) => EmploymentPeriod | null;
  getEffectiveWeeklyHours: (period: EmploymentPeriod | null, date: Date) => number;
  getActiveEmployeesForDate: (date: Date) => Employee[];
  getEmployeeBalancesForWeek: (employeeId: string, weekId: string) => { ordinary: number, holiday: number, leave: number, total: number };
  getEmployeeFinalBalances: (employeeId: string) => { ordinary: number, holiday: number, leave: number, total: number };
  getTheoreticalHoursAndTurn: (employeeId: string, dateInWeek: Date) => { turnId: string | null; weekDaysWithTheoreticalHours: { dateKey: string; theoreticalHours: number }[] };
  calculateBalancePreview: (employeeId: string, weekData: Record<string, DailyData>, initialBalances: { ordinary: number, holiday: number, leave: number }, weeklyHoursOverride?: number | null, totalComplementaryHours?: number | null) => any;
  calculateCurrentAnnualComputedHours: (employeeId: string, year: number) => number;
  calculateTheoreticalAnnualWorkHours: (employeeId: string, year: number) => { theoreticalHours: number, baseTheoreticalHours: number, suspensionDetails: any[], workHoursChangeDetails: any[] };
  getProcessedAnnualDataForEmployee: (employeeId: string, year: number) => Promise<{ annualData: WeeklyRecordWithBalances[] }>;
  getProcessedAnnualDataForAllYears: (employeeId: string) => Promise<Record<number, { annualData: WeeklyRecordWithBalances[], annualComputedHours: number, theoreticalAnnualWorkHours: number }>>;
  createAbsenceType: (data: Omit<AbsenceType, 'id'>) => Promise<string>;
  updateAbsenceType: (id: string, data: Partial<AbsenceType>) => Promise<void>;
  deleteAbsenceType: (id: string) => Promise<void>;
  createHoliday: (data: Omit<Holiday, 'id' | 'date'> & { date: string }) => Promise<string>;
  updateHoliday: (id: string, data: HolidayFormData) => Promise<void>;
  deleteHoliday: (id: string) => Promise<void>;
  createAnnualConfig: (data: Omit<AnnualConfiguration, 'id'>) => Promise<string>;
  updateAnnualConfig: (id: string, data: Partial<AnnualConfiguration>) => Promise<void>;
  deleteAnnualConfig: (id: string) => Promise<void>;
  createContractType: (data: Omit<ContractType, 'id'>) => Promise<string>;
  updateContractType: (id: string, data: Partial<ContractType>) => Promise<void>;
  deleteContractType: (id: string) => Promise<void>;
  updateEmployeeWorkHours: (employeeId: string, weeklyHours: number, effectiveDate: string) => Promise<void>;
  getWeekId: (d: Date) => string;
  processEmployeeWeekData: (emp: Employee, weekDays: Date[], weekId: string) => DailyEmployeeData | null;
  calculateEmployeeVacations: (emp: Employee) => { vacationDaysTaken: number, suspensionDays: number, vacationDaysAvailable: number };
  addHolidayEmployee: (data: Partial<Omit<HolidayEmployee, 'id'>>) => Promise<string>;
  updateHolidayEmployee: (id: string, data: Partial<Omit<HolidayEmployee, 'id'>>) => Promise<void>;
  deleteHolidayEmployee: (id: string) => Promise<void>;
  addHolidayReport: (report: Omit<HolidayReport, 'id'>) => Promise<string>;
  updateHolidayReport: (reportId: string, data: Partial<Omit<HolidayReport, 'id'>>) => Promise<void>;
  createEmployeeGroup: (data: Omit<EmployeeGroup, 'id'>) => Promise<string>;
  updateEmployeeGroup: (id: string, data: Partial<Omit<EmployeeGroup, 'id'>>) => Promise<void>;
  deleteEmployeeGroup: (id: string) => Promise<void>;
  updateEmployeeGroupOrder: (groups: EmployeeGroup[]) => Promise<void>;
}

const DataContext = createContext<DataContextType>({
  employees: [],
  holidays: [],
  absenceTypes: [],
  contractTypes: [],
  annualConfigs: [],
  weeklyRecords: {},
  users: [],
  holidayEmployees: [],
  holidayReports: [],
  employeeGroups: [],
  loading: true,
  unconfirmedWeeksDetails: [],
  loadData: () => {},
  refreshData: () => {},
  refreshUsers: () => {},
  getEmployeeById: () => undefined,
  getActivePeriod: () => null,
  getEffectiveWeeklyHours: () => 0,
  getActiveEmployeesForDate: () => [],
  getEmployeeBalancesForWeek: () => ({ ordinary: 0, holiday: 0, leave: 0, total: 0 }),
  getEmployeeFinalBalances: () => ({ ordinary: 0, holiday: 0, leave: 0, total: 0 }),
  getTheoreticalHoursAndTurn: () => ({ turnId: null, weekDaysWithTheoreticalHours: [] }),
  calculateBalancePreview: () => null,
  calculateCurrentAnnualComputedHours: () => 0,
  calculateTheoreticalAnnualWorkHours: () => ({ theoreticalHours: 0, baseTheoreticalHours: 0, suspensionDetails: [], workHoursChangeDetails: [] }),
  getProcessedAnnualDataForEmployee: async () => ({ annualData: [] }),
  getProcessedAnnualDataForAllYears: async () => ({}),
  createAbsenceType: async () => '',
  updateAbsenceType: async () => {},
  deleteAbsenceType: async () => {},
  createHoliday: async () => '',
  updateHoliday: async () => {},
  deleteHoliday: async () => {},
createAnnualConfig: async () => '',
    updateAnnualConfig: async () => {},
    deleteAnnualConfig: async () => {},
    createContractType: async () => '',
    updateContractType: async () => {},
deleteContractType: async () => {},
  updateEmployeeWorkHours: async () => {},
  getWeekId: () => '',
  processEmployeeWeekData: () => null,
  calculateEmployeeVacations: () => ({ vacationDaysTaken: 0, suspensionDays: 0, vacationDaysAvailable: 31 }),
  addHolidayEmployee: async (data) => '',
  updateHolidayEmployee: async (id: string, data: Partial<Omit<HolidayEmployee, 'id'>>) => {},
  deleteHolidayEmployee: async (id: string) => {},
  addHolidayReport: async (report: Omit<HolidayReport, 'id'>) => '',
  updateHolidayReport: async (reportId: string, data: Partial<Omit<HolidayReport, 'id'>>) => {},
  createEmployeeGroup: async (data: Omit<EmployeeGroup, 'id'>) => '',
  updateEmployeeGroup: async (id: string, data: Partial<Omit<EmployeeGroup, 'id'>>) => {},
  deleteEmployeeGroup: async (id: string) => {},
  updateEmployeeGroupOrder: async (groups: EmployeeGroup[]) => {},
});

const roundToNearestQuarter = (num: number) => {
    return Math.round(num * 4) / 4;
};


export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [absenceTypes, setAbsenceTypes] = useState<AbsenceType[]>([]);
  const [contractTypes, setContractTypes] = useState<ContractType[]>([]);
  const [annualConfigs, setAnnualConfigs] = useState<AnnualConfiguration[]>([]);
  const [weeklyRecords, setWeeklyRecords] = useState<Record<string, WeeklyRecord>>({});
  const [users, setUsers] = useState<AppUser[]>([]);
  const [holidayEmployees, setHolidayEmployees] = useState<HolidayEmployee[]>([]);
  const [holidayReports, setHolidayReports] = useState<HolidayReport[]>([]);
  const [employeeGroups, setEmployeeGroups] = useState<EmployeeGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [unconfirmedWeeksDetails, setUnconfirmedWeeksDetails] = useState<{ weekId: string; employeeNames: string[] }[]>([]);

  const getWeekId = (d: Date): string => {
    const monday = startOfWeek(d, { weekStartsOn: 1 });
    return format(monday, 'yyyy-MM-dd');
  };
  
  const refreshData = useCallback(() => {
    // This is a placeholder. The actual refresh is triggered by onSnapshot.
    // We can enhance this if manual refresh is needed.
    console.log("Refreshing data (triggered by onSnapshot)...");
  }, []);

  const refreshUsers = () => {};

  const calculateEmployeeVacations = useCallback((emp: Employee): { vacationDaysTaken: number, suspensionDays: number, vacationDaysAvailable: number } => {
    const vacationType = absenceTypes.find(at => at.name === 'Vacaciones');
    const suspensionTypeIds = new Set(absenceTypes.filter(at => at.suspendsContract).map(at => at.id));

    if (!vacationType) {
        return { vacationDaysTaken: 0, suspensionDays: 0, vacationDaysAvailable: 31 };
    }

    const currentYear = getYear(new Date());
    const yearDayMap = new Map<string, 'V' | 'S'>(); // 'V' for Vacation, 'S' for Suspension

    // 1. Process scheduled absences (long-term) first. Suspensions have priority.
    emp.employmentPeriods?.forEach(period => {
        period.scheduledAbsences?.forEach(absence => {
            if (!absence.endDate) return;

            let absenceCode: 'V' | 'S' | null = null;
            if (suspensionTypeIds.has(absence.absenceTypeId)) {
                absenceCode = 'S';
            } else if (absence.absenceTypeId === vacationType.id) {
                absenceCode = 'V';
            }
            if (!absenceCode) return;

            let currentDay = startOfDay(absence.startDate);
            const lastDay = endOfDay(absence.endDate);

            while (currentDay <= lastDay) {
                if (getYear(currentDay) === currentYear) {
                    const dayKey = format(currentDay, 'yyyy-MM-dd');
                    // Suspension overrides vacation if there's an overlap
                    if (!yearDayMap.has(dayKey) || absenceCode === 'S') {
                        yearDayMap.set(dayKey, absenceCode);
                    }
                }
                currentDay = addDays(currentDay, 1);
            }
        });
    });

    // 2. Process weekly records, filling in days not already covered by a scheduled absence.
    Object.values(weeklyRecords).forEach(record => {
        const empWeekData = record.weekData[emp.id];
        if (!empWeekData?.days) return;

        Object.entries(empWeekData.days).forEach(([dayStr, dayData]) => {
            const dayDate = parseISO(dayStr);
            if (getYear(dayDate) !== currentYear) return;

            const dayKey = format(dayDate, 'yyyy-MM-dd');
            if (yearDayMap.has(dayKey)) return; // Already processed by a long-term scheduled absence

            if (dayData.absence && dayData.absence !== 'ninguna') {
                const absenceType = absenceTypes.find(at => at.abbreviation === dayData.absence);
                if (absenceType) {
                    if (suspensionTypeIds.has(absenceType.id)) {
                        yearDayMap.set(dayKey, 'S');
                    } else if (absenceType.id === vacationType.id) {
                        yearDayMap.set(dayKey, 'V');
                    }
                }
            }
        });
    });

    let vacationDaysCount = 0;
    let suspensionDaysCount = 0;

    yearDayMap.forEach((value) => {
        if (value === 'S') {
            suspensionDaysCount++;
        } else if (value === 'V') {
            vacationDaysCount++;
        }
    });
    
    const vacationDeduction = Math.floor(suspensionDaysCount / 30) * 2.5;
    const vacationDaysAvailable = Math.max(0, 31 - vacationDeduction);

    return { vacationDaysTaken: vacationDaysCount, suspensionDays: suspensionDaysCount, vacationDaysAvailable };
}, [absenceTypes, weeklyRecords]);



const loadData = useCallback(() => {
    if (loaded) return;
    setLoading(true);

    let mounted = true;
    
    const unsubEmployees = onCollectionUpdate<Employee[]>('employees', (data) => {
        if (mounted) {
            const processedEmployees = data.map(emp => ({
                ...emp,
                employmentPeriods: emp.employmentPeriods.map(p => ({
                    ...p,
                    startDate: (p.startDate as any)?.toDate ? (p.startDate as any).toDate() : p.startDate,
                    endDate: p.endDate ? ((p.endDate as any)?.toDate ? (p.endDate as any).toDate() : p.endDate) : null,
                    scheduledAbsences: (p.scheduledAbsences || []).map(a => ({
                        ...a,
                        startDate: (a.startDate as any)?.toDate ? (a.startDate as any).toDate() : parseISO(a.startDate as string),
                        endDate: a.endDate ? ((a.endDate as any)?.toDate ? (a.endDate as any).toDate() : parseISO(a.endDate as string)) : null,
                    })),
                })),
            })).sort((a, b) => a.name.localeCompare(b.name));
             setEmployees(processedEmployees);
        }
    });

    const unsubAbsenceTypes = onCollectionUpdate<AbsenceType[]>('absenceTypes', (data) => {
        if (mounted) {
            setAbsenceTypes(data.sort((a, b) => a.name.localeCompare(b.name)));
        }
    });

    const unsubWeeklyRecords = onCollectionUpdate<WeeklyRecord[]>('weeklyRecords', (data) => {
        if (mounted) {
            setWeeklyRecords(data.reduce((acc, record) => ({ ...acc, [record.id]: record }), {}));
        }
    });

    const unsubHolidays = onCollectionUpdate<any>('holidays', (data) => {
      if (mounted) setHolidays(data.map((h: any) => ({ ...h, date: (h.date as Timestamp).toDate() })).sort((a:any,b:any) => a.date.getTime() - b.date.getTime()));
    });
    const unsubContractTypes = onCollectionUpdate<ContractType[]>('contractTypes', (data) => { if(mounted) setContractTypes(data)});
    const unsubAnnualConfigs = onCollectionUpdate<AnnualConfiguration[]>('annualConfigurations', (data) => { if(mounted) setAnnualConfigs(data.sort((a:any,b:_any) => a.year - b.year))});
    const unsubUsers = onCollectionUpdate<AppUser[]>('users', (data) => {if(mounted) setUsers(data)});
    const unsubHolidayEmployees = onCollectionUpdate<HolidayEmployee[]>('holidayEmployees', (data) => { if(mounted) setHolidayEmployees(data.sort((a,b) => a.name.localeCompare(b.name))) });
    const unsubHolidayReports = onCollectionUpdate<HolidayReport[]>('holidayReports', (data) => { if(mounted) setHolidayReports(data) });
    const unsubEmployeeGroups = onCollectionUpdate<EmployeeGroup[]>('employeeGroups', (data) => { if (mounted) setEmployeeGroups(data.sort((a,b) => a.order - b.order)) });


    const allSubscriptionsReady = Promise.all([
        unsubEmployees.ready,
        unsubAbsenceTypes.ready,
        unsubWeeklyRecords.ready,
        unsubHolidays.ready,
        unsubContractTypes.ready,
        unsubAnnualConfigs.ready,
        unsubUsers.ready,
        unsubHolidayEmployees.ready,
        unsubHolidayReports.ready,
        unsubEmployeeGroups.ready,
    ]);

    allSubscriptionsReady.then(() => {
        if (mounted) {
            setLoading(false);
            setLoaded(true);
        }
    }).catch(error => {
        console.error("Error during initial data load:", error);
        if (mounted) {
            setLoading(false);
        }
    });

    return () => {
        mounted = false;
        unsubEmployees.unsubscribe();
        unsubAbsenceTypes.unsubscribe();
        unsubWeeklyRecords.unsubscribe();
        unsubHolidays.unsubscribe();
        unsubContractTypes.unsubscribe();
        unsubAnnualConfigs.unsubscribe();
        unsubUsers.unsubscribe();
        unsubHolidayEmployees.unsubscribe();
        unsubHolidayReports.unsubscribe();
        unsubEmployeeGroups.unsubscribe();
    };
}, [loaded]);

  const getActiveEmployeesForDate = useCallback((date: Date): Employee[] => {
    const weekStart = startOfDay(startOfWeek(date, { weekStartsOn: 1 }));
    const weekEnd = endOfDay(endOfWeek(date, { weekStartsOn: 1 }));

    return employees.filter(emp => 
        emp.employmentPeriods.some(p => {
            const periodStart = startOfDay(parseISO(p.startDate as string));
            const periodEnd = p.endDate ? startOfDay(parseISO(p.endDate as string)) : new Date('9999-12-31');
            return periodStart <= weekEnd && periodEnd >= weekStart;
        })
    );
}, [employees]);


useEffect(() => {
    if (loading || !employees.length) return;

    const details: { weekId: string; employeeNames: string[] }[] = [];
    const today = new Date();
    const startOfCurrentWeek = startOfDay(startOfWeek(today, { weekStartsOn: 1 }));
    
    // Patch: Lista de semanas a ignorar
    const excludedWeeks = new Set(['2024-12-16', '2024-12-23', '2025-01-13', '2025-01-20']);

    // Recorrer todos los registros semanales
    for (const weekId in weeklyRecords) {
        const weekStartDate = parseISO(weekId);
        
        // 1. Considerar solo semanas pasadas
        if (isBefore(startOfDay(weekStartDate), startOfCurrentWeek)) {
            // 2. Saltar semanas excluidas
            if (excludedWeeks.has(weekId)) {
                continue;
            }

            const activeEmployeesThisWeek = getActiveEmployeesForDate(weekStartDate);

            if (activeEmployeesThisWeek.length === 0) {
                continue;
            }

            const weekRecord = weeklyRecords[weekId];
            const unconfirmedEmployeeNames = activeEmployeesThisWeek
                .filter(emp => !(weekRecord?.weekData?.[emp.id]?.confirmed ?? false))
                .map(emp => emp.name);

            if (unconfirmedEmployeeNames.length > 0) {
                details.push({ weekId: weekId, employeeNames: unconfirmedEmployeeNames });
            }
        }
    }
    
    // Ordenar los detalles por fecha para consistencia
    details.sort((a, b) => a.weekId.localeCompare(b.weekId));

    setUnconfirmedWeeksDetails(details);

}, [loading, weeklyRecords, employees, getActiveEmployeesForDate]);


  const getEmployeeById = (id: string) => employees.find(e => e.id === id);

  const getActivePeriod = (employeeId: string, date: Date): EmploymentPeriod | null => {
    const employee = getEmployeeById(employeeId);
    if (!employee?.employmentPeriods) return null;

    const weekStart = startOfDay(startOfWeek(date, { weekStartsOn: 1 }));
    const weekEnd = endOfDay(endOfWeek(date, { weekStartsOn: 1 }));

    return employee.employmentPeriods.find(p => {
        const periodStart = startOfDay(parseISO(p.startDate as string));
        const periodEnd = p.endDate ? startOfDay(parseISO(p.endDate as string)) : new Date('9999-12-31');
        
        return periodStart <= weekEnd && periodEnd >= weekStart;
    }) || null;
};

  
  

const getEffectiveWeeklyHours = (period: EmploymentPeriod | null, date: Date): number => {
    if (!period?.workHoursHistory || period.workHoursHistory.length === 0) {
      return 0;
    }
    const targetDate = startOfDay(date);
    const history = [...period.workHoursHistory].sort((a,b) => parseISO(b.effectiveDate).getTime() - parseISO(a.effectiveDate).getTime());
    const effectiveRecord = history.find(record => !isAfter(startOfDay(parseISO(record.effectiveDate)), targetDate));
    return effectiveRecord?.weeklyHours || 0;
  };

const calculateBalancePreview = useCallback((employeeId: string, weekData: Record<string, DailyData>, initialBalances: { ordinary: number, holiday: number, leave: number }, weeklyHoursOverride?: number | null, totalComplementaryHours?: number | null) => {
    const employee = getEmployeeById(employeeId);
    if (!employee) return null;

    return calculateBalancePreviewIsolated(
        employee.id,
        weekData,
        initialBalances,
        absenceTypes,
        contractTypes,
        employee.employmentPeriods,
        weeklyHoursOverride,
        totalComplementaryHours
    );
  }, [employees, absenceTypes, contractTypes]);
  
 const getEmployeeBalancesForWeek = useCallback((employeeId: string, weekId: string): { ordinary: number, holiday: number, leave: number, total: number } => {
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return { ordinary: 0, holiday: 0, leave: 0, total: 0 };

    const targetWeekStartDate = startOfWeek(parseISO(weekId), { weekStartsOn: 1 });

    const previousConfirmedRecords = Object.values(weeklyRecords)
      .filter(record => 
        record.weekData?.[employeeId]?.confirmed && 
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
        const weekData = record.weekData[employeeId];
        const preview = calculateBalancePreview(
            employeeId,
            weekData.days,
            currentBalances,
            weekData.weeklyHoursOverride,
            weekData.totalComplementaryHours
        );
        if (preview) {
            currentBalances = {
                ordinary: preview.resultingOrdinary,
                holiday: preview.resultingHoliday,
                leave: preview.resultingLeave,
            };
        }
    }
    
    return { ...currentBalances, total: currentBalances.ordinary + currentBalances.holiday + currentBalances.leave };
}, [employees, weeklyRecords, calculateBalancePreview]);
  
const getEmployeeFinalBalances = useCallback((employeeId: string): { ordinary: number, holiday: number, leave: number, total: number } => {
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return { ordinary: 0, holiday: 0, leave: 0, total: 0 };

    const allConfirmedRecords = Object.values(weeklyRecords)
      .filter(record => record.weekData?.[employeeId]?.confirmed)
      .sort((a, b) => b.id.localeCompare(a.id)); 

    if (allConfirmedRecords.length > 0) {
        const latestRecordWeekId = allConfirmedRecords[0].id;
        const initialBalances = getEmployeeBalancesForWeek(employeeId, latestRecordWeekId);
        
        const latestRecordData = allConfirmedRecords[0].weekData[employeeId];
        const preview = calculateBalancePreview(
            employeeId,
            latestRecordData.days,
            { ordinary: initialBalances.ordinary, holiday: initialBalances.holiday, leave: initialBalances.leave },
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
}, [employees, weeklyRecords, getEmployeeBalancesForWeek, calculateBalancePreview]);


const getTheoreticalHoursAndTurn = (employeeId: string, dateInWeek: Date): { turnId: string | null; weekDaysWithTheoreticalHours: { dateKey: string; theoreticalHours: number }[] } => {
    const employee = getEmployeeById(employeeId);
    const weekDays = eachDayOfInterval({ start: startOfWeek(dateInWeek, { weekStartsOn: 1 }), end: endOfWeek(dateInWeek, { weekStartsOn: 1 }) });
    const defaultReturn = { turnId: null, weekDaysWithTheoreticalHours: weekDays.map(d => ({ dateKey: format(d, 'yyyy-MM-dd'), theoreticalHours: 0 })) };

    if (!employee) return defaultReturn;

    const activePeriod = getActivePeriod(employee.id, dateInWeek);
    if (!activePeriod?.weeklySchedulesHistory || activePeriod.weeklySchedulesHistory.length === 0) {
        return defaultReturn;
    }

    const schedule = [...activePeriod.weeklySchedulesHistory]
        .sort((a, b) => parseISO(b.effectiveDate).getTime() - parseISO(a.effectiveDate).getTime())
        .find(s => !isAfter(startOfDay(parseISO(s.effectiveDate)), startOfDay(dateInWeek)));
    
    if (!schedule) return defaultReturn;
    
    const ANCHOR_DATE = startOfWeek(new Date('2024-12-30'), { weekStartsOn: 1 });
    const currentWeekStartDate = startOfWeek(dateInWeek, { weekStartsOn: 1 });
    const daysSinceAnchor = differenceInDays(currentWeekStartDate, ANCHOR_DATE);
    const weeksSinceAnchor = Math.floor(daysSinceAnchor / 7);

    const turnIndex = (2 + weeksSinceAnchor) % 4; // Turno 3 (índice 2) es el ancla
    const finalTurnIndex = (turnIndex < 0) ? turnIndex + 4 : turnIndex; // Asegurar índice positivo
    const turnId = `turn${finalTurnIndex + 1}` as keyof typeof schedule.shifts;

    const turnSchedule = schedule.shifts[turnId];

    if (!turnSchedule) return defaultReturn;

    const results = weekDays.map(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const dayIndex = getISODay(day) - 1; // Monday = 0, Sunday = 6
        const dayId = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'][dayIndex];
        const dayData = turnSchedule[dayId];
        const theoreticalHours = (dayData?.isWorkDay && dayData.hours) ? dayData.hours : 0;
        return { dateKey, theoreticalHours: isNaN(theoreticalHours) ? 0 : theoreticalHours };
    });

    return { turnId: `turn${finalTurnIndex + 1}`, weekDaysWithTheoreticalHours: results };
};

  
    const calculateCurrentAnnualComputedHours = (employeeId: string, year: number): number => {
        const employee = getEmployeeById(employeeId);
        if (!employee) return 0;
    
        let totalComputedHours = 0;
    
        const relevantRecords = Object.values(weeklyRecords).filter(
            record => record.weekData[employeeId] && getYear(parseISO(record.id)) === year && record.weekData[employeeId].confirmed
        );
    
        relevantRecords.forEach(weekRecord => {
            const employeeData = weekRecord.weekData[employeeId];
            if (employeeData?.days) {
                Object.entries(employeeData.days).forEach(([dayKey, dayData]) => {
                    const dayDate = parseISO(dayKey);
                    if (getYear(dayDate) !== year) return;
    
                    const absenceType = absenceTypes.find(at => at.abbreviation === dayData.absence);
                    let dailyComputable = 0;
    
                    // Include worked hours only if it's not a holiday or Sunday
                    if (!dayData.isHoliday && getISODay(dayDate) !== 7) {
                        dailyComputable += dayData.workedHours || 0;
                    }
    
                    // Include absence hours if the absence type computes to annual hours
                    if (absenceType && absenceType.computesToAnnualHours) {
                        dailyComputable += dayData.absenceHours || 0;
                    }
                    
                    totalComputedHours += dailyComputable;
                });
    
                if (employeeData.totalComplementaryHours) {
                    totalComputedHours -= employeeData.totalComplementaryHours;
                }
            }
        });
    
        const activePeriod = getActivePeriod(employeeId, new Date(year, 0, 1));
        if (activePeriod) {
            totalComputedHours += activePeriod.annualComputedHours || 0;
        }
    
        return totalComputedHours;
    };

    const calculateTheoreticalAnnualWorkHours = (employeeId: string, year: number): { theoreticalHours: number, baseTheoreticalHours: number, suspensionDetails: any[], workHoursChangeDetails: any[] } => {
        const employee = getEmployeeById(employeeId);
        const annualConfig = annualConfigs.find(c => c.year === year);
    
        if (!employee || !annualConfig) {
            return { theoreticalHours: 0, baseTheoreticalHours: 0, suspensionDetails: [], workHoursChangeDetails: [] };
        }
    
        const yearStartDate = startOfYear(new Date(year, 0, 1));
        const yearEndDate = endOfYear(new Date(year, 11, 31));
    
        // 1. Build list of timeline points
        const datePoints = new Set<string>([format(yearStartDate, 'yyyy-MM-dd'), format(addDays(yearEndDate, 1), 'yyyy-MM-dd')]);
        
        employee.employmentPeriods?.forEach(p => {
            const periodStart = parseISO(p.startDate as string);
            const periodEnd = p.endDate ? parseISO(p.endDate as string) : yearEndDate;
    
            if (isAfter(periodEnd, yearStartDate) && isBefore(periodStart, yearEndDate)) {
                datePoints.add(format(max([periodStart, yearStartDate]), 'yyyy-MM-dd'));
                datePoints.add(format(addDays(min([periodEnd, yearEndDate]), 1), 'yyyy-MM-dd'));
    
                p.workHoursHistory?.forEach(wh => {
                    if (isWithinInterval(parseISO(wh.effectiveDate), { start: yearStartDate, end: yearEndDate })) {
                        datePoints.add(wh.effectiveDate);
                    }
                });
            }
        });
    
        const sortedUniquePoints = Array.from(datePoints).map(d => parseISO(d)).sort((a, b) => a.getTime() - b.getTime());
    
        // 2. Create segments from timeline points
        const segmentos: SegmentoJornada[] = [];
        for (let i = 0; i < sortedUniquePoints.length - 1; i++) {
            const segmentStart = sortedUniquePoints[i];
            const segmentEnd = subDays(sortedUniquePoints[i+1], 1);
    
            if (isBefore(segmentStart, yearStartDate) || isAfter(segmentStart, yearEndDate) || isBefore(segmentEnd, segmentStart)) continue;
    
            const activePeriod = getActivePeriod(employeeId, segmentStart);
            if (activePeriod) {
                const weeklyHours = getEffectiveWeeklyHours(activePeriod, segmentStart);
                segmentos.push({
                    desde: format(segmentStart, 'yyyy-MM-dd'),
                    hasta: format(segmentEnd, 'yyyy-MM-dd'),
                    horasSemanales: weeklyHours,
                });
            }
        }
        
        const uniqueSegmentos = segmentos.filter((seg, index, self) => 
            index === self.findIndex((s) => s.desde === seg.desde && s.hasta === seg.hasta && s.horasSemanales === seg.horasSemanales)
        );
    
        // 3. Collect suspension periods
        const suspensionTypeIds = new Set(absenceTypes.filter(at => at.suspendsContract).map(at => at.id));
        const suspensiones: Suspension[] = [];

        // Source 1: Scheduled Absences
        employee.employmentPeriods?.forEach(p => {
            p.scheduledAbsences?.forEach(sa => {
                // IMPORTANT: Only consider absences with a defined end date
                if (suspensionTypeIds.has(sa.absenceTypeId) && sa.endDate) {
                    const susStart = max([startOfDay(sa.startDate), yearStartDate]);
                    const susEnd = min([endOfDay(sa.endDate), yearEndDate]);
                    
                    if (isAfter(susEnd, susStart) || isSameDay(susEnd, susStart)) {
                        suspensiones.push({
                            desde: format(susStart, 'yyyy-MM-dd'),
                            hasta: format(susEnd, 'yyyy-MM-dd'),
                        });
                    }
                }
            });
        });

        // Source 2: Daily records from weekly data
        for (const weekId in weeklyRecords) {
            const weekDate = parseISO(weekId);
            if (getYear(weekDate) !== year && getYear(endOfWeek(weekDate, { weekStartsOn: 1 })) !== year) continue;

            const empWeekData = weeklyRecords[weekId].weekData[employeeId];
            if (empWeekData?.confirmed && empWeekData.days) {
                for (const dayKey in empWeekData.days) {
                     if (getYear(parseISO(dayKey)) !== year) continue;

                    const dayData = empWeekData.days[dayKey];
                    const dayAbsenceType = absenceTypes.find(at => at.abbreviation === dayData.absence);
                    if (dayAbsenceType && suspensionTypeIds.has(dayAbsenceType.id)) {
                        // To avoid duplicates, we can add individual days and merge later, but for simplicity
                        // we'll assume long-term suspensions are handled by scheduledAbsences.
                        // This part ensures daily entries are also caught if needed.
                        const existing = suspensiones.find(s => s.desde === dayKey && s.hasta === dayKey);
                        if (!existing) {
                             suspensiones.push({ desde: dayKey, hasta: dayKey });
                        }
                    }
                }
            }
        }

        // 4. Call the calculator
        const resultadoCalculo = calcularJornadaAnualTeorica({
            year,
            segmentos: uniqueSegmentos,
            suspensiones,
            baseAnual: annualConfig.maxAnnualHours,
            baseSemanal: annualConfig.referenceWeeklyHours,
        });
    
        return {
            theoreticalHours: resultadoCalculo.totalHoras,
            baseTheoreticalHours: 0,
            suspensionDetails: [],
            workHoursChangeDetails: []
        };
    };
    

const getProcessedAnnualDataForEmployee = async (employeeId: string, year: number): Promise<{ annualData: WeeklyRecordWithBalances[] }> => {
    const employee = getEmployeeById(employeeId);
    if (!employee) return { annualData: [] };

    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);
    const weekIdsInYear = new Set<string>();
    let currentDate = yearStart;
    while(currentDate <= yearEnd) {
        weekIdsInYear.add(getWeekId(currentDate));
        currentDate = addDays(currentDate, 1);
    }
    const sortedWeekIds = Array.from(weekIdsInYear).sort();

    const annualData: WeeklyRecordWithBalances[] = [];

    for (const currentWeekId of sortedWeekIds) {
        const weekStartDate = parseISO(currentWeekId);
        const weekStart = startOfDay(weekStartDate);
        const weekEnd = startOfDay(endOfWeek(weekStartDate, { weekStartsOn: 1 }));

        const activePeriod = employee.employmentPeriods.find(p => {
            const periodStart = startOfDay(parseISO(p.startDate as string));
            const periodEnd = p.endDate ? startOfDay(parseISO(p.endDate as string)) : new Date('9999-12-31');
            return periodStart <= weekEnd && periodEnd >= weekStart;
        });

        if (!activePeriod) continue;
        
        const weekDays = eachDayOfInterval({start: weekStartDate, end: endOfWeek(weekStartDate, { weekStartsOn: 1 })});
        
        const initialBalancesResult = getEmployeeBalancesForWeek(employeeId, currentWeekId);
        const initialBalances = { ordinary: initialBalancesResult.ordinary, holiday: initialBalancesResult.holiday, leave: initialBalancesResult.leave };


        const weekData = processEmployeeWeekData(employee, weekDays, currentWeekId);
        
        if (weekData?.days) {
            const preview = calculateBalancePreview(employeeId, weekData.days, initialBalances, weekData.weeklyHoursOverride, weekData.totalComplementaryHours);
            
            if (preview) {
                annualData.push({
                    id: currentWeekId,
                    data: weekData,
                    initialBalances: initialBalances,
                    impact: {
                        ordinary: preview.ordinary,
                        holiday: preview.holiday,
                        leave: preview.leave,
                    },
                    finalBalances: {
                        ordinary: preview.resultingOrdinary,
                        holiday: preview.resultingHoliday,
                        leave: preview.resultingLeave,
                    }
                });
            }
        }
    }
    
    return { annualData };
};

const getProcessedAnnualDataForAllYears = async (employeeId: string, ): Promise<Record<number, { annualData: WeeklyRecordWithBalances[], annualComputedHours: number, theoreticalAnnualWorkHours: number }>> => {
    const employee = getEmployeeById(employeeId);
    if (!employee) return {};

    const yearsWithActivity = new Set<number>();
    Object.keys(weeklyRecords).forEach(weekId => {
        if (weeklyRecords[weekId].weekData[employeeId]) {
            yearsWithActivity.add(getYear(parseISO(weekId)));
        }
    });
    
    employee.employmentPeriods.forEach(p => {
        yearsWithActivity.add(getYear(parseISO(p.startDate as string)));
        if (p.endDate) {
            yearsWithActivity.add(getYear(parseISO(p.endDate as string)));
        }
    });

    if (yearsWithActivity.size === 0) {
        yearsWithActivity.add(new Date().getFullYear());
    }

    const allYearsData: Awaited<ReturnType<typeof getProcessedAnnualDataForAllYears>> = {};
    const sortedYears = Array.from(yearsWithActivity).sort((a, b) => b - a).filter(y => y >= 2025);

    for (const year of sortedYears) {
        const { annualData } = await getProcessedAnnualDataForEmployee(employeeId, year);
        const { theoreticalHours } = calculateTheoreticalAnnualWorkHours(employeeId, year);
        const computedHours = calculateCurrentAnnualComputedHours(employeeId, year);
        
        allYearsData[year] = {
            annualData,
            annualComputedHours: computedHours,
            theoreticalAnnualWorkHours: theoreticalHours,
        };
    }

    return allYearsData;
};



  const updateEmployeeWorkHours = async (employeeId: string, weeklyHours: number, effectiveDate: string) => {
    const employee = getEmployeeById(employeeId);
    if (!employee) throw new Error("Empleado no encontrado");
    await updateEmployeeWorkHoursService(employeeId, employee, weeklyHours, effectiveDate);
  };
  
    const prefilledRecords: Record<string, PrefilledWeeklyRecord> = prefilledData as any;

    const processEmployeeWeekData = useCallback((emp: Employee, weekDays: Date[], weekId: string): DailyEmployeeData | null => {
        const activePeriod = getActivePeriod(emp.id, weekDays[0]);
        if (!activePeriod) return null;
    
        const dbRecord = weeklyRecords[weekId]?.weekData?.[emp.id];
    
        if (dbRecord && dbRecord.confirmed) {
            return dbRecord;
        }

        const { weekDaysWithTheoreticalHours } = getTheoreticalHoursAndTurn(emp.id, weekDays[0]);
        const weeklyWorkHours = getEffectiveWeeklyHours(activePeriod, weekDays[0]);
        const contractType = contractTypes.find(ct => ct.name === activePeriod.contractType);
        
        const baseDays: Record<string, DailyData> = {};
        weekDaysWithTheoreticalHours.forEach(d => {
            const dayDate = parseISO(d.dateKey);
            const dayOfWeek = getISODay(dayDate);
            const holidayDetails = holidays.find(h => isSameDay(h.date, dayDate));
    
            const scheduledAbsence = activePeriod.scheduledAbsences?.find(a =>
                isWithinInterval(dayDate, { start: startOfDay(a.startDate), end: a.endDate ? startOfDay(a.endDate) : new Date('9999-12-31') })
            );
            const absenceType = scheduledAbsence ? absenceTypes.find(at => at.id === scheduledAbsence.absenceTypeId) : undefined;
    
            let absenceAbbreviation = 'ninguna';
            let absenceHours = 0;
            let workedHours = d.theoreticalHours;
            let leaveHours = 0;

            const isOpeningHoliday = holidayDetails?.type === 'Apertura' && dayOfWeek !== 7;

            if (isOpeningHoliday) {
                workedHours = 0;
            }
            
            if (absenceType) {
                absenceAbbreviation = absenceType.abbreviation;
                if (absenceType.computesFullDay) {
                    absenceHours = d.theoreticalHours;
                    workedHours = 0;
                }
            }

            // Logic for pre-filling leave hours on holidays with 0 theoretical hours
            const isFestivoNoDomingo = holidayDetails && dayOfWeek !== 7;
            
            if (isFestivoNoDomingo && d.theoreticalHours === 0 && contractType?.computesOffDayBag && absenceAbbreviation === 'ninguna') {
                leaveHours = roundToNearestQuarter(weeklyWorkHours / 5);
            }
    
            baseDays[d.dateKey] = {
                theoreticalHours: d.theoreticalHours,
                workedHours,
                absence: absenceAbbreviation,
                absenceHours,
                leaveHours,
                doublePay: false,
                isHoliday: !!holidayDetails,
                holidayType: holidayDetails?.type ?? null,
            };
        });

        if (dbRecord) {
             const mergedDays: Record<string, DailyData> = {};
             for (const dayKey in baseDays) {
                mergedDays[dayKey] = { ...baseDays[dayKey], ...(dbRecord.days?.[dayKey] || {}) };
            }
            return {
                ...dbRecord,
                days: mergedDays,
            };
        }

        let finalData: DailyEmployeeData = {
            days: baseDays,
            confirmed: false,
            totalComplementaryHours: null,
            generalComment: null,
            weeklyHoursOverride: null,
            isDifference: false,
            hasPreregistration: false,
        };

        const prefilledWeek = prefilledRecords[weekId];
        const prefilledEmployeeData = prefilledWeek?.weekData?.[emp.name];
        if (prefilledEmployeeData) {
            finalData.hasPreregistration = true;
            finalData.expectedOrdinaryImpact = prefilledEmployeeData.expectedOrdinaryImpact;
            finalData.expectedHolidayImpact = prefilledEmployeeData.expectedHolidayImpact;
            finalData.expectedLeaveImpact = prefilledEmployeeData.expectedLeaveImpact;
        }
        
        return finalData;

    }, [weeklyRecords, getActivePeriod, getTheoreticalHoursAndTurn, getEffectiveWeeklyHours, holidays, absenceTypes, contractTypes, prefilledRecords]);

    const addHolidayReport = async (report: Omit<HolidayReport, 'id'>): Promise<string> => {
        const docRef = await addDocument('holidayReports', report);
        return docRef.id;
    }

    const updateHolidayReport = async (reportId: string, data: Partial<Omit<HolidayReport, 'id'>>): Promise<void> => {
        await setDocument('holidayReports', reportId, data, { merge: true });
    }

  const value = {
    employees,
    holidays,
    absenceTypes,
    contractTypes,
    annualConfigs,
    weeklyRecords,
    users,
    holidayEmployees,
    holidayReports,
    employeeGroups,
    loading,
    unconfirmedWeeksDetails,
    loadData,
    refreshData,
    refreshUsers,
    getEmployeeById,
    getActivePeriod,
    getEffectiveWeeklyHours,
    getActiveEmployeesForDate,
    getEmployeeBalancesForWeek,
    getEmployeeFinalBalances,
    getTheoreticalHoursAndTurn,
    calculateBalancePreview,
    calculateCurrentAnnualComputedHours,
    calculateTheoreticalAnnualWorkHours,
    getProcessedAnnualDataForEmployee,
    getProcessedAnnualDataForAllYears,
    createAbsenceType: createAbsenceTypeService,
    updateAbsenceType: updateAbsenceTypeService,
    deleteAbsenceType: deleteAbsenceTypeService,
    createHoliday: createHolidayService,
    updateHoliday: updateHolidayService,
    deleteHoliday: deleteHolidayService,
createAnnualConfig: createAnnualConfigService,
    updateAnnualConfig: updateAnnualConfigService,
    deleteAnnualConfig: deleteAnnualConfigService,
    createContractType: createContractTypeService,
    updateContractType: updateContractTypeService,
    deleteContractType: deleteContractTypeService,
    updateEmployeeWorkHours,
    getWeekId,
    processEmployeeWeekData,
    calculateEmployeeVacations,
    addHolidayEmployee: addHolidayEmployee as (data: Partial<Omit<HolidayEmployee, 'id'>>) => Promise<string>,
    updateHolidayEmployee,
    deleteHolidayEmployee,
    addHolidayReport,
    updateHolidayReport,
    createEmployeeGroup,
    updateEmployeeGroup,
    deleteEmployeeGroup,
    updateEmployeeGroupOrder,
  };

  return (
    <DataContext.Provider value={value}>
       {children}
    </DataContext.Provider>
  );
};

export const useDataProvider = () => useContext(DataContext);

    