
'use server';

import admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';

const initializeAdminApp = () => {
    if (getApps().length > 0) {
        return getApps()[0];
    }
    
    try {
        // These will be automatically set by the environment in production.
        const serviceAccount = {
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }
        return admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    } catch (error: any) {
        console.error('ERROR CRÍTICO: No se pudieron procesar las credenciales del Firebase Admin SDK.', error.message);
        throw new Error('Fallo en la inicialización del Firebase Admin SDK. Revisa las variables de entorno del servidor.');
    }
};

let adminApp: admin.app.App | undefined;
try {
    adminApp = initializeAdminApp();
} catch (e) {
    // Error is logged, prevent crash
}

const getDbAdmin = () => {
    if (!adminApp) adminApp = initializeAdminApp();
    return admin.firestore();
};

const getAuthAdmin = () => {
     if (!adminApp) adminApp = initializeAdminApp();
    return admin.auth();
};

export { getDbAdmin, getAuthAdmin };
