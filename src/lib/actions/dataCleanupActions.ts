'use server';

export async function clearAllCheckmarks() {
  return {
    success: false,
    error: 'Configura un adaptador de base de datos antes de ejecutar limpiezas masivas.',
  };
}

export async function resolveCorrectionRequest(_requestId: string) {
  return {
    success: false,
    error: 'Configura un adaptador de base de datos antes de gestionar solicitudes de corrección.',
  };
}
