
'use server';

import * as fs from 'fs/promises';
import * as path from 'path';
import { seedDatabase } from '../services/seedService';
import type { Employee } from '../types';

const employeeNumberMapping: Record<string, string> = {
    'ALBA PIÑEIRO PEREZ': '361204',
    'ALBERTO BIEL GAUDES': '157207',
    'ALBERTO JAVIER MONDEJAR BELTRAN': '421807',
    'ALEJANDRO MAYORAL MORON': '295711',
    'ALEXIA BARRIO CARTAGENA': '542129',
    'ALVARO ECHEGOYEN DE GREGORIO ROCASOLA': '542046',
    'ANA GOMEZ ALAMAN': '142147',
    'ANA GRACIA SANCHEZ': '363991',
    'ANA MARIA IVANOV': '180935',
    'ANDREA MARIA BURILLO FRANCES': '84889',
    'ANDREA RUIZ GRACIA': '470355',
    'BEATRIZ PEREZ JULVE': '79753',
    'BERTA MERCEDES MORELLI DELGADO': '409261',
    'BRENDA CASTAN MARGALEJO': '88026',
    'CANDELA GIMENEZ BARCA': '408387',
    'CARMEN DOÑATE BANEGAS': '371177',
    'CAROLINA PEREZ SANCHEZ': '136213',
    'CELIA LAIRLA SAN JOSE': '343640',
    'CLEMENTE ALUNDA CAÑET': '458410',
    'CRISTINA UCHE CHAURE': '13884',
    'CRISTINA VIDAL CASTIELLO': '131951',
    'DIEGO MARIN HERNANDEZ': '540880',
    'ELISABETH GONZALEZ SERRANO': '59295',
    'EMILIO GOMEZ PARDO': '46319',
    'ESTIBALIZ MUÑOZ ALONSO': '15351',
    'EVA MARIA NUEZ SIERRA': '1449',
    'GABRIEL MARIN HERNANDEZ': '540876',
    'GABRIELA ALVAREZ MARTIN': '471918',
    'GEMA LAURA CALVO AINSA': '51614',
    'GEMMA RUIZ CEJUDO': '14736',
    'GUILLERMO BLANCO ALONSO': '430000',
    'GUILLERMO SORIA MODREGO': '524832',
    'IRIS GIMENEZ MUÑOZ': '172543',
    'IRIS MARTIN MATA': '438984',
    'ISABEL GARCIA TERES': '407853',
    'JAVIER CORTES REMACHA': '439331',
    'JESSICA LATORRE NAVARRO': '146999',
    'JOHANNA ANDREA PAUCAR LEONES': '179226',
    'JORGE GIL TELLO': '442690',
    'LAURA CASAS TURON': '14767',
    'LAURA DE DIEGO LATORRE': '531642',
    'LENA RODRIGUEZ MONTOYA': '339463',
    'LEYRE ORDOÑEZ VELASCO': '410359',
    'LORENA LOSTAO OLLES': '439383',
    'LORENA NAVARRO CASTELLOT': '185308',
    'LUCIA LAFUENTE GARCIA': '526942',
    'MARCOS GIUSEPPE LÓPEZ SAAVEDRA': '417089',
    'MARIA ANGELES IBUARBEN CATALAN': '179373',
    'MARIA ARANTXA GASCA JIMENEZ': '14798',
    'MARIA ARANZAZU VILLACAMPA-GINER GARCIA': '10535',
    'MARIA CAMPILLO ARANDA': '242130',
    'MARIA CIPRIANA MONJE REBENAQUE': '1443',
    'MARIA JOSE MARTIN ALIAS': '96950',
    'MARIA JOSE ORTIZ RUEDA': '104038',
    'MARIA MAR GRACIA RECH': '1439',
    'MARIA MARTINEZ PEREZ': '485622',
    'MARIA PILAR SANCHEZ PEÑA': '53679',
    'MAXIMILIAN RIVALDO PETRISOR': '473138',
    'MIGUEL ANGEL MONFERRER MANRESA': '541676',
    'MIRIAM RODRIGUEZ GARCIA': '437117',
    'NATALIA AZNAR MARTIN': '97081',
    'NAWAL TEMSAH GHERNATI': '459348',
    'NOELIA LOPEZ PARDO': '115501',
    'NOELIA PARDO CALAVIA': '51109',
    'NOELIA VILLAR GRACIA': '385361',
    'OBDULIA SANCHEZ DOPICO': '1423',
    'PABLO LOPEZ MOUCO': '341289',
    'PAOLA LOPEZ GASCA': '340752',
    'PATRICIA BERNA CASTEJON': '408338',
    'PATRICIA MARCO CORVINOS': '170224',
    'RAFFAELA DE LIMA REZENDE': '467648',
    'RAQUEL CHUECA PEREZ': '76663',
    'RAQUEL PLANAS CHOJOLAN': '469776',
    'RAQUEL VELASCO BENITO': '135842',
    'REBECA PASCUAL ANDRES': '22638',
    'SAMUEL RODRIGUEZ MUNOZ': '479778',
    'SERGIO GALLEGO FRANCO': '476652',
    'SILVIA FEIJOO ROMEO': '18334',
    'SOFIA GALUCHINO BINABURO': '132761',
    'SOFIA OCHOA LASERNA': '288486',
    'SUSANA ALVARO NUEZ': '13768',
    'VALERIA TORRES PAÑOS': '472505',
    'VERONICA CLAVERIA RODRIGUEZ': '39423',
    'VERONICA DANIELA BABEANU': '180335',
    'VERONICA FRAJ CEBRINO': '74429',
    'VICTORIA BITRIAN POSTIGO': '5514',
    'YANIRA GIMENEZ SALESA': '462144',
    'YASMINA SANCHEZ GIMENEZ': '467650',
    'ZAINAB LKHADESSI': '362456',
};

