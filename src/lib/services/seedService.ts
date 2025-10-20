
'use server';

import { getDbAdmin } from '../firebase-admin';
import type { DocumentData } from 'firebase-admin/firestore';
import * as fs from 'fs/promises';
import * as path from 'path';


// Utility to clear a collection
async function clearCollection(collectionName: string) {
    const dbAdmin = getDbAdmin();
    const collectionRef = dbAdmin.collection(collectionName);
    const snapshot = await collectionRef.get();

    if (snapshot.empty) {
        console.log(`Collection ${collectionName} is already empty or does not exist, skipping deletion.`);
        return 0;
    }

    const batch = dbAdmin.batch();
    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });
    await batch.commit();
    console.log(`Collection ${collectionName} cleared.`);
    return snapshot.size;
}

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
    'GABRIEL MARIN HERNANDEZ',
    'MAXIMILIAN RIVALDO PETRISOR',
    'MIGUEL ANGEL MONFERRER MANRESA',
    'SAMUEL RODRIGUEZ MUNOZ',
    'SOFIA GALUCHINO BINABURO'
];


export async function seedDatabase(dataToImport: any) {
    const dbAdmin = getDbAdmin();
    console.log("Starting database seed/update process...");

    // Clear only the collections that are going to be imported.
    await clearCollection('weeklyRecords');
    await clearCollection('employees');
    await clearCollection('holidayEmployees');
    
    const batch = dbAdmin.batch();
    const stats: Record<string, number> = {
        employees: 0,
        weeklyRecords: 0,
        holidayEmployees: 0,
    };

    // Staging employees
    if (dataToImport.employees) {
        Object.entries(dataToImport.employees).forEach(([docId, docData]) => {
            const employeeData = docData as { name: string; employeeNumber?: string };
            const dbEmployeeNameUpper = employeeData.name.toUpperCase();
            
            const mappingEntry = Object.entries(employeeNumberMapping).find(([fullName, number]) => 
                fullName.includes(dbEmployeeNameUpper)
            );

            if (mappingEntry) {
                employeeData.employeeNumber = mappingEntry[1];
            }

            const docRef = dbAdmin.collection('employees').doc(docId);
            batch.set(docRef, employeeData as DocumentData);
            stats.employees++;
        });
        console.log(`Staging ${stats.employees} documents for collection 'employees'...`);
    }

    // Staging weekly records
    if (dataToImport.weeklyRecords) {
        Object.entries(dataToImport.weeklyRecords).forEach(([docId, docData]) => {
            const docRef = dbAdmin.collection('weeklyRecords').doc(docId);
            batch.set(docRef, docData as DocumentData);
            stats.weeklyRecords++;
        });
        console.log(`Staging ${stats.weeklyRecords} documents for collection 'weeklyRecords'...`);
    }

    // Add employees not found to holidayEmployees
    const existingHolidayEmployeesSnapshot = await dbAdmin.collection('holidayEmployees').get();
    const existingHolidayEmployeeNames = new Set(existingHolidayEmployeesSnapshot.docs.map(doc => doc.data().name.toUpperCase()));

    Object.entries(employeeNumberMapping).forEach(([name, number]) => {
        const nameUpper = name.toUpperCase();
        const dataEmployee = Object.values(dataToImport.employees).find(emp => nameUpper.includes((emp as any).name.toUpperCase()));
        
        if (!dataEmployee && !existingHolidayEmployeeNames.has(nameUpper)) {
             const docRef = dbAdmin.collection('holidayEmployees').doc();
             batch.set(docRef, { 
                name: name.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' '), // Title Case
                active: true,
                employeeNumber: number,
                workShift: 'Eventual',
             });
             stats.holidayEmployees++;
        }
    });

    if (stats.holidayEmployees > 0) {
        console.log(`Staging ${stats.holidayEmployees} new documents for collection 'holidayEmployees'...`);
    }


    await batch.commit();
    console.log("Database seed/update process completed successfully!");
    
    return stats;
}

