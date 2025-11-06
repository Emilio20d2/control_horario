
'use server';

import admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';
import { firebaseConfig } from './firebase'; // Importar la configuración del cliente

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
        // Utilizar la configuración del cliente como fallback si las variables de entorno no están definidas
        const projectId = process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

        if (!projectId || !clientEmail || !privateKey) {
             console.error('Firebase Admin SDK Error: Las credenciales del Firebase Admin SDK no están completas. Asegúrate de que FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY estén en las variables de entorno.');
             throw new Error('Fallo en la inicialización del Firebase Admin SDK. Faltan credenciales del servidor.');
        }

        const serviceAccount = {
            projectId,
            clientEmail,
            privateKey,
        };

        adminApp = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: firebaseConfig.databaseURL,
        });
        return adminApp;

    } catch (error: any) {
        console.error('ERROR CRÍTICO: No se pudieron procesar las credenciales del Firebase Admin SDK.', error.message);
        throw new Error('Fallo en la inicialización del Firebase Admin SDK. Revisa las credenciales del servidor.');
    }
};

const getDbAdmin = () => {
    if (!adminApp) initializeAdminApp();
    return admin.firestore(adminApp);
};

const getAuthAdmin = () => {
     if (!adminApp) initializeAdminApp();
    return admin.auth(adminApp);
};

export { getDbAdmin, getAuthAdmin };
