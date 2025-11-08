
'use server';

import * as fs from 'fs/promises';
import * as path from 'path';
import { seedDatabase } from '../services/seedService';
import type { Employee } from '../types';

export async function processAndSeedData() {
  'use server';
  
  const jsonFilePath = path.join(process.cwd(), 'public', 'seed_import_data.json');

  try {
    const fileContent = await fs.readFile(jsonFilePath, 'utf-8');
    if (!fileContent) {
        return { success: false, error: 'El archivo JSON está vacío o no se pudo leer.' };
    }
    const dataToImport = JSON.parse(fileContent);

    const employeeNumberMappingInput: Record<string, string> =
        typeof dataToImport.employeeNumberMapping === 'object' && dataToImport.employeeNumberMapping !== null
            ? dataToImport.employeeNumberMapping
            : {};
    const employeesToAddToEventual: Array<Pick<Employee, 'name' | 'employeeNumber' | 'active' | 'workShift'>> =
        Array.isArray(dataToImport.employeesToAddToEventual)
            ? (dataToImport.employeesToAddToEventual as Array<Pick<Employee, 'name' | 'employeeNumber' | 'active' | 'workShift'>>)
            : [];

    const employeeNumberMapping = Object.entries(employeeNumberMappingInput).reduce(
        (acc, [name, number]) => {
            acc[name.toUpperCase().trim()] = number;
            return acc;
        },
        {} as Record<string, string>
    );

    delete dataToImport.employeeNumberMapping;
    delete dataToImport.employeesToAddToEventual;

    // --- LOGIC TO ADD EMPLOYEE NUMBERS AND USE THEM AS IDs ---
    const originalEmployeesData = dataToImport.employees;
    const newEmployeesData: Record<string, Omit<Employee, 'id'>> = {};
    const employeesFoundInMapping = new Set<string>();

    for (const docId in originalEmployeesData) {
        const employee: Employee = originalEmployeesData[docId];
        const employeeNameUpper = employee.name.toUpperCase().trim();
        const employeeNumber: string | undefined = employeeNumberMapping[employeeNameUpper];

        if (employeeNumber) {
            employee.employeeNumber = employeeNumber;
            // Use employeeNumber as the key for the new data structure
            newEmployeesData[employeeNumber] = employee;
            employeesFoundInMapping.add(employeeNameUpper);
        } else {
            console.warn(`Warning: Employee number not found for ${employee.name}. This employee will be skipped.`);
        }
    }
    
    // Replace old employee data with the new ID-based structure
    dataToImport.employees = newEmployeesData;

    // --- REMAP WEEKLY RECORDS ---
    const originalWeeklyRecords = dataToImport.weeklyRecords;
    const weeklyRecordsList = [];

    for (const weekId in originalWeeklyRecords) {
        const weekData = originalWeeklyRecords[weekId].weekData;
        for (const oldEmployeeId in weekData) {
            const employeeName = originalEmployeesData[oldEmployeeId]?.name.toUpperCase().trim();
            if (employeeName) {
                const employeeNumber = employeeNumberMapping[employeeName];
                if (employeeNumber) {
                    const docId = `${weekId}-${employeeNumber}`;
                    const dataToSet = {
                        id: docId,
                        weekId: weekId,
                        employeeId: employeeNumber,
                        ...weekData[oldEmployeeId]
                    };
                    weeklyRecordsList.push(dataToSet);
                }
            }
        }
    }
    dataToImport.weeklyRecords = weeklyRecordsList;


    const normalizedEventualEmployees = employeesToAddToEventual.filter((employee) => {
        if (!employee?.employeeNumber || !employee?.name) {
            return false;
        }
        const normalizedName = employee.name.toUpperCase().trim();
        return !employeesFoundInMapping.has(normalizedName);
    });

    // Pass the modified data to the seed service
    const stats = await seedDatabase(dataToImport, normalizedEventualEmployees);

    return { success: true, stats };
  } catch (error) {
    console.error("Error in processAndSeedData Server Action:", error);
     if (error instanceof Error && 'code' in error && (error as any).code === 'ENOENT') {
        return { success: false, error: 'No se encontró el archivo `seed_import_data.json` en la carpeta `public`. Ejecuta primero el script de importación.' };
    }
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido durante la importación.';
    return { success: false, error: errorMessage };
  }
}

    