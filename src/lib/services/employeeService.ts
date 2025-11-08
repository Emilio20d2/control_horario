import type { Employee, EmployeeFormData, DailyData } from '../types';

const notConfiguredError = (operation: string) =>
  new Error(`Configura un adaptador de base de datos para usar employeeService.${operation}.`);

export const createEmployee = async (_formData: EmployeeFormData): Promise<string> => {
  throw notConfiguredError('createEmployee');
};

export const updateEmployee = async (
  _id: string,
  _currentEmployee: Employee,
  _formData: EmployeeFormData,
  _finalBalances: { ordinary: number; holiday: number; leave: number; total: number },
): Promise<void> => {
  throw notConfiguredError('updateEmployee');
};

export const addEmploymentPeriod = async (
  _employeeId: string,
  _currentEmployee: Employee,
  _formData: Omit<EmployeeFormData, 'name'>,
): Promise<void> => {
  throw notConfiguredError('addEmploymentPeriod');
};

export const updateEmployeeWorkHours = async (
  _employeeId: string,
  _employee: Employee,
  _weeklyHours: number,
  _effectiveDate: string,
): Promise<void> => {
  throw notConfiguredError('updateEmployeeWorkHours');
};

export const deleteEmployee = async (_id: string): Promise<void> => {
  throw notConfiguredError('deleteEmployee');
};

export const endIndefiniteAbsence = async (
  _employeeId: string,
  _dayOfInterruption: Date,
  _dayData: DailyData,
): Promise<boolean> => {
  throw notConfiguredError('endIndefiniteAbsence');
};

export const addScheduledAbsence = async (
  _employeeId: string,
  _periodId: string,
  _absence: any,
): Promise<void> => {
  throw notConfiguredError('addScheduledAbsence');
};

export const updateScheduledAbsence = async (
  _employeeId: string,
  _periodId: string,
  _absenceId: string,
  _updatedAbsence: any,
): Promise<void> => {
  throw notConfiguredError('updateScheduledAbsence');
};

export const deleteScheduledAbsence = async (
  _employeeId: string,
  _periodId: string,
  _absenceId: string,
): Promise<void> => {
  throw notConfiguredError('deleteScheduledAbsence');
};

export const hardDeleteScheduledAbsence = async (
  _employeeId: string,
  _periodId: string,
  _absenceId: string,
): Promise<void> => {
  throw notConfiguredError('hardDeleteScheduledAbsence');
};
