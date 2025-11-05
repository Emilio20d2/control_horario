
'use server';

import { getDbAdmin } from '../firebase-admin';
import type { DocumentData } from 'firebase-admin/firestore';
import type { HolidayEmployee, Employee } from '../types';

// Utility to clear a collection in chunks
async function clearCollection(collectionName: string) {
    console.log(`Clearing collection: ${collectionName}...`);
    const dbAdmin = getDbAdmin();
    const collectionRef = dbAdmin.collection(collectionName);
    const batchSize = 400;
    let snapshot;
    let totalDeleted = 0;

    do {
        snapshot = await collectionRef.limit(batchSize).get();
        if (snapshot.empty) {
            break;
        }

        const batch = dbAdmin.batch();
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        totalDeleted += snapshot.size;
        console.log(`Deleted ${snapshot.size} documents from ${collectionName}. Total deleted so far: ${totalDeleted}`);

    } while (snapshot.size > 0);

    console.log(`Collection ${collectionName} cleared. Total ${totalDeleted} documents deleted.`);
    return totalDeleted;
}

export async function seedDatabase(dataToImport: any, holidayEmployeesToAdd: Omit<HolidayEmployee, 'id'>[]) {
    const dbAdmin = getDbAdmin();
    console.log("Starting database seed/update process with sequential batching...");

    const collectionsToClear = ['weeklyRecords', 'employees', 'holidayEmployees', 'users', 'conversations'];
    for (const collectionName of collectionsToClear) {
        await clearCollection(collectionName);
    }
    
    const batchSize = 400;
    
    const stats: Record<string, number> = {
        employees: 0,
        weeklyRecords: 0,
        holidayEmployees: 0,
        users: 0,
    };

    // Staging employees and users
    if (dataToImport.employees) {
        console.log("Seeding employees and users...");
        const employeeEntries = Object.entries(dataToImport.employees);
        for (let i = 0; i < employeeEntries.length; i += batchSize) {
            const batch = dbAdmin.batch();
            const chunk = employeeEntries.slice(i, i + batchSize);
            for (const [docId, docData] of chunk) {
                const docRef = dbAdmin.collection('employees').doc(docId);
                batch.set(docRef, docData as DocumentData);
                stats.employees++;
                
                const employee = docData as Employee;
                if (employee.authId) {
                    const userRef = dbAdmin.collection('users').doc(employee.authId);
                    batch.set(userRef, {
                        employeeId: employee.employeeNumber,
                        email: employee.email,
                        role: employee.email === 'mariaavg@inditex.com' ? 'admin' : 'employee'
                    });
                    stats.users++;
                }
            }
            await batch.commit();
            console.log(`Committed batch of ${chunk.length} employees/users.`);
        }
    }

    // Staging weekly records
    if (dataToImport.weeklyRecords) {
        console.log("Seeding weekly records...");
        const weeklyRecordsEntries = Object.entries(dataToImport.weeklyRecords as any);
        for (let i = 0; i < weeklyRecordsEntries.length; i += batchSize) {
             const batch = dbAdmin.batch();
             const chunk = weeklyRecordsEntries.slice(i, i + batchSize);
             for (const [weekId, weekRecord] of chunk) {
                if ((weekRecord as any).weekData) {
                    for (const [employeeId, employeeData] of Object.entries((weekRecord as any).weekData)) {
                        const docId = `${weekId}-${employeeId}`;
                        const docRef = dbAdmin.collection('weeklyRecords').doc(docId);
                        const dataToSet = {
                            weekId: weekId,
                            employeeId: employeeId,
                            ...employeeData as DocumentData
                        };
                        batch.set(docRef, dataToSet);
                        stats.weeklyRecords++;
                    }
                }
             }
             await batch.commit();
             console.log(`Committed batch of weekly records data.`);
        }
    }


    // Add employees not found to holidayEmployees
    if (holidayEmployeesToAdd && holidayEmployeesToAdd.length > 0) {
        console.log("Seeding holiday employees...");
        for (let i = 0; i < holidayEmployeesToAdd.length; i += batchSize) {
            const batch = dbAdmin.batch();
            const chunk = holidayEmployeesToAdd.slice(i, i + batchSize);
            for (const emp of chunk) {
                const docRef = dbAdmin.collection('holidayEmployees').doc(emp.employeeNumber);
                batch.set(docRef, emp);
                stats.holidayEmployees++;
            }
            await batch.commit();
            console.log(`Committed batch of ${chunk.length} holiday employees.`);
        }
    }
    
    console.log("Database seed/update process completed successfully!");
    
    return stats;
}
