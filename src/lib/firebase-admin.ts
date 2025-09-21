
'use server';

import admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';
import serviceAccount from '../../shiftmaster-9iefy-firebase-adminsdk-fbsvc-c67926a133.json';

const initializeAdminApp = () => {
    if (getApps().length > 0) {
        return getApps()[0];
    }
    
    try {
        // The serviceAccount object needs to be cast to the correct type.
        return admin.initializeApp({
            credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
        });
    } catch (error) {
        console.error('ERROR CRÍTICO: No se pudieron procesar las credenciales del Firebase Admin SDK.', error);
        throw new Error('Fallo en la inicialización del Firebase Admin SDK. Revisa los logs del servidor y las credenciales.');
    }
};

// Ensure the app is initialized before it's used.
let adminApp: admin.app.App | undefined;
try {
    adminApp = initializeAdminApp();
} catch (e) {
    // Error is already logged in initializeAdminApp, just prevent crash
}


const getDbAdmin = () => {
    if (!adminApp) {
        adminApp = initializeAdminApp();
    }
    return admin.firestore();
};

const getAuthAdmin = () => {
     if (!adminApp) {
        adminApp = initializeAdminApp();
    }
    return admin.auth();
};

export { getDbAdmin, getAuthAdmin };
