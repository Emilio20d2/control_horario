
import { db } from '../firebase';
import { 
    collection, 
    getDocs, 
    doc, 
    getDoc,
    setDoc,
    deleteDoc,
    onSnapshot,
    Timestamp,
    addDoc,
    updateDoc
} from 'firebase/firestore';
import type { DocumentData, QueryDocumentSnapshot, DocumentReference } from 'firebase/firestore';


export const getCollection = async <T extends {id: string}>(collectionName: string): Promise<T[]> => {
    const querySnapshot = await getDocs(collection(db, collectionName));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
};

export const getDocumentById = async <T extends {id: string}>(collectionName: string, id: string): Promise<T | null> => {
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as T;
    } else {
        return null;
    }
};

export const onDocumentUpdate = <T>(collectionName: string, id: string, callback: (data: T | null) => void): (() => void) => {
    const docRef = doc(db, collectionName, id);
    return onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            callback({ id: docSnap.id, ...docSnap.data() } as T);
        } else {
            callback(null);
        }
    });
};

export const onCollectionUpdate = <T extends { id: string }>(collectionName: string, callback: (data: T[]) => void) => {
    const q = collection(db, collectionName);
    let initialLoad = true;

    const promise = new Promise<void>((resolve, reject) => {
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const data = querySnapshot.docs.map(doc => {
                const docData = doc.data();
                const serializedData = Object.keys(docData).reduce((acc, key) => {
                    if (docData[key] instanceof Timestamp) {
                        acc[key] = docData[key];
                    } else {
                        acc[key] = docData[key];
                    }
                    return acc;
                }, {} as any);
                return { id: doc.id, ...serializedData } as T;
            });
            callback(data);
            if (initialLoad) {
                initialLoad = false;
                resolve();
            }
        }, reject); // Pass reject to handle errors
        
        return { unsubscribe };
    });
    
    // We can't return the promise and the unsubscribe function directly, so we attach them
    // to a wrapper object.
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
        callback(data);
    });

    return {
        ready: promise,
        unsubscribe: unsubscribe
    };
};


export const addDocument = async (collectionName: string, data: any): Promise<DocumentReference> => {
    return await addDoc(collection(db, collectionName), data);
}

export const updateDocument = async (collectionName: string, docId: string, data: any): Promise<void> => {
    await updateDoc(doc(db, collectionName, docId), data);
}

export const deleteDocument = async (collectionName: string, docId: string): Promise<void> => {
    await deleteDoc(doc(db, collectionName, docId));
}

export const setDocument = async (collectionName: string, docId: string, data: any, options: { merge?: boolean } = {}): Promise<void> => {
    await setDoc(doc(db, collectionName, docId), data, { merge: true, ...options });
}
