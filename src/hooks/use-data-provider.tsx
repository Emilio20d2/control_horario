
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
  CorrectionRequest,
  ScheduledAbsence,
} from '../types';
import { onCollectionUpdate, getDocumentById, createConversation as createConversationService } from '@/lib/services/firestoreService';
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
} from '@/lib/services/settingsService';
import { addDays, addWeeks, differenceInCalendarISOWeeks, differenceInDays, endOfWeek, endOfYear, eachDayOfInterval, format, getISODay, getISOWeek, getWeeksInMonth, getYear, isAfter, isBefore, isSameDay, isSameWeek, isWithinInterval, max, min, parse, parseISO, startOfDay, startOfWeek, startOfYear, subDays, subWeeks, endOfDay, differenceInWeeks, setYear, getMonth, endOfMonth, startOfMonth, getISOWeekYear, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { addDocument, setDocument, getCollection } from '@/lib/services/firestoreService';
import { updateEmployeeWorkHours as updateEmployeeWorkHoursService } from '@/lib/services/employeeService';
import { Timestamp, collection, orderBy, query, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import prefilledData from '@/lib/prefilled_data.json';
import { calculateBalancePreview as balanceCalculator } from '@/lib/calculators/balance-calculator';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { getFinalBalancesForEmployee, getVacationSummaryForEmployee } from '@/lib/services/employee-data-service';

interface UnconfirmedWeekDetail {
    weekId: string;
    employeeNames: string[];
}

interface DataContextType {
  employees: Employee[];
  holidays: Holiday[];
  absenceTypes: AbsenceType[];
  contractTypes: ContractType[];
  annualConfigs: AnnualConfiguration[];
  weeklyRecords: Record<string, WeeklyRecord>;
  users: AppUser[];
  employeeRecord: Employee | null;
  holidayEmployees: HolidayEmployee[];
  holidayReports: HolidayReport[];
  employeeGroups: EmployeeGroup[];
  conversations: Conversation[];
  vacationCampaigns: VacationCampaign[];
  correctionRequests: CorrectionRequest[];
  unconfirmedWeeksDetails: UnconfirmedWeekDetail[];
  appConfig: { isEmployeeViewEnabled?: boolean };
  loading: boolean;
  unreadMessageCount: number;
  pendingCorrectionRequestCount: number;
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
  updateAbsenceType: (id: string, data: Partial<Omit<AbsenceType, 'id'>>) => Promise<void>;
  deleteAbsenceType: (id: string) => Promise<void>;
  createHoliday: (data: Omit<Holiday, 'id' | 'date'> & { date: string }) => Promise<string>;
  updateHoliday: (id: string, data: HolidayFormData) => Promise<void>;
  deleteHoliday: (id: string) => Promise<void>;
  createAnnualConfig: (data: Omit<AnnualConfiguration, 'id'>) => Promise<string>;
  updateAnnualConfig: (id: string, data: Partial<Omit<AnnualConfiguration, 'id'>>) => Promise<void>;
  deleteAnnualConfig: (id: string) => Promise<void>;
  createContractType: (data: Omit<ContractType, 'id'>) => Promise<string>;
  updateContractType: (id: string, data: Partial<Omit<ContractType, 'id'>>) => Promise<void>;
  deleteContractType: (id: string) => Promise<void>;
  updateEmployeeWorkHours: (employeeId: string, employee: Employee, weeklyHours: number, effectiveDate: string) => Promise<void>;
  getWeekId: (d: Date) => string;
  processEmployeeWeekData: (emp: Employee, weekDays: Date[], weekId: string) => DailyEmployeeData | null;
  calculateEmployeeVacations: (emp: Employee | null, year?: number, mode?: 'confirmed' | 'programmed') => {
    vacationDaysTaken: number;
    suspensionDays: number;
    vacationDaysAvailable: number;
    baseDays: number;
    carryOverDays: number;
    suspensionDeduction: number;
    proratedDays: number;
  };
  calculateSeasonalVacationStatus: (employeeId: string, year: number) => { employeeName: string; winterDaysTaken: number; summerDaysTaken: number; winterDaysRemaining: number; summerDaysRemaining: number; };
  createConversation: (employeeId: string, employeeName: string) => Promise<void>;
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
  availableYears: number[];
}

const DataContext = createContext<DataContextType>({
  employees: [],
  holidays: [],
  absenceTypes: [],
  contractTypes: [],
  annualConfigs: [],
  weeklyRecords: {},
  users: [],
  employeeRecord: null,
  holidayEmployees: [],
  holidayReports: [],
  employeeGroups: [],
  conversations: [],
  vacationCampaigns: [],
  correctionRequests: [],
  unconfirmedWeeksDetails: [],
  appConfig: {},
  loading: true,
  unreadMessageCount: 0,
  pendingCorrectionRequestCount: 0,
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
  createConversation: async () => {},
  addHolidayEmployee: async () => '',
  updateHolidayEmployee: async () => {},
  deleteHolidayEmployee: async () => {},
  addHolidayReport: async () => {},
  updateHolidayReport: async () => {},
  deleteHolidayReport: async () => {},
  createEmployeeGroup: async () => '',
  updateEmployeeGroup: async () => {},
  deleteEmployeeGroup: async () => {},
  updateEmployeeGroupOrder: async () => {},
  createVacationCampaign: async () => '',
  updateVacationCampaign: async () => {},
  deleteVacationCampaign: async () => {},
  findNextUnconfirmedWeek: () => null,
  availableYears: [],
});

const roundToNearestQuarter = (num: number) => {
    return Math.round(num * 4) / 4;
};

const safeParseDate = (date: any): Date | null => {
    if (!date) return null;
    if (date instanceof Date) return date;
    if (date instanceof Timestamp) return date.toDate();
    if (typeof date === 'string') {
        const parsed = parseISO(date);
        return isValid(parsed) ? parsed : null;
    }
    return null;
};


export const DataProvider = ({ children }: { children: ReactNode }) => {
  const { user, appUser, loading: authLoading } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [absenceTypes, setAbsenceTypes] = useState<AbsenceType[]>([]);
  const [contractTypes, setContractTypes] = useState<ContractType[]>([]);
  const [annualConfigs, setAnnualConfigs] = useState<AnnualConfiguration[]>([]);
  const [weeklyRecords, setWeeklyRecords] = useState<Record<string, WeeklyRecord>>({});
  const [users, setUsers] = useState<AppUser[]>([]);
  const [employeeRecord, setEmployeeRecord] = useState<Employee | null>(null);
  const [holidayEmployees, setHolidayEmployees] = useState<HolidayEmployee[]>([]);
  const [holidayReports, setHolidayReports] = useState<HolidayReport[]>([]);
  const [employeeGroups, setEmployeeGroups] = useState<EmployeeGroup[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [vacationCampaigns, setVacationCampaigns] = useState<VacationCampaign[]>([]);
  const [correctionRequests, setCorrectionRequests] = useState<CorrectionRequest[]>([]);
  const [unconfirmedWeeksDetails, setUnconfirmedWeeksDetails] = useState<UnconfirmedWeekDetail[]>([]);
  const [appConfig, setAppConfig] = useState<{ isEmployeeViewEnabled?: boolean }>({});
  const [loading, setLoading] = useState(true);
  const [loadingSteps, setLoadingSteps] = useState({
    statics: false,
    weeklyRecords: false,
    employees: false,
    conversations: false,
  });
  
  const allLoadingStepsComplete = useMemo(() => {
    return Object.values(loadingSteps).every(Boolean);
  }, [loadingSteps]);

  // Pure utility functions
  const getWeekId = useCallback((d: Date): string => {
    const monday = startOfWeek(d, { weekStartsOn: 1 });
    return format(monday, 'yyyy-MM-dd');
  }, []);

  const processScheduledAbsences = useCallback((absences: any[]): ScheduledAbsence[] => {
    if (!absences) return [];

    const processedAbsences: ScheduledAbsence[] = [];
    absences.forEach(a => {
        const startDate = safeParseDate(a.startDate);
        if (!startDate) return;
        
        const endDate = a.endDate ? safeParseDate(a.endDate) : null;
        
        const processedAbsence: any = { ...a, startDate, endDate };

        if (a.originalRequest) {
            processedAbsence.originalRequest = {
                ...a.originalRequest,
                startDate: safeParseDate(a.originalRequest.startDate),
                endDate: safeParseDate(a.originalRequest.endDate),
            };
        }
        processedAbsences.push(processedAbsence);
    });

    return processedAbsences;
  }, []);

  // Effect for static data (does not depend on other collections)
  useEffect(() => {
    if (authLoading || !user || !appUser) {
        if (!user) setLoading(false);
        return;
    }
    
    let active = true;
    
    Promise.all([
      getCollection<AbsenceType>('absenceTypes'),
      getCollection<ContractType>('contractTypes'),
      getCollection<AnnualConfiguration>('annualConfigurations'),
      getCollection<Holiday>('holidays'),
      getCollection<AppUser>('users'),
      getCollection<HolidayEmployee>('holidayEmployees'),
      getCollection<HolidayReport>('holidayReports'),
      getCollection<EmployeeGroup>('employeeGroups'),
      getCollection<VacationCampaign>('vacationCampaigns'),
    ]).then(([absTypes, conTypes, annConfigs, hols, usrs, holEmps, holReps, empGrps, vacCamps]) => {
      if (active) {
        setAbsenceTypes(absTypes.sort((a,b) => a.name.localeCompare(b.name)));
        setContractTypes(conTypes);
        setAnnualConfigs(annConfigs.sort((a,b) => a.year - b.year));
        setHolidays(hols.map(h => ({ ...h, date: safeParseDate(h.date) as Date })).sort((a,b) => (a.date as Date).getTime() - (b.date as Date).getTime()));
        setUsers(usrs);
        setHolidayEmployees(holEmps.sort((a,b) => a.name.localeCompare(b.name)));
        setHolidayReports(holReps);
        setEmployeeGroups(empGrps.sort((a,b) => a.order - b.order));
        setVacationCampaigns(vacCamps.sort((a,b) => (safeParseDate(b.submissionStartDate))!.getTime() - (safeParseDate(a.submissionStartDate))!.getTime()));
        setLoadingSteps(prev => ({...prev, statics: true}));
      }
    });

    const configRef = doc(db, 'app_config', 'features');
    const unsubConfig = onSnapshot(configRef, (docSnap) => {
        if (docSnap.exists()) {
            setAppConfig(docSnap.data());
        }
    });

    return () => {
      active = false;
      unsubConfig();
    }
  }, [authLoading, user, appUser]);

  // Effect for weekly records (depends on statics being loaded)
  useEffect(() => {
    if (!loadingSteps.statics) return;

    let active = true;
    const unsubWeekly = onCollectionUpdate<WeeklyRecord>('weeklyRecords', (data) => {
      if (active) {
        setWeeklyRecords(data.reduce((acc, record) => ({ ...acc, [record.id]: record }), {}));
        setLoadingSteps(prev => ({...prev, weeklyRecords: true}));
      }
    }).unsubscribe;

    return () => {
      active = false;
      unsubWeekly();
    }
  }, [loadingSteps.statics]);

  // Effect for employees (depends on static data)
  useEffect(() => {
    if (!loadingSteps.statics) return;
    
    let active = true;
    const unsub = onCollectionUpdate<Employee>('employees', (data) => {
      if (active) {
        const processed = data.map(emp => ({
          ...emp, 
          employmentPeriods: (emp.employmentPeriods || []).map((p: any) => ({
            ...p, 
            startDate: safeParseDate(p.startDate), 
            endDate: safeParseDate(p.endDate), 
            scheduledAbsences: processScheduledAbsences(p.scheduledAbsences),
            workHoursHistory: (p.workHoursHistory || []).map((wh: any) => ({ ...wh, effectiveDate: safeParseDate(wh.effectiveDate) })),
            weeklySchedulesHistory: (p.weeklySchedulesHistory || []).map((ws: any) => ({ ...ws, effectiveDate: safeParseDate(ws.effectiveDate) }))
          }))
        })).sort((a,b) => a.name.localeCompare(b.name));
        setEmployees(processed);
        setLoadingSteps(prev => ({...prev, employees: true}));
      }
    }).unsubscribe;

    return () => {
      active = false;
      unsub();
    }
  }, [loadingSteps.statics, processScheduledAbsences]);

  // Load conversations and correction requests after employees are loaded
  useEffect(() => {
    if (!loadingSteps.employees) return;
  
    let active = true;
  
    const processConversations = async () => {
        const [convs, corReqs] = await Promise.all([
            getCollection<Conversation>('conversations'),
            getCollection<CorrectionRequest>('correctionRequests')
        ]);
  
        if (!active) return;

        const employeesMap = new Map(employees.map(e => [e.id, e.name]));
        const convMap = new Map<string, Conversation>();

        // 1. Prime the map with existing conversations, ensuring name is present
        convs.forEach(c => {
            c.employeeName = c.employeeName || employeesMap.get(c.employeeId) || 'Desconocido';
            convMap.set(c.id, c);
        });

        // 2. Iterate through correction requests to update or create conversations
        corReqs.forEach(req => {
            const employeeName = employeesMap.get(req.employeeId) || 'Desconocido';
            const existingConv = convMap.get(req.employeeId);
            const requestTimestamp = req.requestedAt;
            
            const weekStartDateFormatted = format(parseISO(req.weekId), 'dd/MM/yyyy', { locale: es });
            const messageText = `SOLICITUD DE CORRECCIÓN - Semana: ${weekStartDateFormatted}`;

            if (!existingConv || isAfter(safeParseDate(requestTimestamp)!, safeParseDate(existingConv.lastMessageTimestamp) ?? new Date(0))) {
                const newOrUpdatedConvData: Conversation = {
                    id: req.employeeId,
                    employeeId: req.employeeId,
                    employeeName: employeeName,
                    lastMessageText: messageText,
                    lastMessageTimestamp: requestTimestamp,
                    readBy: existingConv?.readBy || [],
                    unreadByEmployee: existingConv?.unreadByEmployee || false,
                };
                convMap.set(req.employeeId, newOrUpdatedConvData);
            }
        });
        
        const sortedConversations = Array.from(convMap.values()).sort((a, b) => {
          const dateA = safeParseDate(a.lastMessageTimestamp)?.getTime() ?? 0;
          const dateB = safeParseDate(b.lastMessageTimestamp)?.getTime() ?? 0;
          return dateB - dateA;
        });

        setConversations(sortedConversations);
        setCorrectionRequests(corReqs);
        setLoadingSteps(prev => ({...prev, conversations: true}));
    };
  
    processConversations();
  
    return () => { active = false };
  }, [loadingSteps.employees, employees]);

  // Final loading state
  useEffect(() => {
    if (allLoadingStepsComplete) {
      setLoading(false);
    }
  }, [allLoadingStepsComplete]);

  // Set employee record for the logged-in user
  useEffect(() => {
    if (appUser && appUser.employeeId && employees.length > 0) {
        const foundEmployee = employees.find(e => e.id === appUser.employeeId);
        setEmployeeRecord(foundEmployee || null);
    } else if (!appUser) {
        setEmployeeRecord(null);
    }
}, [appUser, employees]);

const getActiveEmployeesForDate = useCallback((date: Date): Employee[] => {
    const checkDate = startOfDay(date);

    return employees.filter(emp => {
        if (!emp.employmentPeriods) return false;
        return emp.employmentPeriods.some(p => {
            const periodStart = startOfDay(p.startDate as Date);
            const periodEnd = p.endDate ? endOfDay(p.endDate as Date) : new Date('9999-12-31');
            
            // An employee is active in a week if their contract period overlaps with that week.
            return isBefore(periodStart, endOfWeek(checkDate, {weekStartsOn: 1})) && isAfter(periodEnd, startOfWeek(checkDate, {weekStartsOn: 1}));
        });
    });
}, [employees]);


useEffect(() => {
    if (loading || !appUser || appUser.role !== 'admin') {
      setUnconfirmedWeeksDetails([]);
      return;
    }
  
    const detailsMap = new Map<string, UnconfirmedWeekDetail>();
    const currentWeekId = getWeekId(new Date());
  
    const earliestDate = employees.reduce((earliest, emp) => {
      if (emp.employmentPeriods && emp.employmentPeriods.length > 0) {
        const firstStartDate = emp.employmentPeriods.reduce((e, p) => {
          const pDate = p.startDate instanceof Date ? p.startDate : parseISO(p.startDate as string);
          return pDate < e ? pDate : e;
        }, new Date());
        return firstStartDate < earliest ? firstStartDate : earliest;
      }
      return earliest;
    }, new Date());
  
    let dateToCheck = startOfWeek(earliestDate, { weekStartsOn: 1 });
  
    while (isBefore(dateToCheck, startOfWeek(new Date(), { weekStartsOn: 1 }))) {
        const weekId = getWeekId(dateToCheck);
        
        // Skip any weeks from 2024
        if (getISOWeekYear(dateToCheck) === 2024) {
            dateToCheck = addWeeks(dateToCheck, 1);
            continue;
        }

        const activeEmployeesForThisWeek = getActiveEmployeesForDate(dateToCheck);
        const unconfirmedEmployees: string[] = [];
  
        for (const emp of activeEmployeesForThisWeek) {
            const isConfirmed = weeklyRecords[weekId]?.weekData?.[emp.id]?.confirmed ?? false;
            if (!isConfirmed) {
                unconfirmedEmployees.push(emp.name);
            }
        }
      
        if (unconfirmedEmployees.length > 0) {
            detailsMap.set(weekId, { weekId, employeeNames: unconfirmedEmployees });
        }
  
        dateToCheck = addWeeks(dateToCheck, 1);
    }
  
    const details = Array.from(detailsMap.values()).sort((a, b) => b.weekId.localeCompare(a.weekId));
    setUnconfirmedWeeksDetails(details);
  
  }, [loading, appUser, employees, weeklyRecords, getActiveEmployeesForDate, getWeekId]);


// Memoized values and functions that depend on state
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

const pendingCorrectionRequestCount = useMemo(() => {
    if (!appUser || appUser.role !== 'admin') return 0;
    return correctionRequests.filter(r => r.status === 'pending').length;
}, [correctionRequests, appUser]);

const getEmployeeById = useCallback((id: string) => employees.find(e => e.id === id), [employees]);

const getActivePeriod = useCallback((employeeId: string, date: Date): EmploymentPeriod | null => {
    const employee = getEmployeeById(employeeId);
    if (!employee?.employmentPeriods) return null;

    const checkDate = startOfDay(date);

    return employee.employmentPeriods.find(p => {
        const periodStart = startOfDay(p.startDate as Date);
        const periodEnd = p.endDate ? startOfDay(p.endDate as Date) : new Date('9999-12-31');
        
        return !isAfter(periodStart, checkDate) && isAfter(periodEnd, checkDate);
    }) || null;
}, [getEmployeeById]);

const getEffectiveWeeklyHours = useCallback((period: EmploymentPeriod | null, date: Date): number => {
    if (!period?.workHoursHistory || period.workHoursHistory.length === 0) {
      return 0;
    }
    const targetDate = startOfDay(date);

    const history = [...period.workHoursHistory].sort((a,b) => {
        const dateA = safeParseDate(a.effectiveDate);
        const dateB = safeParseDate(b.effectiveDate);
        if (!dateA || !dateB) return 0;
        return dateB.getTime() - dateA.getTime();
    });

    const effectiveRecord = history.find(record => {
        const recordDate = safeParseDate(record.effectiveDate);
        if (!recordDate) return false;
        return !isAfter(startOfDay(recordDate), targetDate);
    });
    
    return effectiveRecord?.weeklyHours || 0;
}, []);



const calculateBalancePreview = useCallback((employeeId: string, weekData: Record<string, DailyData>, initialBalances: { ordinary: number, holiday: number, leave: number }, weeklyHoursOverride?: number | null, totalComplementaryHours?: number | null) => {
    const employee = getEmployeeById(employeeId);
    if (!employee) return null;

    return balanceCalculator(
        employee.id,
        weekData,
        initialBalances,
        absenceTypes,
        contractTypes,
        employee.employmentPeriods,
        weeklyHoursOverride,
        totalComplementaryHours
    );
  }, [getEmployeeById, absenceTypes, contractTypes]);
  
const getEmployeeBalancesForWeek = useCallback((employeeId: string, weekId: string): { ordinary: number, holiday: number, leave: number, total: number } => {
    const employee = employees.find(e => e.id === employeeId);
    if (!employee || !employee.employmentPeriods || employee.employmentPeriods.length === 0) {
        return { ordinary: 0, holiday: 0, leave: 0, total: 0 };
    }

    const targetWeekStartDate = startOfDay(parseISO(weekId));
    
    const allPeriodsSorted = [...employee.employmentPeriods].sort((a, b) => 
        (a.startDate as Date).getTime() - (b.startDate as Date).getTime()
    );

    // Find the period active DURING or JUST BEFORE the target week.
    const relevantPeriod = allPeriodsSorted
        .filter(p => !isAfter(startOfDay(p.startDate as Date), targetWeekStartDate))
        .pop();

    if (!relevantPeriod) {
        // This case occurs if the weekId is before any contract started. Return the first period's initial balances.
        const firstPeriod = allPeriodsSorted[0];
        const balances = {
            ordinary: firstPeriod?.initialOrdinaryHours ?? 0,
            holiday: firstPeriod?.initialHolidayHours ?? 0,
            leave: firstPeriod?.initialLeaveHours ?? 0,
        };
        return { ...balances, total: balances.ordinary + balances.holiday + balances.leave };
    }

    let currentBalances = {
        ordinary: relevantPeriod.initialOrdinaryHours ?? 0,
        holiday: relevantPeriod.initialHolidayHours ?? 0,
        leave: relevantPeriod.initialLeaveHours ?? 0,
    };
    
    const relevantPeriodStartDate = startOfDay(relevantPeriod.startDate as Date);

    const recordsToProcess = Object.values(weeklyRecords)
        .filter(record => {
            const recordDate = parseISO(record.id);
            return record.weekData?.[employeeId]?.confirmed &&
                   !isBefore(recordDate, relevantPeriodStartDate) && // Only from the start of the relevant period
                   isBefore(recordDate, targetWeekStartDate);        // Up to the week before the target
        })
        .sort((a, b) => a.id.localeCompare(b.id));

    for (const record of recordsToProcess) {
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
        const nextWeekId = getWeekId(addWeeks(parseISO(latestRecordWeekId), 1));
        return getEmployeeBalancesForWeek(employeeId, nextWeekId);
    }
    
    const earliestPeriod = [...(employee.employmentPeriods || [])]
        .sort((a, b) => (a.startDate as Date).getTime() - (b.startDate as Date).getTime())[0];

    if (earliestPeriod) {
        const balances = {
            ordinary: earliestPeriod.initialOrdinaryHours ?? 0,
            holiday: earliestPeriod.initialHolidayHours ?? 0,
            leave: earliestPeriod.initialLeaveHours ?? 0,
        };
        return { ...balances, total: balances.ordinary + balances.holiday + balances.leave };
    }

    return { ordinary: 0, holiday: 0, leave: 0, total: 0 };
}, [employees, weeklyRecords, getEmployeeBalancesForWeek, getWeekId]);


const getTheoreticalHoursAndTurn = useCallback((employeeId: string, dateInWeek: Date): { turnId: string | null; weekDaysWithTheoreticalHours: { dateKey: string; theoreticalHours: number }[] } => {
    const employee = getEmployeeById(employeeId);
    const weekDays = eachDayOfInterval({ start: startOfWeek(dateInWeek, { weekStartsOn: 1 }), end: endOfWeek(dateInWeek, { weekStartsOn: 1 }) });
    const defaultReturn = { turnId: null, weekDaysWithTheoreticalHours: weekDays.map(d => ({ dateKey: format(d, 'yyyy-MM-dd'), theoreticalHours: 0 })) };

    if (!employee) return defaultReturn;

    const activePeriod = getActivePeriod(employee.id, dateInWeek);
    if (!activePeriod?.weeklySchedulesHistory || activePeriod.weeklySchedulesHistory.length === 0) {
        return defaultReturn;
    }

    const schedule = [...activePeriod.weeklySchedulesHistory]
        .sort((a, b) => ((b.effectiveDate as Date).getTime() - (a.effectiveDate as Date).getTime()))
        .find(s => !isAfter(startOfDay(s.effectiveDate as Date), startOfDay(dateInWeek)));
    
    if (!schedule) return defaultReturn;
    
    const ANCHOR_DATE = startOfWeek(new Date('2024-12-16'), { weekStartsOn: 1 }); // T1 week, as per new business rule
    const currentWeekStartDate = startOfWeek(dateInWeek, { weekStartsOn: 1 });

    const weeksDifference = Math.floor(differenceInDays(currentWeekStartDate, ANCHOR_DATE) / 7);
    
    const turnIndex = (weeksDifference % 4 + 4) % 4; // Ensures positive index for past dates
    const turnId = `turn${turnIndex + 1}` as keyof typeof schedule.shifts;

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

    return { turnId: `turn${turnIndex + 1}`, weekDaysWithTheoreticalHours: results };
}, [getEmployeeById, getActivePeriod]);

  
    const calculateCurrentAnnualComputedHours = useCallback((employeeId: string, year: number): number => {
        const employee = getEmployeeById(employeeId);
        if (!employee) return 0;

        let totalComputedHours = 0;

        const relevantRecords = Object.values(weeklyRecords).filter(record => {
            const weekDate = parseISO(record.id);
            const isoYear = getISOWeekYear(weekDate);
            if (year === 2025) return isoYear === 2025 && record.weekData[employeeId]?.confirmed;
            return isoYear === year && record.weekData[employeeId]?.confirmed;
        });

        relevantRecords.forEach(weekRecord => {
            const employeeData = weekRecord.weekData[employeeId];
            if (employeeData?.days) {
                Object.entries(employeeData.days).forEach(([dayKey, dayData]) => {
                    if (dayData.isHoliday || getISODay(parseISO(dayKey)) === 7) {
                        return; // Skip holidays and Sundays completely
                    }
                    
                    const absenceType = absenceTypes.find(at => at.abbreviation === dayData.absence);
                    let dailyComputable = 0;

                    // Add worked hours
                    dailyComputable += dayData.workedHours || 0;

                    // Only add absence hours if the type is configured to do so.
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
    }, [getEmployeeById, weeklyRecords, absenceTypes, getActivePeriod]);

    const calculateTheoreticalAnnualWorkHours = useCallback((employeeId: string, year: number): { theoreticalHours: number, baseTheoreticalHours: number, suspensionDetails: any[], workHoursChangeDetails: any[] } => {
        const employee = employees.find(e => e.id === employeeId);
        const annualConfig = annualConfigs.find(c => c.year === year);
    
        const defaultReturn = { theoreticalHours: 0, baseTheoreticalHours: 0, suspensionDetails: [], workHoursChangeDetails: [] };
    
        if (!employee || !annualConfig) {
            return defaultReturn;
        }
    
        const yearStart = startOfYear(new Date(year, 0, 1));
        const yearEnd = endOfYear(new Date(year, 11, 31));
        const daysInYear = differenceInDays(yearEnd, yearStart) + 1;
        const baseTheoreticalHours = annualConfig.maxAnnualHours;
    
        let totalProratedHours = 0;
        const allWorkHoursChangeDetails: any[] = [];
        const allSuspensionDetails: any[] = [];
    
        employee.employmentPeriods.forEach(period => {
            const pStart = period.startDate as Date;
            const pEnd = period.endDate ? (period.endDate as Date) : yearEnd;
    
            // Skip period if it doesn't overlap with the year
            if (isAfter(pStart, yearEnd) || isBefore(pEnd, yearStart)) {
                return;
            }
    
            const effectivePeriodStart = max([yearStart, pStart]);
            const effectivePeriodEnd = min([yearEnd, pEnd]);
            
            if (isAfter(effectivePeriodStart, effectivePeriodEnd)) return;
            
            const contractDaysInYear = differenceInDays(effectivePeriodEnd, effectivePeriodStart) + 1;
            
            let periodBaseHours = (baseTheoreticalHours / daysInYear) * contractDaysInYear;
            
            const history = (period.workHoursHistory || []).sort((a,b) => ((a.effectiveDate as Date).getTime() - (b.effectiveDate as Date).getTime()));
            if (history.length > 0) {
                for (let i = 0; i < history.length; i++) {
                    const currentChange = history[i];
                    const nextChange = history[i + 1];
    
                    const changeStart = max([effectivePeriodStart, currentChange.effectiveDate as Date]);
                    const changeEnd = min([effectivePeriodEnd, nextChange ? subDays(nextChange.effectiveDate as Date, 1) : effectivePeriodEnd]);
                    
                    if (isAfter(changeStart, changeEnd)) continue;
    
                    const daysOfChange = differenceInDays(changeEnd, changeStart) + 1;
                    const weeklyHoursDiff = currentChange.weeklyHours - annualConfig.referenceWeeklyHours;
                    
                    if (Math.abs(weeklyHoursDiff) > 0.01) {
                        const impact = (weeklyHoursDiff / 7) * daysOfChange;
                        periodBaseHours += impact;
                        allWorkHoursChangeDetails.push({ 
                            newWeeklyHours: currentChange.weeklyHours, 
                            effectiveDate: currentChange.effectiveDate, 
                            days: daysOfChange,
                            impact: impact 
                        });
                    }
                }
            }
            
            const suspensionTypeIds = new Set(absenceTypes.filter(at => at.suspendsContract).map(at => at.id));
            let periodSuspensionDays = 0;
    
            (period.scheduledAbsences || []).forEach(absence => {
                if (suspensionTypeIds.has(absence.absenceTypeId) && absence.endDate && absence.startDate) {
                    const effectiveAbsenceStart = max([effectivePeriodStart, absence.startDate]);
                    const effectiveAbsenceEnd = min([effectivePeriodEnd, absence.endDate]);
                    
                    if (isAfter(effectiveAbsenceStart, effectiveAbsenceEnd)) return;
                    
                    const days = differenceInDays(effectiveAbsenceEnd, effectiveAbsenceStart) + 1;
                    periodSuspensionDays += days;
                    allSuspensionDetails.push({ name: absenceTypes.find(at => at.id === absence.absenceTypeId)?.name, days });
                }
            });
            
            if (periodSuspensionDays > 0) {
                const hoursToDeduct = (baseTheoreticalHours / daysInYear) * periodSuspensionDays;
                periodBaseHours -= hoursToDeduct;
            }
    
            totalProratedHours += periodBaseHours;
        });
    
        return {
            theoreticalHours: roundToNearestQuarter(totalProratedHours),
            baseTheoreticalHours: baseTheoreticalHours,
            suspensionDetails: allSuspensionDetails,
            workHoursChangeDetails: allWorkHoursChangeDetails
        };
    }, [employees, annualConfigs, absenceTypes]);
    

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
            const periodStart = startOfDay(p.startDate as Date);
            const periodEnd = p.endDate ? startOfDay(p.endDate as Date) : new Date('9999-12-31');
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
            yearsWithActivity.add(getISOWeekYear(parseISO(weekId)));
        }
    });
    
    employee.employmentPeriods.forEach(p => {
        yearsWithActivity.add(getISOWeekYear(p.startDate as Date));
        if (p.endDate) {
            yearsWithActivity.add(getISOWeekYear(p.endDate as Date));
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

const calculateEmployeeVacations = useCallback((emp: Employee | null, year: number = getYear(new Date()), mode: 'confirmed' | 'programmed' = 'programmed'): {
    vacationDaysTaken: number;
    suspensionDays: number;
    vacationDaysAvailable: number;
    baseDays: number;
    carryOverDays: number;
    suspensionDeduction: number;
    proratedDays: number;
  } => {
    const defaultReturn = { vacationDaysTaken: 0, suspensionDays: 0, vacationDaysAvailable: 31, baseDays: 31, carryOverDays: 0, suspensionDeduction: 0, proratedDays: 31 };
    
    if (!emp) {
        return defaultReturn;
    }

    const vacationType = absenceTypes.find(at => at.name === 'Vacaciones');
    const suspensionTypes = new Set(absenceTypes.filter(at => at.suspendsContract).map(at => at.id));
    const suspensionAbbrs = new Set(absenceTypes.filter(at => at.suspendsContract).map(at => at.abbreviation));
    const currentYear = year;

    if (!vacationType) {
        return defaultReturn;
    }

    const getYearData = (targetYear: number) => {
        let vacationDaysTaken = 0;
        let suspensionDays = 0;
        
        const vacationDaysSet = new Set<string>();
        const suspensionDaysSet = new Set<string>();

        emp.employmentPeriods?.forEach(period => {
            period.scheduledAbsences?.forEach(absence => {
                if (!absence.startDate) return;
                const startDate = absence.startDate;
                const endDate = absence.endDate || startDate;
                
                const daysInAbsence = eachDayOfInterval({start: startOfDay(startDate), end: startOfDay(endDate)});
                
                daysInAbsence.forEach(day => {
                    if (getYear(day) === targetYear) {
                        const dayStr = format(day, 'yyyy-MM-dd');
                        if (suspensionTypes.has(absence.absenceTypeId)) suspensionDaysSet.add(dayStr);
                        if (absence.absenceTypeId === vacationType.id) vacationDaysSet.add(dayStr);
                    }
                });
            });
        });

        Object.values(weeklyRecords).forEach(record => {
            if (!record.weekData || !record.weekData[emp.id]) return;
            const empWeekData = record.weekData[emp.id];
            if (empWeekData?.confirmed && empWeekData.days) {
                 Object.entries(empWeekData.days).forEach(([dayStr, dayData]) => {
                    const dayDate = parseISO(dayStr);
                    if (getYear(dayDate) === targetYear) {
                        if (dayData.absence === vacationType.abbreviation) vacationDaysSet.add(dayStr);
                        if (suspensionAbbrs.has(dayData.absence)) suspensionDaysSet.add(dayStr);
                    }
                 });
            }
        });

        vacationDaysTaken = vacationDaysSet.size;
        suspensionDays = suspensionDaysSet.size;

        const activePeriod = emp.employmentPeriods.find(p => {
            const pStart = startOfDay(p.startDate as Date);
            const pEnd = p.endDate ? startOfDay(p.endDate as Date) : new Date(targetYear, 11, 31);
            return isWithinInterval(new Date(targetYear, 6, 1), { start: pStart, end: pEnd });
        });
        
        if(activePeriod?.isTransfer && activePeriod?.vacationDaysUsedInAnotherCenter) {
            vacationDaysTaken += activePeriod.vacationDaysUsedInAnotherCenter;
        }

        return { vacationDaysTaken, suspensionDays };
    };

    const activePeriodForYear = emp.employmentPeriods.find(p => {
        const pStart = startOfDay(p.startDate as Date);
        const pEnd = p.endDate ? startOfDay(p.endDate as Date) : new Date(currentYear, 11, 31);
        return isWithinInterval(new Date(currentYear, 6, 1), { start: pStart, end: pEnd });
    });

    if (!activePeriodForYear) {
        return defaultReturn;
    }

    const contractStartDate = startOfDay(activePeriodForYear.startDate as Date);
    const yearStart = startOfYear(new Date(currentYear, 0, 1));
    const yearEnd = endOfYear(new Date(currentYear, 11, 31));

    let proratedDays = 31;
    if (isAfter(contractStartDate, yearStart) && !activePeriodForYear.isTransfer) {
        const daysInYear = 365; // Simple approximation
        const daysWorkedInYear = differenceInDays(yearEnd, contractStartDate);
        proratedDays = Math.round((daysWorkedInYear / daysInYear) * 31);
    }

    const carryOverDays = activePeriodForYear.vacationDays2024 ?? 0;
    
    const currentYearData = getYearData(currentYear);
    const suspensionDeduction = (currentYearData.suspensionDays / 30) * 2.5;
    const vacationDaysAvailable = Math.round(proratedDays + carryOverDays - suspensionDeduction);

    return {
      vacationDaysTaken: currentYearData.vacationDaysTaken,
      suspensionDays: currentYearData.suspensionDays,
      vacationDaysAvailable: vacationDaysAvailable,
      baseDays: 31,
      carryOverDays: carryOverDays,
      suspensionDeduction: suspensionDeduction,
      proratedDays: proratedDays,
    };
}, [absenceTypes, weeklyRecords]);

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
        if (!absence.startDate || !absence.endDate) return;

        const daysInAbsence = eachDayOfInterval({start: startOfDay(absence.startDate), end: startOfDay(absence.endDate)});
        
        if (absence.absenceTypeId === vacationType.id) {
             daysInAbsence.forEach(day => {
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


  const updateEmployeeWorkHours = async (employeeId: string, employee: Employee, weeklyHours: number, effectiveDate: string) => {
    if (!employee) throw new Error("Empleado no encontrado");
    await updateEmployeeWorkHoursService(employeeId, employee, weeklyHours, effectiveDate);
  };
  
    const prefilledRecords: Record<string, PrefilledWeeklyRecord> = prefilledData as any;

    const processEmployeeWeekData = useCallback((emp: Employee, weekDays: Date[], weekId: string): DailyEmployeeData | null => {
        const dbRecord = weeklyRecords[weekId]?.weekData?.[emp.id];
    
        if (dbRecord) {
            return dbRecord;
        }
    
        const activePeriod = getActivePeriod(emp.id, weekDays[0]);
        if (!activePeriod) {
            return null;
        }
    
        const { weekDaysWithTheoreticalHours } = getTheoreticalHoursAndTurn(emp.id, weekDays[0]);
        const weeklyWorkHours = getEffectiveWeeklyHours(activePeriod, weekDays[0]);
        const newDays: Record<string, DailyData> = {};
    
        for (const day of weekDays) {
            const dayKey = format(day, 'yyyy-MM-dd');
    
            const holidayDetails = holidays.find(h => isSameDay(h.date as Date, day));
            const theoreticalDay = weekDaysWithTheoreticalHours.find(d => d.dateKey === dayKey);
            const theoreticalHours = theoreticalDay?.theoreticalHours ?? 0;
    
            let scheduledAbsence: ScheduledAbsence | undefined;
            for (const period of emp.employmentPeriods) {
                if (period.scheduledAbsences) {
                    scheduledAbsence = period.scheduledAbsences.find(absence => {
                        if (!absence.startDate) return false;
                        const startDate = startOfDay(absence.startDate);
                        const endDate = absence.endDate ? endOfDay(absence.endDate) : endOfDay(startDate);
                        return isWithinInterval(day, { start: startDate, end: endDate });
                    });
                    if (scheduledAbsence) break;
                }
            }
    
            const absenceType = scheduledAbsence ? absenceTypes.find(at => at.id === scheduledAbsence.absenceTypeId) : undefined;
            
            let leaveHours = 0;
            if (holidayDetails && theoreticalHours === 0 && getISODay(day) !== 7) {
                const contractType = contractTypes.find(ct => ct.name === activePeriod.contractType);
                if (contractType?.computesOffDayBag) {
                    leaveHours = roundToNearestQuarter(weeklyWorkHours / 5);
                }
            }
    
            let workedHours = theoreticalHours;
            let absenceAbbreviation = 'ninguna';
            let absenceHours = 0;
    
            if (absenceType) {
                absenceAbbreviation = absenceType.abbreviation;
                if (absenceType.computesFullDay) {
                    workedHours = 0;
                    absenceHours = theoreticalHours;
                }
            }
    
            newDays[dayKey] = {
                theoreticalHours,
                workedHours,
                absence: absenceAbbreviation,
                absenceHours,
                leaveHours,
                doublePay: false,
                isHoliday: !!holidayDetails,
                holidayType: holidayDetails?.type ?? null,
            };
        }
    
        const prefilledWeek = prefilledRecords[weekId];
        const prefilledEmployeeData = prefilledWeek?.weekData?.[emp.name];
    
        return {
            days: newDays,
            confirmed: false,
            totalComplementaryHours: null,
            generalComment: null,
            weeklyHoursOverride: null,
            isDifference: false,
            hasPreregistration: !!prefilledEmployeeData,
            expectedOrdinaryImpact: prefilledEmployeeData?.expectedOrdinaryImpact,
            expectedHolidayImpact: prefilledEmployeeData?.expectedHolidayImpact,
            expectedLeaveImpact: prefilledEmployeeData?.expectedLeaveImpact,
        };
    }, [
        weeklyRecords, 
        getActivePeriod, 
        getTheoreticalHoursAndTurn, 
        holidays, 
        absenceTypes, 
        contractTypes, 
        getEffectiveWeeklyHours
    ]);

  const availableYears = useMemo(() => {
        const years = new Set<number>();
        Object.keys(weeklyRecords).forEach(id => {
            years.add(getISOWeekYear(parseISO(id)));
        });
        const currentYear = new Date().getFullYear();
        years.add(currentYear);
        years.add(currentYear + 1);
        years.add(currentYear + 2); // Add two future years for planning
        return Array.from(years).filter(y => y >= 2025).sort((a,b) => b - a);
    }, [weeklyRecords]);
  
  const refreshData = useCallback(() => {
    // This is now just a placeholder. The onSnapshot listeners handle live updates.
  }, []);

  const refreshUsers = async () => {
    const freshUsers = await getCollection<AppUser>('users');
    setUsers(freshUsers);
  };
  
  const findNextUnconfirmedWeek = useCallback((startDate: Date): string | null => {
    let dateToCheck = startOfWeek(addWeeks(startDate, 1), { weekStartsOn: 1 });
    const limit = addWeeks(new Date(), 104); // Search limit of 2 years

    while (isBefore(dateToCheck, limit)) {
        const currentWeekId = getWeekId(dateToCheck);
        const activeEmployeesThisWeek = getActiveEmployeesForDate(dateToCheck);

        if (activeEmployeesThisWeek.length > 0) {
            const isUnconfirmed = activeEmployeesThisWeek.some(emp =>
                !(weeklyRecords[currentWeekId]?.weekData?.[emp.id]?.confirmed ?? false)
            );

            if (isUnconfirmed) {
                return currentWeekId;
            }
        }

        dateToCheck = addWeeks(dateToCheck, 1);
    }

    return null;
  }, [weeklyRecords, getActiveEmployeesForDate, getWeekId]);

  const value: DataContextType = {
    employees,
    holidays,
    absenceTypes,
    contractTypes,
    annualConfigs,
    weeklyRecords,
    users,
    employeeRecord,
    holidayEmployees,
    holidayReports,
    employeeGroups,
    conversations,
    vacationCampaigns,
    correctionRequests,
    unconfirmedWeeksDetails,
    appConfig,
    loading,
    unreadMessageCount,
    pendingCorrectionRequestCount,
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
    createConversation: createConversationService,
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
    availableYears,
  };

  return (
    <DataContext.Provider value={value}>
       {children}
    </DataContext.Provider>
  );
};

export const useDataProvider = () => useContext(DataContext);
