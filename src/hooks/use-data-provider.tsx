

'use client';
import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
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
  Conversation,
  VacationCampaign,
} from '../types';
import { onCollectionUpdate, getDocumentById } from '@/lib/services/firestoreService';
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
    createVacationCampaign,
    updateVacationCampaign,
    deleteVacationCampaign,
    addHolidayReport,
    updateHolidayReport,
    deleteHolidayReport,
} from '../lib/services/settingsService';
import { addDays, addWeeks, differenceInCalendarWeeks, differenceInDays, endOfWeek, endOfYear, eachDayOfInterval, format, getISODay, getISOWeek, getWeeksInMonth, getYear, isAfter, isBefore, isSameDay, isSameWeek, isWithinInterval, max, min, parse, parseFromISO, parseISO, startOfDay, startOfWeek, startOfYear, subDays, subWeeks, endOfDay, differenceInWeeks, setYear, getMonth, endOfMonth, startOfMonth, getISOWeekYear, isValid } from 'date-fns';
import { addDocument, setDocument, getCollection } from '@/lib/services/firestoreService';
import { updateEmployeeWorkHours as updateEmployeeWorkHoursService } from '@/lib/services/employeeService';
import { Timestamp, collection, orderBy, query, doc, updateDoc } from 'firebase/firestore';
import prefilledData from '@/lib/prefilled_data.json';
import { calculateBalancePreview } from '../lib/calculators/balance-calculator';
import { useAuth } from './useAuth';
import { db } from '@/lib/firebase';
import { getFinalBalancesForEmployee, getVacationSummaryForEmployee } from '@/lib/services/employee-data-service';

interface DataContextType {
  employees: Employee[];
  holidays: Holiday[];
  absenceTypes: AbsenceType[];
  contractTypes: ContractType[];
  annualConfigs: AnnualConfiguration[];
  weeklyRecords: Record<string, WeeklyRecord>;
  users: AppUser[];
  appUser: AppUser | null;
  employeeRecord: Employee | null;
  holidayEmployees: HolidayEmployee[];
  holidayReports: HolidayReport[];
  employeeGroups: EmployeeGroup[];
  conversations: Conversation[];
  vacationCampaigns: VacationCampaign[];
  loading: boolean;
  unreadMessageCount: number;
  unconfirmedWeeksDetails: { weekId: string; employeeNames: string[] }[];
  viewMode: 'admin' | 'employee';
  setViewMode: (mode: 'admin' | 'employee') => void;
  loadData: (user: any) => void;
  refreshData: () => void;
  refreshUsers: () => Promise<void>;
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
  updateContractType: (id: string, data: Partial<Omit<ContractType, 'id'>>) => Promise<void>;
deleteContractType: (id: string) => Promise<void>;
  updateEmployeeWorkHours: (employeeId: string, weeklyHours: number, effectiveDate: string) => Promise<void>;
  getWeekId: (d: Date) => string;
  processEmployeeWeekData: (emp: Employee, weekDays: Date[], weekId: string) => DailyEmployeeData | null;
  calculateEmployeeVacations: (emp: Employee, year?: number) => {
    vacationDaysTaken: number;
    suspensionDays: number;
    vacationDaysAvailable: number;
    baseDays: number;
    carryOverDays: number;
    suspensionDeduction: number;
    proratedDays: number;
  };
  calculateSeasonalVacationStatus: (employeeId: string, year: number) => { employeeName: string; winterDaysTaken: number; summerDaysTaken: number; winterDaysRemaining: number; summerDaysRemaining: number; };
  addHolidayEmployee: (data: Partial<Omit<HolidayEmployee, 'id'>>) => Promise<string>;
  updateHolidayEmployee: (id: string, data: Partial<Omit<HolidayEmployee, 'id'>>) => Promise<void>;
  deleteHolidayEmployee: (id: string) => Promise<void>;
  addHolidayReport: (report: Omit<HolidayReport, 'id'>) => Promise<void>;
  updateHolidayReport: (reportId: string, data: Partial<Omit<HolidayReport, 'id'>>) => Promise<void>;
  deleteHolidayReport: (reportId: string) => Promise<void>;
  createEmployeeGroup: (data: Omit<EmployeeGroup, 'id'>) => Promise<string>;
  updateEmployeeGroup: (id: string, data: Partial<Omit<EmployeeGroup, 'id'>>) => Promise<void>;
  deleteEmployeeGroup: (id: string) => Promise<void>;
  updateEmployeeGroupOrder: (groups: EmployeeGroup[]) => Promise<void>;
  createVacationCampaign: (data: Omit<VacationCampaign, 'id'>) => Promise<string>;
  updateVacationCampaign: (id: string, data: Partial<Omit<VacationCampaign, 'id'>>) => Promise<void>;
  deleteVacationCampaign: (id: string) => Promise<void>;
  findNextUnconfirmedWeek: (startDate: Date) => string | null;
}

