
'use server';

import { getDbAdmin } from '../firebase-admin';
import type { Employee, WeeklyRecord } from '../types';

const BATCH_SIZE = 400;

async function commitBatch(batch: FirebaseFirestore.WriteBatch, operationName: string): Promise<FirebaseFirestore.WriteBatch> {
    await batch.commit();
    console.log(`Batch committed for ${operationName}.`);
    return getDbAdmin().batch();
}

export async function migrateEmployeeDataToUsers(): Promise<{ success: boolean; message: string; error?: string }> {
    'use server';
    console.log("Starting ID migration script...");

    try {
        const db = getDbAdmin();
        const idMap = new Map<string, string>(); // oldId -> newEmployeeNumber

        // 1. Create the ID map from the employees collection
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

        let batch = db.batch();
        let operationCount = 0;

        // 2. Migrate weeklyRecords
        console.log("Step 2: Migrating weeklyRecords collection...");
        const weeklyRecordsSnapshot = await db.collection('weeklyRecords').get();
        const oldWeeklyRecordRefs: FirebaseFirestore.DocumentReference[] = [];

        for (const doc of weeklyRecordsSnapshot.docs) {
            const oldRecord = doc.data() as WeeklyRecord;
            oldWeeklyRecordRefs.push(doc.ref);

            for (const oldEmpId in oldRecord.weekData) {
                const newEmpId = idMap.get(oldEmpId);
                if (newEmpId) {
                    const newDocId = `${oldRecord.id}-${newEmpId}`;
                    const newDocRef = db.collection('weeklyRecords').doc(newDocId);
                    
                    const dataToSet = { ...oldRecord.weekData[oldEmpId], employeeId: newEmpId, weekId: oldRecord.id };
                    batch.set(newDocRef, dataToSet);
                    operationCount++;

                    if (operationCount >= BATCH_SIZE) {
                        batch = await commitBatch(batch, "weeklyRecords creation");
                        operationCount = 0;
                    }
                }
            }
        }
        if (operationCount > 0) {
            batch = await commitBatch(batch, "final weeklyRecords creation");
            operationCount = 0;
        }
        console.log("weeklyRecords migration prepared.");

        // 3. Migrate users
        console.log("Step 3: Migrating users collection...");
        const usersSnapshot = await db.collection('users').get();
        for (const doc of usersSnapshot.docs) {
            const user = doc.data();
            const oldEmpId = user.employeeId;
            const newEmpId = idMap.get(oldEmpId);
            if (newEmpId && newEmpId !== oldEmpId) {
                batch.update(doc.ref, { employeeId: newEmpId });
                operationCount++;
                if (operationCount >= BATCH_SIZE) {
                    batch = await commitBatch(batch, "users update");
                    operationCount = 0;
                }
            }
        }
        if (operationCount > 0) {
            batch = await commitBatch(batch, "final users update");
            operationCount = 0;
        }
        console.log("Users migration prepared.");

        // 4. Migrate holidayEmployees
        console.log("Step 4: Migrating holidayEmployees collection...");
        const holidaySnapshot = await db.collection('holidayEmployees').get();
        const oldHolidayRefs: FirebaseFirestore.DocumentReference[] = [];
        for (const doc of holidaySnapshot.docs) {
            oldHolidayRefs.push(doc.ref);
            const holidayEmp = doc.data();
            const newEmpId = idMap.get(doc.id);
            if (newEmpId) {
                const newDocRef = db.collection('holidayEmployees').doc(newEmpId);
                batch.set(newDocRef, holidayEmp);
                operationCount++;
                if (operationCount >= BATCH_SIZE) {
                    batch = await commitBatch(batch, "holidayEmployees creation");
                    operationCount = 0;
                }
            }
        }
        if (operationCount > 0) {
            batch = await commitBatch(batch, "final holidayEmployees creation");
            operationCount = 0;
        }
        console.log("holidayEmployees migration prepared.");
        
        // 5. Migrate conversations
        console.log("Step 5: Migrating conversations collection...");
        const convSnapshot = await db.collection('conversations').get();
        const oldConvRefs: {ref: FirebaseFirestore.DocumentReference, messages: FirebaseFirestore.QuerySnapshot}[] = [];
        for (const doc of convSnapshot.docs) {
             const messagesSnapshot = await doc.ref.collection('messages').get();
             oldConvRefs.push({ref: doc.ref, messages: messagesSnapshot});
             const newEmpId = idMap.get(doc.id);
             if (newEmpId) {
                const newDocRef = db.collection('conversations').doc(newEmpId);
                const convData = doc.data();
                convData.employeeId = newEmpId;
                batch.set(newDocRef, convData);
                operationCount++;

                if (!messagesSnapshot.empty) {
                    for (const msgDoc of messagesSnapshot.docs) {
                        const newMsgRef = newDocRef.collection('messages').doc(msgDoc.id);
                        batch.set(newMsgRef, msgDoc.data());
                        operationCount++;
                        if (operationCount >= BATCH_SIZE) {
                            batch = await commitBatch(batch, "conversations creation");
                            operationCount = 0;
                        }
                    }
                }
             }
        }
        if (operationCount > 0) {
            batch = await commitBatch(batch, "final conversations creation");
            operationCount = 0;
        }
        console.log("Conversations migration prepared.");


        // 6. Delete old data
        console.log("Step 6: Deleting old data...");
        // Delete old weekly records
        for (const ref of oldWeeklyRecordRefs) {
            batch.delete(ref);
            operationCount++;
            if (operationCount >= BATCH_SIZE) {
                batch = await commitBatch(batch, "old weeklyRecords deletion");
                operationCount = 0;
            }
        }
        // Delete old holiday employees
        for (const ref of oldHolidayRefs) {
            batch.delete(ref);
            operationCount++;
            if (operationCount >= BATCH_SIZE) {
                batch = await commitBatch(batch, "old holidayEmployees deletion");
                operationCount = 0;
            }
        }
        // Delete old conversations
        for (const conv of oldConvRefs) {
            if(!conv.messages.empty) {
                for(const msg of conv.messages.docs) {
                    batch.delete(msg.ref);
                    operationCount++;
                    if(operationCount >= BATCH_SIZE) {
                        batch = await commitBatch(batch, "old conversation messages deletion");
                        operationCount = 0;
                    }
                }
            }
            batch.delete(conv.ref);
            operationCount++;
             if(operationCount >= BATCH_SIZE) {
                batch = await commitBatch(batch, "old conversations deletion");
                operationCount = 0;
            }
        }

        if (operationCount > 0) {
            await commitBatch(batch, "final old data deletion");
        }
        console.log("Old data deletion prepared.");

        // 7. Finally, migrate the employees collection itself
        console.log("Step 7: Migrating employees collection...");
        let employeeBatch = db.batch();
        let employeeOpCount = 0;
        const oldEmployeeRefs: FirebaseFirestore.DocumentReference[] = [];

        for (const doc of employeesSnapshot.docs) {
            const newEmpId = idMap.get(doc.id);
            if (newEmpId && doc.id !== newEmpId) {
                const newDocRef = db.collection('employees').doc(newEmpId);
                employeeBatch.set(newDocRef, doc.data());
                oldEmployeeRefs.push(doc.ref);
                employeeOpCount++;
                if (employeeOpCount >= BATCH_SIZE / 2) { // Use smaller batches here due to 2 ops per doc
                    await employeeBatch.commit();
                    console.log("Employee migration batch committed.");
                    employeeBatch = db.batch();
                    employeeOpCount = 0;
                }
            }
        }
        if (employeeOpCount > 0) {
            await employeeBatch.commit();
            console.log("Final employee migration batch committed.");
        }
        
        let deleteEmployeeBatch = db.batch();
        let deleteEmployeeOpCount = 0;
        for (const ref of oldEmployeeRefs) {
            deleteEmployeeBatch.delete(ref);
            deleteEmployeeOpCount++;
            if (deleteEmployeeOpCount >= BATCH_SIZE) {
                await deleteEmployeeBatch.commit();
                 console.log("Old employees deletion batch committed.");
                deleteEmployeeBatch = db.batch();
                deleteEmployeeOpCount = 0;
            }
        }
        if (deleteEmployeeOpCount > 0) {
            await deleteEmployeeBatch.commit();
             console.log("Final old employees deletion batch committed.");
        }


        return { success: true, message: 'La migración de IDs se ha completado con éxito.' };

    } catch (error) {
        console.error("Error during migration:", error);
        return { success: false, error: error instanceof Error ? error.message : 'Un error desconocido ocurrió durante la migración.' };
    }
}
