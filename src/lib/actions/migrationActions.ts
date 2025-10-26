
'use server';

import { getAuthAdmin, getDbAdmin } from '../firebase-admin';

export async function migrateEmployeeDataToUsers(): Promise<{ success: boolean; message: string; error?: string }> {
    try {
        const db = getDbAdmin();
        const auth = getAuthAdmin();
        const batch = db.batch();

        const employeesSnapshot = await db.collection('employees').get();
        
        let employeesProcessed = 0;
        let usersCreated = 0;
        let usersUpdated = 0;
        let employeesLinked = 0;

        for (const employeeDoc of employeesSnapshot.docs) {
            const employeeData = employeeDoc.data();
            const employeeId = employeeDoc.id;

            // Only process employees with an email
            if (employeeData.email) {
                employeesProcessed++;
                let userRecord;

                // 1. Find user in Firebase Auth by email
                try {
                    userRecord = await auth.getUserByEmail(employeeData.email);
                } catch (error: any) {
                    if (error.code === 'auth/user-not-found') {
                        // User does not exist in Firebase Auth, skip for now.
                        // They will need to register through the app.
                        continue;
                    }
                    throw error; // Re-throw other auth errors
                }

                // 2. We have an auth user, let's sync data.
                if (userRecord) {
                    const authId = userRecord.uid;
                    const userDocRef = db.collection('users').doc(authId);
                    const userDoc = await userDocRef.get();

                    // 2a. Link employee to authId if not already linked
                    if (employeeData.authId !== authId) {
                        batch.update(employeeDoc.ref, { authId: authId });
                        employeesLinked++;
                    }

                    // 2b. Create or update the document in the 'users' collection
                    const userData = {
                        email: employeeData.email,
                        employeeId: employeeId,
                        role: userDoc.exists && userDoc.data()?.role ? userDoc.data()?.role : 'employee', // Preserve existing role or default to 'employee'
                    };

                    if (userDoc.exists) {
                        const existingUserData = userDoc.data();
                        if (existingUserData?.employeeId !== employeeId || existingUserData?.email !== employeeData.email) {
                           batch.update(userDocRef, userData);
                           usersUpdated++;
                        }
                    } else {
                        batch.set(userDocRef, userData);
                        usersCreated++;
                    }
                }
            }
        }

        if (employeesProcessed === 0) {
            return {
                success: true,
                message: 'No se encontraron empleados con email para procesar.'
            }
        }

        await batch.commit();
        
        let messageParts = [];
        if (usersCreated > 0) messageParts.push(`${usersCreated} usuarios creados`);
        if (usersUpdated > 0) messageParts.push(`${usersUpdated} usuarios actualizados`);
        if (employeesLinked > 0) messageParts.push(`${employeesLinked} empleados vinculados a su cuenta`);
        
        if (messageParts.length === 0) {
            return { success: true, message: 'Migración completada. Todos los datos ya estaban sincronizados.' };
        }


        return {
            success: true,
            message: `Migración completada: ${messageParts.join(', ')}.`,
        };
    } catch (error) {
        console.error("Error during employee data migration:", error);
        return {
            success: false,
            message: 'Falló la migración de datos.',
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
