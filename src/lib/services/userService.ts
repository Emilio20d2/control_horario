'use server';

export interface AppUser {
  id: string;
  email: string;
  employeeId: string;
  role: 'admin' | 'employee';
}

export interface CreateUserPayload {
  email: string;
  password: string;
  employeeId: string;
}

const notConfigured = (operation: string) =>
  new Error(`Configura un proveedor de autenticación para habilitar userService.${operation}.`);

export const createUser = async (_payload: CreateUserPayload) => {
  return { success: false, error: notConfigured('createUser').message };
};

export const deleteUser = async (_uid: string) => {
  throw notConfigured('deleteUser');
};

export const updateDocument = async (_collectionName: string, _docId: string, _data: any): Promise<void> => {
  throw notConfigured('updateDocument');
};

export const setDocument = async (
  _collectionName: string,
  _docId: string,
  _data: any,
  _options: { merge?: boolean } = {},
): Promise<void> => {
  throw notConfigured('setDocument');
};
