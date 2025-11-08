'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  DEFAULT_LOCAL_DATABASE,
  loadLocalDatabase,
  saveLocalDatabase,
  type LocalDatabaseState,
} from '@/lib/local-data';
import type {
  AbsenceType,
  AnnualConfiguration,
  AppUser,
  ContractType,
  DailyData,
  DailyEmployeeData,
  Employee,
  EmployeeGroup,
  EmploymentPeriod,
  Holiday,
  HolidayEmployee,
  HolidayFormData,
  HolidayReport,
  VacationCampaign,
  WeeklyRecord,
  WeeklyRecordWithBalances,
  CorrectionRequest,
  Conversation,
} from '@/lib/types';
import { calculateBalancePreview as computeBalancePreview } from '@/lib/calculators/balance-calculator';

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
  unconfirmedWeeksDetails: { weekId: string; employeeNames: string[] }[];
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
  getEmployeeBalancesForWeek: (
    employeeId: string,
    weekId: string,
  ) => { ordinary: number; holiday: number; leave: number; total: number };
  getEmployeeFinalBalances: (
    employeeId: string,
  ) => { ordinary: number; holiday: number; leave: number; total: number };
  getTheoreticalHoursAndTurn: (
    employeeId: string,
    dateInWeek: Date,
  ) => { turnId: string | null; weekDaysWithTheoreticalHours: { dateKey: string; theoreticalHours: number }[] };
  calculateBalancePreview: (
    employeeId: string,
    weekData: Record<string, DailyData>,
    initialBalances: { ordinary: number; holiday: number; leave: number },
    weeklyHoursOverride?: number | null,
    totalComplementaryHours?: number | null,
  ) => {
    ordinary: number;
    holiday: number;
    leave: number;
    resultingOrdinary: number;
    resultingHoliday: number;
    resultingLeave: number;
  };
  calculateCurrentAnnualComputedHours: (employeeId: string, year: number) => number;
  calculateTheoreticalAnnualWorkHours: (
    employeeId: string,
    year: number,
  ) => {
    theoreticalHours: number;
    baseTheoreticalHours: number;
    suspensionDetails: any[];
    workHoursChangeDetails: any[];
  };
  getProcessedAnnualDataForEmployee: (
    employeeId: string,
    year: number,
  ) => Promise<{ annualData: WeeklyRecordWithBalances[] }>;
  getProcessedAnnualDataForAllYears: (
    employeeId: string,
  ) => Promise<Record<
    number,
    { annualData: WeeklyRecordWithBalances[]; annualComputedHours: number; theoreticalAnnualWorkHours: number }
  >>;
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
  updateEmployeeWorkHours: (
    employeeId: string,
    employee: Employee,
    weeklyHours: number,
    effectiveDate: string,
  ) => Promise<void>;
  getWeekId: (d: Date) => string;
  processEmployeeWeekData: (
    emp: Employee,
    weekDays: Date[],
    weekId: string,
  ) => DailyEmployeeData | null;
  calculateEmployeeVacations: (
    emp: Employee | null,
    year?: number,
    mode?: 'confirmed' | 'programmed',
  ) => {
    vacationDaysTaken: number;
    suspensionDays: number;
    vacationDaysAvailable: number;
    baseDays: number;
    carryOverDays: number;
    suspensionDeduction: number;
    proratedDays: number;
  };
  calculateSeasonalVacationStatus: (
    employeeId: string,
    year: number,
  ) => {
    employeeName: string;
    winterDaysTaken: number;
    summerDaysTaken: number;
    winterDaysRemaining: number;
    summerDaysRemaining: number;
  };
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
  databaseConfigured: boolean;
}

