'use server';

export interface CreateUserPayload {
  email: string;
  password?: string;
  name?: string;
}

export const createUserAccount = async (_payload: CreateUserPayload) => {
  return { success: false, error: 'Integra tu proveedor de autenticación antes de crear cuentas.' };
};

export const sendPasswordResetEmail = async (_email: string) => {
  return {
    success: false,
    error: 'Integra tu proveedor de autenticación antes de enviar correos de recuperación.',
  };
};
