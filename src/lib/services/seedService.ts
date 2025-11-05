
'use server';

import { getDbAdmin } from '../firebase-admin';
import type { DocumentData } from 'firebase-admin/firestore';
import type { HolidayEmployee } from '../types';

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

export async function seedDatabase(dataToImport: any, holidayEmployeesToAdd: Omit<HolidayEmployee, 'id'>[]) {
    const dbAdmin = getDbAdmin();
    console.log("Starting database seed/update process...");

    // Clear only the collections that are going to be imported.
    await clearCollection('weeklyRecords');
    await clearCollection('employees');
    await clearCollection('holidayEmployees');
    await clearCollection('users');
    await clearCollection('conversations');
    
    const batch = dbAdmin.batch();
    const stats: Record<string, number> = {
        employees: 0,
        weeklyRecords: 0,
        holidayEmployees: 0,
        users: 0,
    };

    // Staging employees (already enriched with employeeNumber)
    if (dataToImport.employees) {
        for (const [docId, docData] of Object.entries(dataToImport.employees)) {
            const docRef = dbAdmin.collection('employees').doc(docId);
            batch.set(docRef, docData as DocumentData);
            stats.employees++;
            
            // Create user document in 'users' collection
            const employee = docData as Employee;
            if(employee.authId) {
                const userRef = dbAdmin.collection('users').doc(employee.authId);
                batch.set(userRef, {
                    employeeId: employee.employeeNumber,
                    email: employee.email,
                    role: employee.email === 'mariaavg@inditex.com' ? 'admin' : 'employee'
                });
                stats.users++;
            }
        }
        console.log(`Staging ${stats.employees} documents for collection 'employees'...`);
        console.log(`Staging ${stats.users} documents for collection 'users'...`);
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
    if (holidayEmployeesToAdd && holidayEmployeesToAdd.length > 0) {
        holidayEmployeesToAdd.forEach(emp => {
            const docRef = dbAdmin.collection('holidayEmployees').doc(emp.employeeNumber); 
            batch.set(docRef, emp);
            stats.holidayEmployees++;
        });
        console.log(`Staging ${stats.holidayEmployees} new documents for collection 'holidayEmployees'...`);
    }

    await batch.commit();
    console.log("Database seed/update process completed successfully!");
    
    return stats;
}

    
