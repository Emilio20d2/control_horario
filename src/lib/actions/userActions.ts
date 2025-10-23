'use server';

import { getAuthAdmin } from '@/lib/firebase-admin';

export interface CreateUserPayload {
    email: string;
}

export const createUserAccount = async (payload: CreateUserPayload) => {
    const { email } = payload;
    
    try {
        const authAdmin = getAuthAdmin();
        
        if (!authAdmin) {
            throw new Error('La autenticación de administrador de Firebase no está inicializada.');
        }
        if (!email) {
          throw new Error('El email es un campo obligatorio.');
        }

        // Generate a more secure, random password.
        const tempPassword = Math.random().toString(36).slice(-8) + 'aA1!';

        const userRecord = await authAdmin.createUser({
            email,
            password: tempPassword,
        });

        // It is recommended to send the temporary password to the user via a secure channel (e.g., email),
        // but for this implementation, we will just return the UID.
        // The user will have to use the "Forgot Password" flow to set their own password.
        
        return { success: true, uid: userRecord.uid };

    } catch (error: any) {
        console.error('Error in createUserAccount Server Action:', error);
        let errorMessage = 'Error desconocido al crear el usuario.';
        if (error.code === 'auth/email-already-exists') {
          errorMessage = 'El correo electrónico ya está en uso por otro usuario.';
        } else if (error.code === 'auth/invalid-password') {
            errorMessage = 'La contraseña generada no es válida (error interno).';
        }
        return { success: false, error: errorMessage };
    }
};

    