import { database, type DatabaseReference, type CollectionSubscription } from '../database';

export type { DatabaseReference };

export const getCollection = async <T extends { id: string }>(collectionName: string): Promise<T[]> => {
  return database.getCollection<T>(collectionName);
};

export const getDocumentById = async <T extends { id: string }>(collectionName: string, id: string): Promise<T | null> => {
  return database.getDocumentById<T>(collectionName, id);
};

export const onDocumentUpdate = <T>(collectionName: string, id: string, callback: (data: T | null) => void) => {
  return database.onDocumentUpdate<T>(collectionName, id, callback);
};

export const onCollectionUpdate = <T extends { id: string }>(
  collectionName: string,
  callback: (data: T[]) => void,
): CollectionSubscription => {
  return database.onCollectionUpdate<T>(collectionName, callback);
};

export const addDocument = async (collectionName: string, data: any): Promise<DatabaseReference> => {
  return database.addDocument(collectionName, data);
};

export const updateDocument = async (collectionName: string, docId: string, data: any): Promise<void> => {
  await database.updateDocument(collectionName, docId, data);
};

export const deleteDocument = async (collectionName: string, docId: string): Promise<void> => {
  await database.deleteDocument(collectionName, docId);
};

export const deleteSubcollectionDocument = async (
  collectionName: string,
  docId: string,
  subcollectionName: string,
  subDocId: string,
): Promise<void> => {
  await database.deleteSubcollectionDocument(collectionName, docId, subcollectionName, subDocId);
};

export const setDocument = async (
  collectionName: string,
  docId: string,
  data: any,
  options: { merge?: boolean } = {},
): Promise<void> => {
  await database.setDocument(collectionName, docId, data, options);
};

export const createConversation = async (employeeId: string, employeeName: string): Promise<void> => {
  await database.createConversation(employeeId, employeeName);
};

export const addConversationMessage = async (
  conversationId: string,
  data: Record<string, any>,
): Promise<void> => {
  await database.addConversationMessage(conversationId, data);
};
