

'use server';

// This file is deprecated and no longer in use.
// All database write operations have been migratred to the new adapter-based layer.
// Mantén este archivo únicamente como recordatorio de que las acciones deben
// implementarse a través del adaptador configurado.

export const updateDocument = async (collectionName: string, docId: string, data: any): Promise<void> => {
    console.error("DEPRECATED: updateDocument from firestoreAdminService was called.");
    throw new Error("This server function is deprecated.");
};

export const setDocument = async (collectionName: string, docId: string, data: any, options: { merge?: boolean } = {}): Promise<void> => {
    console.error("DEPRECATED: setDocument from firestoreAdminService was called.");
    throw new Error("This server function is deprecated.");
};
