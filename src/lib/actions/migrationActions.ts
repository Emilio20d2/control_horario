
'use server';

import { getAuthAdmin, getDbAdmin } from '../firebase-admin';

export async function migrateEmployeeDataToUsers(): Promise<{ success: boolean; message: string; error?: string }> {
    try {
        const db = getDbAdmin();
        const auth = getAuthAdmin();
        
        const employeesSnapshot = await db.collection('employees').get();
        
        let employeesProcessed = 0;
        let usersCreatedInAuth = 0;
        let usersDocCreated = 0;
        let usersDocUpdated = 0;
        let employeesLinked = 0;

        for (const employeeDoc of employeesSnapshot.docs) {
            const employeeData = employeeDoc.data();
            const employeeId = employeeDoc.id;

            // Only process employees with a valid email
            if (employeeData.email && typeof employeeData.email === 'string') {
                employeesProcessed++;
                let userRecord;
                let authId: string;

                // 1. Find or create user in Firebase Auth by email
                try {
                    userRecord = await auth.getUserByEmail(employeeData.email);
                    authId = userRecord.uid;
                } catch (error: any) {
                    if (error.code === 'auth/user-not-found') {
                        // User does not exist, so create them
                        const tempPassword = Math.random().toString(36).slice(-8); // Generate a random password
                        userRecord = await auth.createUser({
                            email: employeeData.email,
                            password: tempPassword,
                            displayName: employeeData.name,
                        });
                        authId = userRecord.uid;
                        usersCreatedInAuth++;
                    } else {
                        // For other auth errors, log it and skip this employee
                        console.error(`Error fetching user for ${employeeData.email}:`, error);
                        continue; 
                    }
                }
                
                const batch = db.batch();

                // 2. Link employee to authId if not already linked
                if (employeeData.authId !== authId) {
                    batch.update(employeeDoc.ref, { authId: authId });
                    employeesLinked++;
                }

                // 3. Create or update the document in the 'users' collection
                const userDocRef = db.collection('users').doc(authId);
                const userDoc = await userDocRef.get();
                
                const userData = {
                    email: employeeData.email,
                    employeeId: employeeId,
                    // Preserve existing role, otherwise default to 'employee'
                    role: userDoc.exists && userDoc.data()?.role ? userDoc.data()?.role : 'employee',
                };
                
                if (userDoc.exists) {
                     const existingData = userDoc.data();
                     if (existingData?.employeeId !== employeeId || existingData?.email !== employeeData.email || existingData?.role !== userData.role) {
                        batch.update(userDocRef, userData);
                        usersDocUpdated++;
                     }
                } else {
                    batch.set(userDocRef, userData);
                    usersDocCreated++;
                }

                await batch.commit();
            }
        }

        if (employeesProcessed === 0) {
            return {
                success: true,
                message: 'No se encontraron empleados con email para procesar.'
            }
        }
        
        let messageParts = [];
        if (usersCreatedInAuth > 0) messageParts.push(`${usersCreatedInAuth} usuarios creados en autenticación`);
        if (usersDocCreated > 0) messageParts.push(`${usersDocCreated} perfiles de usuario creados`);
        if (usersDocUpdated > 0) messageParts.push(`${usersDocUpdated} perfiles actualizados`);
        if (employeesLinked > 0) messageParts.push(`${employeesLinked} empleados vinculados`);
        
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