const DataContext = createContext<DataContextType>({
  employees: [],
  holidays: [],
  absenceTypes: [],
  contractTypes: [],
  annualConfigs: [],
  weeklyRecords: {},
  users: [],
  appUser: null,
  employeeRecord: null,
  holidayEmployees: [],
  holidayReports: [],
  employeeGroups: [],
  conversations: [],
  vacationCampaigns: [],
  loading: true,
  unreadMessageCount: 0,
  unconfirmedWeeksDetails: [],
  viewMode: 'admin',
  setViewMode: () => {},
  loadData: () => {},
  refreshData: () => {},
  refreshUsers: async () => {},
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
  calculateEmployeeVacations: () => ({ vacationDaysTaken: 0, suspensionDays: 0, vacationDaysAvailable: 31, baseDays: 31, carryOverDays: 0, suspensionDeduction: 0, proratedDays: 31 }),
  calculateSeasonalVacationStatus: () => ({ employeeName: '', winterDaysTaken: 0, summerDaysTaken: 0, winterDaysRemaining: 10, summerDaysRemaining: 21 }),
  addHolidayEmployee: async (data) => '',
  updateHolidayEmployee: async (id: string, data: Partial<Omit<HolidayEmployee, 'id'>>) => {},
  deleteHolidayEmployee: async (id: string) => {},
  addHolidayReport: async (report: Omit<HolidayReport, 'id'>) => {},
  updateHolidayReport: async (reportId: string, data: Partial<Omit<HolidayReport, 'id'>>) => {},
  deleteHolidayReport: async (reportId: string) => {},
  createEmployeeGroup: async (data: Omit<EmployeeGroup, 'id'>) => '',
  updateEmployeeGroup: async (id: string, data: Partial<Omit<EmployeeGroup, 'id'>>) => {},
  deleteEmployeeGroup: async (id: string) => {},
  updateEmployeeGroupOrder: async (groups: EmployeeGroup[]) => {},
  createVacationCampaign: async (data: Omit<VacationCampaign, 'id'>) => '',
  updateVacationCampaign: async (id: string, data: Partial<Omit<VacationCampaign, 'id'>>) => {},
  deleteVacationCampaign: async (id: string) => {},
  findNextUnconfirmedWeek: () => null,
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
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [employeeRecord, setEmployeeRecord] = useState<Employee | null>(null);
  const [holidayEmployees, setHolidayEmployees] = useState<HolidayEmployee[]>([]);
  const [holidayReports, setHolidayReports] = useState<HolidayReport[]>([]);
  const [employeeGroups, setEmployeeGroups] = useState<EmployeeGroup[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [vacationCampaigns, setVacationCampaigns] = useState<VacationCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [unconfirmedWeeksDetails, setUnconfirmedWeeksDetails] = useState<{ weekId: string; employeeNames: string[] }[]>([]);
  const [viewMode, setViewMode] = useState<'admin' | 'employee'>('admin');
  const { user: authUser, loading: authLoading } = useAuth();
  
  const loadData = useCallback(() => {
    setLoading(true);
    const unsubs: (() => void)[] = [];

    const safeFormat = (date: Date | Timestamp | string | null | undefined): string | null => {
        if (!date) return null;
        const d = (date as Timestamp)?.toDate ? (date as Timestamp).toDate() : (typeof date === 'string' ? parseISO(date) : date);
        return isValid(d) ? format(d, 'yyyy-MM-dd') : null;
    }

    const setupSubscription = <T extends { id: string }>(collectionName: string, setter: React.Dispatch<React.SetStateAction<T[]>>, processor?: (data: any[]) => T[]) => {
        const { unsubscribe, ready } = onCollectionUpdate<T>(collectionName, (data) => {
            const processedData = processor ? processor(data) : data;
            setter(processedData as T[]);
        });
        unsubs.push(unsubscribe);
        return ready;
    };
    
    const promises = [
        setupSubscription<Employee>('employees', setEmployees, (data) => data.map(emp => ({
            ...emp, 
            employmentPeriods: emp.employmentPeriods.map(p => ({
                ...p, 
                startDate: safeFormat(p.startDate), 
                endDate: p.endDate ? safeFormat(p.endDate) : null, 
                scheduledAbsences: (p.scheduledAbsences || []).map(a => ({
                    ...a, 
                    startDate: (a.startDate as any)?.toDate ? (a.startDate as any).toDate() : parseISO(a.startDate as string), 
                    endDate: a.endDate ? ((a.endDate as any)?.toDate ? (a.endDate as any).toDate() : parseISO(a.endDate as string)) : null,
                })),
                workHoursHistory: (p.workHoursHistory || []).map(wh => ({
                    ...wh,
                    effectiveDate: safeFormat(wh.effectiveDate as any)
                })),
                weeklySchedulesHistory: (p.weeklySchedulesHistory || []).map(ws => ({
                    ...ws,
                    effectiveDate: safeFormat(ws.effectiveDate as any)
                }))
            }))
        })).sort((a,b) => a.name.localeCompare(b.name))),
        setupSubscription<AbsenceType>('absenceTypes', setAbsenceTypes, data => data.sort((a,b) => a.name.localeCompare(b.name))),
        setupSubscription<Holiday>('holidays', setHolidays, data => data.map(h => ({ ...h, date: (h.date as Timestamp).toDate() })).sort((a,b) => a.date.getTime() - b.date.getTime())),
        setupSubscription<ContractType>('contractTypes', setContractTypes),
        setupSubscription<AnnualConfiguration>('annualConfigurations', setAnnualConfigs, data => data.sort((a,b) => a.year - b.year)),
        setupSubscription<WeeklyRecord>('weeklyRecords', (data) => setWeeklyRecords(data.reduce((acc, record) => ({ ...acc, [record.id]: record }), {}))),
        setupSubscription<AppUser>('users', setUsers),
        setupSubscription<HolidayEmployee>('holidayEmployees', setHolidayEmployees, data => data.sort((a,b) => a.name.localeCompare(b.name))),
        setupSubscription<HolidayReport>('holidayReports', setHolidayReports),
        setupSubscription<EmployeeGroup>('employeeGroups', setEmployeeGroups, data => data.sort((a,b) => a.order - b.order)),
        setupSubscription<Conversation>('conversations', setConversations, data => data.sort((a, b) => b.lastMessageTimestamp.toDate().getTime() - a.lastMessageTimestamp.toDate().getTime())),
        setupSubscription<VacationCampaign>('vacationCampaigns', setVacationCampaigns, data => data.sort((a,b) => (b.submissionStartDate as any).toDate().getTime() - (a.submissionStartDate as any).toDate().getTime())),
    ];

    Promise.all(promises).then(() => {
        setLoading(false);
    }).catch(error => {
        console.error("Error during initial data load:", error);
        setLoading(false);
    });

    return () => unsubs.forEach(unsub => unsub());
  }, []);

  useEffect(() => {
    if (!authLoading && authUser) {
      loadData();
    } else if (!authLoading && !authUser) {
      setLoading(false);
    }
  }, [authLoading, authUser, loadData]);
  
  useEffect(() => {
    if (authUser && employees.length > 0) {
        const loggedInUserEmail = authUser.email?.trim().toLowerCase();
        if (loggedInUserEmail) {
            const foundEmployee = employees.find(e => 
                e.email && e.email.trim().toLowerCase() === loggedInUserEmail
            );
            setEmployeeRecord(foundEmployee || null);
        } else {
            setEmployeeRecord(null);
        }
    } else if (!authUser) {
        setEmployeeRecord(null);
    }
}, [authUser, employees]);

useEffect(() => {
    if (authLoading) return;

    if (authUser) {
        const userEmployeeRecord = employees.find(e => e.authId === authUser.uid);
        
        getDocumentById<AppUser>('users', authUser.uid).then(userRecord => {
            const adminEmails = ['emiliogp@inditex.com', 'rebecapa@inditex.com'];
            const isHardcodedAdmin = adminEmails.includes(authUser.email?.toLowerCase() || '');
            const trueRole = (userRecord?.role === 'admin' || isHardcodedAdmin) ? 'admin' : 'employee';
            
            const newRole = trueRole === 'admin' ? viewMode : 'employee';

            setAppUser({
                id: authUser.uid,
                email: authUser.email!,
                employeeId: userRecord?.employeeId || userEmployeeRecord?.id || '',
                role: newRole,
                trueRole: trueRole,
            });
        }).catch(() => {
             const adminEmails = ['emiliogp@inditex.com', 'rebecapa@inditex.com'];
             const isHardcodedAdmin = adminEmails.includes(authUser.email?.toLowerCase() || '');
             const trueRole = isHardcodedAdmin ? 'admin' : 'employee';
             const newRole = trueRole === 'admin' ? viewMode : 'employee';
             setAppUser({
                id: authUser.uid,
                email: authUser.email!,
                employeeId: userEmployeeRecord?.id || '',
                role: newRole,
                trueRole: trueRole,
             });
        });
    } else {
        setAppUser(null);
    }
}, [authLoading, authUser, viewMode, employees]);

const unreadMessageCount = useMemo(() => {
    if (!appUser) return 0;
    if (appUser.role === 'admin') {
        return conversations.filter(c => c.unreadByAdmin).length;
    }
    if (appUser.role === 'employee' && employeeRecord) {
        const myConversation = conversations.find(c => c.employeeId === employeeRecord.id);
        return myConversation?.unreadByEmployee ? 1 : 0;
    }
    return 0;
}, [conversations, appUser, employeeRecord]);


  const getWeekId = (d: Date): string => {
    const monday = startOfWeek(d, { weekStartsOn: 1 });
    return format(monday, 'yyyy-MM-dd');
  };
  
  const refreshData = useCallback(() => {
    console.log("Refreshing data (triggered by onSnapshot)...");
  }, []);

  const refreshUsers = async () => {
    const freshUsers = await getCollection<AppUser>('users');
    setUsers(freshUsers);
  };

  const calculateEmployeeVacations = useCallback((emp: Employee, calculationYear?: number) => {
    const year = calculationYear ?? new Date().getFullYear();
    const vacationType = absenceTypes.find(at => at.name === 'Vacaciones');
    const suspensionTypeIds = new Set(absenceTypes.filter(at => at.suspendsContract).map(at => at.id));
    const suspensionAbbrs = new Set(absenceTypes.filter(at => at.suspendsContract).map(at => at.abbreviation));

    const defaultReturn = { vacationDaysTaken: 0, suspensionDays: 0, vacationDaysAvailable: 31, baseDays: 31, carryOverDays: 0, suspensionDeduction: 0, proratedDays: 31 };
    if (!vacationType) return defaultReturn;
    
    // --- Calculate days taken and suspension days IN THE CURRENT YEAR ---
    let vacationDaysTakenInCurrentYear = 0;
    const currentYearDayMap = new Map<string, 'V' | 'S'>();
    
    emp.employmentPeriods?.forEach(period => {
      period.scheduledAbsences?.forEach(absence => {
        if (!absence.endDate) return;
        const absenceCode = suspensionTypeIds.has(absence.absenceTypeId) ? 'S' : (absence.absenceTypeId === vacationType.id ? 'V' : null);
        if (!absenceCode) return;
        eachDayOfInterval({ start: startOfDay(absence.startDate), end: endOfDay(absence.endDate) }).forEach(day => {
            if (getYear(day) === year) {
                currentYearDayMap.set(format(day, 'yyyy-MM-dd'), absenceCode);
            }
        });
      });
    });
    
    Object.values(weeklyRecords).forEach(record => {
      const empWeekData = record.weekData[emp.id];
      if (!empWeekData?.days) return;
      Object.entries(empWeekData.days).forEach(([dayStr, dayData]) => {
          if (getYear(parseISO(dayStr)) !== year) return;
          const dayKey = format(parseISO(dayStr), 'yyyy-MM-dd');
          if (currentYearDayMap.has(dayKey)) return; 
          if (dayData.absence && dayData.absence !== 'ninguna') {
              if (suspensionAbbrs.has(dayData.absence)) currentYearDayMap.set(dayKey, 'S');
              else if (dayData.absence === vacationType.abbreviation) currentYearDayMap.set(dayKey, 'V');
          }
      });
    });
    
    let suspensionDaysInCurrentYear = 0;
    currentYearDayMap.forEach(value => {
        if (value === 'S') suspensionDaysInCurrentYear++;
        else if (value === 'V') vacationDaysTakenInCurrentYear++;
    });

    // --- Calculate Carry Over from PREVIOUS YEAR ---
    let carryOverDays = 0;
    const previousYear = year - 1;

    if (year === 2025) {
      const firstPeriod = emp.employmentPeriods?.[0];
      carryOverDays = firstPeriod?.vacationDays2024 ?? 0;
    } else {
      const { vacationDaysAvailable: prevYearAvailable, vacationDaysTaken: prevYearTaken } = calculateEmployeeVacations(emp, previousYear);
      carryOverDays = prevYearAvailable - prevYearTaken;
    }
    
    // --- Calculate Prorated Days for CURRENT YEAR ---
    let proratedDays = 0;
    const firstPeriod = emp.employmentPeriods?.[0];
    if (!firstPeriod) return defaultReturn;
    
    const startDateYear = getYear(parseISO(firstPeriod.startDate as string));
    const isTransferInCurrentYear = firstPeriod.isTransfer && year === startDateYear;
    
    if (isTransferInCurrentYear) {
        proratedDays = 31;
    } else {
        const currentYearStart = startOfYear(new Date(year, 0, 1));
        const currentYearEnd = endOfYear(new Date(year, 11, 31));
        let contractDaysInCurrentYear = 0;
        emp.employmentPeriods?.filter(p => {
            const pStart = parseISO(p.startDate as string);
            const pEnd = p.endDate ? parseISO(p.endDate as string) : currentYearEnd;
            return getYear(pStart) <= year && getYear(pEnd) >= year;
        }).forEach(p => {
            const pStart = parseISO(p.startDate as string);
            const pEnd = p.endDate ? parseISO(p.endDate as string) : currentYearEnd;
            const effectiveStart = isAfter(pStart, currentYearStart) ? pStart : currentYearStart;
            const effectiveEnd = isBefore(pEnd, currentYearEnd) ? pEnd : currentYearEnd;
            if (isAfter(effectiveStart, effectiveEnd)) return;
            contractDaysInCurrentYear += differenceInDays(effectiveEnd, effectiveStart) + 1;
        });

        const daysInYear = differenceInDays(currentYearEnd, currentYearStart) + 1;
        proratedDays = (31 / daysInYear) * contractDaysInCurrentYear;
    }
    
    // --- Calculate Final Available Days ---
    const suspensionDeduction = (suspensionDaysInCurrentYear / 30) * 2.5;
    let totalAvailable = proratedDays + carryOverDays - suspensionDeduction;

    if (isTransferInCurrentYear) {
      const vacationDaysUsedInAnotherCenter = firstPeriod.vacationDaysUsedInAnotherCenter ?? 0;
      totalAvailable -= vacationDaysUsedInAnotherCenter;
    }

    return {
        vacationDaysTaken: vacationDaysTakenInCurrentYear,
        suspensionDays: suspensionDaysInCurrentYear,
        vacationDaysAvailable: Math.round(totalAvailable),
        baseDays: 31,
        carryOverDays: carryOverDays,
        suspensionDeduction: suspensionDeduction,
        proratedDays: proratedDays,
    };
}, [absenceTypes, weeklyRecords]);



  const getActiveEmployeesForDate = useCallback((date: Date): Employee[] => {
    const weekStart = startOfDay(startOfWeek(date, { weekStartsOn: 1 }));
    const weekEnd = endOfDay(endOfWeek(date, { weekStartsOn: 1 }));

    return employees.filter(emp => 
        emp.employmentPeriods.some(p => {
            const periodStart = startOfDay(parseISO(p.startDate as string));
            const periodEnd = p.endDate ? endOfDay(parseISO(p.endDate as string)) : new Date('9999-12-31');
            return periodStart <= weekEnd && periodEnd >= weekStart;
        })
    );
}, [employees]);


useEffect(() => {
    if (loading || !employees.length) return;

    const details: { weekId: string; employeeNames: string[] }[] = [];
    const startOfCurrentWeek = startOfDay(startOfWeek(new Date(), { weekStartsOn: 1 }));
    
    // The alert will only be effective from January 27, 2025 onwards.
    const auditStartDate = startOfDay(new Date('2025-01-27'));

    const excludedWeeks = new Set(['2024-12-16', '2024-12-23', '2025-01-13', '2025-01-20']);

    for (const weekId in weeklyRecords) {
        if (excludedWeeks.has(weekId)) {
            console.log(`Skipping excluded week: ${weekId}`);
            continue;
        }

        const weekDate = parseISO(weekId);
        
        // Check if the week is strictly before the current week AND on or after the audit start date.
        if (isBefore(startOfDay(weekDate), startOfCurrentWeek) && (isAfter(weekDate, auditStartDate) || isSameDay(weekDate, auditStartDate))) {
            const activeEmployeesThisWeek = getActiveEmployeesForDate(weekDate);
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
    const history = [...period.workHoursHistory].sort((a,b) => parseISO(b.effectiveDate as string).getTime() - parseISO(a.effectiveDate as string).getTime());
    const effectiveRecord = history.find(record => !isAfter(startOfDay(parseISO(record.effectiveDate as string)), targetDate));
    return effectiveRecord?.weeklyHours || 0;
};

const calculateBalancePreviewCallback = useCallback((employeeId: string, weekData: Record<string, DailyData>, initialBalances: { ordinary: number, holiday: number, leave: number }, weeklyHoursOverride?: number | null, totalComplementaryHours?: number | null) => {
    const employee = getEmployeeById(employeeId);
    if (!employee) return null;

    return calculateBalancePreview(
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
        const preview = calculateBalancePreviewCallback(
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
}, [employees, weeklyRecords, calculateBalancePreviewCallback]);
  
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
        const preview = calculateBalancePreviewCallback(
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
}, [employees, weeklyRecords, getEmployeeBalancesForWeek, calculateBalancePreviewCallback]);


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
        .sort((a, b) => parseISO(b.effectiveDate as string).getTime() - parseISO(a.effectiveDate as string).getTime())
        .find(s => !isAfter(startOfDay(parseISO(s.effectiveDate as string)), startOfDay(dateInWeek)));
    
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
    
        const relevantRecords = Object.values(weeklyRecords).filter(record => {
            const weekDate = parseISO(record.id);
            const isoYear = getISOWeekYear(weekDate);
            // CRITICAL OVERRIDE for 2025
            if (year === 2025) {
                return isoYear === 2025 && record.weekData[employeeId]?.confirmed;
            }
            return isoYear === year && record.weekData[employeeId]?.confirmed;
        });
    
        relevantRecords.forEach(weekRecord => {
            const employeeData = weekRecord.weekData[employeeId];
            if (employeeData?.days) {
                Object.entries(employeeData.days).forEach(([dayKey, dayData]) => {
                    const dayDate = parseISO(dayKey);
                    const isoYear = getISOWeekYear(dayDate);
                    
                    let isCorrectYear = false;
                     // CRITICAL OVERRIDE for 2025
                    if (year === 2025) {
                        isCorrectYear = isoYear === 2025 || (getYear(dayDate) === 2024 && getISOWeek(dayDate) === 1);
                    } else {
                        isCorrectYear = isoYear === year;
                    }

                    if (!isCorrectYear) return;

    
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
    
        const suspensionTypeIds = new Set(absenceTypes.filter(at => at.suspendsContract).map(at => at.id));
        const suspensionAbsenceAbbrs = new Set(absenceTypes.filter(at => at.suspendsContract).map(at => at.abbreviation));
    
        const yearStart = startOfYear(new Date(year, 0, 1));
        const yearEnd = endOfYear(new Date(year, 11, 31));
    
        let totalProratedHours = 0;
        const suspensionIntervals = [];
    
        // Collect all suspension intervals
        for (const period of (employee.employmentPeriods || [])) {
            for (const absence of (period.scheduledAbsences || [])) {
                if (suspensionTypeIds.has(absence.absenceTypeId) && absence.endDate) {
                    suspensionIntervals.push({
                        start: startOfDay(absence.startDate),
                        end: endOfDay(absence.endDate)
                    });
                }
            }
        }
    
        for (const weekId in weeklyRecords) {
            const record = weeklyRecords[weekId];
            const empData = record?.weekData?.[employeeId];
            if (empData && getISOWeekYear(parseISO(weekId)) === year) {
                for (const dayStr in empData.days) {
                    if (suspensionAbsenceAbbrs.has(empData.days[dayStr].absence)) {
                        const day = parseISO(dayStr);
                        suspensionIntervals.push({ start: day, end: day });
                    }
                }
            }
        }
    
        // Iterate through each day of the year to calculate prorated hours
        for (let day = new Date(yearStart); day <= yearEnd; day = addDays(day, 1)) {
            // Check if the day is within any suspension interval
            const isSuspended = suspensionIntervals.some(interval => isWithinInterval(day, interval));
            if (isSuspended) continue;
    
            // Find the active employment period for the day
            const activePeriod = getActivePeriod(employee.id, day);
            if (!activePeriod) continue;
    
            // Prorate hours based on the weekly hours for that day
            const dailyProratedHours = getEffectiveWeeklyHours(activePeriod, day) / 7;
            totalProratedHours += dailyProratedHours;
        }
    
        return {
            theoreticalHours: roundToNearestQuarter(totalProratedHours),
            baseTheoreticalHours: annualConfig.maxAnnualHours,
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
    
    // CRITICAL OVERRIDE for 2025
    if (year === 2025) {
        weekIdsInYear.add('2024-12-30');
    }

    let currentDate = yearStart;
    while(currentDate <= yearEnd) {
        if(getISOWeekYear(currentDate) === year) {
            weekIdsInYear.add(getWeekId(currentDate));
        }
        currentDate = addDays(currentDate, 7);
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
            const preview = calculateBalancePreviewCallback(employeeId, weekData.days, initialBalances, weekData.weeklyHoursOverride, weekData.totalComplementaryHours);
            
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
            yearsWithActivity.add(getISOWeekYear(parseISO(weekId)));
        }
    });
    
    employee.employmentPeriods.forEach(p => {
        yearsWithActivity.add(getISOWeekYear(parseISO(p.startDate as string)));
        if (p.endDate) {
            yearsWithActivity.add(getISOWeekYear(parseISO(p.endDate as string)));
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

const calculateSeasonalVacationStatus = (employeeId: string, year: number) => {
    const employee = getEmployeeById(employeeId);
    if (!employee) {
      return { employeeName: 'Desconocido', winterDaysTaken: 0, summerDaysTaken: 0, winterDaysRemaining: 10, summerDaysRemaining: 21 };
    }
  
    const vacationType = absenceTypes.find(at => at.name === 'Vacaciones');
    if (!vacationType) {
      return { employeeName: employee.name, winterDaysTaken: 0, summerDaysTaken: 0, winterDaysRemaining: 10, summerDaysRemaining: 21 };
    }
  
    const winterStart = startOfYear(new Date(year, 0, 1));
    const winterEnd = endOfMonth(new Date(year, 4, 1)); // End of May
    const summerStart = startOfMonth(new Date(year, 5, 1)); // Start of June
    const summerEnd = endOfYear(new Date(year, 11, 31));
  
    let winterDays = 0;
    let summerDays = 0;
  
    const allAbsenceDays = new Set<string>();
  
    employee.employmentPeriods?.forEach(period => {
      period.scheduledAbsences?.forEach(absence => {
        if (absence.absenceTypeId === vacationType.id && absence.endDate) {
          eachDayOfInterval({ start: startOfDay(absence.startDate), end: startOfDay(absence.endDate) }).forEach(day => {
            if (getYear(day) === year) {
              allAbsenceDays.add(format(day, 'yyyy-MM-dd'));
            }
          });
        }
      });
    });
  
    Object.values(weeklyRecords).forEach(record => {
      const empWeekData = record.weekData[employee.id];
      if (!empWeekData?.days) return;
      Object.entries(empWeekData.days).forEach(([dayStr, dayData]) => {
        if (getYear(parseISO(dayStr)) === year && dayData.absence === vacationType.abbreviation) {
          allAbsenceDays.add(dayStr);
        }
      });
    });
  
    allAbsenceDays.forEach(dayStr => {
      const day = parseISO(dayStr);
      if (isWithinInterval(day, { start: winterStart, end: winterEnd })) {
        winterDays++;
      }
      if (isWithinInterval(day, { start: summerStart, end: summerEnd })) {
        summerDays++;
      }
    });
  
    return {
      employeeName: employee.name,
      winterDaysTaken: winterDays,
      summerDaysTaken: summerDays,
      winterDaysRemaining: Math.max(0, 10 - winterDays),
      summerDaysRemaining: Math.max(0, 21 - summerDays),
    };
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

    const findNextUnconfirmedWeek = (startDate: Date): string | null => {
        const auditStartDate = startOfDay(new Date('2025-01-27'));
        let dateToCheck = startOfWeek(new Date('2024-12-30'), { weekStartsOn: 1 });
        if (isBefore(dateToCheck, auditStartDate)) {
            dateToCheck = auditStartDate;
        }

        const limit = addWeeks(new Date(), 104);
    
        while (isBefore(dateToCheck, limit)) {
            const weekId = getWeekId(dateToCheck);
            const activeEmployeesThisWeek = getActiveEmployeesForDate(dateToCheck);
    
            if (activeEmployeesThisWeek.length > 0) {
                const isUnconfirmed = activeEmployeesThisWeek.some(emp =>
                    !(weeklyRecords[weekId]?.weekData?.[emp.id]?.confirmed ?? false)
                );
    
                if (isUnconfirmed) {
                    return weekId;
                }
            }
    
            dateToCheck = addWeeks(dateToCheck, 1);
        }
    
        return null;
    };

  const value = {
    employees,
    holidays,
    absenceTypes,
    contractTypes,
    annualConfigs,
    weeklyRecords,
    users,
    appUser,
    employeeRecord,
    holidayEmployees,
    holidayReports,
    employeeGroups,
    conversations,
    vacationCampaigns,
    loading,
    unreadMessageCount,
    unconfirmedWeeksDetails,
    viewMode,
    setViewMode,
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
    calculateBalancePreview: calculateBalancePreviewCallback,
    calculateCurrentAnnualComputedHours,
    calculateTheoreticalAnnualWorkHours,
    getProcessedAnnualDataForEmployee,
    getProcessedAnnualDataForAllYears,
    calculateSeasonalVacationStatus,
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
    addHolidayReport: addHolidayReport as (report: Omit<HolidayReport, 'id'>) => Promise<void>,
    updateHolidayReport,
    deleteHolidayReport,
    createEmployeeGroup,
    updateEmployeeGroup,
deleteEmployeeGroup,
    updateEmployeeGroupOrder,
    createVacationCampaign,
    updateVacationCampaign,
    deleteVacationCampaign,
    findNextUnconfirmedWeek,
  };

  return (
    <DataContext.Provider value={value}>
       {children}
    </DataContext.Provider>
  );
};

export const useDataProvider = () => useContext(DataContext);
