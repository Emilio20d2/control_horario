
'use server';

import { getDbAdmin } from '../firebase-admin';
import type { Employee, WeeklyRecord } from '../types';

const BATCH_SIZE = 400;

async function commitBatch(batch: FirebaseFirestore.WriteBatch, operationName: string, count: number): Promise<FirebaseFirestore.WriteBatch> {
    if (count > 0) {
        await batch.commit();
        console.log(`Batch of ${count} operations committed for ${operationName}.`);
    }
    return getDbAdmin().batch();
}

export async function migrateEmployeeDataToUsers(): Promise<{ success: boolean; message: string; error?: string }> {
    'use server';
    console.log("Starting granular ID migration script...");

    try {
        const db = getDbAdmin();
        const idMap = new Map<string, string>();

        console.log("Step 1: Reading employees to create ID map...");
        const employeesSnapshot = await db.collection('employees').get();
        employeesSnapshot.forEach(doc => {
            const employee = doc.data() as Employee;
            if (employee.employeeNumber) {
                idMap.set(doc.id, employee.employeeNumber);
            } else {
                console.warn(`Employee ${doc.id} (${employee.name}) is missing an employeeNumber and will be skipped.`);
            }
        });
        console.log(`ID map created with ${idMap.size} entries.`);

        // 2. Migrate weeklyRecords
        console.log("Step 2: Migrating weeklyRecords collection...");
        const weeklyRecordsSnapshot = await db.collection('weeklyRecords').get();
        let weeklyBatch = db.batch();
        let weeklyOpCount = 0;

        for (const doc of weeklyRecordsSnapshot.docs) {
            const oldRecord = doc.data() as WeeklyRecord;
            for (const oldEmpId in oldRecord.weekData) {
                const newEmpId = idMap.get(oldEmpId);
                if (newEmpId) {
                    const newDocId = `${oldRecord.id}-${newEmpId}`;
                    const newDocRef = db.collection('weeklyRecords').doc(newDocId);
                    const dataToSet = { ...oldRecord.weekData[oldEmpId], employeeId: newEmpId, weekId: oldRecord.id };
                    weeklyBatch.set(newDocRef, dataToSet);
                    weeklyOpCount++;
                    if (weeklyOpCount >= BATCH_SIZE) {
                        weeklyBatch = await commitBatch(weeklyBatch, "weeklyRecords creation", weeklyOpCount);
                        weeklyOpCount = 0;
                    }
                }
            }
        }
        await commitBatch(weeklyBatch, "final weeklyRecords creation", weeklyOpCount);
        console.log("New weeklyRecords created. Now deleting old ones...");
        
        let deleteWeeklyBatch = db.batch();
        let deleteWeeklyOpCount = 0;
        for (const doc of weeklyRecordsSnapshot.docs) {
             deleteWeeklyBatch.delete(doc.ref);
             deleteWeeklyOpCount++;
             if(deleteWeeklyOpCount >= BATCH_SIZE) {
                deleteWeeklyBatch = await commitBatch(deleteWeeklyBatch, "old weeklyRecords deletion", deleteWeeklyOpCount);
                deleteWeeklyOpCount = 0;
             }
        }
        await commitBatch(deleteWeeklyBatch, "final old weeklyRecords deletion", deleteWeeklyOpCount);
        console.log("Old weeklyRecords deleted.");


        // 3. Migrate users
        console.log("Step 3: Migrating users collection...");
        const usersSnapshot = await db.collection('users').get();
        let usersBatch = db.batch();
        let usersOpCount = 0;
        for (const doc of usersSnapshot.docs) {
            const user = doc.data();
            const oldEmpId = user.employeeId;
            const newEmpId = idMap.get(oldEmpId);
            if (newEmpId && newEmpId !== oldEmpId) {
                usersBatch.update(doc.ref, { employeeId: newEmpId });
                usersOpCount++;
                if (usersOpCount >= BATCH_SIZE) {
                    usersBatch = await commitBatch(usersBatch, "users update", usersOpCount);
                    usersOpCount = 0;
                }
            }
        }
        await commitBatch(usersBatch, "final users update", usersOpCount);
        console.log("Users migrated.");
        
        // 4. Migrate holidayEmployees
        console.log("Step 4: Migrating holidayEmployees collection...");
        const holidaySnapshot = await db.collection('holidayEmployees').get();
        let holidayBatch = db.batch();
        let holidayOpCount = 0;
        for (const doc of holidaySnapshot.docs) {
            const holidayEmp = doc.data();
            const newEmpId = idMap.get(doc.id);
            if (newEmpId) {
                const newDocRef = db.collection('holidayEmployees').doc(newEmpId);
                holidayBatch.set(newDocRef, holidayEmp);
                holidayOpCount++;
                if (holidayOpCount >= BATCH_SIZE) {
                    holidayBatch = await commitBatch(holidayBatch, "holidayEmployees creation", holidayOpCount);
                    holidayOpCount = 0;
                }
            }
        }
        await commitBatch(holidayBatch, "final holidayEmployees creation", holidayOpCount);
        console.log("New holidayEmployees created. Now deleting old ones...");

        let deleteHolidayBatch = db.batch();
        let deleteHolidayOpCount = 0;
        for (const doc of holidaySnapshot.docs) {
             deleteHolidayBatch.delete(doc.ref);
             deleteHolidayOpCount++;
             if(deleteHolidayOpCount >= BATCH_SIZE) {
                deleteHolidayBatch = await commitBatch(deleteHolidayBatch, "old holidayEmployees deletion", deleteHolidayOpCount);
                deleteHolidayOpCount = 0;
             }
        }
        await commitBatch(deleteHolidayBatch, "final old holidayEmployees deletion", deleteHolidayOpCount);
        console.log("Old holidayEmployees deleted.");


        // 5. Migrate the employees collection itself
        console.log("Step 5: Migrating employees collection...");
        let employeeBatch = db.batch();
        let employeeOpCount = 0;
        for (const doc of employeesSnapshot.docs) {
            const newEmpId = idMap.get(doc.id);
            if (newEmpId && doc.id !== newEmpId) {
                const newDocRef = db.collection('employees').doc(newEmpId);
                employeeBatch.set(newDocRef, doc.data());
                employeeOpCount++;
                if (employeeOpCount >= BATCH_SIZE) {
                    employeeBatch = await commitBatch(employeeBatch, "employees creation", employeeOpCount);
                    employeeOpCount = 0;
                }
            }
        }
        await commitBatch(employeeBatch, "final employees creation", employeeOpCount);
        console.log("New employees created. Now deleting old ones...");

        let deleteEmployeeBatch = db.batch();
        let deleteEmployeeOpCount = 0;
        for (const doc of employeesSnapshot.docs) {
            const newEmpId = idMap.get(doc.id);
            if(newEmpId && doc.id !== newEmpId) {
                deleteEmployeeBatch.delete(doc.ref);
                deleteEmployeeOpCount++;
                if (deleteEmployeeOpCount >= BATCH_SIZE) {
                    deleteEmployeeBatch = await commitBatch(deleteEmployeeBatch, "old employees deletion", deleteEmployeeOpCount);
                    deleteEmployeeOpCount = 0;
                }
            }
        }
        await commitBatch(deleteEmployeeBatch, "final old employees deletion", deleteEmployeeOpCount);
        console.log("Old employees deleted.");


        return { success: true, message: 'La migración de IDs se ha completado con éxito.' };

    } catch (error) {
        console.error("Error during migration:", error);
        return { success: false, error: error instanceof Error ? error.message : 'Un error desconocido ocurrió durante la migración.' };
    }
}