const defaultValue: DataContextType = {
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
  refreshData: () => {
    console.warn('[data-provider] No hay base de datos configurada.');
  },
  refreshUsers: async () => {
    console.warn('[data-provider] refreshUsers requiere base de datos configurada.');
  },
  getEmployeeById: () => undefined,
  getActivePeriod: () => null,
  getEffectiveWeeklyHours: () => 0,
  getActiveEmployeesForDate: () => [],
  getEmployeeBalancesForWeek: () => ({ ordinary: 0, holiday: 0, leave: 0, total: 0 }),
  getEmployeeFinalBalances: () => ({ ordinary: 0, holiday: 0, leave: 0, total: 0 }),
  getTheoreticalHoursAndTurn: () => ({ turnId: null, weekDaysWithTheoreticalHours: [] }),
  calculateBalancePreview: () => ({
    ordinary: 0,
    holiday: 0,
    leave: 0,
    resultingOrdinary: 0,
    resultingHoliday: 0,
    resultingLeave: 0,
  }),
  calculateCurrentAnnualComputedHours: () => 0,
  calculateTheoreticalAnnualWorkHours: () => ({
    theoreticalHours: 0,
    baseTheoreticalHours: 0,
    suspensionDetails: [],
    workHoursChangeDetails: [],
  }),
  getProcessedAnnualDataForEmployee: async () => ({ annualData: [] }),
  getProcessedAnnualDataForAllYears: async () => ({}),
  createAbsenceType: async () => '0',
  updateAbsenceType: async () => {},
  deleteAbsenceType: async () => {},
  createHoliday: async () => '0',
  updateHoliday: async () => {},
  deleteHoliday: async () => {},
  createAnnualConfig: async () => '0',
  updateAnnualConfig: async () => {},
  deleteAnnualConfig: async () => {},
  createContractType: async () => '0',
  updateContractType: async () => {},
  deleteContractType: async () => {},
  updateEmployeeWorkHours: async () => {},
  getWeekId: (d: Date) => new Date(d).toISOString().slice(0, 10),
  processEmployeeWeekData: () => null,
  calculateEmployeeVacations: () => ({
    vacationDaysTaken: 0,
    suspensionDays: 0,
    vacationDaysAvailable: 0,
    baseDays: 0,
    carryOverDays: 0,
    suspensionDeduction: 0,
    proratedDays: 0,
  }),
  calculateSeasonalVacationStatus: () => ({
    employeeName: '',
    winterDaysTaken: 0,
    summerDaysTaken: 0,
    winterDaysRemaining: 0,
    summerDaysRemaining: 0,
  }),
  createConversation: async () => {},
  addHolidayEmployee: async () => '0',
  updateHolidayEmployee: async () => {},
  deleteHolidayEmployee: async () => {},
  addHolidayReport: async () => {},
  updateHolidayReport: async () => {},
  deleteHolidayReport: async () => {},
  createEmployeeGroup: async () => '0',
  updateEmployeeGroup: async () => {},
  deleteEmployeeGroup: async () => {},
  updateEmployeeGroupOrder: async () => {},
  createVacationCampaign: async () => '0',
  updateVacationCampaign: async () => {},
  deleteVacationCampaign: async () => {},
  findNextUnconfirmedWeek: () => null,
  availableYears: [],
  databaseConfigured: false,
};

const DataContext = createContext<DataContextType>(defaultValue);

const cloneDatabase = (state: LocalDatabaseState): LocalDatabaseState =>
  JSON.parse(JSON.stringify(state)) as LocalDatabaseState;

