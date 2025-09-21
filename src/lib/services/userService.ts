

'use server';

import { getAuthAdmin } from '@/lib/firebase-admin';
import { setDocument, updateDocument } from './firestoreAdminService';

export interface AppUser {
    id: string; // Corresponds to Firebase Auth UID
    email: string;
    employeeId: string;
}

export interface CreateUserPayload {
    email: string;
    password: string;
    employeeId: string;
}

// This function is now a Server Action. It creates the user in Firebase Auth
// and then updates Firestore accordingly.
export const createUser = async (payload: CreateUserPayload) => {
    const { email, password, employeeId } = payload;
    
    try {
        const authAdmin = getAuthAdmin();
        
        if (!authAdmin) {
            throw new Error('La autenticación de administrador de Firebase no es inicializada.');
        }
        if (!email || !password || !employeeId) {
          throw new Error('Faltan campos obligatorios: email, password y employeeId son requeridos.');
        }
        if (password.length < 6) {
            throw new Error('La contraseña debe tener al menos 6 caracteres.');
        }

        const userRecord = await authAdmin.createUser({
            email,
            password,
        });

        // After user is created in Auth, link the UID to the employee document
        await updateDocument('employees', employeeId, { authId: userRecord.uid });
        // Use setDocument to create the user document in the 'users' collection
        await setDocument('users', userRecord.uid, { email: payload.email, employeeId: payload.employeeId });

        return { success: true, uid: userRecord.uid };

    } catch (error: any) {
        console.error('Error in createUser Server Action:', error);
        let errorMessage = 'Error desconocido al crear el usuario.';
        if (error.code === 'auth/email-already-exists') {
          errorMessage = 'El correo electrónico ya está en uso por otro usuario.';
        } else if (error.code === 'auth/invalid-password') {
            errorMessage = 'La contraseña debe tener al menos 6 caracteres.';
        }
        return { success: false, error: errorMessage };
    }
};


// Placeholder for delete user functionality
export const deleteUser = async (uid: string) => {
    // This would also call a Cloud Function to delete the user from Firebase Auth
    // and handle cleanup in Firestore (e.g., remove authId from employee).
    console.log(`Deleting user ${uid} - functionality to be implemented.`);
};
