'use client';

import { createContext, useContext, useMemo, ReactNode } from 'react';
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
  HolidayEmployee,
  HolidayReport,
  EmployeeGroup,
  Conversation,
  VacationCampaign,
  CorrectionRequest,
} from '@/lib/types';

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
  ) => any;
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
  ) => Promise<Record<number, { annualData: WeeklyRecordWithBalances[]; annualComputedHours: number; theoreticalAnnualWorkHours: number }>>;
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
  processEmployeeWeekData: (emp: Employee, weekDays: Date[], weekId: string) => DailyEmployeeData | null;
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
  loading: false,
  unreadMessageCount: 0,
  pendingCorrectionRequestCount: 0,
  refreshData: () => {
    console.warn('[data-provider] No hay base de datos configurada. Implementa un adaptador personalizado para cargar datos reales.');
  },
  refreshUsers: async () => {
    console.warn('[data-provider] refreshUsers requiere una base de datos configurada.');
  },
  getEmployeeById: () => undefined,
  getActivePeriod: () => null,
  getEffectiveWeeklyHours: () => 0,
  getActiveEmployeesForDate: () => [],
  getEmployeeBalancesForWeek: () => ({ ordinary: 0, holiday: 0, leave: 0, total: 0 }),
  getEmployeeFinalBalances: () => ({ ordinary: 0, holiday: 0, leave: 0, total: 0 }),
  getTheoreticalHoursAndTurn: () => ({ turnId: null, weekDaysWithTheoreticalHours: [] }),
  calculateBalancePreview: () => null,
  calculateCurrentAnnualComputedHours: () => 0,
  calculateTheoreticalAnnualWorkHours: () => ({
    theoreticalHours: 0,
    baseTheoreticalHours: 0,
    suspensionDetails: [],
    workHoursChangeDetails: [],
  }),
  getProcessedAnnualDataForEmployee: async () => ({ annualData: [] }),
  getProcessedAnnualDataForAllYears: async () => ({}),
  createAbsenceType: async () => {
    throw new Error('Configura un adaptador de base de datos antes de crear tipos de ausencia.');
  },
  updateAbsenceType: async () => {
    throw new Error('Configura un adaptador de base de datos antes de actualizar tipos de ausencia.');
  },
  deleteAbsenceType: async () => {
    throw new Error('Configura un adaptador de base de datos antes de eliminar tipos de ausencia.');
  },
  createHoliday: async () => {
    throw new Error('Configura un adaptador de base de datos antes de crear festivos.');
  },
  updateHoliday: async () => {
    throw new Error('Configura un adaptador de base de datos antes de actualizar festivos.');
  },
  deleteHoliday: async () => {
    throw new Error('Configura un adaptador de base de datos antes de eliminar festivos.');
  },
  createAnnualConfig: async () => {
    throw new Error('Configura un adaptador de base de datos antes de crear configuraciones anuales.');
  },
  updateAnnualConfig: async () => {
    throw new Error('Configura un adaptador de base de datos antes de actualizar configuraciones anuales.');
  },
  deleteAnnualConfig: async () => {
    throw new Error('Configura un adaptador de base de datos antes de eliminar configuraciones anuales.');
  },
  createContractType: async () => {
    throw new Error('Configura un adaptador de base de datos antes de crear tipos de contrato.');
  },
  updateContractType: async () => {
    throw new Error('Configura un adaptador de base de datos antes de actualizar tipos de contrato.');
  },
  deleteContractType: async () => {
    throw new Error('Configura un adaptador de base de datos antes de eliminar tipos de contrato.');
  },
  updateEmployeeWorkHours: async () => {
    throw new Error('Configura un adaptador de base de datos antes de actualizar horas laborales.');
  },
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
  createConversation: async () => {
    throw new Error('Configura un adaptador de base de datos antes de crear conversaciones.');
  },
  addHolidayEmployee: async () => {
    throw new Error('Configura un adaptador de base de datos antes de crear personal de vacaciones.');
  },
  updateHolidayEmployee: async () => {
    throw new Error('Configura un adaptador de base de datos antes de actualizar personal de vacaciones.');
  },
  deleteHolidayEmployee: async () => {
    throw new Error('Configura un adaptador de base de datos antes de eliminar personal de vacaciones.');
  },
  addHolidayReport: async () => {
    throw new Error('Configura un adaptador de base de datos antes de registrar reportes de vacaciones.');
  },
  updateHolidayReport: async () => {
    throw new Error('Configura un adaptador de base de datos antes de actualizar reportes de vacaciones.');
  },
  deleteHolidayReport: async () => {
    throw new Error('Configura un adaptador de base de datos antes de eliminar reportes de vacaciones.');
  },
  createEmployeeGroup: async () => {
    throw new Error('Configura un adaptador de base de datos antes de crear grupos de empleados.');
  },
  updateEmployeeGroup: async () => {
    throw new Error('Configura un adaptador de base de datos antes de actualizar grupos de empleados.');
  },
  deleteEmployeeGroup: async () => {
    throw new Error('Configura un adaptador de base de datos antes de eliminar grupos de empleados.');
  },
  updateEmployeeGroupOrder: async () => {
    throw new Error('Configura un adaptador de base de datos antes de reordenar grupos de empleados.');
  },
  createVacationCampaign: async () => {
    throw new Error('Configura un adaptador de base de datos antes de crear campañas de vacaciones.');
  },
  updateVacationCampaign: async () => {
    throw new Error('Configura un adaptador de base de datos antes de actualizar campañas de vacaciones.');
  },
  deleteVacationCampaign: async () => {
    throw new Error('Configura un adaptador de base de datos antes de eliminar campañas de vacaciones.');
  },
  findNextUnconfirmedWeek: () => null,
  availableYears: [],
  databaseConfigured: false,
};

const DataContext = createContext<DataContextType>(defaultValue);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const value = useMemo(() => defaultValue, []);
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useDataProvider = () => useContext(DataContext);
