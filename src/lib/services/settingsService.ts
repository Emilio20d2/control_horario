import type {
  AbsenceType,
  Holiday,
  AnnualConfiguration,
  ContractType,
  HolidayFormData,
  HolidayEmployee,
  EmployeeGroup,
  VacationCampaign,
  HolidayReport,
  Employee,
} from '../types';
import {
  addDocument,
  updateDocument,
  deleteDocument,
  setDocument,
  getDocumentById,
} from './firestoreService';

const generateId = () => {
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const normalizeDateInput = (value: string | Date): string => {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return new Date(value).toISOString();
};

export const createAbsenceType = async (data: Omit<AbsenceType, 'id'>): Promise<string> => {
  const result = await addDocument('absenceTypes', {
    ...data,
    abbreviation: data.abbreviation || data.name.substring(0, 3).toUpperCase(),
  });
  return result.id;
};

export const updateAbsenceType = async (id: string, data: Partial<Omit<AbsenceType, 'id'>>): Promise<void> => {
  await updateDocument('absenceTypes', id, data);
};

export const deleteAbsenceType = async (id: string): Promise<void> => {
  await deleteDocument('absenceTypes', id);
};

export const createHoliday = async (
  data: Omit<Holiday, 'id' | 'date'> & { date: string },
): Promise<string> => {
  const docId = data.date;
  await setDocument(
    'holidays',
    docId,
    {
      name: data.name,
      type: data.type,
      date: normalizeDateInput(data.date),
    },
    { merge: true },
  );
  return docId;
};

export const updateHoliday = async (id: string, data: Partial<HolidayFormData>): Promise<void> => {
  const { date: _date, ...rest } = data;
  await updateDocument('holidays', id, rest);
};

export const deleteHoliday = async (id: string): Promise<void> => {
  await deleteDocument('holidays', id);
};

export const createAnnualConfig = async (data: Omit<AnnualConfiguration, 'id'>): Promise<string> => {
  const docId = String(data.year);
  await setDocument('annualConfigurations', docId, data, { merge: true });
  return docId;
};

export const updateAnnualConfig = async (
  id: string,
  data: Partial<Omit<AnnualConfiguration, 'id'>>,
): Promise<void> => {
  await updateDocument('annualConfigurations', id, data);
};

export const deleteAnnualConfig = async (id: string): Promise<void> => {
  await deleteDocument('annualConfigurations', id);
};

export const createContractType = async (data: Omit<ContractType, 'id'>): Promise<string> => {
  const result = await addDocument('contractTypes', data);
  return result.id;
};

export const updateContractType = async (
  id: string,
  data: Partial<Omit<ContractType, 'id'>>,
): Promise<void> => {
  await updateDocument('contractTypes', id, data);
};

export const deleteContractType = async (id: string): Promise<void> => {
  await deleteDocument('contractTypes', id);
};

export const addHolidayEmployee = async (
  data: Partial<Omit<HolidayEmployee, 'id'>> & { id?: string },
): Promise<string> => {
  const { id, ...rest } = data;
  const targetId = id ?? generateId();
  await setDocument(
    'holidayEmployees',
    targetId,
    {
      name: rest.name,
      active: rest.active ?? true,
      groupId: rest.groupId ?? null,
      workShift: rest.workShift ?? null,
      employeeNumber: rest.employeeNumber ?? null,
    },
    { merge: true },
  );
  return targetId;
};

export const updateHolidayEmployee = async (
  id: string,
  data: Partial<Omit<HolidayEmployee, 'id'>>,
): Promise<void> => {
  const sanitizedData: Partial<Omit<HolidayEmployee, 'id'>> = {
    ...data,
    groupId: data.groupId ?? null,
    workShift: data.workShift ?? null,
  };
  await updateDocument('holidayEmployees', id, sanitizedData);
};

export const deleteHolidayEmployee = async (id: string): Promise<void> => {
  await deleteDocument('holidayEmployees', id);
};

export const setAllHolidayEmployeesActiveStatus = async (
  employees: (Employee & { isEventual: boolean })[],
  activeState: boolean,
) => {
  for (const employee of employees) {
    await setDocument(
      'holidayEmployees',
      employee.id,
      {
        name: employee.name,
        active: activeState,
      },
      { merge: true },
    );
  }
};

export const seedHolidayEmployees = async (employeeNames: string[]): Promise<void> => {
  for (const name of employeeNames) {
    await addDocument('holidayEmployees', { name, active: true });
  }
};

export const addHolidayReport = async (
  report: Partial<Omit<HolidayReport, 'id'>> & { id?: string },
): Promise<void> => {
  const docId = report.id ?? `${report.weekId}_${report.employeeId}`;
  await setDocument(
    'holidayReports',
    docId,
    {
      weekId: report.weekId,
      weekDate: report.weekDate ? normalizeDateInput(report.weekDate) : null,
      employeeId: report.employeeId,
      substituteId: report.substituteId ?? null,
      substituteName: report.substituteName ?? null,
    },
    { merge: true },
  );
};

export const updateHolidayReport = async (
  reportId: string,
  data: Partial<Omit<HolidayReport, 'id'>>,
): Promise<void> => {
  await updateDocument('holidayReports', reportId, data);
};

export const deleteHolidayReport = async (reportId: string): Promise<void> => {
  await deleteDocument('holidayReports', reportId);
};

export const createEmployeeGroup = async (data: Omit<EmployeeGroup, 'id'>): Promise<string> => {
  const result = await addDocument('employeeGroups', data);
  return result.id;
};

export const updateEmployeeGroup = async (
  id: string,
  data: Partial<Omit<EmployeeGroup, 'id'>>,
): Promise<void> => {
  await updateDocument('employeeGroups', id, data);
};

export const deleteEmployeeGroup = async (id: string): Promise<void> => {
  await deleteDocument('employeeGroups', id);
};

export const updateEmployeeGroupOrder = async (groups: EmployeeGroup[]): Promise<void> => {
  for (const group of groups) {
    await setDocument('employeeGroups', group.id, { order: group.order }, { merge: true });
  }
};

export const createVacationCampaign = async (data: Omit<VacationCampaign, 'id'>): Promise<string> => {
  const result = await addDocument('vacationCampaigns', {
    ...data,
    submissionStartDate: normalizeDateInput(data.submissionStartDate),
    submissionEndDate: normalizeDateInput(data.submissionEndDate),
  });
  return result.id;
};

export const updateVacationCampaign = async (
  id: string,
  data: Partial<Omit<VacationCampaign, 'id'>>,
): Promise<void> => {
  const normalized = { ...data } as Partial<VacationCampaign>;
  if (normalized.submissionStartDate) {
    normalized.submissionStartDate = normalizeDateInput(normalized.submissionStartDate as any) as any;
  }
  if (normalized.submissionEndDate) {
    normalized.submissionEndDate = normalizeDateInput(normalized.submissionEndDate as any) as any;
  }
  await updateDocument('vacationCampaigns', id, normalized);
};

export const deleteVacationCampaign = async (id: string): Promise<void> => {
  await deleteDocument('vacationCampaigns', id);
};

export const getHolidayById = async (id: string): Promise<Holiday | null> => {
  return getDocumentById<Holiday>('holidays', id);
};
