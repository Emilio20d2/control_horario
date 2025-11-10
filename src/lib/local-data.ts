import type {
  AbsenceType,
  AnnualConfiguration,
  AppUser,
  ContractType,
  Conversation,
  CorrectionRequest,
  DailyEmployeeData,
  DailyData,
  Employee,
  EmployeeGroup,
  Holiday,
  HolidayEmployee,
  HolidayReport,
  VacationCampaign,
  WeeklyRecord,
} from './types';

export type LocalDatabaseState = {
  employees: Employee[];
  holidays: Holiday[];
  absenceTypes: AbsenceType[];
  contractTypes: ContractType[];
  annualConfigurations: AnnualConfiguration[];
  weeklyRecords: WeeklyRecord[];
  users: AppUser[];
  holidayEmployees: HolidayEmployee[];
  holidayReports: HolidayReport[];
  employeeGroups: EmployeeGroup[];
  conversations: Conversation[];
  vacationCampaigns: VacationCampaign[];
  correctionRequests: CorrectionRequest[];
  appConfig: { isEmployeeViewEnabled?: boolean };
};

export const LOCAL_DATABASE_STORAGE_KEY = 'control-horario:local-db';

const sampleDailyData = (): DailyData => ({
  theoreticalHours: 8,
  workedHours: 8,
  absence: 'ninguna',
  absenceHours: 0,
  leaveHours: 0,
  doublePay: false,
  isHoliday: false,
  holidayType: null,
});

const createWeekRecord = (id: string, employeeIds: string[]): WeeklyRecord => ({
  id,
  weekData: employeeIds.reduce(
    (acc, employeeId) => {
      acc[employeeId] = {
        days: {
          [id]: sampleDailyData(),
        },
        confirmed: true,
        totalComplementaryHours: 0,
        weeklyHoursOverride: null,
        previousBalances: {
          ordinary: 0,
          holiday: 0,
          leave: 0,
        },
        impact: {
          ordinary: 0,
          holiday: 0,
          leave: 0,
        },
        finalBalances: {
          ordinary: 0,
          holiday: 0,
          leave: 0,
        },
      } as DailyEmployeeData & { finalBalances: { ordinary: number; holiday: number; leave: number } };
      return acc;
    },
    {} as Record<string, DailyEmployeeData & { finalBalances: { ordinary: number; holiday: number; leave: number } }>,
  ),
});

export const DEFAULT_LOCAL_DATABASE: LocalDatabaseState = {
  employees: [
    {
      id: 'EMP-001',
      name: 'Administrador General',
      email: 'admin@example.com',
      role: 'admin',
      employmentPeriods: [
        {
          id: 'PERIOD-001',
          contractType: 'Tiempo completo',
          startDate: '2024-01-01',
          endDate: null,
          annualComputedHours: 0,
          initialOrdinaryHours: 0,
          initialHolidayHours: 0,
          initialLeaveHours: 0,
          vacationDays2024: 30,
          workHoursHistory: [
            { effectiveDate: '2024-01-01', weeklyHours: 40 },
          ],
        },
      ],
    },
  ],
  holidays: [
    {
      id: '2024-01-06',
      name: 'Día de Reyes',
      date: '2024-01-06',
      type: 'Regional',
    },
  ],
  absenceTypes: [
    {
      id: 'absence-vacaciones',
      name: 'Vacaciones',
      abbreviation: 'VAC',
      color: '#f97316',
      computesToWeeklyHours: true,
      computesToAnnualHours: true,
      suspendsContract: false,
      annualHourLimit: null,
      deductsHours: true,
      computesFullDay: true,
      affectedBag: 'ninguna',
      isAbsenceSplittable: true,
    },
    {
      id: 'absence-baja',
      name: 'Baja Médica',
      abbreviation: 'BAJ',
      color: '#ef4444',
      computesToWeeklyHours: false,
      computesToAnnualHours: false,
      suspendsContract: true,
      annualHourLimit: null,
      deductsHours: false,
      computesFullDay: false,
      affectedBag: 'ninguna',
      isAbsenceSplittable: false,
    },
  ],
  contractTypes: [
    {
      id: 'contract-fulltime',
      name: 'Tiempo completo',
      computesOrdinaryBag: true,
      computesHolidayBag: true,
      computesOffDayBag: true,
    },
    {
      id: 'contract-parttime',
      name: 'Tiempo parcial',
      computesOrdinaryBag: true,
      computesHolidayBag: false,
      computesOffDayBag: true,
    },
  ],
  annualConfigurations: [
    {
      id: '2025',
      year: 2025,
      maxAnnualHours: 1794,
      referenceWeeklyHours: 40,
    },
  ],
  weeklyRecords: [createWeekRecord('2025-01-01', ['EMP-001'])],
  users: [
    {
      id: 'local-admin',
      email: 'admin@example.com',
      employeeId: 'EMP-001',
      role: 'admin',
      trueRole: 'admin',
    },
  ],
  holidayEmployees: [],
  holidayReports: [],
  employeeGroups: [
    {
      id: 'default-group',
      name: 'Equipo General',
      description: 'Grupo inicial de demostración',
      order: 0,
    },
  ],
  conversations: [],
  vacationCampaigns: [],
  correctionRequests: [],
  appConfig: { isEmployeeViewEnabled: true },
};

export const loadLocalDatabase = (): LocalDatabaseState => {
  if (typeof window === 'undefined') {
    return DEFAULT_LOCAL_DATABASE;
  }

  try {
    const raw = window.localStorage.getItem(LOCAL_DATABASE_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(
        LOCAL_DATABASE_STORAGE_KEY,
        JSON.stringify(DEFAULT_LOCAL_DATABASE),
      );
      return DEFAULT_LOCAL_DATABASE;
    }
    const parsed = JSON.parse(raw) as LocalDatabaseState;
    return {
      ...DEFAULT_LOCAL_DATABASE,
      ...parsed,
    };
  } catch (error) {
    console.warn('[local-db] No se pudo leer la base de datos local, se usará el estado por defecto.', error);
    return DEFAULT_LOCAL_DATABASE;
  }
};

export const saveLocalDatabase = (state: LocalDatabaseState) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(LOCAL_DATABASE_STORAGE_KEY, JSON.stringify(state));
};

export const resetLocalDatabase = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(LOCAL_DATABASE_STORAGE_KEY);
  window.localStorage.setItem(
    LOCAL_DATABASE_STORAGE_KEY,
    JSON.stringify(DEFAULT_LOCAL_DATABASE),
  );
};