const employeesNotFoundInList = [
    'ALBERTO JAVIER MONDEJAR BELTRAN',
    'GABRIEL MARIN HHernandez',
    'MAXIMILIAN RIVALDO PETRISOR',
    'MIGUEL ANGEL MONFERRER MANRESA',
    'SAMUEL RODRIGUEZ MUNOZ',
    'SOFIA GALUCHINO BINABURO'
];

export async function processAndSeedData() {
  'use server';
  
  const jsonFilePath = path.join(process.cwd(), 'public', 'firestore_import_data.json');

  try {
    const fileContent = await fs.readFile(jsonFilePath, 'utf-8');
    if (!fileContent) {
        return { success: false, error: 'El archivo JSON está vacío o no se pudo leer.' };
    }
    const dataToImport = JSON.parse(fileContent);

    // --- LOGIC TO ADD EMPLOYEE NUMBERS AND USE THEM AS IDs ---
    const originalEmployeesData = dataToImport.employees;
    const newEmployeesData: Record<string, Omit<Employee, 'id'>> = {};
    const employeesFoundInMapping = new Set<string>();

    for (const docId in originalEmployeesData) {
        const employee: Employee = originalEmployeesData[docId];
        const employeeNameUpper = employee.name.toUpperCase();
        let employeeNumber: string | undefined = undefined;

        for (const fullName in employeeNumberMapping) {
            if (fullName.toUpperCase().includes(employeeNameUpper)) {
                employeeNumber = employeeNumberMapping[fullName];
                employeesFoundInMapping.add(fullName);
                break; 
            }
        }

        if (employeeNumber) {
            employee.employeeNumber = employeeNumber;
            // Use employeeNumber as the key for the new data structure
            newEmployeesData[employeeNumber] = employee;
        } else {
            console.warn(`Warning: Employee number not found for ${employee.name}. This employee will be skipped.`);
        }
    }
    
    // Replace old employee data with the new ID-based structure
    dataToImport.employees = newEmployeesData;

    const employeesToAddToEventual = Object.entries(employeeNumberMapping)
        .filter(([fullName]) => !employeesFoundInMapping.has(fullName))
        .map(([fullName, number]) => ({
            name: fullName.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' '),
            employeeNumber: number,
            active: true,
            workShift: 'Eventual'
        }));
    
    // Pass the modified data to the seed service
    const stats = await seedDatabase(dataToImport, employeesToAddToEventual);

    return { success: true, stats };
  } catch (error) {
    console.error("Error in processAndSeedData Server Action:", error);
     if (error instanceof Error && 'code' in error && (error as any).code === 'ENOENT') {
        return { success: false, error: 'No se encontró el archivo `firestore_import_data.json` en la carpeta `public`. Ejecuta primero el script de importación.' };
    }
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido durante la importación.';
    return { success: false, error: errorMessage };
  }
}
