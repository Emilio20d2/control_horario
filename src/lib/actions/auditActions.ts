'use server';

export async function runRetroactiveAudit() {
  return {
    success: false,
    error: 'Configura un adaptador de base de datos antes de ejecutar la auditoría retroactiva.',
  };
}

export async function syncCorrectionRequestMessages() {
  return {
    success: false,
    error: 'Configura un adaptador de base de datos antes de sincronizar solicitudes de corrección.',
  };
}
