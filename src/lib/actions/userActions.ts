
'use server';

import { getAuthAdmin, getDbAdmin } from '@/lib/firebase-admin';
import type { Employee } from '../types';

export interface CreateUserPayload {
    email: string;
    password?: string; // Optional password for creation, can be auto-generated
}

export const createUserAccount = async (payload: {email: string, password?: string, name?: string}): Promise<{ success: boolean; uid?: string, error?: string; }> => {
    const { email, password, name } = payload;
    const authAdmin = getAuthAdmin();

    try {
        if (!email) {
            throw new Error('El email es obligatorio.');
        }
        
        if (!password) {
            throw new Error('La contraseña es obligatoria.');
        }

        const userRecord = await authAdmin.createUser({
            email,
            password,
            displayName: name,
        });

        return { success: true, uid: userRecord.uid };

    } catch (error: any) {
        console.error('Error in createUserAccount Server Action:', error);
        let errorMessage = 'Error desconocido al crear el usuario.';
        if (error.code === 'auth/email-already-exists') {
          errorMessage = 'El correo electrónico ya está en uso por otro usuario.';
        } else if (error.code === 'auth/invalid-password') {
            errorMessage = 'La contraseña debe tener al menos 6 caracteres.';
        }
        return { success: false, error: errorMessage };
    }
};

export const sendPasswordResetEmail = async (email: string): Promise<{ success: boolean; message?: string, error?: string }> => {
    const authAdmin = getAuthAdmin();

    try {
        await authAdmin.getUserByEmail(email);
        const link = await authAdmin.generatePasswordResetLink(email);

        // In a real application, you would send an email here using a service like SendGrid or Nodemailer.
        // For this context, we confirm the link was generated.
        console.log(`Password reset link generated (but not sent): ${link}`);

        return { success: true, message: 'Si tu correo está registrado, recibirás un enlace para restablecer tu contraseña.' };
    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            // We don't want to reveal if a user exists or not
             return { success: true, message: 'Si tu correo está registrado, recibirás un enlace para restablecer tu contraseña.' };
        }
        console.error('Error sending password reset email:', error);
        return { success: false, error: 'No se pudo enviar el correo de recuperación.' };
    }
};

    