const safeParseDate = (value: string | Date | null | undefined): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const sortWeeks = (records: WeeklyRecord[]) => [...records].sort((a, b) => a.id.localeCompare(b.id));

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [dbState, setDbState] = useState<LocalDatabaseState>(DEFAULT_LOCAL_DATABASE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const state = loadLocalDatabase();
    setDbState(state);
    setLoading(false);
  }, []);

  const updateState = useCallback((updater: (draft: LocalDatabaseState) => void) => {
    setDbState((current) => {
      const draft = cloneDatabase(current);
      updater(draft);
      saveLocalDatabase(draft);
      return draft;
    });
  }, []);

  const weeklyRecordMap = useMemo(() => {
    const map: Record<string, WeeklyRecord> = {};
    for (const record of dbState.weeklyRecords) {
      map[record.id] = record;
    }
    return map;
  }, [dbState.weeklyRecords]);

  const getEmployeeById = useCallback(
    (id: string) => dbState.employees.find((employee) => employee.id === id),
    [dbState.employees],
  );

  const getActivePeriod = useCallback(
    (employeeId: string, date: Date) => {
      const employee = getEmployeeById(employeeId);
      if (!employee) return null;
      const target = date.setHours(0, 0, 0, 0);
      return (
        employee.employmentPeriods.find((period) => {
          const start = safeParseDate(period.startDate)?.getTime();
          const end = safeParseDate(period.endDate)?.getTime() ?? Number.POSITIVE_INFINITY;
          if (start == null) return false;
          return start <= target && target <= end;
        }) ?? null
      );
    },
    [getEmployeeById],
  );

  const getEffectiveWeeklyHours = useCallback((period: EmploymentPeriod | null, date: Date) => {
    if (!period?.workHoursHistory || period.workHoursHistory.length === 0) {
      return 0;
    }
    const timestamp = date.setHours(0, 0, 0, 0);
    const history = [...period.workHoursHistory].sort((a, b) => {
      const aDate = safeParseDate(a.effectiveDate)?.getTime() ?? 0;
      const bDate = safeParseDate(b.effectiveDate)?.getTime() ?? 0;
      return bDate - aDate;
    });
    const match = history.find((entry) => {
      const entryDate = safeParseDate(entry.effectiveDate)?.getTime();
      if (entryDate == null) return false;
      return entryDate <= timestamp;
    });
    return match?.weeklyHours ?? 0;
  }, []);

  const getActiveEmployeesForDate = useCallback(
    (date: Date) => dbState.employees.filter((employee) => getActivePeriod(employee.id, date)),
    [dbState.employees, getActivePeriod],
  );

  const getWeekId = useCallback((d: Date) => new Date(d).toISOString().slice(0, 10), []);

  const getEmployeeBalancesForWeek = useCallback(
    (employeeId: string, weekId: string) => {
      const record = weeklyRecordMap[weekId];
      if (!record) {
        return { ordinary: 0, holiday: 0, leave: 0, total: 0 };
      }
      const data = record.weekData[employeeId] as (DailyEmployeeData & {
        impact?: { ordinary: number; holiday: number; leave: number };
        finalBalances?: { ordinary: number; holiday: number; leave: number };
      }) | undefined;
      if (!data) {
        return { ordinary: 0, holiday: 0, leave: 0, total: 0 };
      }
      const impact = data.impact ?? { ordinary: 0, holiday: 0, leave: 0 };
      const finalBalances = data.finalBalances ?? impact;
      return {
        ordinary: impact.ordinary,
        holiday: impact.holiday,
        leave: impact.leave,
        total: finalBalances.ordinary + finalBalances.holiday + finalBalances.leave,
      };
    },
    [weeklyRecordMap],
  );

  const getEmployeeFinalBalances = useCallback(
    (employeeId: string) => {
      const records = sortWeeks(dbState.weeklyRecords).filter((record) => record.weekData[employeeId]);
      if (records.length === 0) {
        return { ordinary: 0, holiday: 0, leave: 0, total: 0 };
      }
      const latest = records[records.length - 1].weekData[employeeId] as (DailyEmployeeData & {
        finalBalances?: { ordinary: number; holiday: number; leave: number };
      });
      const balances = latest.finalBalances ?? { ordinary: 0, holiday: 0, leave: 0 };
      return {
        ordinary: balances.ordinary,
        holiday: balances.holiday,
        leave: balances.leave,
        total: balances.ordinary + balances.holiday + balances.leave,
      };
    },
    [dbState.weeklyRecords],
  );

  const getTheoreticalHoursAndTurn = useCallback(
    (employeeId: string, dateInWeek: Date) => {
      const period = getActivePeriod(employeeId, dateInWeek);
      if (!period?.weeklySchedulesHistory?.length) {
        return { turnId: null, weekDaysWithTheoreticalHours: [] };
      }
      const history = [...period.weeklySchedulesHistory].sort((a, b) => {
        const aDate = safeParseDate(a.effectiveDate)?.getTime() ?? 0;
        const bDate = safeParseDate(b.effectiveDate)?.getTime() ?? 0;
        return bDate - aDate;
      });
      const match = history.find((item) => {
        const effective = safeParseDate(item.effectiveDate)?.getTime() ?? 0;
        return effective <= dateInWeek.getTime();
      });
      if (!match) {
        return { turnId: null, weekDaysWithTheoreticalHours: [] };
      }
      const turnId = Object.keys(match.shifts)[0] ?? null;
      const weekDaysWithTheoreticalHours = Object.entries(match.shifts[turnId as keyof typeof match.shifts] ?? {}).map(
        ([dateKey, schedule]) => ({
          dateKey,
          theoreticalHours: schedule.hours,
        }),
      );
      return { turnId, weekDaysWithTheoreticalHours };
    },
    [getActivePeriod],
  );

  const calculateBalancePreview = useCallback(
    (
      employeeId: string,
      weekData: Record<string, DailyData>,
      initialBalances: { ordinary: number; holiday: number; leave: number },
      weeklyHoursOverride?: number | null,
      totalComplementaryHours?: number | null,
    ) => {
      const employee = getEmployeeById(employeeId);
      if (!employee) {
        return {
          ordinary: 0,
          holiday: 0,
          leave: 0,
          resultingOrdinary: initialBalances.ordinary,
          resultingHoliday: initialBalances.holiday,
          resultingLeave: initialBalances.leave,
        };
      }
      const periods = employee.employmentPeriods;
      return computeBalancePreview(
        employeeId,
        weekData,
        initialBalances,
        dbState.absenceTypes,
        dbState.contractTypes,
        periods,
        weeklyHoursOverride,
        totalComplementaryHours,
      );
    },
    [dbState.absenceTypes, dbState.contractTypes, getEmployeeById],
  );

  const calculateCurrentAnnualComputedHours = useCallback(
    (employeeId: string, year: number) => {
      const employee = getEmployeeById(employeeId);
      if (!employee) return 0;
      return employee.employmentPeriods.reduce((total, period) => {
        const start = safeParseDate(period.startDate)?.getFullYear();
        if (start !== year) return total;
        return total + (period.annualComputedHours ?? 0);
      }, 0);
    },
    [getEmployeeById],
  );

  const calculateTheoreticalAnnualWorkHours = useCallback(
    (employeeId: string, year: number) => {
      const config = dbState.annualConfigurations.find((item) => item.year === year);
      const baseTheoreticalHours = config ? config.referenceWeeklyHours * 52 : 0;
      return {
        theoreticalHours: baseTheoreticalHours,
        baseTheoreticalHours,
        suspensionDetails: [],
        workHoursChangeDetails: [],
      };
    },
    [dbState.annualConfigurations],
  );

  const buildWeeklyRecordWithBalances = useCallback(
    (record: WeeklyRecord, employeeId: string): WeeklyRecordWithBalances | null => {
      const data = record.weekData[employeeId] as (DailyEmployeeData & {
        previousBalances?: { ordinary: number; holiday: number; leave: number };
        impact?: { ordinary: number; holiday: number; leave: number };
        finalBalances?: { ordinary: number; holiday: number; leave: number };
      }) | undefined;
      if (!data) return null;
      const initial = data.previousBalances ?? { ordinary: 0, holiday: 0, leave: 0 };
      const impact = data.impact ?? { ordinary: 0, holiday: 0, leave: 0 };
      const finalBalances = data.finalBalances ?? {
        ordinary: initial.ordinary + impact.ordinary,
        holiday: initial.holiday + impact.holiday,
        leave: initial.leave + impact.leave,
      };
      return {
        id: record.id,
        data,
        initialBalances: initial,
        impact,
        finalBalances,
      };
    },
    [],
  );

  const getProcessedAnnualDataForEmployee = useCallback(
    async (employeeId: string, year: number) => {
      const annualData = sortWeeks(dbState.weeklyRecords)
        .filter((record) => record.id.startsWith(String(year)))
        .map((record) => buildWeeklyRecordWithBalances(record, employeeId))
        .filter((item): item is WeeklyRecordWithBalances => Boolean(item));
      return { annualData };
    },
    [dbState.weeklyRecords, buildWeeklyRecordWithBalances],
  );

  const getProcessedAnnualDataForAllYears = useCallback(
    async (employeeId: string) => {
      const grouped: Record<number, WeeklyRecordWithBalances[]> = {};
      for (const record of dbState.weeklyRecords) {
        const year = Number(record.id.slice(0, 4));
        const data = buildWeeklyRecordWithBalances(record, employeeId);
        if (!data) continue;
        if (!grouped[year]) {
          grouped[year] = [];
        }
        grouped[year].push(data);
      }
      const result: Record<
        number,
        { annualData: WeeklyRecordWithBalances[]; annualComputedHours: number; theoreticalAnnualWorkHours: number }
      > = {};
      for (const [yearString, data] of Object.entries(grouped)) {
        const year = Number(yearString);
        result[year] = {
          annualData: data,
          annualComputedHours: calculateCurrentAnnualComputedHours(employeeId, year),
          theoreticalAnnualWorkHours: calculateTheoreticalAnnualWorkHours(employeeId, year).theoreticalHours,
        };
      }
      return result;
    },
    [
      dbState.weeklyRecords,
      buildWeeklyRecordWithBalances,
      calculateCurrentAnnualComputedHours,
      calculateTheoreticalAnnualWorkHours,
    ],
  );

  const createAbsenceType = useCallback(
    async (data: Omit<AbsenceType, 'id'>) => {
      const id = crypto.randomUUID();
      updateState((draft) => {
        draft.absenceTypes.push({ ...data, id });
      });
      return id;
    },
    [updateState],
  );

  const updateAbsenceType = useCallback(
    async (id: string, data: Partial<Omit<AbsenceType, 'id'>>) => {
      updateState((draft) => {
        const target = draft.absenceTypes.find((item) => item.id === id);
        if (target) {
          Object.assign(target, data);
        }
      });
    },
    [updateState],
  );

  const deleteAbsenceType = useCallback(
    async (id: string) => {
      updateState((draft) => {
        draft.absenceTypes = draft.absenceTypes.filter((item) => item.id !== id);
      });
    },
    [updateState],
  );

  const createHoliday = useCallback(
    async (data: Omit<Holiday, 'id' | 'date'> & { date: string }) => {
      const id = data.date;
      updateState((draft) => {
        const existing = draft.holidays.find((item) => item.id === id);
        const payload: Holiday = { id, name: data.name, type: data.type, date: data.date };
        if (existing) {
          Object.assign(existing, payload);
        } else {
          draft.holidays.push(payload);
        }
      });
      return id;
    },
    [updateState],
  );

  const updateHoliday = useCallback(
    async (id: string, data: HolidayFormData) => {
      updateState((draft) => {
        const target = draft.holidays.find((item) => item.id === id);
        if (target) {
          Object.assign(target, data, { date: data.date ?? target.date });
        }
      });
    },
    [updateState],
  );

  const deleteHoliday = useCallback(
    async (id: string) => {
      updateState((draft) => {
        draft.holidays = draft.holidays.filter((item) => item.id !== id);
      });
    },
    [updateState],
  );

  const createAnnualConfig = useCallback(
    async (data: Omit<AnnualConfiguration, 'id'>) => {
      const id = String(data.year);
      updateState((draft) => {
        const existing = draft.annualConfigurations.find((item) => item.year === data.year);
        if (existing) {
          Object.assign(existing, data, { id });
        } else {
          draft.annualConfigurations.push({ ...data, id });
        }
      });
      return id;
    },
    [updateState],
  );

  const updateAnnualConfig = useCallback(
    async (id: string, data: Partial<Omit<AnnualConfiguration, 'id'>>) => {
      updateState((draft) => {
        const target = draft.annualConfigurations.find((item) => item.id === id);
        if (target) {
          Object.assign(target, data);
        }
      });
    },
    [updateState],
  );

  const deleteAnnualConfig = useCallback(
    async (id: string) => {
      updateState((draft) => {
        draft.annualConfigurations = draft.annualConfigurations.filter((item) => item.id !== id);
      });
    },
    [updateState],
  );

  const createContractType = useCallback(
    async (data: Omit<ContractType, 'id'>) => {
      const id = crypto.randomUUID();
      updateState((draft) => {
        draft.contractTypes.push({ ...data, id });
      });
      return id;
    },
    [updateState],
  );

  const updateContractType = useCallback(
    async (id: string, data: Partial<Omit<ContractType, 'id'>>) => {
      updateState((draft) => {
        const target = draft.contractTypes.find((item) => item.id === id);
        if (target) {
          Object.assign(target, data);
        }
      });
    },
    [updateState],
  );

  const deleteContractType = useCallback(
    async (id: string) => {
      updateState((draft) => {
        draft.contractTypes = draft.contractTypes.filter((item) => item.id !== id);
      });
    },
    [updateState],
  );

  const updateEmployeeWorkHours = useCallback(
    async (employeeId: string, employee: Employee, weeklyHours: number, effectiveDate: string) => {
      updateState((draft) => {
        const target = draft.employees.find((item) => item.id === employeeId);
        if (!target) return;
        const period = target.employmentPeriods.find((p) => p.id === employee.employmentPeriods[0]?.id);
        if (!period) return;
        if (!period.workHoursHistory) {
          period.workHoursHistory = [];
        }
        period.workHoursHistory.push({ effectiveDate, weeklyHours });
      });
    },
    [updateState],
  );

  const processEmployeeWeekData = useCallback(
    (emp: Employee, weekDays: Date[], weekId: string) => {
      const record = weeklyRecordMap[weekId];
      if (!record) return null;
      return record.weekData[emp.id] ?? null;
    },
    [weeklyRecordMap],
  );

  const calculateEmployeeVacations = useCallback(
    (emp: Employee | null, year = new Date().getFullYear()) => {
      if (!emp) {
        return {
          vacationDaysTaken: 0,
          suspensionDays: 0,
          vacationDaysAvailable: 0,
          baseDays: 0,
          carryOverDays: 0,
          suspensionDeduction: 0,
          proratedDays: 0,
        };
      }
      const period = emp.employmentPeriods.find((p) => safeParseDate(p.startDate)?.getFullYear() === year);
      const baseDays = period?.vacationDays2024 ?? 30;
      return {
        vacationDaysTaken: 0,
        suspensionDays: 0,
        vacationDaysAvailable: baseDays,
        baseDays,
        carryOverDays: 0,
        suspensionDeduction: 0,
        proratedDays: baseDays,
      };
    },
    [],
  );

  const calculateSeasonalVacationStatus = useCallback(
    (employeeId: string) => {
      const employee = getEmployeeById(employeeId);
      return {
        employeeName: employee?.name ?? 'Desconocido',
        winterDaysTaken: 0,
        summerDaysTaken: 0,
        winterDaysRemaining: 0,
        summerDaysRemaining: 0,
      };
    },
    [getEmployeeById],
  );

  const createConversation = useCallback(
    async (employeeId: string, employeeName: string) => {
      updateState((draft) => {
        draft.conversations.push({
          id: crypto.randomUUID(),
          employeeId,
          employeeName,
          lastMessageText: 'Conversación creada',
          lastMessageTimestamp: new Date().toISOString(),
          readBy: [],
          unreadByEmployee: false,
        });
      });
    },
    [updateState],
  );

  const addHolidayEmployee = useCallback(
    async (data: Partial<Omit<HolidayEmployee, 'id'>>) => {
      const id = data.id ?? crypto.randomUUID();
      updateState((draft) => {
        const existing = draft.holidayEmployees.find((item) => item.id === id);
        const payload: HolidayEmployee = {
          id,
          name: data.name ?? 'Nuevo empleado',
          active: data.active ?? true,
          groupId: data.groupId ?? null,
          workShift: data.workShift ?? null,
          employeeNumber: data.employeeNumber ?? null,
        };
        if (existing) {
          Object.assign(existing, payload);
        } else {
          draft.holidayEmployees.push(payload);
        }
      });
      return id;
    },
    [updateState],
  );

  const updateHolidayEmployee = useCallback(
    async (id: string, data: Partial<Omit<HolidayEmployee, 'id'>>) => {
      updateState((draft) => {
        const target = draft.holidayEmployees.find((item) => item.id === id);
        if (target) {
          Object.assign(target, data);
        }
      });
    },
    [updateState],
  );

  const deleteHolidayEmployee = useCallback(
    async (id: string) => {
      updateState((draft) => {
        draft.holidayEmployees = draft.holidayEmployees.filter((item) => item.id !== id);
      });
    },
    [updateState],
  );

  const addHolidayReport = useCallback(
    async (report: Omit<HolidayReport, 'id'>) => {
      const id = `${report.weekId}_${report.employeeId}`;
      updateState((draft) => {
        const payload: HolidayReport = {
          ...report,
          id,
          weekDate: report.weekDate ?? new Date().toISOString(),
        };
        const existing = draft.holidayReports.find((item) => item.id === id);
        if (existing) {
          Object.assign(existing, payload);
        } else {
          draft.holidayReports.push(payload);
        }
      });
    },
    [updateState],
  );

  const updateHolidayReport = useCallback(
    async (reportId: string, data: Partial<Omit<HolidayReport, 'id'>>) => {
      updateState((draft) => {
        const target = draft.holidayReports.find((item) => item.id === reportId);
        if (target) {
          Object.assign(target, data);
        }
      });
    },
    [updateState],
  );

  const deleteHolidayReport = useCallback(
    async (reportId: string) => {
      updateState((draft) => {
        draft.holidayReports = draft.holidayReports.filter((item) => item.id !== reportId);
      });
    },
    [updateState],
  );

  const createEmployeeGroup = useCallback(
    async (data: Omit<EmployeeGroup, 'id'>) => {
      const id = crypto.randomUUID();
      updateState((draft) => {
        draft.employeeGroups.push({ ...data, id });
      });
      return id;
    },
    [updateState],
  );

  const updateEmployeeGroup = useCallback(
    async (id: string, data: Partial<Omit<EmployeeGroup, 'id'>>) => {
      updateState((draft) => {
        const target = draft.employeeGroups.find((item) => item.id === id);
        if (target) {
          Object.assign(target, data);
        }
      });
    },
    [updateState],
  );

  const deleteEmployeeGroup = useCallback(
    async (id: string) => {
      updateState((draft) => {
        draft.employeeGroups = draft.employeeGroups.filter((item) => item.id !== id);
      });
    },
    [updateState],
  );

  const updateEmployeeGroupOrder = useCallback(
    async (groups: EmployeeGroup[]) => {
      updateState((draft) => {
        draft.employeeGroups = groups.map((group, index) => ({ ...group, order: index }));
      });
    },
    [updateState],
  );

  const createVacationCampaign = useCallback(
    async (data: Omit<VacationCampaign, 'id'>) => {
      const id = crypto.randomUUID();
      updateState((draft) => {
        draft.vacationCampaigns.push({ ...data, id });
      });
      return id;
    },
    [updateState],
  );

  const updateVacationCampaign = useCallback(
    async (id: string, data: Partial<Omit<VacationCampaign, 'id'>>) => {
      updateState((draft) => {
        const target = draft.vacationCampaigns.find((item) => item.id === id);
        if (target) {
          Object.assign(target, data);
        }
      });
    },
    [updateState],
  );

  const deleteVacationCampaign = useCallback(
    async (id: string) => {
      updateState((draft) => {
        draft.vacationCampaigns = draft.vacationCampaigns.filter((item) => item.id !== id);
      });
    },
    [updateState],
  );

  const findNextUnconfirmedWeek = useCallback(
    (startDate: Date) => {
      const sorted = sortWeeks(dbState.weeklyRecords);
      for (const record of sorted) {
        if (record.id < getWeekId(startDate)) continue;
        const hasUnconfirmed = Object.values(record.weekData).some((data) => !(data as DailyEmployeeData).confirmed);
        if (hasUnconfirmed) {
          return record.id;
        }
      }
      return null;
    },
    [dbState.weeklyRecords, getWeekId],
  );

  const refreshData = useCallback(() => {
    setDbState(loadLocalDatabase());
  }, []);

  const refreshUsers = useCallback(async () => {
    setDbState((current) => {
      const next = loadLocalDatabase();
      return { ...next, weeklyRecords: current.weeklyRecords };
    });
  }, []);

  const availableYears = useMemo(
    () => Array.from(new Set(dbState.weeklyRecords.map((record) => Number(record.id.slice(0, 4))))).sort(),
    [dbState.weeklyRecords],
  );

  const pendingCorrectionRequestCount = dbState.correctionRequests.length;
  const currentUserId = dbState.users[0]?.id ?? 'local-admin';
  const unreadMessageCount = dbState.conversations.filter(
    (conversation) => !conversation.readBy?.includes(currentUserId),
  ).length;

  const employeeRecord = useMemo(() => (dbState.users[0]?.employeeId ? getEmployeeById(dbState.users[0].employeeId) ?? null : null), [
    dbState.users,
    getEmployeeById,
  ]);

  const value = useMemo<DataContextType>(() => ({
    employees: dbState.employees,
    holidays: dbState.holidays,
    absenceTypes: dbState.absenceTypes,
    contractTypes: dbState.contractTypes,
    annualConfigs: dbState.annualConfigurations,
    weeklyRecords: weeklyRecordMap,
    users: dbState.users,
    employeeRecord,
    holidayEmployees: dbState.holidayEmployees,
    holidayReports: dbState.holidayReports,
    employeeGroups: dbState.employeeGroups,
    conversations: dbState.conversations,
    vacationCampaigns: dbState.vacationCampaigns,
    correctionRequests: dbState.correctionRequests,
    unconfirmedWeeksDetails: [],
    appConfig: dbState.appConfig,
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
    createAbsenceType,
    updateAbsenceType,
    deleteAbsenceType,
    createHoliday,
    updateHoliday,
    deleteHoliday,
    createAnnualConfig,
    updateAnnualConfig,
    deleteAnnualConfig,
    createContractType,
    updateContractType,
    deleteContractType,
    updateEmployeeWorkHours,
    getWeekId,
    processEmployeeWeekData,
    calculateEmployeeVacations,
    calculateSeasonalVacationStatus,
    createConversation,
    addHolidayEmployee,
    updateHolidayEmployee,
    deleteHolidayEmployee,
    addHolidayReport,
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
    databaseConfigured: true,
  }), [
    dbState,
    weeklyRecordMap,
    employeeRecord,
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
    createAbsenceType,
    updateAbsenceType,
    deleteAbsenceType,
    createHoliday,
    updateHoliday,
    deleteHoliday,
    createAnnualConfig,
    updateAnnualConfig,
    deleteAnnualConfig,
    createContractType,
    updateContractType,
    deleteContractType,
    updateEmployeeWorkHours,
    getWeekId,
    processEmployeeWeekData,
    calculateEmployeeVacations,
    calculateSeasonalVacationStatus,
    createConversation,
    addHolidayEmployee,
    updateHolidayEmployee,
    deleteHolidayEmployee,
    addHolidayReport,
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
  ]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useDataProvider = () => useContext(DataContext);
