
'use server';

import admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';

let adminApp: admin.app.App | undefined;

const initializeAdminApp = () => {
    if (adminApp) {
        return adminApp;
    }

    if (getApps().length > 0) {
        adminApp = getApps()[0];
        return adminApp;
    }
    
    try {
        const serviceAccount = {
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }

        if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
            console.error('Firebase Admin SDK Error: Las credenciales del Firebase Admin SDK no están completas en las variables de entorno del servidor.');
            throw new Error('Fallo en la inicialización del Firebase Admin SDK. Revisa las variables de entorno del servidor.');
        }

        adminApp = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: `https://shiftmaster-9iefy-default-rtdb.europe-west1.firebasedatabase.app`,
        });
        return adminApp;

    } catch (error: any) {
        console.error('ERROR CRÍTICO: No se pudieron procesar las credenciales del Firebase Admin SDK.', error.message);
        throw new Error('Fallo en la inicialización del Firebase Admin SDK. Revisa las variables de entorno del servidor.');
    }
};

const getDbAdmin = () => {
    if (!adminApp) initializeAdminApp();
    // This ensures we get the firestore instance from the initialized app,
    // explicitly pointing to the correct database.
    return admin.firestore(adminApp);
};

const getAuthAdmin = () => {
     if (!adminApp) initializeAdminApp();
    return admin.auth(adminApp);
};

export { getDbAdmin, getAuthAdmin };
