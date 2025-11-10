import type { AppUser } from '../types';
import { loadLocalDatabase, type LocalDatabaseState } from '../local-data';
import { getUniversalAdminCredentials, getUniversalUserPassword } from './config';

export interface LocalAuthOptions {
  loadDatabase?: () => LocalDatabaseState;
}

export interface LocalAuthResult {
  success: boolean;
  user?: AppUser;
  error?: string;
  isUniversalAdmin?: boolean;
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const buildUniversalAdminUser = (): AppUser => {
  const universalAdmin = getUniversalAdminCredentials();
  return {
    id: 'local-admin',
    email: universalAdmin.email,
    employeeId: null,
    role: 'admin',
    trueRole: 'admin',
  } satisfies AppUser;
};

export const authenticateWithLocalProvider = (
  email: string,
  password: string,
  options?: LocalAuthOptions,
): LocalAuthResult => {
  const loader = options?.loadDatabase ?? loadLocalDatabase;
  const database = loader();
  const universalAdmin = getUniversalAdminCredentials();
  const universalUserPassword = getUniversalUserPassword();

  const normalizedEmail = normalizeEmail(email);
  const matchedUser = database.users.find((item) => normalizeEmail(item.email ?? '') === normalizedEmail) ?? null;

  const isUniversalAdmin = normalizedEmail === universalAdmin.normalizedEmail;
  const expectedPassword = isUniversalAdmin ? universalAdmin.password : universalUserPassword;

  if (!matchedUser && !isUniversalAdmin) {
    return {
      success: false,
      error: 'No existe ningún usuario registrado con ese correo. Solicita acceso al administrador.',
    };
  }

  if (password !== expectedPassword) {
    return {
      success: false,
      error: 'Contraseña no válida. Actualiza la configuración predeterminada o integra tu proveedor de autenticación.',
    };
  }

  const user = matchedUser ?? buildUniversalAdminUser();

  return {
    success: true,
    user,
    isUniversalAdmin,
  };
};

export interface LocalAuthAuditReport {
  emailTested: string;
  success: boolean;
  userRole?: string | null;
  issues: string[];
}

export const runLocalAuthAudit = (
  email: string,
  password: string,
  options?: LocalAuthOptions,
): LocalAuthAuditReport => {
  const issues: string[] = [];
  const result = authenticateWithLocalProvider(email, password, options);

  if (!result.success) {
    issues.push(result.error ?? 'Error desconocido en la autenticación local.');
  }

  return {
    emailTested: email,
    success: result.success,
    userRole: result.user?.role ?? null,
    issues,
  };
};
