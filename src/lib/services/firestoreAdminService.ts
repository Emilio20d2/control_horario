

'use server';

import { getDbAdmin } from '../firebase-admin';

export const updateDocument = async (collectionName: string, docId: string, data: any): Promise<void> => {
    const dbAdmin = getDbAdmin();
    const docRef = dbAdmin.collection(collectionName).doc(docId);
    await docRef.update(data);
};

export const setDocument = async (collectionName: string, docId: string, data: any, options: { merge?: boolean } = {}): Promise<void> => {
    const dbAdmin = getDbAdmin();
    const docRef = dbAdmin.collection(collectionName).doc(docId);
    await docRef.set(data, { merge: true, ...options });
};

