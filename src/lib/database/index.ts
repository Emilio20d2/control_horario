export interface DatabaseDocumentReference {
  id: string;
}

export interface SetDocumentOptions {
  merge?: boolean;
}

export interface CollectionSubscription {
  ready: Promise<void>;
  unsubscribe: () => void;
}

export interface DocumentSubscription {
  unsubscribe: () => void;
}

export interface DatabaseAdapter {
  getCollection<T>(collectionName: string): Promise<T[]>;
  getDocumentById<T>(collectionName: string, id: string): Promise<T | null>;
  onCollectionUpdate<T>(collectionName: string, callback: (data: T[]) => void): CollectionSubscription;
  onDocumentUpdate<T>(collectionName: string, id: string, callback: (data: T | null) => void): DocumentSubscription;
  addDocument(collectionName: string, data: any): Promise<DatabaseDocumentReference>;
  updateDocument(collectionName: string, docId: string, data: any): Promise<void>;
  deleteDocument(collectionName: string, docId: string): Promise<void>;
  deleteSubcollectionDocument?(collectionName: string, docId: string, subcollectionName: string, subDocId: string): Promise<void>;
  setDocument(collectionName: string, docId: string, data: any, options?: SetDocumentOptions): Promise<void>;
  createConversation?(employeeId: string, employeeName: string): Promise<void>;
  addConversationMessage?(conversationId: string, data: Record<string, any>): Promise<void>;
}

export class DatabaseNotConfiguredError extends Error {
  constructor(method: string) {
    super(
      `No se ha configurado ningún adaptador de base de datos. Implementa un adaptador personalizado y llama a configureDatabaseAdapter antes de usar ${method}.`
    );
    this.name = 'DatabaseNotConfiguredError';
  }
}

const createNoopSubscription = (): CollectionSubscription => ({
  ready: Promise.resolve(),
  unsubscribe: () => {
    console.warn('[database] unsubscribe() llamado sin adaptador configurado.');
  },
});

const noopDocumentSubscription = (): DocumentSubscription => ({
  unsubscribe: () => {
    console.warn('[database] unsubscribe() llamado sin adaptador configurado.');
  },
});

const warn = (method: string) => {
  console.warn(
    `[database] ${method} fue invocado sin un adaptador configurado. Consulta src/lib/database/README.md para más detalles.`
  );
};

const defaultAdapter: DatabaseAdapter = {
  async getCollection() {
    warn('getCollection');
    return [];
  },
  async getDocumentById() {
    warn('getDocumentById');
    return null;
  },
  onCollectionUpdate(collectionName, callback) {
    warn('onCollectionUpdate');
    callback([]);
    return createNoopSubscription();
  },
  onDocumentUpdate() {
    warn('onDocumentUpdate');
    return noopDocumentSubscription();
  },
  async addDocument(collectionName) {
    warn('addDocument');
    return { id: `${collectionName}-placeholder-id` };
  },
  async updateDocument() {
    warn('updateDocument');
  },
  async deleteDocument() {
    warn('deleteDocument');
  },
  async deleteSubcollectionDocument() {
    warn('deleteSubcollectionDocument');
  },
  async setDocument() {
    warn('setDocument');
  },
  async createConversation(employeeId) {
    warn('createConversation');
    console.info(`Se intentó crear una conversación para el empleado ${employeeId}.`);
  },
  async addConversationMessage(conversationId) {
    warn('addConversationMessage');
    console.info(`Se intentó añadir un mensaje a la conversación ${conversationId}.`);
  },
};

let activeAdapter: DatabaseAdapter = defaultAdapter;

export const configureDatabaseAdapter = (adapter: DatabaseAdapter) => {
  activeAdapter = adapter;
};

const ensureAdapter = (method: keyof DatabaseAdapter): DatabaseAdapter => {
  if (activeAdapter === defaultAdapter) {
    throw new DatabaseNotConfiguredError(String(method));
  }
  return activeAdapter;
};

export const database = {
  isConfigured: () => activeAdapter !== defaultAdapter,
  getCollection<T>(collectionName: string) {
    return activeAdapter.getCollection<T>(collectionName);
  },
  getDocumentById<T>(collectionName: string, id: string) {
    return activeAdapter.getDocumentById<T>(collectionName, id);
  },
  onCollectionUpdate<T>(collectionName: string, callback: (data: T[]) => void) {
    return activeAdapter.onCollectionUpdate<T>(collectionName, callback);
  },
  onDocumentUpdate<T>(collectionName: string, id: string, callback: (data: T | null) => void) {
    return activeAdapter.onDocumentUpdate<T>(collectionName, id, callback);
  },
  addDocument(collectionName: string, data: any) {
    return activeAdapter.addDocument(collectionName, data);
  },
  updateDocument(collectionName: string, docId: string, data: any) {
    return activeAdapter.updateDocument(collectionName, docId, data);
  },
  deleteDocument(collectionName: string, docId: string) {
    return activeAdapter.deleteDocument(collectionName, docId);
  },
  deleteSubcollectionDocument(collectionName: string, docId: string, subcollectionName: string, subDocId: string) {
    if (typeof activeAdapter.deleteSubcollectionDocument === 'function') {
      return activeAdapter.deleteSubcollectionDocument(collectionName, docId, subcollectionName, subDocId);
    }
    warn('deleteSubcollectionDocument');
    return Promise.resolve();
  },
  setDocument(collectionName: string, docId: string, data: any, options?: SetDocumentOptions) {
    return activeAdapter.setDocument(collectionName, docId, data, options);
  },
  createConversation(employeeId: string, employeeName: string) {
    if (typeof activeAdapter.createConversation === 'function') {
      return activeAdapter.createConversation(employeeId, employeeName);
    }
    warn('createConversation');
    return Promise.resolve();
  },
  addConversationMessage(conversationId: string, data: Record<string, any>) {
    if (typeof activeAdapter.addConversationMessage === 'function') {
      return activeAdapter.addConversationMessage(conversationId, data);
    }
    warn('addConversationMessage');
    return Promise.resolve();
  },
  ensureConfigured(method: keyof DatabaseAdapter) {
    return ensureAdapter(method);
  },
};

export type { DatabaseAdapter as DatabaseAdapterDefinition, DatabaseDocumentReference as DatabaseReference };
