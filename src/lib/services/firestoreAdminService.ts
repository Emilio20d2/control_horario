

'use server';

// This file is deprecated and no longer in use.
// All database write operations have been moved to the client-side
// using the standard Firebase SDK to ensure proper user authentication
// and fix persistence issues.

export const updateDocument = async (collectionName: string, docId: string, data: any): Promise<void> => {
    console.error("DEPRECATED: updateDocument from firestoreAdminService was called.");
    throw new Error("This server function is deprecated.");
};

export const setDocument = async (collectionName: string, docId: string, data: any, options: { merge?: boolean } = {}): Promise<void> => {
    console.error("DEPRECATED: setDocument from firestoreAdminService was called.");
    throw new Error("This server function is deprecated.");
};
