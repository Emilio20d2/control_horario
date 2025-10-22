

'use server';

import { getAuthAdmin } from '@/lib/firebase-admin';
import { setDocument, updateDocument } from './firestoreAdminService';

export interface AppUser {
    id: string; // Corresponds to Firebase Auth UID
    email: string;
    employeeId: string;
    role: 'admin' | 'employee';
}

export interface CreateUserPayload {
    email: string;
    password: string;
    employeeId: string;
}

export const createUser = async (payload: CreateUserPayload) => {
    const { email, password, employeeId } = payload;
    
    try {
        const authAdmin = getAuthAdmin();
        
        if (!authAdmin) {
            throw new Error('La autenticación de administrador de Firebase no es inicializada.');
        }
        if (!email || !password) {
          throw new Error('Faltan campos obligatorios: email y password son requeridos.');
        }
        if (password.length < 6) {
            throw new Error('La contraseña debe tener al menos 6 caracteres.');
        }

        const userRecord = await authAdmin.createUser({
            email,
            password,
        });

        // The user document in 'users' collection is created in the calling service (employeeService)
        // because we need the employeeId which is generated after the employee is created.
        
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
