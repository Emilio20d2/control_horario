
'use server';

import { getDbAdmin } from '../firebase-admin';
import type { DocumentData } from 'firebase-admin/firestore';
import type { HolidayEmployee, Employee } from '../types';

// Utility to clear a collection in chunks
async function clearCollection(collectionName: string) {
    const dbAdmin = getDbAdmin();
    const collectionRef = dbAdmin.collection(collectionName);
    const snapshot = await collectionRef.get();

    if (snapshot.empty) {
        console.log(`Collection ${collectionName} is already empty or does not exist, skipping deletion.`);
        return 0;
    }

    const batchSize = 400;
    let batch = dbAdmin.batch();
    let count = 0;

    for (const doc of snapshot.docs) {
        batch.delete(doc.ref);
        count++;
        if (count >= batchSize) {
            await batch.commit();
            batch = dbAdmin.batch();
            count = 0;
        }
    }
    // Commit the final batch if it's not empty
    if (count > 0) {
        await batch.commit();
    }
    
    console.log(`Collection ${collectionName} cleared.`);
    return snapshot.size;
}

export async function seedDatabase(dataToImport: any, holidayEmployeesToAdd: Omit<HolidayEmployee, 'id'>[]) {
    const dbAdmin = getDbAdmin();
    console.log("Starting database seed/update process...");

    // Clear all relevant collections before seeding
    await Promise.all([
        clearCollection('weeklyRecords'),
        clearCollection('employees'),
        clearCollection('holidayEmployees'),
        clearCollection('users'),
        clearCollection('conversations')
    ]);
    
    const batchSize = 400;
    let batch = dbAdmin.batch();
    let operationCount = 0;
    
    const commitBatchIfNeeded = async () => {
        if (operationCount >= batchSize) {
            console.log(`Committing batch with ${operationCount} operations...`);
            await batch.commit();
            batch = dbAdmin.batch();
            operationCount = 0;
        }
    };

    const stats: Record<string, number> = {
        employees: 0,
        weeklyRecords: 0,
        holidayEmployees: 0,
        users: 0,
    };

    // Staging employees and users
    if (dataToImport.employees) {
        for (const [docId, docData] of Object.entries(dataToImport.employees)) {
            const docRef = dbAdmin.collection('employees').doc(docId);
            batch.set(docRef, docData as DocumentData);
            operationCount++;
            stats.employees++;
            
            const employee = docData as Employee;
            if(employee.authId) {
                const userRef = dbAdmin.collection('users').doc(employee.authId);
                batch.set(userRef, {
                    employeeId: employee.employeeNumber,
                    email: employee.email,
                    role: employee.email === 'mariaavg@inditex.com' ? 'admin' : 'employee'
                });
                operationCount++;
                stats.users++;
            }
            await commitBatchIfNeeded();
        }
    }

    // Staging weekly records with the new structure
    if (dataToImport.weeklyRecords) {
        for (const [weekId, weekRecord] of Object.entries(dataToImport.weeklyRecords as any)) {
            if (weekRecord.weekData) {
                for (const [employeeId, employeeData] of Object.entries(weekRecord.weekData)) {
                    const docId = `${weekId}-${employeeId}`;
                    const docRef = dbAdmin.collection('weeklyRecords').doc(docId);
                    
                    const dataToSet = {
                        weekId: weekId,
                        employeeId: employeeId,
                        ...employeeData as DocumentData
                    };

                    batch.set(docRef, dataToSet);
                    operationCount++;
                    stats.weeklyRecords++;
                    await commitBatchIfNeeded();
                }
            }
        }
    }


    // Add employees not found to holidayEmployees
    if (holidayEmployeesToAdd && holidayEmployeesToAdd.length > 0) {
        for (const emp of holidayEmployeesToAdd) {
            const docRef = dbAdmin.collection('holidayEmployees').doc(emp.employeeNumber); 
            batch.set(docRef, emp);
            operationCount++;
            stats.holidayEmployees++;
            await commitBatchIfNeeded();
        }
    }

    // Commit any remaining operations in the final batch
    if (operationCount > 0) {
        console.log(`Committing final batch with ${operationCount} operations...`);
        await batch.commit();
    }
    
    console.log("Database seed/update process completed successfully!");
    
    return stats;
}
