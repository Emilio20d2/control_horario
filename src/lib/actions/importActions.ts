
'use server';

import * as fs from 'fs/promises';
import * as path from 'path';
import { seedDatabase } from '../services/seedService';


export async function processAndSeedData() {
  'use server';
  
  const jsonFilePath = path.join(process.cwd(), 'public', 'firestore_import_data.json');

  try {
    const fileContent = await fs.readFile(jsonFilePath, 'utf-8');
    if (!fileContent) {
        return { success: false, error: 'El archivo JSON está vacío o no se pudo leer.' };
    }
    const dataToImport = JSON.parse(fileContent);
    
    const stats = await seedDatabase(dataToImport);

    return { success: true, stats };
  } catch (error) {
    console.error("Error in processAndSeedData Server Action:", error);
     if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return { success: false, error: 'No se encontró el archivo `firestore_import_data.json` en la carpeta `public`. Ejecuta primero el script de importación.' };
    }
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido durante la importación.';
    return { success: false, error: errorMessage };
  }
}
