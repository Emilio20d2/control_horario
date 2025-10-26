
'use server';

import { getDbAdmin } from '../firebase-admin';

export async function migrateEmployeeDataToUsers(): Promise<{ success: boolean; message: string; error?: string }> {
    try {
        const db = getDbAdmin();
        const batch = db.batch();

        const employeesSnapshot = await db.collection('employees').get();
        const usersSnapshot = await db.collection('users').get();
        const usersData = new Map(usersSnapshot.docs.map(doc => [doc.id, doc.data()]));
        
        let usersCreated = 0;
        let usersUpdated = 0;

        for (const employeeDoc of employeesSnapshot.docs) {
            const employeeData = employeeDoc.data();
            const employeeId = employeeDoc.id;

            if (employeeData.authId && employeeData.email) {
                const userDocRef = db.collection('users').doc(employeeData.authId);
                const existingUser = usersData.get(employeeData.authId);

                if (existingUser) {
                    // User exists, update if necessary to ensure consistency
                    const updates: any = {};
                    if (existingUser.employeeId !== employeeId) updates.employeeId = employeeId;
                    if (existingUser.email !== employeeData.email) updates.email = employeeData.email;
                    // We don't update role here, we just ensure a default one exists if missing.
                    if (!existingUser.role) updates.role = 'employee';

                    if (Object.keys(updates).length > 0) {
                        batch.update(userDocRef, updates);
                        usersUpdated++;
                    }
                } else {
                    // User does not exist in 'users' collection, create it
                    batch.set(userDocRef, {
                        email: employeeData.email,
                        employeeId: employeeId,
                        role: 'employee' // Default role
                    });
                    usersCreated++;
                }
            }
        }

        await batch.commit();

        return {
            success: true,
            message: `Migración completada: ${usersCreated} usuarios creados, ${usersUpdated} usuarios actualizados.`,
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

    