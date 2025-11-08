'use server';

export async function migrateEmployeeDataToUsers() {
  return {
    success: false,
    error: 'Configura tu base de datos antes de ejecutar scripts de migración.',
  };
}
